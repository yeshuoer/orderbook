export const log = console.log.bind(console, '🐰')

export const wait = function (ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
