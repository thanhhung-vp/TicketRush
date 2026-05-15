import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AUDIENCE_ZONE_SHAPES,
  STAGE_LAYOUT_TYPES,
  clampRotation,
  getAudienceShapeLabel,
  getStageLayoutLabel,
} from '../src/utils/venueLayout.js';

test('exposes the requested audience area shapes', () => {
  assert.deepEqual(
    AUDIENCE_ZONE_SHAPES.map(shape => shape.value),
    ['rect', 'fan', 'semicircle', 'circle', 'u_shape']
  );
  assert.equal(getAudienceShapeLabel('fan'), 'Hinh quat');
  assert.equal(getAudienceShapeLabel('unknown'), 'Hinh chu nhat');
});

test('exposes the requested stage layout types', () => {
  assert.deepEqual(
    STAGE_LAYOUT_TYPES.map(shape => shape.value),
    ['proscenium', 'thrust', 'arena', 'traverse', 'catwalk']
  );
  assert.equal(getStageLayoutLabel('catwalk'), 'Catwalk / runway');
  assert.equal(getStageLayoutLabel('legacy'), 'Proscenium / mot huong');
});

test('normalizes rotation to a 0-359 degree range', () => {
  assert.equal(clampRotation(725), 5);
  assert.equal(clampRotation(-30), 330);
  assert.equal(clampRotation('90'), 90);
  assert.equal(clampRotation('abc'), 0);
});
