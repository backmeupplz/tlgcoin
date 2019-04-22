export function getUTCDate(d?: Date) {
  const date = d || new Date()

  return `${leadZero(date.getUTCDate())}-${leadZero(
    date.getUTCMonth() + 1
  )}-${date.getUTCFullYear()}`
}

export function getUTCTime(d?: Date) {
  const date = d || new Date()

  return `${leadZero(date.getUTCHours())}:${leadZero(
    date.getUTCMinutes()
  )}:${leadZero(date.getUTCSeconds())} UTC`
}

function leadZero(n: number) {
  return n < 10 ? `0${n}` : n
}
