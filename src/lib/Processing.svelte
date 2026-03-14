<script>
  import { onDestroy, onMount } from 'svelte';
  import { currentPage, currentResultId, photos, finalStrip, selectedFilter, selectedFrame, customEmoji, customColor, customText } from './store.js';
  import { saveStrip } from './strip-db.js';
  import { generateStripDataUrl } from './strip-renderer.js';

  const totalSeconds = 5;
  const loadingMessages = [
    'Warming chemical baths and calibrating contrast.',
    'Aligning frame perforations and leveling highlights.',
    'Dusting off nostalgia grain for that analog edge.',
    'Sealing the strip for pockets, fridges, and scrapbooks.'
  ];

  let secondsLeft = totalSeconds;
  let stripReady = false;
  let countdownHandle;
  let loadingHandle;
  let loadingIndex = 0;
  let loadingMessage = loadingMessages[0];
  let disposed = false;

  $: progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  onMount(async () => {
    if ($photos.length === 0) {
      currentPage.set('selection');
      return;
    }

    const countdownPromise = new Promise((resolve) => {
      countdownHandle = setInterval(() => {
        secondsLeft = Math.max(0, secondsLeft - 1);
        if (secondsLeft === 0) {
          clearInterval(countdownHandle);
          resolve();
        }
      }, 1000);
    });

    loadingHandle = setInterval(() => {
      if (stripReady) return;
      loadingIndex = (loadingIndex + 1) % loadingMessages.length;
      loadingMessage = loadingMessages[loadingIndex];
    }, 1400);

    try {
      const stripUrl = await generateStripDataUrl({
        photos: $photos,
        selectedFilter: $selectedFilter,
        selectedFrame: $selectedFrame,
        customEmoji: $customEmoji,
        customColor: $customColor,
        footerLabel: $customText
      });

      if (!stripUrl) {
        throw new Error('Strip generation returned no image data');
      }

      if (disposed) return;

      finalStrip.set(stripUrl);
      const savedId = await saveStrip(stripUrl);
      currentResultId.set(savedId ?? null);
      stripReady = true;
      loadingMessage = 'Strip generated and archived. Sending to pickup counter.';

      await countdownPromise;
      if (!disposed) {
        currentPage.set('result');
      }
    } catch (error) {
      clearInterval(countdownHandle);
      clearInterval(loadingHandle);
      alert('Error while processing photos. Please try again.');
      if (!disposed) {
        currentPage.set('selection');
      }
    }
  });

  onDestroy(() => {
    disposed = true;
    clearInterval(countdownHandle);
    clearInterval(loadingHandle);
  });
</script>

<div class="processing-page">
  <div class="theatrical-container">
    <div class="info-section">
      <div class="kicker-group">
        <span class="status-indicator">
          <span class="pulse-dot"></span>
          Darkroom Active
        </span>
      </div>
      
      <h2 class="title">
        <span class="title-line">Developing</span>
        <span class="title-line indented">Your Strip</span>
      </h2>

      <div class="progress-steps" aria-hidden="true">
        <div class="step" class:active={progress >= 5}>
          <div class="step-num">01</div>
          <div class="step-name">Chemical Bath</div>
          <div class="step-bar"></div>
        </div>
        <div class="step" class:active={progress >= 35}>
          <div class="step-num">02</div>
          <div class="step-name">Exposure</div>
          <div class="step-bar"></div>
        </div>
        <div class="step" class:active={progress >= 50}>
          <div class="step-num">03</div>
          <div class="step-name">Fixing</div>
          <div class="step-bar"></div>
        </div>
        <div class="step" class:active={progress >= 70}>
          <div class="step-num">04</div>
          <div class="step-name">Dispense</div>
          <div class="step-bar"></div>
        </div>
      </div>

      {#if progress >= 75}
        <div class="output-log" aria-live="polite">
          <span class="log-cursor">&gt;</span> {loadingMessage}
        </div>
      {/if}
    </div>

    <div class="machine-section" aria-hidden="true">
      <div class="timer-giant">{secondsLeft}</div>
      <div class="chute-wrapper">
        <div class="roller-assembly top">
          <div class="roller gear-ccw"></div>
          <div class="roller gear-cw"></div>
        </div>
        
        <div class="chute-window">
          <div class="liquid-wash" style="transform: translateY({100 - progress}%);"></div>
          
          <div class="strip-animation" style="transform: translate(-50%, calc(-120% + {progress * 1.5}%));">
            <div class="strip-body">
              <div class="strip-photo"></div>
              <div class="strip-photo"></div>
              <div class="strip-photo"></div>
              <div class="strip-photo"></div>
            </div>
          </div>
        </div>
        
        <div class="roller-assembly bottom">
          <div class="roller gear-ccw"></div>
          <div class="roller gear-cw"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .processing-page {
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(1.5rem, 4vw, 4rem);
    animation: fadeIn 600ms var(--ease-out-expo) both;
  }

  .theatrical-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: clamp(2rem, 8vw, 8rem);
    width: 100%;
    max-width: 1300px;
    align-items: center;
  }

  @media (max-width: 900px) {
    .theatrical-container {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto;
      gap: 3rem;
    }
  }

  .info-section {
    display: flex;
    flex-direction: column;
    gap: clamp(1.5rem, 4vw, 2.8rem);
    z-index: 2;
  }

  .status-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.85rem;
    color: var(--teal-deep);
    padding: 0.5rem 1rem;
    background: color-mix(in oklch, var(--teal) 15%, transparent);
    border: 1px solid color-mix(in oklch, var(--teal) 30%, transparent);
    border-radius: 999px;
    box-shadow: 0 4px 12px color-mix(in oklch, var(--teal) 15%, transparent);
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--brick);
    animation: pulse-op 1.5s ease-in-out infinite;
  }

  .title {
    display: flex;
    flex-direction: column;
    line-height: 0.82;
    margin: 0;
    color: var(--brick-deep);
  }

  .title-line {
    font-family: var(--font-display);
    font-size: clamp(3.2rem, 7vw, 6rem);
    letter-spacing: -0.02em;
    text-transform: uppercase;
  }

  .title-line.indented {
    padding-left: clamp(2rem, 6vw, 5rem);
    color: color-mix(in oklch, var(--ink) 85%, var(--brick-deep));
    font-family: var(--font-body);
    font-style: italic;
    text-transform: none;
    font-size: clamp(3.8rem, 8vw, 7rem);
    margin-top: -0.1em;
  }

  .progress-steps {
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
    margin-top: 0.5rem;
  }

  .step {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 1.2rem;
    opacity: 0.35;
    transition: opacity 0.5s ease, transform 0.5s var(--ease-out-quart);
    transform: translateX(-15px);
  }

  .step.active {
    opacity: 1;
    transform: translateX(0);
  }

  .step-num {
    font-family: var(--font-ui);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--teal-deep);
    border: 1px solid color-mix(in oklch, var(--teal) 40%, transparent);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    background: color-mix(in oklch, var(--teal) 10%, transparent);
  }

  .step-name {
    font-family: var(--font-ui);
    text-transform: uppercase;
    font-size: 1.4rem;
    letter-spacing: 0.1em;
    color: var(--ink);
  }

  .step-bar {
    grid-column: 1 / -1;
    height: 1px;
    background: color-mix(in oklch, var(--ink) 12%, transparent);
    margin-top: -0.4rem;
    position: relative;
    overflow: hidden;
  }

  .step-bar::after {
    content: '';
    position: absolute;
    top: 0; left: 0; bottom: 0;
    width: 100%;
    background: var(--teal);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.8s var(--ease-out-quint);
  }

  .step.active .step-bar::after {
    transform: scaleX(1);
  }

  .output-log {
    font-family: monospace, var(--font-ui);
    font-size: 0.95rem;
    color: var(--ink-soft);
    background: color-mix(in oklch, var(--paper-soft) 60%, transparent);
    padding: 1.2rem;
    border-left: 3px solid var(--brick);
    line-height: 1.6;
    box-shadow: 0 8px 16px color-mix(in oklch, var(--ink) 5%, transparent);
  }

  .log-cursor {
    color: var(--brick);
    font-weight: bold;
    margin-right: 0.4rem;
    animation: blink 1s step-end infinite;
  }

  .machine-section {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    min-height: clamp(400px, 60vh, 700px);
  }

  .timer-giant {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: var(--font-display);
    font-size: clamp(14rem, 28vw, 24rem);
    color: color-mix(in oklch, var(--teal) 12%, transparent);
    z-index: 0;
    line-height: 1;
    pointer-events: none;
  }

  .chute-wrapper {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    filter: drop-shadow(0 24px 48px color-mix(in oklch, var(--ink) 20%, transparent));
  }

  .roller-assembly {
    display: flex;
    gap: 4px;
    background: color-mix(in oklch, var(--ink) 90%, var(--paper));
    padding: 6px;
    border-radius: 6px;
    border: 2px solid color-mix(in oklch, var(--ink) 60%, var(--paper));
    z-index: 2;
    box-shadow: inset 0 2px 6px color-mix(in oklch, var(--ink) 50%, transparent);
  }

  .roller {
    width: 60px;
    height: 24px;
    background: repeating-linear-gradient(90deg, 
      color-mix(in oklch, var(--ink) 70%, var(--paper)) 0px, 
      color-mix(in oklch, var(--ink) 70%, var(--paper)) 4px, 
      color-mix(in oklch, var(--ink) 85%, var(--paper)) 4px, 
      color-mix(in oklch, var(--ink) 85%, var(--paper)) 8px
    );
    border-radius: 3px;
    border: 1px solid var(--ink);
  }

  .gear-cw { animation: scroll-x 1.2s linear infinite; }
  .gear-ccw { animation: scroll-x-reverse 1.2s linear infinite; }

  .chute-window {
    width: 132px;
    height: clamp(320px, 45vh, 500px);
    background: color-mix(in oklch, var(--ink) 95%, var(--paper));
    position: relative;
    overflow: hidden;
    border-left: 3px solid color-mix(in oklch, var(--ink) 75%, var(--paper));
    border-right: 3px solid color-mix(in oklch, var(--ink) 75%, var(--paper));
    box-shadow: inset 0 0 40px color-mix(in oklch, var(--ink) 90%, transparent);
  }

  .liquid-wash {
    position: absolute;
    inset: -10% -10% -10% -10%;
    background: linear-gradient(0deg, var(--teal) 0%, transparent 100%);
    opacity: 0.25;
    transition: transform 1s ease-in-out;
    mix-blend-mode: screen;
    z-index: 2;
    pointer-events: none;
  }

  .strip-animation {
    position: absolute;
    left: 50%;
    top: 5%;
    width: 104px;
    transition: transform 1s linear;
  }

  .strip-body {
    width: 100%;
    padding: 6px;
    display: grid;
    justify-items: center;
    gap: 4px;
    border: 1px solid color-mix(in oklch, var(--ink) 25%, var(--paper));
    background: color-mix(in oklch, var(--paper) 95%, var(--ink));
    box-shadow: 0 10px 20px color-mix(in oklch, var(--ink) 40%, transparent);
  }

  .strip-photo {
    width: 86px;
    height: 110px;
    border: 1px solid color-mix(in oklch, var(--ink) 18%, var(--paper));
    border-radius: 2px;
    background: linear-gradient(145deg, color-mix(in oklch, var(--teal) 34%, var(--ink)), color-mix(in oklch, var(--brick) 40%, var(--ink)));
    opacity: 0.4;
    animation: photoDevelop 1.5s ease forwards;
  }

  .strip-photo:nth-child(1) { animation-delay: 0.3s; }
  .strip-photo:nth-child(2) { animation-delay: 0.7s; }
  .strip-photo:nth-child(3) { animation-delay: 1.1s; }
  .strip-photo:nth-child(4) { animation-delay: 1.5s; }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes pulse-op {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
  }

  @keyframes blink {
    50% { opacity: 0; }
  }

  @keyframes scroll-x {
    from { background-position: 0 0; }
    to { background-position: 16px 0; }
  }

  @keyframes scroll-x-reverse {
    from { background-position: 0 0; }
    to { background-position: -16px 0; }
  }

  @keyframes photoDevelop {
    from {
      opacity: 0.3;
      filter: saturate(0.2) contrast(0.8);
    }
    to {
      opacity: 1;
      filter: saturate(1.2) contrast(1.1);
      background: var(--paper-soft); /* simulate revealing image */
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .processing-page,
    .roller,
    .pulse-dot,
    .log-cursor,
    .strip-animation,
    .step-bar::after,
    .strip-photo {
      animation: none;
      transition: none;
    }
    .strip-photo {
      opacity: 1;
      background: var(--paper-soft);
    }
  }
</style>
