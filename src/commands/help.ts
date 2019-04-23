// Dependencies
import { Telegraf, ContextMessageUpdate } from 'telegraf'
import { checkLock } from '../middlewares/checkLock'

export function setupHelp(bot: Telegraf<ContextMessageUpdate>) {
  bot.command(['help', 'start'], checkLock, async ctx => {
    await ctx.replyWithHTML(ctx.i18n.t('help', { id: ctx.chat.id }))
  })
}
