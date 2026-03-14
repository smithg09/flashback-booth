<script>
  import { onMount, onDestroy } from 'svelte';
  import { currentPage, photos } from './store.js';

  let video;
  let canvas;
  let stream;
  let countdown = null;
  let shooting = false;
  let count = 0;
  let totalShots = 4;
  let flash = false;
  let ready = false;

  onMount(async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      video.srcObject = stream;
      video.play();
      ready = true;
      setTimeout(startSequence, 1500); // give user a moment
    } catch (err) {
      console.error("Camera access denied or error:", err);
      alert("Please allow camera access to use the flashback booth!");
      currentPage.set('selection');
    }
  });

  onDestroy(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  });

  function startSequence() {
    shooting = true;
    photos.set([]);
    count = 0;
    nextShot();
  }

  function nextShot() {
    if (count >= totalShots) {
      finish();
      return;
    }

    countdown = 3;
    let intervals = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(intervals);
        takePhoto();
      }
    }, 1000);
  }

  function takePhoto() {
    flash = true;
    setTimeout(() => flash = false, 200);

    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    photos.update(p => [...p, dataUrl]);
    
    count++;
    if (count < totalShots) {
      setTimeout(nextShot, 1200);
    } else {
      setTimeout(finish, 800);
    }
  }

  function finish() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    currentPage.set('processing');
  }
</script>

<div class="capture-page">
  <!-- Machine frame around video -->
  <div class="machine-housing">
    <div class="housing-top">
      <div class="indicator-lights">
        <div class="indicator" class:recording={shooting}></div>
        <span class="rec-label">{shooting ? 'REC' : 'STANDBY'}</span>
      </div>
      <div class="shot-counter">
        {#each Array(totalShots) as _, i}
          <div class="counter-dot" class:filled={i < count}></div>
        {/each}
      </div>
    </div>

    <div class="viewfinder">
      <video bind:this={video} autoplay playsinline muted></video>
      
      <!-- Corner brackets overlay -->
      <div class="bracket tl"></div>
      <div class="bracket tr"></div>
      <div class="bracket bl"></div>
      <div class="bracket br"></div>

      {#if !ready}
        <div class="warming-up">
          <p>Warming up camera...</p>
          <div class="loading-dots">
            <span>.</span><span>.</span><span>.</span>
          </div>
        </div>
      {/if}

      {#if countdown !== null && countdown > 0}
        <div class="countdown-overlay">
          <div class="countdown-ring">
            <span>{countdown}</span>
          </div>
        </div>
      {/if}

      {#if flash}
        <div class="flash-overlay"></div>
      {/if}

      <canvas bind:this={canvas} style="display: none;"></canvas>
    </div>

    <div class="housing-bottom">
      <div class="photo-label">
        PHOTO {Math.min(count + 1, totalShots)} of {totalShots}
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {(count / totalShots) * 100}%"></div>
      </div>
    </div>
  </div>

  <p class="smile-text">
    {#if countdown !== null && countdown > 0}
      Get ready... 📸
    {:else if shooting && count < totalShots}
      SMILE! 😄
    {:else if !ready}
      Setting up...
    {:else}
      Processing your photos...
    {/if}
  </p>
</div>

<style>
  .capture-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 20px;
  }

  .machine-housing {
    background: linear-gradient(180deg, #333 0%, #222 100%);
    border: 4px solid var(--metal-mid);
    border-radius: 12px;
    padding: 15px;
    box-shadow:
      0 10px 40px rgba(0,0,0,0.6),
      inset 0 1px 0 rgba(255,255,255,0.08);
    max-width: 95vw;
  }

  .housing-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding: 0 5px;
  }

  .indicator-lights {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #555;
    border: 1px solid #333;
    transition: all 0.3s;
  }
  .indicator.recording {
    background: #ff3333;
    box-shadow: 0 0 10px rgba(255,51,51,0.8);
    animation: blink 1s ease-in-out infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .rec-label {
    font-family: 'Special Elite', cursive;
    font-size: 0.7rem;
    color: var(--metal-light);
    letter-spacing: 2px;
  }

  .shot-counter {
    display: flex;
    gap: 6px;
  }

  .counter-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--metal-light);
    background: transparent;
    transition: all 0.3s;
  }
  .counter-dot.filled {
    background: var(--gold);
    border-color: var(--gold);
    box-shadow: 0 0 8px rgba(200,168,78,0.5);
  }

  .viewfinder {
    position: relative;
    width: 560px;
    max-width: 85vw;
    aspect-ratio: 4/3;
    border: 3px solid #555;
    border-radius: 4px;
    overflow: hidden;
    background: #000;
    box-shadow: inset 0 0 30px rgba(0,0,0,0.8);
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1);
  }

  /* Corner brackets */
  .bracket {
    position: absolute;
    width: 30px;
    height: 30px;
    border-color: rgba(255,255,255,0.6);
    border-style: solid;
    z-index: 5;
  }
  .tl { top: 10px; left: 10px; border-width: 2px 0 0 2px; }
  .tr { top: 10px; right: 10px; border-width: 2px 2px 0 0; }
  .bl { bottom: 10px; left: 10px; border-width: 0 0 2px 2px; }
  .br { bottom: 10px; right: 10px; border-width: 0 2px 2px 0; }

  .warming-up {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.85);
    z-index: 10;
  }
  .warming-up p {
    font-family: 'Special Elite', cursive;
    color: var(--gold-dim);
    font-size: 1.2rem;
    letter-spacing: 2px;
  }
  .loading-dots span {
    font-size: 2rem;
    color: var(--gold);
    animation: dotBounce 1.4s ease-in-out infinite;
  }
  .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes dotBounce {
    0%, 80%, 100% { opacity: 0.2; }
    40% { opacity: 1; }
  }

  .countdown-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.3);
    z-index: 8;
  }

  .countdown-ring {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: 4px solid rgba(255,255,255,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.5);
    animation: countPop 1s ease-out;
  }
  .countdown-ring span {
    font-family: 'Permanent Marker', cursive;
    font-size: 4rem;
    color: white;
    text-shadow: 0 0 20px rgba(255,255,255,0.5);
  }

  @keyframes countPop {
    0% { transform: scale(1.5); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  .flash-overlay {
    position: absolute;
    inset: 0;
    background: white;
    z-index: 20;
    animation: flashAnim 0.2s ease-out forwards;
  }

  @keyframes flashAnim {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }

  .housing-bottom {
    margin-top: 10px;
    padding: 0 5px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .photo-label {
    font-family: 'Special Elite', cursive;
    font-size: 0.8rem;
    color: var(--metal-light);
    letter-spacing: 2px;
    text-align: center;
  }

  .progress-bar {
    width: 100%;
    height: 6px;
    background: #111;
    border: 1px solid var(--metal-mid);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--rust), var(--gold));
    border-radius: 3px;
    transition: width 0.5s ease;
  }

  .smile-text {
    margin-top: 20px;
    font-family: 'Caveat', cursive;
    font-size: 1.5rem;
    color: var(--gold-dim);
    text-align: center;
    min-height: 2rem;
  }

  @media (max-width: 480px) {
    .viewfinder { width: 90vw; }
  }
</style>