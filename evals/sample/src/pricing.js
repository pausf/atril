// Prices are integer cents.
export function lineTotal(unitCents, qty) {
  return unitCents * qty
}

export function cartTotal(lines) {
  return lines.reduce((sum, line) => sum + lineTotal(line.unitCents, line.qty), 0)
}

export function withTax(cents, ratePercent) {
  return Math.floor((cents * (100 + ratePercent)) / 100)
}
