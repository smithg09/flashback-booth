<script>
  import { onDestroy } from 'svelte';
  import { currentPage, selectedFilter, selectedFrame, photos, customEmoji, customColor, customText } from './store.js';
  import { createMockPhotoDataUrls, generateStripDataUrl } from './strip-renderer.js';

  let video;
  let canvas;
  let fileInput;
  let stream;
  let countdownTimer;
  let queuedTimeout;

  const frames = [
    { id: 'film-strip', name: 'Film Strip', icon: 'ph-fill ph-film-strip', note: 'Analog perforations down both sides.' },
    { id: 'custom', name: 'Custom', icon: 'ph-fill ph-smiley', note: 'Stamp your own favorite emoji along the frame edge!' },
    { id: 'simple-white', name: 'Classic White', icon: 'ph-fill ph-app-window', note: 'Clean portrait strips with no decoration.' },
    { id: 'simple-black', name: 'Noir', icon: 'ph-fill ph-app-window', note: 'Dark frame for dramatic high contrast looks.' },
    { id: 'polaroid', name: 'Vintage', icon: 'ph-fill ph-camera', note: 'Warm paper tint with retro softness.' },
    { id: 'hearts', name: 'Hearts', icon: 'ph-fill ph-heart', note: 'Playful accents around each shot.' },
    { id: 'sparkles', name: 'Sparkles', icon: 'ph-fill ph-sparkle', note: 'Party-ready stars and highlights.' },
    { id: 'sketchy', name: 'Sketchy', icon: 'ph-fill ph-pencil-simple', note: 'Hand-drawn border style for casual vibes.' },
    { id: 'cyber', name: 'Cyber Glitch', icon: 'ph-fill ph-alien', note: 'Neon edges and dark sci-fi backdrop.' },
    { id: 'floral', name: 'Botanical', icon: 'ph-fill ph-plant', note: 'Soft borders with tiny leaf accents.' },
    { id: 'arcade', name: '8-Bit Arcade', icon: 'ph-fill ph-game-controller', note: 'Pixelated decorations and bright colors.' },
    { id: 'postage', name: 'Postage Mail', icon: 'ph-fill ph-envelope-simple', note: 'Looks like rare vintage stamps.' },
    { id: 'notepad', name: 'Grid Notepad', icon: 'ph-fill ph-notepad', note: 'Lined paper with casual scribbles.' },
  ];

  const previewPlaceholders = createMockPhotoDataUrls(4);

  let currentFrameIndex = 0;
  let inlineMode = 'preview'; // preview | camera | review
  let countdown = null;
  let shooting = false;
  let count = 0;
  const totalShots = 4;
  let flash = false;
  let cameraReady = false;
  let uploadThumbs = [];
  let previewStripUrl = '';
  let previewBuildToken = 0;
  let delightLine = 'Pick your frame, then run a quick rehearsal.';
  let delightTimer;
  let delightIndex = 0;

  const delightByMode = {
    preview: [
      'Pick your frame, then run a quick rehearsal.',
      'Tip: Color for party glow, B&W for album-cover mood.',
      'Frame first, filter second, then lock in your best pose.'
    ],
    camera: [
      'Camera live. Hold steady between countdown beeps.',
      'Every shot saves automatically, so keep the energy up.',
      'Try one serious face, one chaotic face, then repeat.'
    ],
    upload: [
      'Upload up to four shots and we will build a matching strip.',
      'Landscape images are auto-cropped, so center your subject.',
      'Need a different look? Pick new files anytime.'
    ]
  };

  const frameReactions = {
    'simple-white': 'Clean and timeless. Looks great in every room.',
    'simple-black': 'Moody and cinematic. Perfect for dramatic faces.',
    'film-strip': 'Peak nostalgia. Arcade-night approved.',
    polaroid: 'Warm and dreamy. Instant throwback feel.',
    hearts: 'Soft chaos. Good for date-night strips.',
    sparkles: 'Party mode activated. Shine is guaranteed.',
    sketchy: 'Messy in the best way. Very indie-zine.'
  };

  $selectedFrame = frames[currentFrameIndex].id;
  $: activeFrame = frames[currentFrameIndex];
  $: frameReaction = frameReactions[$selectedFrame] ?? 'Iconic choice.';
  $: cameraTip =
    inlineMode === 'camera'
      ? count === 0
        ? 'Opening shot: hold a confident pose for one beat.'
        : count === totalShots - 1
          ? 'Final shot. Give it the most expressive look.'
          : 'Keep changing expressions so each panel feels different.'
      : '';

  $: {
    clearInterval(delightTimer);
    delightIndex = 0;
    const lines = delightByMode[inlineMode] ?? delightByMode.preview;
    delightLine = lines[delightIndex] ?? '';

    if (lines.length > 1) {
      delightTimer = setInterval(() => {
        delightIndex = (delightIndex + 1) % lines.length;
        delightLine = lines[delightIndex];
      }, 2200);
    }
  }

  $: if (inlineMode !== 'camera') {
    const sourcePhotos = inlineMode === 'review' && uploadThumbs.length > 0
      ? uploadThumbs
      : previewPlaceholders;

    // Depend explicitly on stores so preview updates dynamically
    const currentFrame = $selectedFrame;
    const currentFilter = $selectedFilter;
    const currentEmoji = $customEmoji;
    const currentColor = $customColor;
    const currentText = $customText;
    
    const currentToken = ++previewBuildToken;

    generateStripDataUrl({
      photos: sourcePhotos,
      selectedFilter: currentFilter,
      selectedFrame: currentFrame,
      customEmoji: currentEmoji,
      customColor: currentColor,
      footerLabel: currentText || 'PREVIEW'
    })
      .then((stripUrl) => {
        if (currentToken !== previewBuildToken) return;
        previewStripUrl = stripUrl ?? '';
      })
      .catch(() => {
        if (currentToken !== previewBuildToken) return;
        previewStripUrl = '';
      });
  }

  function nextFrame() {
    currentFrameIndex = (currentFrameIndex + 1) % frames.length;
    $selectedFrame = frames[currentFrameIndex].id;
  }

  function prevFrame() {
    currentFrameIndex = (currentFrameIndex - 1 + frames.length) % frames.length;
    $selectedFrame = frames[currentFrameIndex].id;
  }

  function setFilter(filterId) {
    $selectedFilter = filterId;
  }

  function goBack() {
    stopCamera();
    currentPage.set('landing');
  }

  async function startInlineCapture() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Camera capture is not available in this browser.');
      return;
    }

    inlineMode = 'camera';
    uploadThumbs = [];
    cameraReady = false;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      video.srcObject = stream;
      await video.play();
      cameraReady = true;
      startSequence();
    } catch (err) {
      stopCamera();
      alert('Please allow camera access to take photos.');
      inlineMode = 'preview';
    }
  }

  function startSequence() {
    shooting = true;
    count = 0;
    photos.set([]);
    nextShot();
  }

  function nextShot() {
    if (inlineMode !== 'camera') return;

    if (count >= totalShots) {
      finishToProcessing();
      return;
    }

    countdown = 3;
    clearInterval(countdownTimer);

    countdownTimer = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) {
        clearInterval(countdownTimer);
        takePhoto();
      }
    }, 1000);
  }

  function takePhoto() {
    if (!video?.videoWidth || !video?.videoHeight) {
      return;
    }

    flash = true;
    setTimeout(() => (flash = false), 180);

    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    photos.update((existing) => [...existing, dataUrl]);

    count += 1;
    clearTimeout(queuedTimeout);
    if (count < totalShots) {
      queuedTimeout = setTimeout(nextShot, 900);
    } else {
      queuedTimeout = setTimeout(finishToProcessing, 600);
    }
  }

  function stopCamera() {
    cameraReady = false;
    countdown = null;
    shooting = false;
    clearInterval(countdownTimer);
    clearTimeout(queuedTimeout);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
  }

  function finishToProcessing() {
    stopCamera();
    uploadThumbs = [...$photos];
    inlineMode = 'review';
  }

  function triggerUpload() {
    inlineMode = 'upload';
    stopCamera();
    fileInput?.click();
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function onUploadChange(event) {
    try {
      const selected = Array.from(event.target.files || []);
      if (selected.length === 0) {
        inlineMode = 'preview';
        return;
      }

      const firstFour = selected.slice(0, 4);
      const loaded = await Promise.all(firstFour.map((file) => readFile(file)));

      const normalized = [...loaded];
      while (normalized.length < 4) {
        normalized.push(normalized[normalized.length - 1]);
      }

      uploadThumbs = normalized;
      photos.set(normalized);
      inlineMode = 'review';
    } catch (error) {
      alert('Could not load selected images. Please try different files.');
      uploadThumbs = [];
      inlineMode = 'preview';
    }
  }

  function proceedToProcessing() {
    if (uploadThumbs.length > 0) {
      currentPage.set('processing');
    }
  }

  function swapPhotos(indexA, indexB) {
    if (indexA < 0 || indexA >= uploadThumbs.length || indexB < 0 || indexB >= uploadThumbs.length) return;
    const newThumbs = [...uploadThumbs];
    const temp = newThumbs[indexA];
    newThumbs[indexA] = newThumbs[indexB];
    newThumbs[indexB] = temp;
    uploadThumbs = newThumbs;
    photos.set(newThumbs);
  }

  function resetInlineArea() {
    stopCamera();
    uploadThumbs = [];
    inlineMode = 'preview';
    if (fileInput) fileInput.value = '';
  }

  onDestroy(() => {
    stopCamera();
    clearInterval(delightTimer);
  });
</script>

<div class="selection-page">
  <header class="top-row">
    <button class="back-btn" on:click={goBack}>Back To Lobby</button>
    <p class="mode-pill">Mode: {inlineMode === 'preview' ? 'Compose' : inlineMode === 'camera' ? 'Camera Session' : 'Review Session'}</p>
  </header>

  <div class="selection-grid">
    <section class="control-column">
      <h2>Compose Your Strip</h2>
      <p class="control-subtitle">Pick a frame style, choose color mode, then capture or upload four shots.</p>
      <p class="delight-note" aria-live="polite">{delightLine}</p>

      <div class="frame-picker">
        <button class="frame-nav" on:click={prevFrame} disabled={inlineMode !== 'preview'} aria-label="Previous frame">
          <i class="ph-bold ph-caret-left"></i>
        </button>
        <div class="frame-info">
          <p class="frame-name">{activeFrame.name}</p>
          {#if activeFrame.id === 'custom'}
             <div class="emoji-input-wrap">
               <label for="emoji-input">Emoji:</label>
               <input id="emoji-input" class="emoji-input" type="text" bind:value={$customEmoji} maxlength="5" />
               <label for="color-input">Color:</label>
               <input id="color-input" class="color-input" type="color" bind:value={$customColor} />
             </div>
          {:else}
            <p class="frame-note">{activeFrame.note}</p>
            <p class="frame-reaction">{frameReaction}</p>
          {/if}
        </div>
        <button class="frame-nav" on:click={nextFrame} disabled={inlineMode !== 'preview'} aria-label="Next frame">
          <i class="ph-bold ph-caret-right"></i>
        </button>
      </div>

      <div class="filter-group" role="group" aria-label="Filter mode">
        <button class="filter-btn" class:active={$selectedFilter === 'color'} on:click={() => setFilter('color')}>Color</button>
        <button class="filter-btn" class:active={$selectedFilter === 'bw'} on:click={() => setFilter('bw')}>B&amp;W</button>
      </div>

      <div class="bottom-label-input">
        <label for="bottom-text">Strip Label</label>
        <input type="text" id="bottom-text" placeholder="Add custom text..." bind:value={$customText} maxlength="30" />
      </div>

      <div class="meta-row">
        <p>4 shots per strip</p>
        <p>Auto-save enabled</p>
      </div>

      <div class="actions">
        {#if inlineMode === 'preview'}
          <button class="action-btn action-primary" on:click={startInlineCapture}>Take Photos</button>
          <button class="action-btn" on:click={triggerUpload}>Upload Images</button>
        {:else if inlineMode === 'camera'}
          <button class="action-btn" on:click={resetInlineArea}>Cancel Capture</button>
        {:else if inlineMode === 'review'}
          <div class="reorder-panel">
            <p class="reorder-title">Reorder Shots</p>
            <div class="reorder-track">
              {#each uploadThumbs as thumb, index}
                <div class="reorder-item">
                  <img src={thumb} alt="thumbnail {index + 1}" class="tiny-thumb" />
                  <span class="reorder-num">{index + 1}</span>
                  <div class="reorder-actions">
                    <button class="reorder-btn" disabled={index === 0} on:click={() => swapPhotos(index, index - 1)} aria-label="Move Before">
                      <i class="ph-bold ph-caret-left"></i>
                    </button>
                    <button class="reorder-btn" disabled={index === uploadThumbs.length - 1} on:click={() => swapPhotos(index, index + 1)} aria-label="Move After">
                      <i class="ph-bold ph-caret-right"></i>
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          </div>
          <button class="action-btn action-primary" on:click={proceedToProcessing} disabled={uploadThumbs.length === 0}>
            Print Strip
          </button>
          <button class="action-btn" on:click={triggerUpload}>Upload Different</button>
          <button class="action-btn" on:click={resetInlineArea}>Discard</button>
        {/if}
      </div>
    </section>

    <section class="preview-column">
      <div class="frame-preview">
        <header class="preview-top">
          <span>Live Preview</span>
          <span>{$selectedFilter === 'bw' ? 'B&W' : 'Color'}</span>
        </header>

        <p class="preview-sticker" aria-hidden="true">Snap Magic</p>

        {#if inlineMode === 'camera'}
          <div class="inline-camera">
            <video bind:this={video} autoplay playsinline muted></video>

            {#if !cameraReady}
              <div class="overlay-note">Opening camera...</div>
            {/if}

            {#if countdown !== null && countdown > 0}
              <div class="countdown-overlay" aria-live="assertive">
                <span>{countdown}</span>
              </div>
            {/if}

            {#if flash}
              <div class="flash-overlay"></div>
            {/if}
          </div>

          <p class="camera-status">Photo {Math.min(count + 1, totalShots)} / {totalShots}</p>
          <p class="camera-tip" aria-live="polite">{cameraTip}</p>
        {:else}
          <div class="strip-preview-shell">
            {#if previewStripUrl}
              <img src={previewStripUrl} alt="Generated strip preview" class="preview-strip-image" />
            {:else}
              <div class="preview-loading">Building preview...</div>
            {/if}
          </div>

          {#if inlineMode === 'review' && uploadThumbs.length === 0}
            <p class="upload-hint">Take photos or choose 4 images.</p>
          {/if}
        {/if}
      </div>

      <p class="preview-meta">
        {$selectedFilter === 'bw' ? 'Monochrome mode keeps tones cinematic.' : 'Color mode keeps all tones and accents.'}
      </p>
    </section>
  </div>

  <canvas bind:this={canvas} style="display:none;"></canvas>
  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    multiple
    on:change={onUploadChange}
    style="display:none;"
  />
</div>

<style>
  .selection-page {
    min-height: 100%;
    display: grid;
    gap: clamp(0.7rem, 1.9vw, 1.2rem);
    padding-block: clamp(0.6rem, 1.5vw, 1rem);
    animation: sectionIn 500ms var(--ease-out-expo) both;
    width: 100%;
  }

  .top-row {
    display: flex;
    flex-direction: column; /* Mobile first */
    align-items: flex-start; /* Mobile first */
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  @media (min-width: 560px) {
    .top-row {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }
  }

  .back-btn,
  .mode-pill,
  .filter-btn,
  .action-btn,
  .frame-nav {
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.09em;
  }

  .back-btn {
    border: 2px solid color-mix(in oklch, var(--teal-deep) 58%, var(--paper));
    border-radius: 4px;
    background: color-mix(in oklch, var(--paper) 80%, var(--teal) 20%);
    color: color-mix(in oklch, var(--teal-deep) 78%, var(--ink));
    padding: 0.45rem 0.88rem;
    min-height: 44px; /* Touch target */
  }

  .mode-pill {
    border: 1px solid color-mix(in oklch, var(--ink) 24%, var(--paper));
    border-radius: 2px;
    padding: 0.36rem 0.7rem;
    background: color-mix(in oklch, var(--paper) 86%, var(--sun) 14%);
    color: color-mix(in oklch, var(--ink-soft) 78%, var(--ink));
    font-size: 0.74rem;
    animation: pillPulse 2200ms ease-in-out infinite;
    width: 100%; /* Mobile first */
    text-align: center; /* Mobile first */
  }

  @media (min-width: 560px) {
    .mode-pill {
      width: auto;
      text-align: left;
    }
  }

  .selection-grid {
    display: grid;
    grid-template-columns: 1fr; /* Mobile first */
    gap: clamp(0.8rem, 2vw, 1.5rem);
    align-items: start;
    container-type: inline-size;
  }

  @media (min-width: 900px) {
    .selection-grid {
      grid-template-columns: minmax(0, 0.84fr) minmax(0, 1.16fr);
    }
  }

  .control-column,
  .preview-column {
    border: 2px solid color-mix(in oklch, var(--ink) 28%, var(--paper));
    border-radius: 8px;
    background: color-mix(in oklch, var(--paper) 92%, var(--sun) 8%);
    padding: clamp(0.85rem, 2vw, 1.3rem);
    box-shadow: 0 16px 24px color-mix(in oklch, var(--ink) 14%, transparent);
    animation: panelRise 560ms var(--ease-out-quint) both;
  }

  .control-column {
    position: relative;
    overflow: hidden;
  }

  .control-column::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.22;
    background-image: repeating-linear-gradient(
      -25deg,
      color-mix(in oklch, var(--ink) 14%, transparent) 0 1px,
      transparent 1px 15px
    );
  }

  .control-column > * {
    position: relative;
    z-index: 1;
  }

  .preview-column {
    animation-delay: 90ms;
    display: grid;
    justify-items: center;
    gap: 0.6rem;
    background: linear-gradient(170deg, color-mix(in oklch, var(--paper) 86%, var(--teal) 14%), color-mix(in oklch, var(--paper-soft) 78%, var(--sun) 22%));
  }

  h2 {
    font-size: clamp(1.7rem, 2vw, 3.1rem);
    line-height: 0.9;
    color: color-mix(in oklch, var(--brick-deep) 64%, var(--ink));
    text-wrap: balance;
    margin-bottom: 0.35rem;
  }

  .control-subtitle {
    color: color-mix(in oklch, var(--ink-soft) 75%, var(--ink));
    font-size: clamp(1rem, 1.8vw, 1.12rem);
    line-height: 1.34;
    margin-bottom: 0.85rem;
    max-width: 44ch;
  }

  .delight-note {
    width: fit-content;
    max-width: 100%;
    border: 1px dashed color-mix(in oklch, var(--teal-deep) 38%, var(--paper));
    border-radius: 4px;
    background: color-mix(in oklch, var(--paper) 86%, var(--teal) 14%);
    color: color-mix(in oklch, var(--teal-deep) 74%, var(--ink));
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.66rem;
    line-height: 1.25;
    padding: 0.3rem 0.6rem;
    animation: hintIn 280ms var(--ease-out-quart);
  }

  .frame-picker {
    margin-top: 0.75rem;
    border: 2px solid color-mix(in oklch, var(--ink) 20%, var(--paper));
    border-radius: 6px;
    padding: 0.7rem;
    display: grid;
    grid-template-columns: 1fr; /* Mobile first */
    justify-items: start; /* Mobile first */
    align-items: center;
    gap: 0.6rem;
    background: color-mix(in oklch, var(--paper-soft) 80%, var(--teal) 20%);
    grid-template-columns: auto 1fr auto;
  }

  @media (min-width: 560px) {
    .frame-picker {
      justify-items: stretch;
    }
  }

  .frame-nav {
    width: 38px;
    height: 38px;
    border: 2px solid color-mix(in oklch, var(--ink) 22%, var(--paper));
    border-radius: 50%;
    background: color-mix(in oklch, var(--paper) 92%, var(--sun) 8%);
    font-size: 1.2rem;
    color: var(--ink);
    transition: transform 180ms var(--ease-out-quart), box-shadow 180ms var(--ease-out-quart);
    min-height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media (hover: hover) {
    .frame-nav:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 7px 12px color-mix(in oklch, var(--ink) 14%, transparent);
    }
  }

  .frame-nav:disabled {
    opacity: 0.44;
    cursor: not-allowed;
  }

  .frame-info {
    display: grid;
    gap: 0.22rem;
  }

  .frame-icon {
    width: fit-content;
    padding: 0.4rem;
    border-radius: 4px;
    background: color-mix(in oklch, var(--brick) 78%, var(--paper));
    color: var(--paper);
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .frame-name {
    font-family: var(--font-display);
    font-size: 1.36rem;
    line-height: 0.95;
    color: color-mix(in oklch, var(--brick-deep) 66%, var(--ink));
  }

  .emoji-input-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.2rem;
  }

  .emoji-input-wrap label {
    font-size: 0.85rem;
    color: var(--ink-soft);
  }

  .emoji-input {
    width: 3rem;
    font-size: 1.25rem;
    text-align: center;
    border: 2px dashed color-mix(in oklch, var(--brick) 40%, var(--paper));
    border-radius: 4px;
    background: color-mix(in oklch, var(--paper) 90%, var(--ink));
    padding: 0.2rem;
  }

  .emoji-input:focus {
    outline: none;
    border-color: var(--teal);
  }

  .color-input {
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 4px;
    background: none;
    cursor: pointer;
    padding: 0;
  }

  .color-input::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  .color-input::-webkit-color-swatch {
    border: 2px dashed color-mix(in oklch, var(--brick) 40%, var(--paper));
    border-radius: 4px;
  }

  .frame-note {
    color: color-mix(in oklch, var(--ink-soft) 74%, var(--ink));
    font-size: 0.9rem;
    line-height: 1.25;
  }

  .frame-reaction {
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.62rem;
    color: color-mix(in oklch, var(--teal-deep) 66%, var(--ink));
  }

  .filter-group {
    margin-top: 0.75rem;
    display: inline-flex;
    border: 1px solid color-mix(in oklch, var(--ink) 20%, var(--paper));
    border-radius: 3px;
    padding: 0.2rem;
    background: color-mix(in oklch, var(--paper) 92%, var(--ink) 8%);
  }

  .filter-btn {
    border: 0;
    border-radius: 2px;
    padding: 0.36rem 0.75rem;
    font-size: 0.74rem;
    background: transparent;
    color: color-mix(in oklch, var(--ink-soft) 72%, var(--ink));
    min-height: 44px; /* Touch target */
  }

  .filter-btn.active {
    background: color-mix(in oklch, var(--teal) 64%, var(--paper));
    color: color-mix(in oklch, var(--teal-deep) 78%, var(--ink));
  }

  .bottom-label-input {
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .bottom-label-input label {
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.7rem;
    color: color-mix(in oklch, var(--ink-soft) 72%, var(--ink));
  }

  .bottom-label-input input {
    font-family: var(--font-ui);
    font-size: 0.9rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid color-mix(in oklch, var(--ink) 20%, var(--paper));
    border-radius: 3px;
    background: color-mix(in oklch, var(--paper) 95%, var(--ink));
    color: var(--ink);
  }

  .bottom-label-input input:focus {
    outline: none;
    border-color: var(--teal);
    box-shadow: 0 0 0 2px color-mix(in oklch, var(--teal) 30%, transparent);
  }

  .meta-row {
    margin-top: 0.72rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .meta-row p {
    border: 1px solid color-mix(in oklch, var(--ink) 16%, var(--paper));
    border-radius: 3px;
    background: color-mix(in oklch, var(--paper) 90%, var(--teal) 10%);
    color: color-mix(in oklch, var(--ink-soft) 76%, var(--ink));
    padding: 0.23rem 0.46rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.09em;
  }

  .actions {
    margin-top: 0.92rem;
    display: grid;
    gap: 0.48rem;
  }

  .action-btn {
    border: 2px solid color-mix(in oklch, var(--ink) 20%, var(--paper));
    border-radius: 5px;
    background: color-mix(in oklch, var(--paper) 92%, var(--sun) 8%);
    color: var(--ink);
    padding: 0.6rem 0.82rem;
    text-align: left;
    transition: transform 170ms var(--ease-out-quart), box-shadow 170ms var(--ease-out-quart);
    min-height: 44px; /* Touch target size */
  }

  @media (hover: hover) {
    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 14px color-mix(in oklch, var(--ink) 14%, transparent);
    }
  }

  .action-btn:active {
    transform: scale(0.985);
  }

  .action-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .reorder-panel {
    background: color-mix(in oklch, var(--paper) 95%, var(--ink));
    border: 1px dashed color-mix(in oklch, var(--ink) 24%, var(--paper));
    border-radius: 4px;
    padding: 0.6rem;
    margin-bottom: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .reorder-title {
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.65rem;
    color: var(--ink-soft);
  }

  .reorder-track {
    display: flex;
    gap: 0.3rem;
    justify-content: space-between;
  }

  .reorder-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    background: color-mix(in oklch, var(--paper-soft) 80%, var(--teal) 20%);
    border: 1px solid color-mix(in oklch, var(--ink) 15%, var(--paper));
    border-radius: 3px;
    padding: 0.3rem;
    flex: 1;
  }

  .tiny-thumb {
    width: 100%;
    aspect-ratio: 3/4;
    object-fit: cover;
    border-radius: 2px;
    border: 1px solid color-mix(in oklch, var(--ink) 30%, transparent);
    background: var(--ink);
  }

  .reorder-num {
    font-family: var(--font-ui);
    font-weight: 700;
    font-size: 0.65rem;
    color: var(--teal-deep);
  }

  .reorder-actions {
    display: flex;
    gap: 0.2rem;
    width: 100%;
    justify-content: center;
  }

  .reorder-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid color-mix(in oklch, var(--ink) 18%, var(--paper));
    border-radius: 2px;
    background: color-mix(in oklch, var(--paper) 80%, var(--sun) 20%);
    color: var(--ink);
    cursor: pointer;
  }

  .reorder-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .action-primary {
    background: linear-gradient(180deg, color-mix(in oklch, var(--brick) 86%, var(--paper)), color-mix(in oklch, var(--brick-deep) 74%, var(--ink)));
    color: var(--paper);
  }

  .frame-preview {
    width: min(360px, 100%); /* Mobile */
    min-height: 520px; /* Mobile */
    border: 3px solid color-mix(in oklch, var(--ink) 28%, var(--paper));
    border-radius: 8px;
    background: color-mix(in oklch, var(--paper) 95%, var(--ink) 5%);
    padding: 0.82rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
    box-shadow: 0 18px 24px color-mix(in oklch, var(--ink) 18%, transparent);
  }

  @media (min-width: 900px) {
    .frame-preview {
      width: min(340px, 100%);
      min-height: clamp(530px, 70vh, 640px);
    }
  }

  .preview-top {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.11em;
    font-size: 0.69rem;
    color: color-mix(in oklch, var(--ink-soft) 76%, var(--ink));
    margin-bottom: 0.56rem;
  }

  .preview-sticker {
    align-self: flex-end;
    margin-bottom: 0.42rem;
    border: 1px solid color-mix(in oklch, var(--brick-deep) 46%, var(--paper));
    border-radius: 3px;
    background: color-mix(in oklch, var(--brick) 80%, var(--paper));
    color: var(--paper);
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.58rem;
    padding: 0.22rem 0.5rem;
    transform: rotate(-3deg);
    animation: stickerPulse 2400ms ease-in-out infinite;
  }

  .strip-preview-shell {
    width: 100%;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    perspective: 760px;
    overflow: hidden;
    padding-inline: 0.42rem;
  }

  .preview-strip-image {
    width: min(150px, 50%); /* Mobile */
    max-height: 100%;
    object-fit: contain;
    transform-origin: center center;
    transform: translateX(4px) rotate(-2.4deg);
    filter: drop-shadow(0 12px 16px rgba(0, 0, 0, 0.3));
    transition: transform 260ms var(--ease-out-quint), filter 260ms var(--ease-out-quint);
    animation: previewStripIn 530ms var(--ease-out-expo) both, previewStripFloat 4200ms ease-in-out 560ms infinite;
  }

  @media (min-width: 560px) {
    .preview-strip-image {
      width: min(126px, 50%);
    }
  }

  @media (hover: hover) {
    .preview-strip-image:hover {
      transform: translateX(4px) rotate(-1.1deg) translateY(-3px) scale(1.01);
      filter: drop-shadow(0 16px 22px rgba(0, 0, 0, 0.34));
    }
  }

  .preview-loading {
    border: 1px dashed color-mix(in oklch, var(--ink) 24%, var(--paper));
    border-radius: 5px;
    padding: 0.54rem 0.7rem;
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.09em;
    font-size: 0.7rem;
    color: color-mix(in oklch, var(--ink-soft) 74%, var(--ink));
  }

  .upload-hint {
    margin-top: 0.34rem;
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.65rem;
    color: color-mix(in oklch, var(--ink-soft) 74%, var(--ink));
    animation: hintIn 260ms var(--ease-out-quart);
  }

  .inline-camera {
    position: relative;
    width: 100%;
    flex: 1;
    min-height: 292px; /* Mobile first */
    border: 2px solid color-mix(in oklch, var(--ink) 40%, var(--paper));
    border-radius: 6px;
    overflow: hidden;
    background: color-mix(in oklch, var(--ink) 88%, var(--paper));
  }

  @media (min-width: 560px) {
    .inline-camera {
      min-height: 314px;
    }
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1);
  }

  .overlay-note,
  .countdown-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .overlay-note {
    background: color-mix(in oklch, var(--ink) 74%, transparent);
    color: color-mix(in oklch, var(--paper) 84%, var(--teal));
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.75rem;
  }

  .countdown-overlay {
    background: color-mix(in oklch, var(--ink) 24%, transparent);
  }

  .countdown-overlay span {
    width: 88px;
    aspect-ratio: 1;
    border-radius: 50%;
    display: grid;
    place-items: center;
    border: 3px solid color-mix(in oklch, var(--paper) 74%, var(--sun));
    background: color-mix(in oklch, var(--ink) 54%, transparent);
    color: var(--paper);
    font-family: var(--font-display);
    font-size: 2.3rem;
    animation: pop 320ms var(--ease-out-quint);
  }

  .flash-overlay {
    position: absolute;
    inset: 0;
    background: color-mix(in oklch, var(--paper) 92%, var(--sun) 8%);
    animation: flash 190ms ease-out forwards;
  }

  .camera-status {
    margin-top: 0.52rem;
    text-align: center;
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.11em;
    font-size: 0.7rem;
    color: color-mix(in oklch, var(--ink-soft) 78%, var(--ink));
  }

  .camera-tip {
    text-align: center;
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.09em;
    font-size: 0.61rem;
    color: color-mix(in oklch, var(--teal-deep) 68%, var(--ink));
  }

  .preview-meta {
    text-align: center;
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.7rem;
    color: color-mix(in oklch, var(--ink-soft) 78%, var(--ink));
  }

  @keyframes sectionIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes panelRise {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.993);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes previewStripIn {
    from {
      opacity: 0;
      transform: translateX(4px) rotate(-1deg) translateY(10px) scale(0.97);
    }

    to {
      opacity: 1;
      transform: translateX(4px) rotate(-2.4deg) translateY(0) scale(1);
    }
  }

  @keyframes previewStripFloat {
    0%,
    100% {
      transform: translateX(4px) rotate(-2.4deg) translateY(0);
    }

    50% {
      transform: translateX(4px) rotate(-1.8deg) translateY(-4px);
    }
  }

  @keyframes hintIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pillPulse {
    0%,
    100% {
      transform: translateY(0);
      box-shadow: 0 0 0 color-mix(in oklch, var(--teal) 0%, transparent);
    }

    50% {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px color-mix(in oklch, var(--teal) 16%, transparent);
    }
  }

  @keyframes stickerPulse {
    0%,
    100% {
      transform: rotate(-3deg) translateY(0);
    }

    50% {
      transform: rotate(-1deg) translateY(-1px);
    }
  }

  @keyframes pop {
    from {
      transform: scale(1.12);
      opacity: 0;
    }

    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes flash {
    from {
      opacity: 1;
    }

    to {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mode-pill,
    .preview-strip-image,
    .preview-sticker,
    .delight-note,
    .upload-hint {
      animation: none;
      transition: none;
    }
  }
</style>
