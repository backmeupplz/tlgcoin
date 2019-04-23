// Dependencies
import { Telegraf, ContextMessageUpdate } from 'telegraf'
import { checkLock } from '../middlewares/checkLock'

export function setupAttackerAnonimity(bot: Telegraf<ContextMessageUpdate>) {
  bot.command('attackerAnonimity', checkLock, async ctx => {
    ctx.dbuser.attackerAnonimity = !ctx.dbuser.attackerAnonimity
    await ctx.dbuser.save()
    await ctx.replyWithHTML(
      ctx.i18n.t(
        ctx.dbuser.attackerAnonimity
          ? 'attacker_anonimity_on'
          : 'attacker_anonimity_off'
      )
    )
  })
}
