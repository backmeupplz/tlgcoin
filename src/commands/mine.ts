// Dependencies
import { Telegraf, ContextMessageUpdate, Markup as m, Extra } from 'telegraf'
import Semaphore from 'semaphore-async-await'
import { findUser } from '../models'
import { getName } from '../helpers/name'

const mineLock = new Semaphore(1)

const mineAmount = 1

export function setupMine(bot: Telegraf<ContextMessageUpdate>) {
  bot.command('mine', async ctx => {
    // Send inline button
    await ctx.replyWithHTML(
      mineText(ctx),
      mineButtonExtraInline(ctx, mineAmount)
    )
  })
  bot.action('mine', async ctx => {
    // Lock semaphore
    await mineLock.wait()
    try {
      // Answer right away
      await ctx.answerCbQuery()
      // Add coins
      ctx.dbuser = await findUser(ctx.dbuser.id)
      console.log(`Increasing from ${ctx.dbuser.balance}`)
      ctx.dbuser.balance = ctx.dbuser.balance + mineAmount
      await ctx.dbuser.save()
      await ctx.editMessageText(
        mineText(ctx),
        mineButtonExtraInline(ctx, mineAmount)
      )
      console.log(`Increased to ${ctx.dbuser.balance}`)
    } catch (err) {
      // Do nothing
    } finally {
      // Release semaphore
      mineLock.signal()
    }
  })
}

function mineButtonExtraInline(ctx, amount) {
  return Extra.HTML().markup(m =>
    m.inlineKeyboard([
      m.callbackButton(ctx.i18n.t('mine_button', { amount }), 'mine'),
    ])
  )
}

function mineText(ctx) {
  const isPrivate = ctx.chat.type === 'private'
  const name = isPrivate ? getName(ctx.from) : ctx.chat.title
  return ctx.i18n.t(isPrivate ? 'mine_personal' : 'mine_group', {
    name,
    balance: ctx.dbuser.balance,
    cps: 0,
  })
}
