import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyCoupon } from './src/coupon.js'

test('SAVE10 takes 10% off, rounding the discount half up', () => {
  assert.equal(applyCoupon(1000, 'SAVE10'), 900)
  assert.equal(applyCoupon(1005, 'SAVE10'), 904)
  assert.equal(applyCoupon(0, 'SAVE10'), 0)
})

test('FIVE takes 500 off and stops at zero', () => {
  assert.equal(applyCoupon(2000, 'FIVE'), 1500)
  assert.equal(applyCoupon(300, 'FIVE'), 0)
})

test('an unknown code throws', () => {
  assert.throws(() => applyCoupon(1000, 'NOPE'), { message: 'unknown coupon: NOPE' })
})
