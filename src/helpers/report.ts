// Dependencies
import { Telegram } from 'telegraf'

export async function report(telegram: Telegram, err: Error) {
  const dismissableErrors = ['message is not modified']
  try {
    for (const errorText in dismissableErrors) {
      if (err.message.indexOf(errorText) > -1) {
        return
      }
    }
    const text = `Error:\n<code>${err.message ||
      JSON.stringify(err)}</code>\n\n<code>${err.stack
      .replace('<', '\\<')
      .replace('>', '\\>')}</code>`
    await telegram.sendMessage(process.env.ADMIN, text, {
      parse_mode: 'HTML',
    })
  } catch (err) {
    console.error(err)
  }
}
