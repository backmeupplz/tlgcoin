// Dependencies
import commaNumber = require('comma-number')

const balanceFormat = commaNumber.bindWith(' ', ',')

export function format(n: number) {
  return balanceFormat(n)
}
