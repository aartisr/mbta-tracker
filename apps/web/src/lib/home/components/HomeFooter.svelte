<footer class="app-footer">
  <div class="footer-content">
    <div class="footer-top">
      <section class="footer-brand" aria-label="MBTA Tracker summary">
        <p class="footer-title">MBTA Tracker</p>
        <p class="footer-summary">Search-first transit that minimizes cognitive overload and keeps decisions fast.</p>
        <p class="footer-live">Data from MBTA API • Updated in real-time</p>
      </section>

      <section class="footer-group" aria-label="Explore links">
        <p class="footer-group-title">Explore</p>
        <div class="footer-link-grid">
          <a href="https://mbta.com" target="_blank" rel="noopener">
            <svg class="footer-link-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z"></path><path d="M7 9h10M7 12h10M7 15h6"></path></svg>
            MBTA
          </a>
          <a href="/about">
            <svg class="footer-link-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"></circle><path d="M6 20a6 6 0 0 1 12 0"></path></svg>
            About
          </a>
          <a href="/privacy">
            <svg class="footer-link-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.4-2.5 8.1-7 10-4.5-1.9-7-5.6-7-10V6l7-3z"></path><path d="M9.5 12.5l1.8 1.8 3.5-3.5"></path></svg>
            Privacy
          </a>
        </div>
      </section>

      <section class="footer-group" aria-label="Share and embed links">
        <p class="footer-group-title">Share</p>
        <div class="footer-link-grid">
          <a href="/share">
            <svg class="footer-link-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 8l-6 4 6 4"></path><path d="M9 12h9"></path><circle cx="6" cy="12" r="2"></circle><circle cx="18" cy="8" r="2"></circle><circle cx="18" cy="16" r="2"></circle></svg>
            Share page
          </a>
          <a href="/embed">
            <svg class="footer-link-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7l-5 5 5 5"></path><path d="M16 7l5 5-5 5"></path><path d="M14 4l-4 16"></path></svg>
            Embed preview
          </a>
          <a href="#page-top">
            <svg class="footer-link-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V6"></path><path d="M6.5 11.5L12 6l5.5 5.5"></path></svg>
            Back to top
          </a>
        </div>
      </section>
    </div>

    <p class="footer-ownership">
      © 2026 <a href="https://ai-aarti.com" target="_blank" rel="noopener">Aarti S Ravikumar, Pioneer Charter School of Science II</a>
    </p>
    <p class="footer-credits" aria-label="Source credits">
      Credits: <a href="https://www.mbta.com/" target="_blank" rel="noopener">MBTA</a>,
      <a href="https://maplibre.org/" target="_blank" rel="noopener">MapLibre</a>,
      <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener">OpenStreetMap</a>,
      <a href="https://nominatim.org/" target="_blank" rel="noopener">Nominatim</a>,
      <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a>
    </p>
  </div>
</footer>

<style lang="postcss">
  .app-footer {
    @apply border-t mt-10;
    background:
      linear-gradient(180deg, rgba(247, 249, 252, 0.95), rgba(240, 245, 250, 0.98)),
      radial-gradient(circle at 50% 0%, rgba(29, 78, 216, 0.04), transparent 50%);
    border-color: rgba(216, 225, 236, 0.6);
    backdrop-filter: blur(12px);
    box-shadow: 0 -12px 32px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8);
    animation: footer-rise 580ms cubic-bezier(0.2, 0.85, 0.2, 1);
    animation-delay: 120ms;
    animation-fill-mode: both;
  }

  .footer-content {
    @apply max-w-6xl mx-auto text-xs;
    width: min(100%, 72rem);
    padding-left: 1.5rem;
    padding-right: 1.5rem;
    padding-top: 1.8rem;
    padding-bottom: 1.8rem;
    text-align: left;
    color: var(--text-soft);
    line-height: 1.55;
    display: grid;
    gap: 1rem;
  }

  .footer-top {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  .footer-brand {
    display: grid;
    gap: 0.4rem;
    border-bottom: 1px solid rgba(203, 213, 225, 0.4);
    padding-bottom: 1rem;
    margin-bottom: 0;
  }

  .footer-title {
    margin: 0;
    font-size: 0.88rem;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.01em;
  }

  .footer-summary,
  .footer-live {
    margin: 0.4rem 0 0;
    font-size: 11px;
    color: var(--text-body);
    line-height: 1.5;
  }

  .footer-live {
    font-weight: 600;
    color: var(--text-soft);
    font-size: 10px;
  }

  .footer-group {
    padding: 0;
    border-radius: 0;
    border: none;
    background: transparent;
    transition: none;
    animation: none;
  }

  .footer-group:hover {
    transform: none;
    box-shadow: none;
  }

  .footer-group-title {
    margin: 0 0 0.6rem 0;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    font-size: 10px;
    font-weight: 700;
    color: var(--text-strong);
  }

  .footer-link-grid {
    margin-top: 0.4rem;
    display: grid;
    gap: 0.35rem;
  }

  .footer-link-grid a {
    display: inline-flex;
    align-items: center;
    min-height: 1.9rem;
    text-decoration: none;
    color: #1d4ed8;
    font-weight: 700;
    border-radius: 0.55rem;
    padding: 0.22rem 0.45rem;
    gap: 0.38rem;
  }

  .footer-link-grid a:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--focus);
  }

  .footer-link-icon {
    width: 0.9rem;
    height: 0.9rem;
    stroke: currentColor;
    stroke-width: 1.6;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    flex-shrink: 0;
    transition: transform 200ms ease-out;
  }

  .footer-link-grid a:hover .footer-link-icon {
    transform: scale(1.15);
  }

  .footer-link-grid a:hover {
    background: #eff6ff;
    color: #1e40af;
  }

  .footer-ownership {
    margin: 0;
    font-size: 9px;
    color: var(--text-soft);
    letter-spacing: 0;
    display: block;
    padding: 1rem 0 0 0;
    border-top: 1px solid rgba(203, 213, 225, 0.4);
    width: 100%;
    background: transparent;
    box-shadow: none;
  }

  .footer-ownership a {
    color: #1e40af;
    text-decoration: none;
    font-weight: 500;
    border-bottom: 1px solid #1e40af;
    transition: color 200ms ease-out;
  }

  .footer-ownership a:hover {
    color: #1d4ed8;
    border-bottom-color: #1d4ed8;
  }

  .footer-credits {
    margin: 0.6rem 0 0 0;
    font-size: 9px;
    color: var(--text-soft);
    line-height: 1.5;
    max-width: 70ch;
  }

  .footer-credits a {
    color: #1e40af;
    text-decoration: none;
    font-weight: 500;
    border-bottom: 1px solid transparent;
    transition: all 200ms ease-out;
  }

  .footer-credits a:hover {
    color: #1d4ed8;
    border-bottom-color: #1d4ed8;
  }

  @media (max-width: 640px) {
    .app-footer {
      margin-top: 1.3rem;
      padding-left: 0.35rem;
      padding-right: 0.35rem;
    }

    .footer-content {
      padding-left: 0.8rem;
      padding-right: 0.8rem;
      gap: 0.4rem;
      padding-bottom: calc(4.5rem + env(safe-area-inset-bottom));
      border-radius: 1rem 1rem 0 0;
    }

    .footer-top {
      grid-template-columns: 1fr;
      gap: 0.4rem;
    }

    .footer-group {
      padding: 0.4rem 0.4rem;
    }

    .footer-ownership {
      font-size: 0.68rem;
      padding: 0.2rem 0.45rem;
    }

    .footer-credits {
      font-size: 0.68rem;
    }

    .footer-link-grid {
      gap: 0.7rem;
      margin-top: 0.1rem;
    }
  }

  @keyframes footer-rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
