// Dependencies
import { Telegraf, ContextMessageUpdate, Markup as m } from 'telegraf'
import Semaphore from 'semaphore-async-await'
import { findUser } from '../models'

const mineLock = new Semaphore(1)

const mineAmount = 1

export function setupMine(bot: Telegraf<ContextMessageUpdate>) {
  bot.command('mine', ctx => {
    ctx.replyWithHTML(
      ctx.i18n.t('mine', { balance: ctx.dbuser.balance }),
      mineButtonExtra(ctx, mineAmount)
    )
  })
  bot.action('mine', async ctx => {
    // Lock semaphore
    await mineLock.wait()
    console.log(`Increasing from ${ctx.dbuser.balance}`)
    try {
      ctx.dbuser = await findUser(ctx.dbuser.id)
      ctx.dbuser.balance = ctx.dbuser.balance + mineAmount
      await ctx.dbuser.save()
      await ctx.editMessageText(
        ctx.i18n.t('mine', { balance: ctx.dbuser.balance }),
        mineButtonExtra(ctx, mineAmount)
      )
      console.log(`Increased to ${ctx.dbuser.balance}`)
    } finally {
      // Release semaphore
      mineLock.signal()
    }
  })
}

function mineButtonExtra(ctx, amount) {
  return {
    reply_markup: m.inlineKeyboard([
      m.callbackButton(ctx.i18n.t('mine_button', { amount }), 'mine'),
    ]),
  }
}
