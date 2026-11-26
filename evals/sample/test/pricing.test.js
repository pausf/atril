import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cartTotal, lineTotal, withTax } from '../src/pricing.js'

test('a line is unit price times quantity', () => {
  assert.equal(lineTotal(250, 3), 750)
})

test('a cart sums its lines', () => {
  assert.equal(cartTotal([{ unitCents: 250, qty: 2 }, { unitCents: 100, qty: 1 }]), 600)
  assert.equal(cartTotal([]), 0)
})

test('tax is added on whole cents', () => {
  assert.equal(withTax(100, 20), 120)
  assert.equal(withTax(100, 0), 100)
})
