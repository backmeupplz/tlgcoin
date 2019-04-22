// Dependencies
import { Telegraf, ContextMessageUpdate } from 'telegraf'
import { checkLock } from '../middlewares/checkLock'

export function setupLock(bot: Telegraf<ContextMessageUpdate>) {
  bot.command('lock', checkLock, async ctx => {
    ctx.dbuser.adminLocked = !ctx.dbuser.adminLocked
    await ctx.dbuser.save()
    ctx.replyWithHTML(
      ctx.i18n.t(ctx.dbuser.adminLocked ? 'lock_on' : 'lock_off')
    )
  })
}
