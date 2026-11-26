import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reserve } from './src/stock.js'

test('reserve takes the quantity off and leaves the input alone', () => {
  const stock = { apple: 5, pear: 1 }
  assert.deepEqual(reserve(stock, 'apple', 2), { apple: 3, pear: 1 })
  assert.deepEqual(stock, { apple: 5, pear: 1 })
  assert.deepEqual(reserve(stock, 'pear', 1), { apple: 5, pear: 0 })
})

test('reserving more than is left, or an unknown sku, is out of stock', () => {
  assert.throws(() => reserve({ apple: 1 }, 'apple', 2), { message: 'out of stock: apple' })
  assert.throws(() => reserve({ apple: 1 }, 'kiwi', 1), { message: 'out of stock: kiwi' })
})

test('the quantity must be a positive integer', () => {
  for (const qty of [0, -1, 1.5, '2', NaN]) {
    assert.throws(() => reserve({ apple: 5 }, 'apple', qty), { name: 'RangeError', message: 'qty must be a positive integer' })
  }
})
