// Dependencies
import { MessageUpdater } from '../helpers/MessageUpdater'
import { checkLock } from '../middlewares/checkLock'
import { Telegraf, ContextMessageUpdate } from 'telegraf'
import Semaphore from 'semaphore-async-await'
import { UserModel } from '../models'
import { getName } from '../helpers/name'
import { format } from '../helpers/format'
import { getUTCTime } from '../helpers/date'
import { tryReport } from '../helpers/tryReport'
import { mineButtonExtraInline } from '../helpers/buttons'

export enum MessageUpdateRequestStatus {
  Empty = 0,
  Occupied = 1,
  Requested = 2,
}

const mineAmount = 1

const mineLocks = {}
const messageUpdater = new MessageUpdater()

export function setupMine(bot: Telegraf<ContextMessageUpdate>) {
  bot.command('mine', checkLock, async ctx => {
    // Send inline button
    await ctx.replyWithHTML(
      await mineText(ctx),
      mineButtonExtraInline(ctx, mineAmount)
    )
  })
  bot.action('mine', async ctx => {
    // Answer right away
    await tryReport(ctx.answerCbQuery())
    // Lock semaphore
    let mineLock = mineLocks[ctx.dbuser.id]
    if (!mineLock) {
      mineLock = new Semaphore(1)
      mineLocks[ctx.dbuser.id] = mineLock
    }
    await mineLock.wait()
    // Try adding coins
    await tryReport(async () => {
      ctx.dbuser = await UserModel.findOneAndUpdate(
        { id: ctx.dbuser.id },
        { $inc: { balance: mineAmount } }
      )
    })
    // Release semaphore
    mineLock.signal()
    // Try updating balance message
    messageUpdater.update(
      `${ctx.chat.id}-${ctx.callbackQuery.message.message_id}`,
      async () => {
        await updateMessage(ctx)
      }
    )
  })
}

async function updateMessage(ctx: ContextMessageUpdate) {
  // Update message
  ctx.dbuser = await UserModel.findOne({ id: ctx.dbuser.id })
  const text = await mineText(ctx)
  const extra = mineButtonExtraInline(ctx, mineAmount)
  await ctx.editMessageText(text, extra)
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
