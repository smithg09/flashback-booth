<script>
  import { fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import Landing from './lib/Landing.svelte';
  import Selection from './lib/Selection.svelte';
  import Processing from './lib/Processing.svelte';
  import Result from './lib/Result.svelte';
  import { currentPage, currentResultId } from './lib/store.js';

  let syncingFromHash = false;
  const pageLabels = {
    landing: 'Lobby',
    selection: 'Studio',
    processing: 'Darkroom',
    result: 'Pickup'
  };

  function setHash(path) {
    const nextHash = `#/${path}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
    }
  }

  function applyRouteFromHash() {
    syncingFromHash = true;
    const path = window.location.hash.replace(/^#\/?/, '');
    const parts = path.split('/').filter(Boolean);

    if (parts.length === 0) {
      currentResultId.set(null);
      currentPage.set('landing');
      syncingFromHash = false;
      return;
    }

    if (parts[0] === 'selection') {
      currentResultId.set(null);
      currentPage.set('selection');
      syncingFromHash = false;
      return;
    }

    if (parts[0] === 'processing') {
      currentPage.set('processing');
      syncingFromHash = false;
      return;
    }

    if (parts[0] === 'result' && parts[1]) {
      const id = Number(parts[1]);
      currentResultId.set(Number.isFinite(id) ? id : null);
      currentPage.set('result');
      syncingFromHash = false;
      return;
    }

    currentResultId.set(null);
    currentPage.set('landing');
    setHash('');
    syncingFromHash = false;
  }

  onMount(() => {
    applyRouteFromHash();
    window.addEventListener('hashchange', applyRouteFromHash);

    const unsubscribePage = currentPage.subscribe((page) => {
      if (syncingFromHash) return;

      if (page === 'landing') setHash('');
      if (page === 'selection') setHash('selection');
      if (page === 'processing') setHash('processing');
      if (page === 'result') {
        const id = get(currentResultId);
        if (id) setHash(`result/${id}`);
      }
    });

    const unsubscribeResultId = currentResultId.subscribe((id) => {
      if (syncingFromHash) return;
      if (get(currentPage) === 'result' && id) {
        setHash(`result/${id}`);
      }
    });

    return () => {
      window.removeEventListener('hashchange', applyRouteFromHash);
      unsubscribePage();
      unsubscribeResultId();
    };
  });
</script>

<div class="app-shell">
  <div class="ambient ambient-left"></div>
  <div class="ambient ambient-right"></div>
  <div class="grain"></div>

  <header class="marquee">
    <p class="marquee-kicker">Neighborhood Snapshot Society</p>
    <h1>Flashback Booth</h1>
    <p class="marquee-status">Now Open: {pageLabels[$currentPage] ?? 'Lobby'}</p>
  </header>

  <main class="stage" aria-live="polite">
    {#key $currentPage}
      <div class="page-frame" in:fade={{ duration: 240 }} out:fade={{ duration: 160 }}>
        {#if $currentPage === 'landing'}
          <Landing />
        {:else if $currentPage === 'selection'}
          <Selection />
        {:else if $currentPage === 'processing'}
          <Processing />
        {:else if $currentPage === 'result'}
          <Result />
        {/if}
      </div>
    {/key}
  </main>
</div>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(:root) {
    --font-display: 'Playfair Display SC', serif;
    --font-body: 'Cormorant Garamond', serif;
    --font-ui: 'Barlow Condensed', sans-serif;

    --paper: oklch(0.95 0.03 78);
    --paper-soft: oklch(0.9 0.03 78);
    --ink: oklch(0.24 0.04 35);
    --ink-soft: oklch(0.42 0.04 36);
    --brick: oklch(0.56 0.16 34);
    --brick-deep: oklch(0.4 0.12 30);
    --teal: oklch(0.63 0.11 188);
    --teal-deep: oklch(0.47 0.07 190);
    --metal: oklch(0.57 0.02 230);
    --metal-deep: oklch(0.34 0.01 230);
    --sun: oklch(0.84 0.11 82);

    --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
    --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
    --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);

    color: var(--ink);
  }

  :global(body) {
    padding: 0;
    min-height: 100vh;
    color: var(--ink);
    font-family: var(--font-body);
    background:
      radial-gradient(circle at 12% 10%, color-mix(in oklch, var(--sun) 32%, transparent), transparent 42%),
      radial-gradient(circle at 85% 16%, color-mix(in oklch, var(--teal) 28%, transparent), transparent 36%),
      linear-gradient(180deg, oklch(0.89 0.03 82), oklch(0.8 0.03 72));
    overflow-x: hidden;
    position: relative;
  }

  :global(body)::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -4;
    pointer-events: none;
    opacity: 0.15;
    background-image: repeating-linear-gradient(
      -20deg,
      color-mix(in oklch, var(--ink) 24%, transparent) 0 1px,
      transparent 1px 16px
    );
  }

  :global(button) {
    font-family: var(--font-ui);
    cursor: pointer;
    transition: transform 160ms var(--ease-out-quart), box-shadow 220ms var(--ease-out-quart), filter 220ms var(--ease-out-quart);
  }

  :global(button:active) {
    transform: scale(0.97);
  }

  :global(button:focus) {
    outline: 2px solid var(--teal-deep);
    outline-offset: 3px;
  }

  :global(h1, h2, h3) {
    font-family: var(--font-display);
    letter-spacing: 0.02em;
  }

  .app-shell {
    position: relative;
    min-height: 100vh;
    isolation: isolate;
    width: min(1200px, 100%);
    margin-inline: auto;
    padding: clamp(0.75rem, 2vw, 1.35rem);
    display: grid;
    grid-template-rows: auto 1fr;
    gap: clamp(0.9rem, 2vw, 1.4rem);
    animation: shellIn 560ms var(--ease-out-expo) both;
  }

  .ambient {
    position: fixed;
    inset: auto;
    z-index: -3;
    width: min(40vw, 520px);
    height: min(40vw, 520px);
    border-radius: 50%;
    pointer-events: none;
    filter: blur(34px);
    opacity: 0.66;
    will-change: transform;
    transform: translateX(var(--ambient-x, 0));
    animation: ambientFloat 9200ms ease-in-out infinite;
  }

  .ambient-left {
    top: 20vh;
    left: 0;
    --ambient-x: -55%;
    background: color-mix(in oklch, var(--brick) 72%, transparent);
  }

  .ambient-right {
    right: 0;
    bottom: 10vh;
    /* --ambient-x: 35%; */
    background: color-mix(in oklch, var(--teal) 62%, transparent);
    animation-delay: 1100ms;
  }

  .grain {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: -2;
    opacity: 0.24;
    background-image: repeating-linear-gradient(
      45deg,
      color-mix(in oklch, var(--ink) 12%, transparent) 0px,
      color-mix(in oklch, var(--ink) 12%, transparent) 2px,
      transparent 2px,
      transparent 8px
    );
  }

  .marquee {
    border: 3px solid color-mix(in oklch, var(--brick-deep) 68%, var(--ink));
    border-radius: 8px;
    padding: clamp(0.95rem, 2.3vw, 1.5rem) clamp(1rem, 3vw, 2rem);
    background: linear-gradient(178deg, color-mix(in oklch, var(--paper) 92%, var(--sun) 8%), color-mix(in oklch, var(--paper-soft) 80%, var(--teal) 20%));
    box-shadow:
      0 1px 0 color-mix(in oklch, var(--paper) 78%, var(--ink) 22%) inset,
      0 24px 32px color-mix(in oklch, var(--brick-deep) 26%, transparent);
    position: relative;
    overflow: hidden;
    animation: marqueeIn 640ms 90ms var(--ease-out-expo) both;
    transform: rotate(-0.45deg);
  }

  .marquee::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
      90deg,
      color-mix(in oklch, var(--ink) 11%, transparent) 0 1px,
      transparent 1px 12px
    );
    opacity: 0.45;
  }

  .marquee::after {
    content: 'EST. 1988';
    position: absolute;
    right: clamp(0.55rem, 1.7vw, 1rem);
    top: clamp(0.45rem, 1.5vw, 0.8rem);
    border: 1px solid color-mix(in oklch, var(--brick-deep) 70%, var(--ink));
    background: color-mix(in oklch, var(--paper) 72%, var(--sun) 28%);
    color: color-mix(in oklch, var(--brick-deep) 72%, var(--ink));
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.09em;
    font-size: clamp(0.57rem, 1.1vw, 0.65rem);
    padding: 0.16rem 0.45rem;
    z-index: 2;
  }

  .marquee-kicker,
  .marquee-status {
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: clamp(0.7rem, 1.6vw, 0.9rem);
    position: relative;
    z-index: 1;
  }

  .marquee-kicker {
    color: var(--ink-soft);
  }

  h1 {
    font-size: clamp(2.3rem, 5vw, 5.6rem);
    line-height: 0.88;
    margin-block: 0.22rem 0.34rem;
    color: color-mix(in oklch, var(--brick-deep) 58%, var(--ink));
    position: relative;
    z-index: 1;
    text-wrap: balance;
    text-shadow: 0 4px 0 color-mix(in oklch, var(--paper) 40%, transparent);
  }

  .marquee-status {
    color: color-mix(in oklch, var(--teal-deep) 65%, var(--ink));
  }

  .stage {
    position: relative;
    min-height: 0;
    overflow-x: clip;
    border: 2px solid color-mix(in oklch, var(--ink) 22%, transparent);
    border-radius: 14px;
    background: color-mix(in oklch, var(--paper) 84%, var(--sun) 16%);
    box-shadow: 0 22px 30px color-mix(in oklch, var(--ink) 11%, transparent);
  }

  .page-frame {
    width: 100%;
    margin-inline: auto;
    min-height: calc(100vh - 11.8rem);
    padding-inline: clamp(0.55rem, 1.3vw, 1rem);
    animation: pageDriftIn 440ms var(--ease-out-quint);
    transform-origin: center top;
  }

  @keyframes ambientFloat {
    0%,
    100% {
      transform: translateX(var(--ambient-x, 0)) translateY(0);
    }

    50% {
      transform: translateX(var(--ambient-x, 0)) translateY(-24px);
    }
  }

  @keyframes shellIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes marqueeIn {
    from {
      opacity: 0;
      transform: translateY(-10px) scale(0.985);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes pageDriftIn {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.99);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(*),
    :global(*::before),
    :global(*::after) {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  @media (max-width: 760px) {
    .app-shell {
      padding: 0.65rem;
    }

    .marquee {
      transform: none;
    }

    h1 {
      font-size: clamp(2.1rem, 5vw, 3.8rem);
    }

    .page-frame {
      min-height: calc(100vh - 10.4rem);
      padding-inline: 0.45rem;
    }
  }
</style>
