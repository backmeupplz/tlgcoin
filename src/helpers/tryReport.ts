// Dependencies
import { bot } from './bot'

export async function tryReport<T>(fun: (() => T) | Promise<T>) {
  try {
    const result = await (fun instanceof Function ? fun() : fun)
    return result
  } catch (err) {
    await report(err)
    return undefined
  }
}

async function report(err: Error) {
  const dismissableErrors = ['message is not modified', 'Too Many Requests']
  try {
    for (const errorText of dismissableErrors) {
      if (err.message.indexOf(errorText) > -1) {
        return
      }
    }
    const text = `Error:\n<code>${err.message ||
      JSON.stringify(err)}</code>\n\n<code>${err.stack
      .replace('<', '{{')
      .replace('>', '}}')}</code>`
    bot.telegram.sendMessage(process.env.ADMIN, text, {
      parse_mode: 'HTML',
    })
  } catch (err) {
    console.error(err)
  }
}
