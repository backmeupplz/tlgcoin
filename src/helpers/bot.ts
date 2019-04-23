// Dependencies
import { ContextMessageUpdate, Telegraf } from 'telegraf'
import { tryReport } from './tryReport'
const TelegrafBot = require('telegraf')

export const bot = new TelegrafBot(process.env.TOKEN, {
  channelMode: true,
}) as Telegraf<ContextMessageUpdate>

bot.telegram.getMe().then(botInfo => {
  const anybot = bot as any
  anybot.options.username = botInfo.username
})

bot.catch(async err => {
  await tryReport(err)
})
