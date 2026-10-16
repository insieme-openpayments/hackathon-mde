import test from 'node:test'
import assert from 'node:assert/strict'
import { expectedHash, verifyHash } from '../src/gnap.js'
const p = { clientNonce: 'c', serverNonce: 's', interactRef: 'r', grantEndpoint: 'https://auth.example/x' }
test('hash GNAP válido', () => assert.ok(verifyHash(p, expectedHash(p))))
test('hash manipulado se rechaza', () => {
  assert.ok(!verifyHash(p, expectedHash({ ...p, interactRef: 'otro' })))
  assert.ok(!verifyHash(p, ''))
})
