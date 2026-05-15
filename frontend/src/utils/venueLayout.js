export const AUDIENCE_ZONE_SHAPES = [
  { value: 'rect', label: 'Hinh chu nhat' },
  { value: 'fan', label: 'Hinh quat' },
  { value: 'semicircle', label: 'Ban nguyet' },
  { value: 'circle', label: 'Hinh tron / 360' },
  { value: 'u_shape', label: 'Hinh chu U' },
];

export const STAGE_LAYOUT_TYPES = [
  { value: 'proscenium', label: 'Proscenium / mot huong' },
  { value: 'thrust', label: 'Thrust / nho ra' },
  { value: 'arena', label: 'Arena / trung tam 360' },
  { value: 'traverse', label: 'Traverse / hai phia' },
  { value: 'catwalk', label: 'Catwalk / runway' },
];

export function getAudienceShapeLabel(shape) {
  return AUDIENCE_ZONE_SHAPES.find(item => item.value === shape)?.label || AUDIENCE_ZONE_SHAPES[0].label;
}

export function getStageLayoutLabel(shape) {
  return STAGE_LAYOUT_TYPES.find(item => item.value === shape)?.label || STAGE_LAYOUT_TYPES[0].label;
}

export function clampRotation(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return ((Math.round(numeric) % 360) + 360) % 360;
}

export function normalizeAudienceShape(shape) {
  return AUDIENCE_ZONE_SHAPES.some(item => item.value === shape) ? shape : 'rect';
}

export function normalizeStageLayout(shape) {
  const legacyMap = {
    trapezoid: 'proscenium',
    rect: 'traverse',
    ellipse: 'arena',
    semicircle: 'thrust',
  };
  const normalized = legacyMap[shape] || shape;
  return STAGE_LAYOUT_TYPES.some(item => item.value === normalized) ? normalized : 'proscenium';
}
