export function getUTCTime() {
  const date = new Date()

  return `${date.getUTCHours()}:${date.getUTCMinutes()}:${date.getUTCSeconds()} UTC`
}
