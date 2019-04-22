// Dependencies
import { Telegraf, ContextMessageUpdate } from 'telegraf'
import { checkIfAdmin } from '../helpers/checkIfAdmin'

export function setupDuelMode(bot: Telegraf<ContextMessageUpdate>) {
  bot.command('duelMode', async ctx => {
    // Check if admin in nonprivate
    if (ctx.chat.type !== 'private' && !(await checkIfAdmin(ctx))) {
      return ctx.replyWithHTML(ctx.i18n.t('only_admins_error'))
    }
    ctx.dbuser.duelsOn = !ctx.dbuser.duelsOn
    await ctx.dbuser.save()
    ctx.replyWithHTML(ctx.i18n.t(ctx.dbuser.duelsOn ? 'duels_on' : 'duels_off'))
  })
}
