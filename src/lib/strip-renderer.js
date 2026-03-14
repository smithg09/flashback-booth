const STRIP_LAYOUT = {
  border: 20,
  photoWidth: 230,
  photoHeight: 300,
  gap: 10,
  headerHeight: 64,
  footerHeight: 46
};

const MOCK_CACHE = new Map();

function getStripDimensions() {
  const { border, photoWidth, photoHeight, gap, headerHeight, footerHeight } = STRIP_LAYOUT;
  const stripWidth = photoWidth + (border * 2);
  const stripHeight = headerHeight + (photoHeight * 4) + (gap * 3) + footerHeight + border;

  return {
    stripWidth,
    stripHeight,
    ...STRIP_LAYOUT
  };
}

function getFrameBackground(selectedFrame) {
  if (selectedFrame === 'simple-black' || selectedFrame === 'film-strip') return '#1f1f21';
  if (selectedFrame === 'hearts') return '#ffe9eb';
  if (selectedFrame === 'sparkles') return '#fcf2db';
  if (selectedFrame === 'sketchy') return '#f4f4f0';
  if (selectedFrame === 'polaroid') return '#d6c7b3';
  if (selectedFrame === 'cyber') return '#0a0a0f';
  if (selectedFrame === 'floral') return '#e9f2ee';
  if (selectedFrame === 'arcade') return '#1a1b26';
  if (selectedFrame === 'postage') return '#fefcf8';
  if (selectedFrame === 'notepad') return '#fffaf0';
  if (selectedFrame === 'custom') return '#f9f6ff';
  return '#f2eee6';
}

function getFrameTextColor(selectedFrame) {
  if (selectedFrame === 'simple-black' || selectedFrame === 'film-strip') return '#e7ded0';
  if (selectedFrame === 'cyber') return '#00ffdb';
  if (selectedFrame === 'arcade') return '#ffd700';
  if (selectedFrame === 'notepad') return '#3a4b66';
  if (selectedFrame === 'postage') return '#b33939';
  if (selectedFrame === 'floral') return '#2b4d32';
  if (selectedFrame === 'hearts') return '#d14358';
  if (selectedFrame === 'custom') return '#50416b';
  return '#43332e';
}

function normalizePhotos(photos) {
  const sources = Array.isArray(photos) ? [...photos] : [];
  if (sources.length === 0) return [];

  const normalized = sources.slice(0, 4);
  while (normalized.length < 4) {
    normalized.push(normalized[normalized.length - 1]);
  }

  return normalized;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawCoverImage(context, image, dx, dy, dw, dh) {
  const targetAspect = dw / dh;
  const sourceAspect = image.width / image.height;

  let sx = 0;
  let sy = 0;
  let sw = image.width;
  let sh = image.height;

  if (sourceAspect > targetAspect) {
    sw = image.height * targetAspect;
    sx = (image.width - sw) / 2;
  } else {
    sh = image.width / targetAspect;
    sy = (image.height - sh) / 2;
  }

  context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
}

function applyBwFilter(context, x, y, width, height) {
  const imageData = context.getImageData(x, y, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const luminance = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
    data[i] = luminance;
    data[i + 1] = luminance;
    data[i + 2] = luminance;
  }

  context.putImageData(imageData, x, y);
}

function drawHeart(ctx, x, y, size, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(x, y + topCurveHeight);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
  ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 2, x, y + size);
  ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 2, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
  ctx.fill();
}

function drawStar(ctx, x, y, r1, r2, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const radius = i % 2 === 0 ? r1 : r2;
    if (i === 0) ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    else ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  ctx.fill();
}

function drawLeaf(ctx, x, y) {
  ctx.beginPath();
  ctx.ellipse(x, y, 5, 10, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawFrameDecorations(ctx, selectedFrame, stripWidth, stripHeight, customEmoji) {
  const { border, photoWidth, photoHeight, gap, headerHeight } = STRIP_LAYOUT;

  if (selectedFrame === 'film-strip') {
    ctx.fillStyle = '#ece2d2';
    const holeSize = 10;
    const holeGap = 20;
    for (let y = 0; y < stripHeight; y += holeGap) {
      ctx.fillRect(5, y, holeSize, holeSize);
      ctx.fillRect(stripWidth - 5 - holeSize, y, holeSize, holeSize);
    }
  }

  if (selectedFrame === 'hearts') {
    for (let i = 0; i < 8; i++) {
      const y = 92 + (i * 145);
      if (i % 2 === 0) drawHeart(ctx, 15, y, 20, '#ff4d6d');
      else drawHeart(ctx, 15, y, 23, i % 2 === 0 ? '#ff85a1' : '#ffb3c6');
      if (i % 2 === 0) drawHeart(ctx, stripWidth - 15, y + 25, 21, '#ff4d6d');
      drawHeart(ctx, stripWidth - 15, y + 25, 18, i % 2 === 0 ? '#ff85a1' : '#ffb3c6');
    }
  }

  if (selectedFrame === 'sparkles') {
    for (let i = 0; i < 8; i++) {
      const y = 92 + (i * 145);
      drawStar(ctx, 16, y, 12, 3, '#f9a03f');
      drawStar(ctx, stripWidth - 16, y + 25, 14, 4, '#f7d002');
      if (i % 2 === 0) drawStar(ctx, 24, y + 45, 5, 2, '#ffffff');
    }
  }

  if (selectedFrame === 'sketchy') {
    ctx.strokeStyle = '#66665f';
    ctx.lineWidth = 1.5;
    
    ctx.beginPath();
    ctx.moveTo(8, 8);
    ctx.lineTo(stripWidth - 6, 12);
    ctx.lineTo(stripWidth - 10, stripHeight - 8);
    ctx.lineTo(12, stripHeight - 10);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(6, 12);
    ctx.lineTo(stripWidth - 8, 6);
    ctx.lineTo(stripWidth - 6, stripHeight - 12);
    ctx.lineTo(8, stripHeight - 6);
    ctx.closePath();
    ctx.stroke();

    for (let i = 0; i < 4; i += 1) {
      const y = headerHeight + (i * (photoHeight + gap));
      ctx.strokeRect(border - 5, y - 4, photoWidth + 10, photoHeight + 8);
    }
  }

  if (selectedFrame === 'cyber') {
    ctx.fillStyle = '#ff0055';
    for (let i = 0; i < 4; i += 1) {
      const y = headerHeight + (i * (photoHeight + gap));
      ctx.fillRect(border - 2, y, 2, photoHeight);
      ctx.fillRect(border + photoWidth, y, 2, photoHeight);
    }
    ctx.fillStyle = '#00ffdb';
    ctx.fillRect(10, 80, 2, stripHeight - 160);
    ctx.fillRect(stripWidth - 12, 80, 2, stripHeight - 160);
    
    ctx.font = '12px Courier';
    ctx.fillStyle = '#00ffdb';
    ctx.fillText('+', 8, 50);
    ctx.fillText('+', stripWidth - 16, 50);
    ctx.fillText('REC', 20, stripHeight - 20);
  }

  if (selectedFrame === 'floral') {
    ctx.fillStyle = '#83a886';
    for (let i = 0; i < 9; i++) {
        const y = 70 + (i * 120);
        drawLeaf(ctx, 12, y);
        drawLeaf(ctx, stripWidth - 12, y + 40);
    }
  }

  if (selectedFrame === 'arcade') {
    const s = 6;
    for (let y = 0; y < stripHeight; y += 40) {
      ctx.fillStyle = y % 80 === 0 ? '#ff0055' : '#00ffdb';
      ctx.fillRect(4, y, s, s);
      ctx.fillStyle = y % 80 === 0 ? '#00ffdb' : '#ffd700';
      ctx.fillRect(stripWidth - 10, y + 10, s, s);
    }
  }

  if (selectedFrame === 'postage') {
    ctx.strokeStyle = '#d6cdc0';
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, stripWidth - 12, stripHeight - 12);
    ctx.setLineDash([]);
    ctx.fillStyle = '#b33939';
    ctx.font = 'bold 28px "Archivo Narrow", sans-serif';
    ctx.fillText('25¢', stripWidth - 30, 45);
  }

  if (selectedFrame === 'notepad') {
    ctx.strokeStyle = '#c6d8fc';
    ctx.lineWidth = 1;
    for (let y = 40; y < stripHeight; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(stripWidth, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#f4b3b3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(30, stripHeight);
    ctx.stroke();
  }

  if (selectedFrame === 'polaroid') {
    ctx.strokeStyle = 'rgba(90, 70, 50, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, stripWidth - 16, stripHeight - 16);
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 14, stripWidth - 28, stripHeight - 28);

    ctx.fillStyle = '#2a2a2a';
    const cornerSize = 14;
    const offset = 2;

    for (let i = 0; i < 4; i += 1) {
      const y = headerHeight + (i * (photoHeight + gap));
      
      // Top Left
      ctx.beginPath();
      ctx.moveTo(border - offset, y - offset);
      ctx.lineTo(border - offset + cornerSize, y - offset);
      ctx.lineTo(border - offset, y - offset + cornerSize);
      ctx.fill();

      // Top Right
      ctx.beginPath();
      ctx.moveTo(border + photoWidth + offset, y - offset);
      ctx.lineTo(border + photoWidth + offset - cornerSize, y - offset);
      ctx.lineTo(border + photoWidth + offset, y - offset + cornerSize);
      ctx.fill();

      // Bottom Left
      ctx.beginPath();
      ctx.moveTo(border - offset, y + photoHeight + offset);
      ctx.lineTo(border - offset + cornerSize, y + photoHeight + offset);
      ctx.lineTo(border - offset, y + photoHeight + offset - cornerSize);
      ctx.fill();

      // Bottom Right
      ctx.beginPath();
      ctx.moveTo(border + photoWidth + offset, y + photoHeight + offset);
      ctx.lineTo(border + photoWidth + offset - cornerSize, y + photoHeight + offset);
      ctx.lineTo(border + photoWidth + offset, y + photoHeight + offset - cornerSize);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(border, y, photoWidth, photoHeight);
    }
  }

  if (selectedFrame === 'custom') {
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const stamp = customEmoji || '✨';
    for (let i = 0; i < 9; i++) {
      const y = 92 + (i * 145);
      if (i % 2 === 0) ctx.fillText(stamp, 15, y);
      else  ctx.fillText(stamp, stripWidth - 15, y + 25);
    }
  }
}

export async function generateStripDataUrl({
  photos,
  selectedFilter,
  selectedFrame,
  customEmoji,
  customColor,
  titleLabel = 'FLASHBACK BOOTH',
  footerLabel = null
}) {
  const normalizedPhotos = normalizePhotos(photos);
  if (normalizedPhotos.length === 0) return null;

  const {
    stripWidth,
    stripHeight,
    border,
    photoWidth,
    photoHeight,
    gap,
    headerHeight
  } = getStripDimensions();

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = stripWidth;
  canvas.height = stripHeight;

  ctx.fillStyle = selectedFrame === 'custom' && customColor ? customColor : getFrameBackground(selectedFrame);
  ctx.fillRect(0, 0, stripWidth, stripHeight);

  const textColor = getFrameTextColor(selectedFrame);
  ctx.fillStyle = textColor;
  ctx.font = '700 16px "Archivo Narrow", sans-serif';
  ctx.textAlign = 'center';

  for (let i = 0; i < normalizedPhotos.length; i += 1) {
    const img = await loadImage(normalizedPhotos[i]);
    const y = headerHeight + (i * (photoHeight + gap));
    drawCoverImage(ctx, img, border, y, photoWidth, photoHeight);

    if (selectedFilter === 'bw') {
      applyBwFilter(ctx, border, y, photoWidth, photoHeight);
    }
  }

  drawFrameDecorations(ctx, selectedFrame, stripWidth, stripHeight, customEmoji);

  ctx.fillStyle = getFrameTextColor(selectedFrame);
  ctx.font = '700 14px "Archivo Narrow", sans-serif';
  const defaultDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  ctx.fillText(footerLabel ?? defaultDate, stripWidth / 2, stripHeight - 16);

  return canvas.toDataURL('image/png');
}

export function createMockPhotoDataUrls(count = 4) {
  if (MOCK_CACHE.has(count)) {
    return MOCK_CACHE.get(count);
  }

  const result = [];
  for (let i = 0; i < count; i += 1) {
    const canvas = document.createElement('canvas');
    const width = STRIP_LAYOUT.photoWidth;
    const height = STRIP_LAYOUT.photoHeight;
    const ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    const hueShift = (i * 7) + 8;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, `oklch(0.45 0.12 ${70 + hueShift})`);
    gradient.addColorStop(1, `oklch(0.35 0.14 ${35 + hueShift})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.ellipse(width * 0.68, height * 0.22, width * 0.26, height * 0.14, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.82);
    ctx.lineTo(width * 0.44, height * 0.46);
    ctx.lineTo(width * 0.7, height * 0.66);
    ctx.lineTo(width, height * 0.5);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    result.push(canvas.toDataURL('image/png'));
  }

  MOCK_CACHE.set(count, result);
  return result;
}
