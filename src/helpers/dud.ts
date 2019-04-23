// Dependencies
import { Telegraf, ContextMessageUpdate } from 'telegraf'
import { tryReport } from './tryReport'

export function setupDud(bot: Telegraf<ContextMessageUpdate>) {
  bot.action('dud', async ctx => {
    // Answer right away
    await tryReport(ctx.answerCbQuery(ctx.i18n.t('dud_message')))
  })
}
