<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { SearchResult } from '$lib/types';
	import { apiUrl } from '$lib/api';

	// Props
	export let onSearch: (query: string) => void = () => {};
	export let placeholder = 'Search route, stop, address, or vehicle...';
	export let autoFocus = false;

	// State
	let searchInput = '';
	let suggestions: SearchResult[] = [];
	let recentSearches: string[] = [];
	let favoriteSearches: string[] = [];
	let isLoading = false;
	let isOpen = false;
	let selectedIndex = -1;
	let showHistoryPanel = false;
	let historyPageIndex = 0;
	let rootEl: HTMLDivElement;
	let searchInputEl: HTMLInputElement;
	let isListening = false;
	let voiceMessage = '';
	let recognition: SpeechRecognition | null = null;
	const HISTORY_PAGE_SIZE = 3;

	type SpeechRecognitionConstructor = new () => SpeechRecognition;

	interface SpeechRecognition extends EventTarget {
		lang: string;
		continuous: boolean;
		interimResults: boolean;
		maxAlternatives: number;
		onresult: ((event: SpeechRecognitionEvent) => void) | null;
		onerror: ((event: Event) => void) | null;
		onend: (() => void) | null;
		start(): void;
		stop(): void;
	}

	interface SpeechRecognitionEvent extends Event {
		results: {
			[index: number]: {
				[index: number]: { transcript: string };
				isFinal: boolean;
			};
			length: number;
		};
	}

	const RECENT_STORAGE_KEY = 'mbta_recent_searches';
	const FAVORITES_STORAGE_KEY = 'mbta_favorite_searches';

	// Load recent searches from localStorage
	onMount(() => {
		const storedRecent = localStorage.getItem(RECENT_STORAGE_KEY);
		if (storedRecent) {
			recentSearches = JSON.parse(storedRecent);
		}

		const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
		if (storedFavorites) {
			favoriteSearches = JSON.parse(storedFavorites);
		}

		const handleDocumentClick = (event: MouseEvent) => {
			if (rootEl && !rootEl.contains(event.target as Node)) {
				isOpen = false;
				selectedIndex = -1;
			}
		};

		const handleGlobalShortcut = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement | null;
			const isTypingContext = target && (
				target.tagName === 'INPUT'
				|| target.tagName === 'TEXTAREA'
				|| target.isContentEditable
			);

			if (isTypingContext) {
				return;
			}

			if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
				event.preventDefault();
				searchInputEl?.focus();
				return;
			}

			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault();
				searchInputEl?.focus();
			}
		};

		document.addEventListener('click', handleDocumentClick);
		window.addEventListener('keydown', handleGlobalShortcut);
		if (autoFocus) {
			queueMicrotask(() => searchInputEl?.focus());
		}
		return () => {
			document.removeEventListener('click', handleDocumentClick);
			window.removeEventListener('keydown', handleGlobalShortcut);
		};
	});

	// Fetch autocomplete suggestions
	async function fetchSuggestions(query: string) {
		if (!query || query.length < 2) {
			suggestions = [];
			isOpen = false;
			return;
		}

		isLoading = true;
		try {
			const response = await fetch(
				apiUrl(`/api/search/autocomplete?q=${encodeURIComponent(query)}&limit=10`)
			);
			const data = await response.json();
			suggestions = data.suggestions || [];
			isOpen = suggestions.length > 0;
			selectedIndex = -1;
		} catch (error) {
			console.error('Error fetching suggestions:', error);
			suggestions = [];
		} finally {
			isLoading = false;
		}
	}

	// Handle input change (debounced)
	let debounceTimer: NodeJS.Timeout;
	function handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		searchInput = input.value;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			fetchSuggestions(searchInput);
		}, 300);
	}

	onDestroy(() => {
		clearTimeout(debounceTimer);
	});

	// Handle search submission
	function handleSearch(query: string) {
		if (!query.trim()) return;

		// Add to recent searches
		const filtered = recentSearches.filter(s => s !== query);
		recentSearches = [query, ...filtered].slice(0, 5);
		localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentSearches));

		// Trigger search
		onSearch(query);
		suggestions = [];
		isOpen = false;
		selectedIndex = -1;
	}

	// Handle keyboard navigation
	function handleKeyDown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				break;
			case 'Enter':
				event.preventDefault();
				if (selectedIndex >= 0 && suggestions[selectedIndex]) {
					handleSearch(getResultLabel(suggestions[selectedIndex]));
				} else {
					handleSearch(searchInput);
				}
				break;
			case 'Escape':
				event.preventDefault();
				isOpen = false;
				selectedIndex = -1;
				break;
		}
	}

	// Voice input placeholder
	function handleVoiceSearch() {
		const ctor = (
			(window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition
			|| (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition
		);

		if (!ctor) {
			voiceMessage = 'Voice search is not supported in this browser.';
			return;
		}

		if (isListening) {
			recognition?.stop();
			isListening = false;
			voiceMessage = 'Voice search stopped.';
			return;
		}

		voiceMessage = 'Listening... say a route, stop, or address.';
		recognition = new ctor();
		recognition.lang = 'en-US';
		recognition.continuous = false;
		recognition.interimResults = true;
		recognition.maxAlternatives = 1;

		recognition.onresult = (event) => {
			let transcript = '';
			for (let i = 0; i < event.results.length; i += 1) {
				transcript += event.results[i][0]?.transcript ?? '';
			}

			searchInput = transcript.trim();
			if (searchInput.length >= 2) {
				void fetchSuggestions(searchInput);
			}

			if (event.results[event.results.length - 1]?.isFinal && searchInput) {
				handleSearch(searchInput);
				voiceMessage = 'Voice search complete.';
			}
		};

		recognition.onerror = () => {
			voiceMessage = 'Voice search failed. Please try again.';
			isListening = false;
		};

		recognition.onend = () => {
			isListening = false;
		};

		isListening = true;
		recognition.start();
	}

	function clearSearch() {
		searchInput = '';
		suggestions = [];
		isOpen = false;
		selectedIndex = -1;
	}

	function toggleCurrentFavorite() {
		const query = searchInput.trim();
		if (!query) {
			return;
		}

		toggleFavorite(query);
	}

	$: visibleHistoryPage = recentSearches.slice(
		historyPageIndex * HISTORY_PAGE_SIZE,
		(historyPageIndex + 1) * HISTORY_PAGE_SIZE
	);
	$: totalHistoryPages = Math.ceil(recentSearches.length / HISTORY_PAGE_SIZE);
	$: canPageBack = historyPageIndex > 0;
	$: canPageForward = historyPageIndex < totalHistoryPages - 1;
	$: currentQuery = searchInput.trim();
	$: currentQueryIsFavorite = currentQuery.length > 0 && isFavorite(currentQuery);

	function toggleHistoryPanel() {
		showHistoryPanel = !showHistoryPanel;
		if (showHistoryPanel) {
			historyPageIndex = 0;
		}
	}

	function nextHistoryPage() {
		if (canPageForward) {
			historyPageIndex += 1;
		}
	}

	function prevHistoryPage() {
		if (canPageBack) {
			historyPageIndex -= 1;
		}
	}

	function selectFromHistory(query: string) {
		handleSearch(query);
		showHistoryPanel = false;
	}

	function isFavorite(query: string): boolean {
		return favoriteSearches.includes(query);
	}

	function toggleFavorite(query: string) {
		if (!query) {
			return;
		}

		if (isFavorite(query)) {
			favoriteSearches = favoriteSearches.filter((item) => item !== query);
		} else {
			favoriteSearches = [query, ...favoriteSearches.filter((item) => item !== query)].slice(0, 8);
		}

		localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteSearches));
	}

	function getResultType(result: SearchResult): string {
		return result.type;
	}

	function getResultLabel(result: SearchResult): string {
		switch (result.type) {
			case 'route':
				return `${result.route_number} - ${result.route_name}`;
			case 'stop':
				return `${result.stop_name}`;
			case 'address':
				return `${result.address}`;
			case 'vehicle':
				return `Bus #${result.vehicle_id}`;
			case 'landmark':
				return `${result.landmark_name}`;
			default:
				return '';
		}
	}
</script>

<div class="search-container">
	<div class="search-box" bind:this={rootEl}>
		<form class="search-form" on:submit|preventDefault={() => handleSearch(searchInput)}>
			<div
				class="search-input-wrapper"
				role="combobox"
				aria-expanded={isOpen}
				aria-controls="suggestions-list"
				aria-owns="suggestions-list"
				aria-haspopup="listbox"
			>
			<svg
				class="search-icon"
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<circle cx="11" cy="11" r="8"></circle>
				<path d="m21 21-4.35-4.35"></path>
			</svg>

			<input
				type="text"
				bind:this={searchInputEl}
				{placeholder}
				value={searchInput}
				on:input={handleInput}
				on:keydown={handleKeyDown}
				on:focus={() => (isOpen = searchInput.length >= 2 && suggestions.length > 0)}
				class="search-input"
				aria-label="Search for routes, stops, addresses, or vehicles"
				aria-autocomplete="list"
				aria-controls="suggestions-list"
				autocomplete="off"
				spellcheck="false"
			/>

			{#if searchInput.length > 0}
				<button
					type="button"
					class="clear-button"
					on:click={clearSearch}
					aria-label="Clear search"
					title="Clear"
				>
					✕
				</button>
			{/if}

			{#if currentQuery}
				<button
					type="button"
					class="favorite-button {currentQueryIsFavorite ? 'active' : ''}"
					on:click={toggleCurrentFavorite}
					aria-label={currentQueryIsFavorite ? `Remove ${currentQuery} from favorites` : `Add ${currentQuery} to favorites`}
					title={currentQueryIsFavorite ? 'Remove favorite' : 'Save favorite'}
				>
					★
				</button>
			{/if}

			<button
				type="submit"
				class="search-button"
				disabled={!searchInput.trim()}
				aria-label="Search"
			>
				Search
			</button>

			<button
				type="button"
				class="voice-button {isListening ? 'active' : ''}"
				on:click={handleVoiceSearch}
				aria-label="Search by voice"
				title={isListening ? 'Stop voice search' : 'Search by voice'}
			>
				🎤
			</button>
			</div>
		</form>

		{#if voiceMessage}
			<p class="voice-message" role="status" aria-live="polite">{voiceMessage}</p>
		{/if}

		{#if isOpen && (suggestions.length > 0 || isLoading)}
			<div class="suggestions-dropdown" id="suggestions-list" role="listbox">
				{#if isLoading}
					<div class="suggestion-item loading">Searching...</div>
				{:else}
					{#each suggestions as suggestion, index}
						<button
							class="suggestion-item {index === selectedIndex ? 'selected' : ''}"
							style={`--stagger:${index};`}
							on:click={() => handleSearch(getResultLabel(suggestion))}
							role="option"
							aria-selected={index === selectedIndex}
						>
							<span class="suggestion-type">{getResultType(suggestion)}</span>
							<span class="suggestion-label">{getResultLabel(suggestion)}</span>
						</button>
					{/each}
				{/if}
			</div>
		{/if}
	</div>

	{#if !isOpen && searchInput === '' && (favoriteSearches.length > 0 || recentSearches.length > 0)}
		<div class="quick-launch" aria-label="Quick search shortcuts">
			{#if favoriteSearches.length > 0}
				<div class="quick-group">
					<div class="quick-group-head">
						<h3 class="recent-label">Pinned</h3>
						<span class="quick-hint">One tap</span>
					</div>
					<div class="quick-list">
						{#each favoriteSearches as search, index}
							<div class="recent-row" style={`--stagger:${index};`}>
								<button
									class="recent-item"
									on:click={() => {
										searchInput = search;
										handleSearch(search);
									}}
									aria-label="Search favorite {search}"
								>
									<span class="favorite-indicator" aria-hidden="true">★</span>
									{search}
								</button>
								<button
									type="button"
									class="favorite-toggle"
									on:click={() => toggleFavorite(search)}
									aria-label="Remove {search} from favorites"
									title="Remove favorite"
								>
									✕
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if recentSearches.length > 0}
				<div class="quick-group">
					<div class="quick-group-head">
						<h3 class="recent-label">Recent</h3>
						<button
							type="button"
							class="history-launch"
							on:click={toggleHistoryPanel}
							aria-label="Show search history"
						>
							History ({recentSearches.length})
						</button>
					</div>
					<div class="quick-list">
						{#each visibleHistoryPage as search, index}
							<button
								class="recent-item compact"
								style={`--stagger:${index};`}
								on:click={() => selectFromHistory(search)}
								aria-label="Search for {search}"
							>
								<svg
									class="history-icon"
									xmlns="http://www.w3.org/2000/svg"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<polyline points="23 4 23 10 17 10"></polyline>
									<path d="M20.49 15a9 9 0 1 1-2-8.83"></path>
								</svg>
								{search}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		{#if showHistoryPanel}
			<div class="history-panel" role="region" aria-label="Search history">
				<div class="history-header">
					<h3 class="history-title">History</h3>
					<button
						type="button"
						class="history-close"
						on:click={toggleHistoryPanel}
						aria-label="Close history"
						title="Close"
					>
						✕
					</button>
				</div>
				<div class="history-list">
					{#each visibleHistoryPage as search, index}
						<button
							class="history-item"
							on:click={() => selectFromHistory(search)}
							aria-label="Search for {search}"
						>
							<svg
								class="history-icon"
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<polyline points="23 4 23 10 17 10"></polyline>
								<path d="M20.49 15a9 9 0 1 1-2-8.83"></path>
							</svg>
							<span class="history-query">{search}</span>
						</button>
					{/each}
				</div>
				{#if totalHistoryPages > 1}
					<div class="history-pagination">
						<button
							type="button"
							class="pagination-button"
							on:click={prevHistoryPage}
							disabled={!canPageBack}
							aria-label="Previous history page"
						>
							←
						</button>
						<span class="pagination-info">{historyPageIndex + 1} / {totalHistoryPages}</span>
						<button
							type="button"
							class="pagination-button"
							on:click={nextHistoryPage}
							disabled={!canPageForward}
							aria-label="Next history page"
						>
							→
						</button>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style lang="postcss">
	.search-container {
		@apply w-full;
	}

	.search-box {
		@apply relative;
	}

	.search-form {
		@apply m-0;
	}

	.search-input-wrapper {
		@apply px-4 py-2.5 bg-white border rounded-2xl shadow-sm;
		display: grid;
		grid-template-columns: auto 1fr auto auto auto auto;
		align-items: center;
		column-gap: 0.5rem;
		border-color: #cbd5e1;
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.7),
			0 8px 16px rgba(15, 23, 42, 0.05);
		transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;

		&:focus-within {
			border-color: #60a5fa;
			box-shadow:
				0 0 0 3px rgba(37, 99, 235, 0.22),
				0 10px 20px rgba(15, 23, 42, 0.08);
			transform: translateY(-1px);
		}
	}

	.search-icon {
		@apply flex-shrink-0;
		color: #64748b;
	}

	.search-input {
		@apply flex-1 outline-none text-base;
		min-width: 0;
		color: #0f172a;

		&::placeholder {
			color: #64748b;
		}
	}

	.voice-button {
		@apply text-lg flex-shrink-0 transition-colors;
		color: #64748b;
		line-height: 1;
		padding: 0.15rem;

		&:hover {
			color: #1d4ed8;
			transform: scale(1.06);
		}
	}

	.voice-button.active {
		color: #dc2626;
		animation: voice-pulse 1000ms ease-in-out infinite;
	}

	.voice-message {
		@apply mt-2 mb-0 text-xs;
		color: #475569;
	}

	.clear-button {
		@apply rounded-full transition-colors;
		color: #64748b;
		width: 1.75rem;
		height: 1.75rem;
		line-height: 1;

		&:hover {
			background: #e2e8f0;
			color: #1e293b;
		}
	}

	.search-button {
		@apply border rounded-full text-xs font-semibold transition-colors;
		background: #1d4ed8;
		border-color: #1e40af;
		color: #ffffff;
		padding: 0.43rem 0.7rem;
		white-space: nowrap;

		&:hover:enabled {
			background: #1e40af;
		}

		&:disabled {
			opacity: 0.45;
			cursor: not-allowed;
		}
	}

	.favorite-button {
		@apply rounded-full transition-colors text-xs font-semibold border;
		width: 1.9rem;
		height: 1.9rem;
		line-height: 1;
		border-color: #fcd34d;
		background: #fffbeb;
		color: #b45309;

		&:hover {
			background: #fef3c7;
			border-color: #f59e0b;
		}
	}

	.favorite-button.active {
		background: #fef3c7;
		color: #92400e;
		border-color: #f59e0b;
	}

	.suggestions-dropdown {
		@apply absolute top-full left-0 right-0 mt-2 border rounded-[1.15rem] z-50 max-h-80 overflow-y-auto;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.98));
		border-color: #cbd5e1;
		box-shadow:
			0 18px 42px rgba(15, 23, 42, 0.12),
			inset 0 1px 0 rgba(255, 255, 255, 0.75);
		backdrop-filter: blur(12px);
		animation: dropdown-in 150ms ease-out;
		transform-origin: top center;
		contain: paint;
	}

	.suggestion-item {
		@apply w-full px-4 py-3 text-left flex items-center gap-3 transition-all cursor-pointer;
		background: transparent;
		color: #1e293b;
		border-bottom: 1px solid rgba(226, 232, 240, 0.9);
		animation: suggestion-in 170ms ease;
		animation-delay: calc(var(--stagger, 0) * 24ms);
		animation-fill-mode: both;

		&:hover {
			background: linear-gradient(90deg, rgba(239, 246, 255, 0.95), rgba(248, 250, 252, 0.98));
			transform: translateX(2px);
		}

		&.selected {
			background: linear-gradient(90deg, rgba(224, 236, 255, 0.95), rgba(239, 246, 255, 0.95));
		}

		&.loading {
			@apply justify-center;
			color: #64748b;
		}
	}

	.suggestion-item:last-child {
		border-bottom: none;
	}

	.suggestion-type {
		@apply inline-block px-2 py-1 text-xs font-semibold rounded flex-shrink-0;
		background: #dbeafe;
		color: #1e3a8a;
	}

	.suggestion-label {
		@apply flex-1 truncate text-sm;
		color: #1e293b;
	}

	.quick-launch {
		@apply mt-4 px-4 grid gap-3;
	}

	.recent-label {
		@apply text-[11px] font-semibold uppercase tracking-[0.22em] m-0;
		color: #64748b;
	}

	.quick-group {
		@apply rounded-[1.15rem] border px-3 py-2;
		background:
			linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.96));
		border-color: #d8e1ec;
		box-shadow: 0 10px 20px rgba(15, 23, 42, 0.04);
	}

	.quick-group-head {
		@apply flex items-center justify-between gap-2 mb-2;
	}

	.quick-hint {
		@apply text-[11px] font-semibold rounded-full px-2 py-1;
		background: #eff6ff;
		color: #1e3a8a;
	}

	.quick-list {
		@apply flex flex-wrap gap-2;
	}

	.recent-row {
		@apply inline-flex items-center gap-1;
		animation: suggestion-in 180ms ease;
		animation-delay: calc(var(--stagger, 0) * 30ms);
		animation-fill-mode: both;
	}

	.recent-item {
		@apply inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-full transition-all border;
		background: linear-gradient(180deg, #ffffff, #f8fafc);
		border-color: #dbe3ee;
		color: #334155;
		&:hover {
			background: linear-gradient(180deg, #f0f6ff, #eaf2ff);
			border-color: #bfdbfe;
			color: #1e3a8a;
			transform: translateY(-1px);
		}
	}

	.recent-item.compact {
		@apply text-xs;
	}

	.favorite-toggle {
		@apply text-xs font-semibold rounded-full border;
		width: 1.65rem;
		height: 1.65rem;
		line-height: 1;
		border-color: #dbe3ee;
		background: #ffffff;
		color: #1e3a8a;

		&:hover {
			background: #e0ecff;
			border-color: #93c5fd;
		}
	}

	.favorite-indicator {
		color: #f59e0b;
	}

	.history-launch {
		@apply text-[11px] font-semibold rounded-full border px-2.5 py-1 transition-colors;
		background: #ffffff;
		border-color: #dbe3ee;
		color: #1e3a8a;

		&:hover {
			background: #eef4ff;
			border-color: #bfdbfe;
		}
	}

	.history-panel {
		@apply mt-3 px-4 py-3 border rounded-[1.15rem] mb-4;
		background:
			radial-gradient(circle at top right, rgba(239, 246, 255, 0.75), transparent 30%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.98));
		border-color: #cbd5e1;
		box-shadow:
			0 16px 32px rgba(15, 23, 42, 0.08),
			inset 0 1px 0 rgba(255, 255, 255, 0.7);
		animation: panel-in 200ms ease-out;
	}

	.history-header {
		@apply flex items-center justify-between mb-3;
	}

	.history-title {
		@apply text-sm font-semibold m-0;
		color: #0f172a;
	}

	.history-close {
		@apply text-lg leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100;
		color: #64748b;
		transition: background-color 150ms ease;

		&:hover {
			background: #f1f5f9;
		}
	}

	.history-list {
		@apply grid gap-1;
	}

	.history-item {
		@apply w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-all;
		background: rgba(255, 255, 255, 0.7);
		border: 1px solid transparent;
		color: #334155;
		text-align: left;

		&:hover {
			background: #eef4ff;
			border-color: #c7dbf4;
			color: #0f172a;
			transform: translateX(2px);
		}
	}

	.history-icon {
		@apply flex-shrink-0;
		color: #64748b;
	}

	.history-query {
		@apply flex-1 truncate;
	}

	.history-pagination {
		@apply flex items-center justify-center gap-2 mt-3 pt-3;
		border-top: 1px solid #e2e8f0;
	}

	.pagination-button {
		@apply px-2 py-1 text-xs font-semibold rounded transition-colors;
		background: #f8fafc;
		color: #0f172a;
		border: 1px solid #cbd5e1;

		&:hover:not(:disabled) {
			background: #eef4ff;
			border-color: #93c5fd;
		}

		&:disabled {
			opacity: 0.4;
			cursor: not-allowed;
		}
	}

	.pagination-info {
		@apply text-xs font-semibold;
		color: #64748b;
		min-width: 3rem;
		text-align: center;
	}

	@keyframes panel-in {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (pointer: coarse) {
		.voice-button:hover,
		.recent-item:hover,
		.suggestion-item:hover {
			transform: none;
		}
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.suggestions-dropdown,
		.suggestion-item,
		.recent-item,
		.history-panel {
			transition: none;
			animation: none;
		}
	}

	@media (max-width: 640px) {
		.search-input-wrapper {
			@apply px-3 py-2;
			grid-template-columns: auto minmax(0, 1fr) auto auto auto;
		}

		.voice-button {
			display: none;
		}

		.search-button {
			padding: 0.4rem 0.62rem;
		}

		.suggestion-item {
			@apply px-3 py-2;
		}

		.suggestion-label {
			white-space: normal;
			line-height: 1.35;
		}

		.history-panel {
			@apply px-3 py-2;
		}

		.quick-launch {
			@apply px-3;
		}

		.quick-group {
			@apply px-2.5 py-2;
		}

		.history-item {
			@apply px-2 py-1.5 text-xs;
		}
	}

	@media (max-width: 860px) {
		.search-input-wrapper {
			grid-template-columns: auto minmax(0, 1fr) auto auto auto;
		}

		.voice-button {
			display: none;
		}
	}

	@keyframes dropdown-in {
		from {
			opacity: 0;
			transform: translateY(-6px) scale(0.99);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes suggestion-in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes voice-pulse {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.08);
		}
		100% {
			transform: scale(1);
		}
	}
</style>
