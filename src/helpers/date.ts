export function getUTCTime() {
  const date = new Date()

  return `${leadZero(date.getUTCHours())}:${leadZero(
    date.getUTCMinutes()
  )}:${leadZero(date.getUTCSeconds())} UTC`
}

function leadZero(n: number) {
  return n < 10 ? `0${n}` : n
}
