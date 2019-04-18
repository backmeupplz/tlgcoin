// Dependencies
import { Telegraf, ContextMessageUpdate, Markup as m, Extra } from 'telegraf'
import Semaphore from 'semaphore-async-await'
import { findUser } from '../models'
import { getName } from '../helpers/name'
import commaNumber = require('comma-number')

const balanceFormat = commaNumber.bindWith(' ', ',')

enum MessageUpdateRequestStatus {
  Empty = 0,
  Occupied = 1,
  Requested = 2,
}

const mineAmount = 1

const mineLocks = {}
const updateLocks = {}
const messageUpdateRequests = {}

export function setupMine(bot: Telegraf<ContextMessageUpdate>) {
  bot.command('mine', async ctx => {
    // Send inline button
    await ctx.replyWithHTML(
      mineText(ctx),
      mineButtonExtraInline(ctx, mineAmount)
    )
  })
  bot.action('mine', async ctx => {
    // Try answering right away
    try {
      // Answer right away
      await ctx.answerCbQuery()
    } catch (err) {
      // TODO: report
      console.error(err.message)
    }
    // Lock semaphore
    let mineLock = mineLocks[ctx.dbuser.id]
    if (!mineLock) {
      mineLock = new Semaphore(1)
      mineLocks[ctx.dbuser.id] = mineLock
    }
    await mineLock.wait()
    // Try adding coins
    try {
      // Add coins
      ctx.dbuser = await findUser(ctx.dbuser.id)
      console.log(`(${ctx.dbuser.id}) Increasing from ${ctx.dbuser.balance}`)
      ctx.dbuser.balance = ctx.dbuser.balance + mineAmount
      await ctx.dbuser.save()
      console.log(`(${ctx.dbuser.id}) Increased to ${ctx.dbuser.balance}`)
    } catch (err) {
      // TODO: report
      console.error(err.message)
    } finally {
      // Release semaphore
      mineLock.signal()
    }
    // Try updating balance message
    await updateMessage(ctx)
  })
}

async function updateMessage(ctx: ContextMessageUpdate) {
  // Get the unique id of the message
  const msgId = `${ctx.chat.id}-${ctx.callbackQuery.message.message_id}`
  // Lock semaphore
  let updateLock = updateLocks[msgId]
  if (!updateLock) {
    updateLock = new Semaphore(1)
    updateLocks[msgId] = updateLock
  }
  await updateLock.wait()
  // Check the update requests
  if (messageUpdateRequests[msgId]) {
    messageUpdateRequests[msgId] = MessageUpdateRequestStatus.Requested
    // Release lock
    updateLock.signal()
    return
  }
  messageUpdateRequests[msgId] = MessageUpdateRequestStatus.Occupied
  // Release lock
  updateLock.signal()
  do {
    try {
      // If requested, change to occupied
      if (
        messageUpdateRequests[msgId] === MessageUpdateRequestStatus.Requested
      ) {
        messageUpdateRequests[msgId] = MessageUpdateRequestStatus.Occupied
      }
      // Update message
      ctx.dbuser = await findUser(ctx.dbuser.id)
      console.log(
        `(${ctx.dbuser.id}) Updating message (${msgId}) to ${
          ctx.dbuser.balance
        }`
      )
      const text = mineText(ctx)
      const extra = mineButtonExtraInline(ctx, mineAmount)
      const requestStart = Date.now()
      await ctx.editMessageText(text, extra)
      const requestEnd = Date.now()
      console.log(
        `(${ctx.dbuser.id}) Updated message (${msgId}) to ${
          ctx.dbuser.balance
        } in ${(requestEnd - requestStart) / 1000}s`
      )
    } catch (err) {
      // TODO: report
      console.error(err.message)
    } finally {
      if (
        messageUpdateRequests[msgId] !== MessageUpdateRequestStatus.Requested
      ) {
        messageUpdateRequests[msgId] = MessageUpdateRequestStatus.Empty
      }
    }
  } while (
    messageUpdateRequests[msgId] === MessageUpdateRequestStatus.Requested
  )
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
    balance: balanceFormat(ctx.dbuser.balance),
    cps: 0,
  })
}
