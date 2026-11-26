import assert from 'node:assert/strict'
import { test } from 'node:test'
import { withTax } from './src/pricing.js'

test('tax rounds half up to whole cents', () => {
  assert.equal(withTax(1005, 10), 1106)
  assert.equal(withTax(999, 10), 1099)
  assert.equal(withTax(1, 50), 2)
})

test('exact amounts do not change', () => {
  assert.equal(withTax(100, 20), 120)
  assert.equal(withTax(100, 0), 100)
})
