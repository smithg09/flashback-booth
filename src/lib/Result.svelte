<script>
  import { onDestroy, onMount } from 'svelte';
  import { currentPage, currentResultId, finalStrip, photos } from './store.js';
  import { getStripById } from './strip-db.js';

  let toastMessage = '';
  let toastTimer;
  let confettiTimer;
  let celebrate = true;
  let confettiPieces = [];
  let celebrationNote = '';

  const celebrationLines = [
    'Fresh out of the booth. Certified fridge-door material.',
    'Four frames, one tiny time capsule.',
    'Nostalgia processed successfully. No retakes required.',
    'Proof that your camera roll still has classics left in it.'
  ];

  function buildConfettiPieces() {
    return Array.from({ length: 16 }, (_, index) => ({
      id: index,
      x: Math.round(8 + Math.random() * 84),
      delay: Math.round(Math.random() * 320),
      drift: Math.round(-24 + Math.random() * 48),
      rot: Math.round(-28 + Math.random() * 56),
      tone: index % 2 === 0 ? 'var(--teal)' : 'var(--brick)'
    }));
  }

  onMount(async () => {
    const now = new Date();
    celebrationNote = celebrationLines[(now.getDate() + now.getMonth()) % celebrationLines.length];
    confettiPieces = buildConfettiPieces();
    confettiTimer = setTimeout(() => {
      celebrate = false;
    }, 1300);

    if ($finalStrip || !$currentResultId) return;

    try {
      const strip = await getStripById($currentResultId);
      if (strip?.dataUrl) {
        finalStrip.set(strip.dataUrl);
      } else {
        currentPage.set('landing');
      }
    } catch (error) {
      currentPage.set('landing');
    }
  });

  onDestroy(() => {
    clearTimeout(toastTimer);
    clearTimeout(confettiTimer);
  });

  function showToast(message) {
    toastMessage = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage = '';
    }, 2200);
  }

  function downloadStrip() {
    if (!$finalStrip) return;
    const link = document.createElement('a');
    link.download = 'flashback-strip.png';
    link.href = $finalStrip;
    link.click();
  }

  function printStrip() {
    if (!$finalStrip) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup blocked. Please allow popups to print.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Flashback Strip</title>
          <style>
            body {
              margin: 0;
              min-height: 100vh;
              display: grid;
              place-items: center;
              background: #110022;
            }
            img {
              max-height: 95vh;
              box-shadow: 0 12px 26px rgba(0, 0, 0, 0.2);
            }
          </style>
        </head>
        <body>
          <img src="${$finalStrip}" alt="Photobooth strip" />
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  }

  async function shareStrip() {
    if (!$finalStrip) return;

    if (navigator.share && navigator.canShare) {
      try {
        const response = await fetch($finalStrip);
        const blob = await response.blob();
        const file = new File([blob], 'flashback-strip.png', { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'My Flashback Booth strip'
          });
          showToast('Shared successfully.');
          return;
        }
      } catch (error) {
        // Fallback handled below.
      }
    }

    await fallbackShare();
  }

  async function fallbackShare() {
    const shareLink = $currentResultId
      ? `${window.location.origin}${window.location.pathname}#/result/${$currentResultId}`
      : window.location.href;

    try {
      await navigator.clipboard.writeText(shareLink);
      showToast('Share link copied to clipboard.');
    } catch (error) {
      showToast('Share is not available in this browser.');
    }
  }

  function restart() {
    photos.set([]);
    finalStrip.set(null);
    currentResultId.set(null);
    currentPage.set('landing');
  }
</script>

<div class="result-page">
  <header class="pickup-header">
    <p class="pickup-kicker">Ready For Pickup</p>
    <h2>Your strip is printed and saved</h2>
    <p class="celebration-note">{celebrationNote}</p>
    {#if $currentResultId}
      <p class="pickup-id">Strip ID: {$currentResultId}</p>
    {/if}
  </header>

  <div class="result-layout">
    <section class="strip-stage">
      <div class="pin pin-left"></div>
      <div class="pin pin-right"></div>

      {#if celebrate}
        <div class="confetti-layer" aria-hidden="true">
          {#each confettiPieces as piece}
            <span
              class="confetti-dot"
              style={`--x: ${piece.x}%; --delay: ${piece.delay}ms; --drift: ${piece.drift}px; --rot: ${piece.rot}deg; --tone: ${piece.tone};`}
            ></span>
          {/each}
        </div>
      {/if}

      {#if $finalStrip}
        <img src={$finalStrip} alt="Completed photobooth strip" class="strip-image" />
      {:else}
        <div class="strip-placeholder">Loading strip...</div>
      {/if}
    </section>

    <section class="action-panel">
      <p class="panel-copy">Save it, print it, or share your strip with one tap.</p>

      <button class="action-btn action-primary" on:click={downloadStrip}>Download PNG</button>
      <button class="action-btn" on:click={printStrip}>Print Strip</button>
      <button class="action-btn" on:click={shareStrip}>Share</button>

      <button class="restart-btn" on:click={restart}>Back to lobby</button>
    </section>
  </div>

  {#if toastMessage}
    <div class="toast" role="status">{toastMessage}</div>
  {/if}
</div>

<style>
  .result-page {
    min-height: 100%;
    display: grid;
    align-content: center;
    gap: clamp(0.9rem, 2.2vw, 1.4rem);
    padding-block: clamp(0.7rem, 1.8vw, 1.2rem);
    animation: resultIn 520ms var(--ease-out-expo) both;
  }

  .pickup-header,
  .result-layout {
    border: 2px solid color-mix(in oklch, var(--ink) 28%, var(--paper));
    border-radius: 8px;
    background: color-mix(in oklch, var(--paper) 92%, var(--sun) 8%);
    box-shadow: 0 16px 24px color-mix(in oklch, var(--ink) 14%, transparent);
    animation: panelIn 540ms var(--ease-out-quint) both;
  }

  .pickup-header {
    position: relative;
    display: grid;
    gap: 0.32rem;
    padding: clamp(0.95rem, 2vw, 1.25rem);
    overflow: hidden;
  }

  .pickup-header::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.24;
    background-image: repeating-linear-gradient(
      -25deg,
      color-mix(in oklch, var(--ink) 13%, transparent) 0 1px,
      transparent 1px 15px
    );
  }

  .pickup-header > * {
    position: relative;
    z-index: 1;
  }

  .result-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.76fr);
    gap: clamp(0.82rem, 2.2vw, 1.3rem);
    padding: clamp(0.9rem, 2vw, 1.3rem);
    animation-delay: 80ms;
  }

  .pickup-kicker {
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: color-mix(in oklch, var(--teal-deep) 72%, var(--ink));
    font-size: 0.74rem;
  }

  h2 {
    font-size: clamp(1.8rem, 5vw, 3.1rem);
    line-height: 0.88;
    color: color-mix(in oklch, var(--brick-deep) 66%, var(--ink));
    text-wrap: balance;
  }

  .pickup-id {
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.72rem;
    color: color-mix(in oklch, var(--ink-soft) 74%, var(--ink));
  }

  .celebration-note {
    width: fit-content;
    max-width: 100%;
    border: 1px dashed color-mix(in oklch, var(--teal-deep) 40%, var(--paper));
    border-radius: 4px;
    background: color-mix(in oklch, var(--paper) 86%, var(--teal) 14%);
    color: color-mix(in oklch, var(--teal-deep) 80%, var(--ink));
    padding: 0.26rem 0.62rem;
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.62rem;
  }

  .strip-stage {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 340px;
    padding: clamp(0.85rem, 2vw, 1.25rem);
    border: 2px dashed color-mix(in oklch, var(--ink) 24%, var(--paper));
    border-radius: 6px;
    background: linear-gradient(168deg, color-mix(in oklch, var(--paper) 84%, var(--teal) 16%), color-mix(in oklch, var(--paper) 76%, var(--sun) 24%));
    overflow: hidden;
  }

  .confetti-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .confetti-dot {
    position: absolute;
    left: var(--x);
    top: -16px;
    width: 8px;
    height: 12px;
    border-radius: 2px;
    background: color-mix(in oklch, var(--tone) 74%, var(--paper));
    animation: confettiDrop 900ms var(--ease-out-quint) forwards;
    animation-delay: var(--delay);
  }

  .pin {
    position: absolute;
    top: 10px;
    width: 14px;
    aspect-ratio: 1;
    border-radius: 50%;
    border: 1px solid color-mix(in oklch, var(--brick-deep) 60%, var(--ink));
    background: color-mix(in oklch, var(--brick) 76%, var(--paper));
  }

  .pin-left {
    left: 20px;
  }

  .pin-right {
    right: 20px;
  }

  .strip-image {
    max-height: min(68vh, 640px);
    width: auto;
    border-radius: 4px;
    box-shadow: 0 20px 28px color-mix(in oklch, var(--ink) 24%, transparent);
    transform: rotate(-2.1deg);
    transition: transform 220ms var(--ease-out-quint);
    animation: stripDrop 600ms 120ms var(--ease-out-expo) both;
  }

  .strip-image:hover {
    transform: rotate(-0.8deg) translateY(-3px);
  }

  .strip-placeholder {
    width: min(220px, 100%);
    aspect-ratio: 1 / 1.7;
    display: grid;
    place-items: center;
    border: 1px dashed color-mix(in oklch, var(--ink) 24%, var(--paper));
    border-radius: 6px;
    color: color-mix(in oklch, var(--ink-soft) 74%, var(--ink));
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.7rem;
  }

  .action-panel {
    display: grid;
    align-content: start;
    gap: 0.56rem;
  }

  .panel-copy {
    color: color-mix(in oklch, var(--ink-soft) 74%, var(--ink));
    line-height: 1.34;
  }

  .action-btn,
  .restart-btn {
    border: 2px solid color-mix(in oklch, var(--ink) 20%, var(--paper));
    border-radius: 5px;
    padding: 0.63rem 0.82rem;
    text-align: left;
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.8rem;
    background: color-mix(in oklch, var(--paper) 92%, var(--sun) 8%);
    color: var(--ink);
    transition: transform 170ms var(--ease-out-quart), box-shadow 170ms var(--ease-out-quart);
  }

  .action-btn:hover,
  .restart-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 14px color-mix(in oklch, var(--ink) 14%, transparent);
  }

  .action-btn:active,
  .restart-btn:active {
    transform: scale(0.985);
  }

  .action-primary {
    background: linear-gradient(180deg, color-mix(in oklch, var(--brick) 86%, var(--paper)), color-mix(in oklch, var(--brick-deep) 74%, var(--ink)));
    color: var(--paper);
  }

  .restart-btn {
    margin-top: 0.25rem;
    background: color-mix(in oklch, var(--paper) 84%, var(--teal) 16%);
    color: color-mix(in oklch, var(--teal-deep) 78%, var(--ink));
  }

  .toast {
    position: fixed;
    left: 50%;
    bottom: 22px;
    transform: translateX(-50%);
    border: 1px solid color-mix(in oklch, var(--ink) 26%, var(--paper));
    border-radius: 3px;
    background: color-mix(in oklch, var(--paper) 80%, var(--teal) 20%);
    color: color-mix(in oklch, var(--teal-deep) 76%, var(--ink));
    padding: 0.54rem 0.9rem;
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.09em;
    font-size: 0.7rem;
    box-shadow: 0 10px 16px color-mix(in oklch, var(--ink) 16%, transparent);
    z-index: 20;
    animation: toastIn 220ms var(--ease-out-quart);
  }

  @keyframes resultIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes panelIn {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.994);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes stripDrop {
    from {
      opacity: 0;
      transform: rotate(-3deg) translateY(10px) scale(0.98);
    }

    to {
      opacity: 1;
      transform: rotate(-2.1deg) translateY(0) scale(1);
    }
  }

  @keyframes toastIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(8px);
    }

    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @keyframes confettiDrop {
    from {
      opacity: 0;
      transform: translateY(-4px) rotate(0deg);
    }

    12% {
      opacity: 1;
    }

    to {
      opacity: 0;
      transform: translateY(210px) translateX(var(--drift)) rotate(var(--rot));
    }
  }

  @media (max-width: 850px) {
    .result-layout {
      grid-template-columns: 1fr;
    }

    .action-btn,
    .restart-btn {
      text-align: center;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .strip-image,
    .toast,
    .confetti-dot {
      animation: none;
      transition: none;
    }
  }
</style>
