// Dependencies
import { Telegraf, ContextMessageUpdate, Extra } from 'telegraf'
import Semaphore from 'semaphore-async-await'
import { UserModel } from '../models'
import { getName } from '../helpers/name'
import { format } from '../helpers/format'
import { report } from '../helpers/report'
import { getUTCTime } from '../helpers/date'

export enum MessageUpdateRequestStatus {
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
      await mineText(ctx),
      mineButtonExtraInline(ctx, mineAmount)
    )
  })
  bot.action('mine', async ctx => {
    // Try answering right away
    try {
      // Answer right away
      await ctx.answerCbQuery()
    } catch (err) {
      await report(ctx.telegram, err)
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
      ctx.dbuser = await UserModel.findOneAndUpdate(
        { id: ctx.dbuser.id },
        { $inc: { balance: mineAmount } }
      )
      // console.log(`(${ctx.dbuser.id}) Increased to ${ctx.dbuser.balance}`)
    } catch (err) {
      await report(ctx.telegram, err)
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
      ctx.dbuser = await UserModel.findOne({ id: ctx.dbuser.id })
      const text = await mineText(ctx)
      const extra = mineButtonExtraInline(ctx, mineAmount)
      await ctx.editMessageText(text, extra)
    } catch (err) {
      await report(ctx.telegram, err)
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

async function mineText(ctx: ContextMessageUpdate) {
  const position = format(
    (await UserModel.find({
      id: { $ne: ctx.chat.id },
      type: ctx.dbuser.type,
      balance: { $gt: ctx.dbuser.balance },
    }).countDocuments()) + 1
  )
  const isPrivate = ctx.chat.type === 'private'
  const name = getName(ctx.dbuser.chat)

  let text = `${ctx.i18n.t(isPrivate ? 'mine_personal' : 'mine_group', {
    name,
    balance: format(ctx.dbuser.balance),
    cps: 0,
    position,
  })}`
  text = `${text}\n${ctx.i18n.t('updated', { time: getUTCTime() })}`
  if (ctx.chat.type === 'channel') {
    text = `${text} ${ctx.i18n.t('signature', {
      username: ctx.options.username,
    })}`
  }
  return text
}
