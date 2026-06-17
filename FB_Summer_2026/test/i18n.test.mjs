// test/i18n.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';
const FB = loadFB(['src/i18n/strings.js']);

test('English labels match the originals', () => {
  FB.I18N.set('eng');
  assert.equal(FB.I18N.t('parts'), 'Parts');
  assert.equal(FB.I18N.t('set_unit'), 'Set Unit Bar');
  assert.equal(FB.I18N.t('b_apart'), 'Break Apart');
});
test('Turkish strings present for partition alert', () => {
  FB.I18N.set('tur');
  assert.ok(FB.I18N.t('select_bar_to_partition').length > 0);
});
