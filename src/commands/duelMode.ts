// Dependencies
import { Telegraf, ContextMessageUpdate } from 'telegraf'
import { checkLock } from '../middlewares/checkLock'

export function setupDuelMode(bot: Telegraf<ContextMessageUpdate>) {
  bot.command('duelMode', checkLock, async ctx => {
    ctx.dbuser.duelsOn = !ctx.dbuser.duelsOn
    await ctx.dbuser.save()
    await ctx.replyWithHTML(
      ctx.i18n.t(ctx.dbuser.duelsOn ? 'duels_on' : 'duels_off')
    )
  })
}
