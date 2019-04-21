// Dependencies
import { Telegram } from 'telegraf'

export async function report(telegram: Telegram, err: Error) {
  try {
    const text = `Error:\n<code>${err.message || JSON.stringify(err)}</code>`
    await telegram.sendMessage(process.env.ADMIN, text, {
      parse_mode: 'HTML',
    })
  } catch (err) {
    console.error(err)
  }
}
