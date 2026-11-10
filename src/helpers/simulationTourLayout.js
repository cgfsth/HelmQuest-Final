const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

export function getSimulationTourLayout({ target, width, height, cardWidth, cardHeight }) {
  const margin = 16, gap = 18;
  const w = Math.min(cardWidth, width - margin * 2), h = Math.min(cardHeight, height - margin * 2);
  if (!target) return { left: (width - w) / 2, top: (height - h) / 2, side: 'center' };
  const centerX = target.left + target.width / 2, centerY = target.top + target.height / 2;
  const candidates = [
    { side: 'right', left: target.right + gap, top: clamp(centerY - h / 2, margin, height - h - margin) },
    { side: 'left', left: target.left - w - gap, top: clamp(centerY - h / 2, margin, height - h - margin) },
    { side: 'bottom', left: clamp(centerX - w / 2, margin, width - w - margin), top: target.bottom + gap },
    { side: 'top', left: clamp(centerX - w / 2, margin, width - w - margin), top: target.top - h - gap },
  ];
  return candidates.find(item => item.left >= margin && item.top >= margin
    && item.left + w <= width - margin && item.top + h <= height - margin)
    || { left: clamp(centerX - w / 2, margin, width - w - margin),
      top: clamp(target.bottom + gap, margin, height - h - margin), side: 'center' };
}

export function getSimulationTourSpotlight(rect, width, height) {
  if (!rect) return null;
  const left = Math.max(6, rect.left - 8), top = Math.max(6, rect.top - 8);
  const right = Math.min(width - 6, rect.right + 8), bottom = Math.min(height - 6, rect.bottom + 8);
  if (right <= left || bottom <= top) return null;
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}
