import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SearchBox from '$lib/SearchBox.svelte';

// Stub fetch to avoid real network calls in tests
const mockFetch = vi.fn();
beforeEach(() => {
	vi.stubGlobal('fetch', mockFetch);
	mockFetch.mockClear();
	mockFetch.mockResolvedValue({
		json: async () => ({ suggestions: [] })
	});
	localStorage.clear();
});

describe('SearchBox', () => {
	it('renders the search input', () => {
		render(SearchBox, {
			onSearch: vi.fn()
		});
		expect(screen.getByRole('textbox')).toBeTruthy();
	});

	it('uses provided placeholder text', () => {
		render(SearchBox, {
			onSearch: vi.fn(),
			placeholder: 'Find a stop'
		});
		expect(screen.getByPlaceholderText('Find a stop')).toBeTruthy();
	});

	it('calls onSearch when Enter is pressed', async () => {
		const onSearch = vi.fn();
		render(SearchBox, { onSearch });
		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'Downtown Crossing' } });
		await fireEvent.keyDown(input, { key: 'Enter' });
		expect(onSearch).toHaveBeenCalledWith('Downtown Crossing');
	});

	it('saves recent search to localStorage on submit', async () => {
		const onSearch = vi.fn();
		render(SearchBox, { onSearch });
		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'Park Street' } });
		await fireEvent.keyDown(input, { key: 'Enter' });
		const stored = JSON.parse(localStorage.getItem('mbta_recent_searches') ?? '[]');
		expect(stored).toContain('Park Street');
	});

	it('requests autocomplete after 2+ chars (debounced)', async () => {
		render(SearchBox, { onSearch: vi.fn() });
		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'Re' } });
		// Debounce is 300ms; flush timers via waitFor polling
		await waitFor(() => expect(mockFetch).toHaveBeenCalled(), { timeout: 600 });
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/search/autocomplete'));
	});

	it('does not request autocomplete for single-char input', async () => {
		render(SearchBox, { onSearch: vi.fn() });
		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'R' } });
		await new Promise((r) => setTimeout(r, 400));
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('closes dropdown on Escape key', async () => {
		// Seed suggestions so dropdown opens (component reads data.suggestions)
		mockFetch.mockResolvedValue({ json: async () => ({ suggestions: [{ type: 'stop', stop_id: 's1', stop_name: 'Park St', stop_code: '70196' }] }) });
		render(SearchBox, { onSearch: vi.fn() });
		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'Park' } });
		await waitFor(() => expect(screen.queryByRole('listbox')).toBeTruthy(), { timeout: 600 });
		await fireEvent.keyDown(input, { key: 'Escape' });
		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('has combobox role container with aria-expanded', () => {
		const { container } = render(SearchBox, { onSearch: vi.fn() });
		const combobox = container.querySelector('[role="combobox"]');
		expect(combobox).toBeTruthy();
		expect(combobox?.getAttribute('aria-expanded')).toBe('false');
	});

	it('allows adding and persisting favorites from recent searches', async () => {
		const onSearch = vi.fn();
		render(SearchBox, { onSearch });
		const input = screen.getByRole('textbox');

		await fireEvent.input(input, { target: { value: 'Harvard' } });
		const addFavoriteButton = screen.getByLabelText('Add Harvard to favorites');
		await fireEvent.click(addFavoriteButton);

		await waitFor(() => {
			const stored = JSON.parse(localStorage.getItem('mbta_favorite_searches') ?? '[]');
			expect(stored).toContain('Harvard');
		});
	});
});
