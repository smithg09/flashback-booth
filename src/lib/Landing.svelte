<script>
  import { onMount } from 'svelte';
  import { currentPage, currentResultId, finalStrip } from './store.js';
  import { clearAllStrips, getRecentStrips } from './strip-db.js';

  import sampleStrip1 from '../assets/sample-strip-1.png';
  import sampleStrip2 from '../assets/sample-strip-2.png';
  import sampleStrip3 from '../assets/sample-strip-3.png';
  import sampleStrip4 from '../assets/sample-strip-4.png';

  const heroKickerByWindow = {
    morning: 'Morning Session.',
    afternoon: 'Afternoon Session.',
    evening: 'Evening Session.',
    night: 'Late Night Session.'
  };

  const vibeLines = [
    'Strike a pose and let the booth handle the rest.',
    'Grab a friend and practice your best dramatic faces.',
    'Pro tip: B&W mode feels like instant nostalgia.',
    'Your new favorite digital souvenir.'
  ];

  let savedStrips = [];
  let heroKicker = 'Analog Energy. Digital Delivery.';
  let dailyVibe = '';

  function getKickerForHour(hour) {
    if (hour < 12) return heroKickerByWindow.morning;
    if (hour < 17) return heroKickerByWindow.afternoon;
    if (hour < 21) return heroKickerByWindow.evening;
    return heroKickerByWindow.night;
  }

  onMount(async () => {
    const now = new Date();
    const daySeed = now.getFullYear() + now.getMonth() + now.getDate();
    heroKicker = getKickerForHour(now.getHours());
    dailyVibe = vibeLines[daySeed % vibeLines.length];

    try {
      savedStrips = await getRecentStrips(8);
    } catch (error) {
      savedStrips = [];
    }
  });

  async function clearHistory() {
    const shouldClear = window.confirm('Delete every saved strip from this browser?');
    if (!shouldClear) return;

    await clearAllStrips();
    savedStrips = [];
  }

  function openSavedStrip(strip) {
    if (!strip?.id || !strip?.dataUrl) return;
    finalStrip.set(strip.dataUrl);
    currentResultId.set(strip.id);
    currentPage.set('result');
  }

  function scrollToHistory() {
    document.getElementById('recent-strips')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function formatDate(timestamp) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(timestamp);
  }
</script>

<div class="landing-page">
  <section class="hero-grid">
    <div class="hero-copy">
      <p class="hero-kicker">{heroKicker}</p>
      <h2>Four snapshots. One timeless strip.</h2>
      <p class="hero-summary">
        The classic street-corner photo booth, brought to your browser. Snap live photos or upload your own—no coins required.
      </p>
      <p class="hero-delight">{dailyVibe}</p>

      <div class="hero-actions">
        <button class="enter-btn" on:click={() => currentPage.set('selection')}>Enter booth</button>
        <button class="history-btn" on:click={scrollToHistory}>View Past Strips</button>
      </div>
    </div>

    <div class="booth-stage" aria-hidden="true">
      <div class="booth-glow"></div>
      <div class="photo-booth-shell">
        <div class="shell-header">
          <div>
            <p class="shell-sign">Flashback</p>
            <p class="shell-sub">Studio Preview</p>
          </div>
          <p class="shell-badge">Sample Strips</p>
        </div>

        <div class="showcase-grid">
          <img src={sampleStrip4} alt="Sample strip side" class="sample-strip-img tilt-left" />
          <img src={sampleStrip2} alt="Sample strip side" class="sample-strip-img tilt-right" />
          <img src={sampleStrip1} alt="Sample strip main" class="sample-strip-img main-featured" />
          <img src={sampleStrip3} alt="Sample strip side" class="sample-strip-img tilt-left" />
        </div>

        <div class="control-band">
          <div class="coin-slot"></div>
          <span class="booth-tag">4 shots. 1 strip. Instant keepsake.</span>
          <div class="ready-light"></div>
        </div>
      </div>
    </div>
  </section>

  <section class="history-section" id="recent-strips">
    <div class="history-head">
      <h2 class="history-title">Recent Strips</h2>
      {#if savedStrips.length > 0}
        <button class="clear-history-btn" on:click={clearHistory}>Clear Saved</button>
      {/if}
    </div>

    {#if savedStrips.length === 0}
      <div class="history-empty">
        <p>Your saved photo strips will appear here.</p>
        <button class="empty-cta" on:click={() => currentPage.set('selection')}>Start Session</button>
      </div>
    {:else}
      <div class="history-grid">
        {#each savedStrips as strip}
          <button class="history-card" on:click={() => openSavedStrip(strip)}>
            <img src={strip.dataUrl} alt="Saved strip" class="history-image" />
            <span class="history-time">{formatDate(strip.createdAt)}</span>
          </button>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  .landing-page {
    min-height: 100%;
    display: grid;
    gap: clamp(1.1rem, 2.8vw, 2rem);
    padding-block: clamp(0.5rem, 1.4vw, 1rem);
  }

  .hero-grid {
    position: relative;
    display: grid;
    grid-template-columns: 1fr; /* Mobile first */
    gap: clamp(0.8rem, 2vw, 1.4rem);
    align-items: stretch;
    padding: clamp(1rem, 2.6vw, 2rem);
    border: 3px solid color-mix(in oklch, var(--brick-deep) 60%, var(--ink));
    border-radius: 8px;
    background:
      linear-gradient(120deg, color-mix(in oklch, var(--paper) 92%, var(--sun) 8%) 0 64%, color-mix(in oklch, var(--paper-soft) 70%, var(--teal) 30%) 64% 100%);
    box-shadow:
      0 1px 0 color-mix(in oklch, var(--paper) 85%, var(--ink) 15%) inset,
      0 24px 34px color-mix(in oklch, var(--brick-deep) 24%, transparent);
    overflow: hidden;
    animation: rise 560ms var(--ease-out-expo);
  }

  @media (min-width: 980px) {
    .hero-grid {
      grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
    }
  }

  .hero-grid::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.44;
    background-image: repeating-linear-gradient(
      -30deg,
      color-mix(in oklch, var(--ink) 12%, transparent) 0 1px,
      transparent 1px 15px
    );
  }

  .hero-copy {
    position: relative;
    z-index: 1;
    display: grid;
    align-content: center;
    gap: clamp(0.75rem, 1.7vw, 1.15rem);
    max-width: 58ch;
  }

  .hero-copy > * {
    animation: revealUp 520ms var(--ease-out-quint) both;
  }

  .hero-copy > *:nth-child(1) { animation-delay: 70ms; }
  .hero-copy > *:nth-child(2) { animation-delay: 130ms; }
  .hero-copy > *:nth-child(3) { animation-delay: 180ms; }
  .hero-copy > *:nth-child(4) { animation-delay: 230ms; }
  .hero-copy > *:nth-child(5) { animation-delay: 300ms; }

  .hero-kicker {
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: color-mix(in oklch, var(--teal-deep) 74%, var(--ink));
    font-size: clamp(0.7rem, 1.4vw, 0.9rem);
  }

  .hero-copy h2 {
    font-family: var(--font-body);
    font-weight: 700;
    font-size: clamp(1.7rem, 4.8vw, 3.45rem);
    line-height: 0.94;
    letter-spacing: 0.01em;
    max-width: 16ch;
    color: color-mix(in oklch, var(--brick-deep) 62%, var(--ink));
    text-wrap: balance;
    text-shadow: 0 2px 0 color-mix(in oklch, var(--paper) 34%, transparent);
  }

  .hero-summary {
    font-size: clamp(1.04rem, 2.4vw, 1.32rem);
    line-height: 1.38;
    color: color-mix(in oklch, var(--ink-soft) 70%, var(--ink));
  }

  .hero-delight {
    width: fit-content;
    max-width: 100%;
    border: 2px solid color-mix(in oklch, var(--brick-deep) 52%, var(--ink));
    border-radius: 0;
    background: color-mix(in oklch, var(--sun) 70%, var(--paper));
    color: color-mix(in oklch, var(--brick-deep) 72%, var(--ink));
    font-family: var(--font-ui);
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    padding: 0.25rem 0.55rem;
    transform: rotate(-2deg);
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-top: 0.35rem;
  }

  .enter-btn,
  .history-btn,
  .empty-cta,
  .clear-history-btn {
    border: 2px solid color-mix(in oklch, var(--ink) 32%, var(--paper));
    border-radius: 4px;
    padding: 0.62rem 1.1rem;
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.88rem;
    transition: transform 180ms var(--ease-out-quart), box-shadow 180ms var(--ease-out-quart), background 180ms var(--ease-out-quart);
  }

  .enter-btn,
  .empty-cta {
    background: linear-gradient(180deg, color-mix(in oklch, var(--brick) 86%, var(--paper) 14%), color-mix(in oklch, var(--brick-deep) 82%, var(--ink) 18%));
    color: var(--paper);
    box-shadow: 0 10px 16px color-mix(in oklch, var(--brick-deep) 32%, transparent);
  }

  .history-btn,
  .clear-history-btn {
    background: color-mix(in oklch, var(--paper) 84%, var(--teal) 16%);
    color: color-mix(in oklch, var(--teal-deep) 72%, var(--ink));
  }

  .enter-btn:hover,
  .history-btn:hover,
  .empty-cta:hover,
  .clear-history-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 18px color-mix(in oklch, var(--ink) 18%, transparent);
  }

  .booth-stage {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    order: -1; /* Mobile first */
    animation: rise 640ms 70ms both var(--ease-out-expo);
  }

  @media (min-width: 980px) {
    .booth-stage {
      order: 0;
    }
  }

  .booth-glow {
    position: absolute;
    inset: auto auto 8% 50%;
    transform: translateX(-46%);
    width: min(92%, 360px);
    height: 44%;
    border-radius: 50%;
    background: color-mix(in oklch, var(--sun) 60%, transparent);
    filter: blur(34px);
    opacity: 0.62;
  }

  .photo-booth-shell {
    width: min(380px, 96vw);
    transform: rotate(0.6deg); /* Mobile first */
    border-radius: 12px;
    border: 3px solid color-mix(in oklch, var(--brick-deep) 60%, var(--ink));
    background: linear-gradient(135deg, color-mix(in oklch, var(--paper) 95%, var(--sun) 5%), color-mix(in oklch, var(--paper-soft) 80%, var(--sun) 20%));
    box-shadow: 
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      0 20px 30px -10px color-mix(in oklch, var(--ink) 40%, transparent);
    padding: 1.25rem;
    position: relative;
    /* Optional hovering effect */
    animation: boothBreath 5600ms ease-in-out infinite;
  }

  @media (min-width: 980px) {
    .photo-booth-shell {
      transform: rotate(0deg);
    }
  }

  .shell-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.8rem;
    color: var(--ink);
  }

  .shell-sign {
    font-family: 'Cormorant Garamond', var(--font-body);
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 1.45rem;
    font-weight: 400;
    line-height: 1;
  }

  .shell-sub {
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.55rem;
    color: currentColor;
    opacity: 0.75;
    margin-top: 0.35rem;
  }

  .shell-badge {
    background: var(--ink);
    color: var(--paper);
    border-radius: 3px;
    padding: 0.25rem 0.5rem;
    font-family: var(--font-ui);
    text-transform: uppercase;
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    box-shadow: 0 2px 5px color-mix(in oklch, var(--ink) 40%, transparent);
  }

  .showcase-grid {
    background: color-mix(in oklch, var(--ink) 95%, var(--brick-deep));
    border-radius: 8px;
    padding: 2.5rem 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.75rem;
    border: 2px solid color-mix(in oklch, var(--ink) 80%, var(--brick-deep));
    box-shadow: inset 0 4px 12px rgba(0,0,0,0.4);
    overflow: hidden;
  }

  .sample-strip-img {
    width: auto;
    border-radius: 2px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    background: var(--paper);
  }

  .main-featured {
    height: 280px;
    z-index: 2;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  .tilt-left {
    height: 270px;
    transform: rotate(-6deg) translateY(12px);
    z-index: 1;
  }

  .tilt-right {
    height: 290px;
    transform: rotate(4deg) translateY(18px);
    z-index: 1;
  }

  .control-band {
    margin-top: 1rem;
    background: color-mix(in oklch, var(--paper-soft) 40%, transparent);
    border-radius: 99px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.8rem;
    box-shadow: 
      inset 0 2px 5px color-mix(in oklch, var(--ink) 15%, transparent),
      0 1px 0 rgba(255, 255, 255, 0.5);
    border: 1px solid color-mix(in oklch, var(--ink) 12%, transparent);
  }

  .coin-slot {
    width: 24px;
    height: 6px;
    background: color-mix(in oklch, var(--ink) 95%, var(--metal));
    border-radius: 4px;
    box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.8), 0 1px 0 rgba(255, 255, 255, 0.4);
  }

  .booth-tag {
    font-family: var(--font-ui);
    font-size: 0.5rem;
    font-weight: 600;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--ink-soft);
  }

  .ready-light {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--brick);
    box-shadow: 0 0 8px var(--brick);
    border: 1px solid color-mix(in oklch, var(--brick-deep) 80%, black);
    animation: readyBlink 1450ms ease-in-out infinite;
  }

  .history-section {
    position: relative;
    border: 2px solid color-mix(in oklch, var(--ink) 30%, var(--paper));
    border-radius: 8px;
    background: linear-gradient(178deg, color-mix(in oklch, var(--paper) 92%, var(--sun) 8%), color-mix(in oklch, var(--paper-soft) 80%, var(--teal) 20%));
    padding: clamp(0.9rem, 2vw, 1.3rem);
    box-shadow: 0 16px 24px color-mix(in oklch, var(--ink) 14%, transparent);
    animation: rise 640ms 140ms both var(--ease-out-quint);
  }

  .history-section::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.2;
    background-image: repeating-linear-gradient(15deg, color-mix(in oklch, var(--ink) 12%, transparent) 0 1px, transparent 1px 14px);
  }

  .history-head {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .history-title {
    font-size: clamp(1.35rem, 3.8vw, 2.4rem);
    line-height: 0.94;
    color: color-mix(in oklch, var(--brick-deep) 64%, var(--ink));
  }

  .history-empty {
    position: relative;
    z-index: 1;
    display: grid;
    gap: 0.7rem;
    border: 1px dashed color-mix(in oklch, var(--teal-deep) 44%, var(--paper));
    border-radius: 6px;
    padding: 1rem;
    color: color-mix(in oklch, var(--ink-soft) 76%, var(--ink));
  }

  .history-grid {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 0.75rem;
  }

  .history-card {
    display: grid;
    gap: 0.45rem;
    text-align: left;
    border: 1px solid color-mix(in oklch, var(--ink) 22%, var(--paper));
    border-radius: 6px;
    padding: 0.45rem;
    background: color-mix(in oklch, var(--paper) 92%, var(--teal) 8%);
    box-shadow: 0 7px 12px color-mix(in oklch, var(--ink) 12%, transparent);
    transition: transform 180ms var(--ease-out-quart), box-shadow 180ms var(--ease-out-quart);
  }

  .history-card:hover {
    transform: translateY(-2px) rotate(-0.7deg);
    box-shadow: 0 12px 18px color-mix(in oklch, var(--ink) 18%, transparent);
  }

  .history-image {
    width: 100%;
    aspect-ratio: 1 / 1.6;
    object-fit: cover;
    border-radius: 3px;
    border: 1px solid color-mix(in oklch, var(--ink) 16%, var(--paper));
    background: color-mix(in oklch, var(--paper-soft) 84%, var(--ink));
  }

  .history-time {
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.09em;
    font-size: 0.69rem;
    color: color-mix(in oklch, var(--ink-soft) 76%, var(--ink));
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(12px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes revealUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes readyBlink {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }

    50% {
      opacity: 0.72;
      transform: scale(0.86);
    }
  }

  @keyframes boothBreath {
    0%,
    100% {
      transform: rotate(0.6deg) translateY(0); /* Mobile */
    }

    50% {
      transform: rotate(0.2deg) translateY(-3px); /* Mobile */
    }
  }

  @media (min-width: 980px) {
    @keyframes boothBreath {
      0%,
      100% {
        transform: translateX(8%) rotate(1.2deg) translateY(0);
      }

      50% {
        transform: translateX(8%) rotate(0.8deg) translateY(-3px);
      }
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-copy > *,
    .photo-booth-shell,
    .sample-strip-img,
    .ready-light {
      animation: none;
      transition: none;
    }
  }
</style>
