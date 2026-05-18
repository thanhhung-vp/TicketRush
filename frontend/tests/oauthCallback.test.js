import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildProviderCallbackPath,
  isLocalAuthCode,
  shouldForwardProviderCallback,
} from '../src/utils/oauthCallback.js';

test('recognizes local app auth codes as 64 hex characters', () => {
  assert.equal(isLocalAuthCode('a'.repeat(64)), true);
  assert.equal(isLocalAuthCode('A'.repeat(64)), true);
  assert.equal(isLocalAuthCode('facebook-oauth-code'), false);
  assert.equal(isLocalAuthCode('g'.repeat(64)), false);
});

test('forwards provider OAuth callbacks that land on the frontend route', () => {
  const params = new URLSearchParams({
    code: 'facebook-oauth-code',
    state: 'oauth-state',
  });

  assert.equal(shouldForwardProviderCallback(params), true);
  assert.equal(
    buildProviderCallbackPath('facebook', params),
    '/api/auth/facebook/callback?code=facebook-oauth-code&state=oauth-state'
  );
});

test('does not forward local one-time app auth codes', () => {
  const params = new URLSearchParams({
    code: 'a'.repeat(64),
  });

  assert.equal(shouldForwardProviderCallback(params), false);
});
