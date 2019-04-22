// Dependencies
import { format } from '../helpers/format'
import { UserModel, User } from './../models/User'
import { Telegraf, ContextMessageUpdate, Extra } from 'telegraf'
import Semaphore from 'semaphore-async-await'
import { report } from '../helpers/report'
import { InstanceType } from 'typegoose'
import { DuelModel, DuelState, Duel } from '../models/Duel'
import { getName } from '../helpers/name'
import { ExtraEditMessage } from 'telegraf/typings/telegram-types'
import { getUTCTime, getUTCDate } from '../helpers/date'
import { MessageUpdateRequestStatus } from './mine'
import { delay } from '../helpers/delay'
import { checkLock, checkIfAdminCB } from '../middlewares/checkLock'

enum DuelSide {
  attacker = 0,
  defender = 1,
}

const duelLock = new Semaphore(1)

export function setupDuel(bot: Telegraf<ContextMessageUpdate>) {
  bot.command('duel', checkLock, async ctx => {
    await duelLock.wait()
    try {
      const components = (ctx.message || ctx.channelPost).text.split(' ')
      if (components.length < 2) {
        return ctx.replyWithHTML(ctx.i18n.t('duel_format_error'))
      }
      const defenderHandleOrID = components[1]
      // Get attacker
      const attacker = ctx.dbuser
      // Get defender
      let defender: InstanceType<User>
      if (defenderHandleOrID.indexOf('@') > -1) {
        defender = await UserModel.findOne({
          username: defenderHandleOrID.substr(1).toLowerCase(),
        })
      } else {
        defender = await UserModel.findOne({
          id: parseInt(defenderHandleOrID, 10),
        })
      }
      if (!defender) {
        return ctx.replyWithHTML(
          ctx.i18n.t('chat_not_found_error', {
            recipient: defenderHandleOrID,
          })
        )
      }
      // Check if it's the same person
      if (attacker.id === defender.id) {
        return ctx.replyWithHTML(ctx.i18n.t('duel_self_error'))
      }
      // Check balance
      if (attacker.balance < 1000) {
        return ctx.replyWithHTML(ctx.i18n.t('duel_balance_error'))
      }
      // Check if defender is channel
      if (defender.type === 'channel') {
        return ctx.replyWithHTML(ctx.i18n.t('duel_channel_error'))
      }
      // Check defender duel mode
      if (!defender.duelsOn) {
        return ctx.replyWithHTML(
          ctx.i18n.t('duel_off_error', {
            defender: getName(defender.chat),
          })
        )
      }
      // Check if attacker is in duel now as attacker
      const activeAttackDuel = await DuelModel.findOne({
        attacker,
        state: DuelState.active,
      })
      if (activeAttackDuel) {
        return ctx.replyWithHTML(
          ctx.i18n.t('active_duel_error', {
            attacker: getName(attacker.chat),
            defender: getName(activeAttackDuel.defender.chat),
          })
        )
      }
      // Check if attacker is in duel now as defender
      const activeDefendDuel = await DuelModel.findOne({
        defender: attacker,
        state: DuelState.active,
      })
      if (activeDefendDuel) {
        return ctx.replyWithHTML(
          ctx.i18n.t('active_duel_error', {
            attacker: getName(activeDefendDuel.attacker.chat),
            defender: getName(attacker.chat),
          })
        )
      }
      // Check if defender is in duel now as attacker
      const activeAttackDuelDefender = await DuelModel.findOne({
        attacker: defender,
        state: DuelState.active,
      })
      if (activeAttackDuelDefender) {
        return ctx.replyWithHTML(
          ctx.i18n.t('active_duel_error', {
            attacker: getName(defender.chat),
            defender: getName(activeAttackDuelDefender.defender.chat),
          })
        )
      }
      // Check if attacker is in duel now as defender
      const activeDefendDuelDefender = await DuelModel.findOne({
        defender,
        state: DuelState.active,
      })
      if (activeDefendDuelDefender) {
        return ctx.replyWithHTML(
          ctx.i18n.t('active_duel_error', {
            attacker: getName(activeDefendDuelDefender.attacker.chat),
            defender: getName(defender.chat),
          })
        )
      }
      // Check if request has been sent too early
      const pastRequest = await DuelModel.findOne({
        defenderId: defender.id,
        attackerId: attacker.id,
        state: { $in: [DuelState.requested, DuelState.cancelled] },
      }).sort({ createdAt: -1 })
      if (
        pastRequest &&
        (pastRequest.createdAt.getTime() - Date.now()) / 1000 < 60 * 60 * 1000
      ) {
        return ctx.replyWithHTML(ctx.i18n.t('duel_request_early_error'))
      }
      // Create request
      let duel = await new DuelModel({
        attacker,
        attackerId: attacker.id,
        defender,
        defenderId: defender.id,
      }).save()
      // Notify attacker
      try {
        duel.attackerMessage = await ctx.telegram.sendMessage(
          attacker.id,
          ctx.i18n.t('duel_confirm', {
            attacker: getName(attacker.chat),
            defender: getName(defender.chat),
            attackerBalance: format(attacker.balance),
            defenderBalance: format(defender.balance),
          }),
          confirmInlineButton(ctx, duel)
        )
      } catch (err) {
        await report(ctx.telegram, err)
      }
      // Save duel
      await duel.save()
    } catch (err) {
      await report(bot.telegram, err)
    } finally {
      duelLock.signal()
    }
  })

  bot.action(/attack.+/g, checkIfAdminCB, async ctx => {
    // Get duel
    const duelId = ctx.callbackQuery.data.split('~')[1]
    const duel = await DuelModel.findOne({ _id: duelId }).populate(
      'attacker defender'
    )
    if (!duel) {
      return ctx.answerCbQuery(ctx.i18n.t('duel_not_found'))
    }
    // Change state
    duel.state = DuelState.requested
    // Send request to defender
    try {
      duel.defenderMessage = await ctx.telegram.sendMessage(
        duel.defender.id,
        ctx.i18n.t('duel_request', {
          attacker: getName(duel.attacker.chat),
          defender: getName(duel.defender.chat),
          attackerBalance: format(duel.attacker.balance),
          defenderBalance: format(duel.defender.balance),
        }),
        requestInlineButton(ctx, duel)
      )
    } catch (err) {
      report(ctx.telegram, err)
    }
    // Save duel
    await duel.save()
    // Update message for attacker
    try {
      await ctx.editMessageText(
        ctx.i18n.t('duel_requested', {
          attacker: getName(duel.attacker.chat),
          defender: getName(duel.defender.chat),
        }),
        Extra.HTML() as ExtraEditMessage
      )
    } catch (err) {
      report(ctx.telegram, err)
    }
    // Finish callback query
    ctx.answerCbQuery()
  })

  bot.action(/cancel.+/g, checkIfAdminCB, async ctx => {
    // Get duel
    const duelId = ctx.callbackQuery.data.split('~')[1]
    const duel = await DuelModel.findOne({ _id: duelId })
    if (!duel) {
      return ctx.answerCbQuery(ctx.i18n.t('duel_not_found'))
    }
    // Remove duel
    await duel.remove()
    // Edit message
    await ctx.deleteMessage()
    // Answer callback query
    await ctx.answerCbQuery(ctx.i18n.t('duel_cancelled'))
  })

  bot.action(/flee.+/g, checkIfAdminCB, async ctx => {
    // Get duel
    const duelId = ctx.callbackQuery.data.split('~')[1]
    const duel = await DuelModel.findOne({ _id: duelId }).populate('defender')
    if (!duel) {
      return ctx.answerCbQuery(ctx.i18n.t('duel_not_found'))
    }
    // Update attacker message
    try {
      await ctx.telegram.editMessageText(
        duel.attackerMessage.chat.id,
        duel.attackerMessage.message_id,
        undefined,
        ctx.i18n.t('defender_fled', {
          defender: getName(duel.defender.chat),
        }),
        Extra.HTML() as ExtraEditMessage
      )
    } catch (err) {
      report(ctx.telegram, err)
    }
    // Remove duel
    duel.state = DuelState.cancelled
    await duel.save()
    // Edit message
    await ctx.deleteMessage()
    // Answer callback query
    await ctx.answerCbQuery(ctx.i18n.t('flee_success'))
  })

  bot.action(/fight.+/g, checkIfAdminCB, async ctx => {
    // Get duel
    const duelId = ctx.callbackQuery.data.split('~')[1]
    const duel = await DuelModel.findOne({ _id: duelId }).populate(
      'attacker defender'
    )
    if (!duel) {
      return ctx.answerCbQuery(ctx.i18n.t('duel_not_found'))
    }
    // Update the state
    duel.state = DuelState.active
    const tenMinutesLater = new Date()
    tenMinutesLater.setMinutes(tenMinutesLater.getMinutes() + 10)
    duel.endDate = tenMinutesLater
    await duel.save()
    // Update attacker message
    try {
      await ctx.telegram.editMessageText(
        duel.attackerMessage.chat.id,
        duel.attackerMessage.message_id,
        undefined,
        activeDuelText(duel, ctx),
        activeDuelInlineButton(ctx, duel, DuelSide.attacker)
      )
    } catch (err) {
      await report(ctx.telegram, err)
    }
    // Update defender message
    try {
      await ctx.editMessageText(
        activeDuelText(duel, ctx),
        activeDuelInlineButton(ctx, duel, DuelSide.defender)
      )
    } catch (err) {
      await report(ctx.telegram, err)
    }
    ctx.answerCbQuery(ctx.i18n.t('fight_message'))
  })

  bot.action(/duel.+/, async ctx => {
    // Get options
    const options = ctx.callbackQuery.data.split('~')
    // Get duel
    const duelId = options[1]
    const duel = await DuelModel.findOne({ _id: duelId }).populate(
      'defender attacker'
    )
    if (!duel) {
      return ctx.answerCbQuery(ctx.i18n.t('duel_not_found'))
    }
    if (duel.state !== DuelState.active) {
      return ctx.answerCbQuery(ctx.i18n.t('duel_finished'))
    }
    // Answer callback query right away
    await ctx.answerCbQuery()
    // Get if attacker or defender
    const side = parseInt(options[2], 10) as DuelSide
    // Increment the right side
    if (side === DuelSide.attacker) {
      await DuelModel.findOneAndUpdate(
        { _id: duelId, state: DuelState.active },
        { $inc: { attackerBalance: 1 } }
      )
    } else {
      await DuelModel.findOneAndUpdate(
        { _id: duelId, state: DuelState.active },
        { $inc: { defenderBalance: 1 } }
      )
    }
    await updateMessages(ctx, duel)
  })
}

function confirmInlineButton(
  ctx: ContextMessageUpdate,
  duel: InstanceType<Duel>
) {
  return Extra.HTML()
    .webPreview(false)
    .markup(m =>
      m.inlineKeyboard([
        m.callbackButton(ctx.i18n.t('attack'), `attack~${duel.id}`),
        m.callbackButton(ctx.i18n.t('cancel'), `cancel~${duel.id}`),
      ])
    )
}

function requestInlineButton(
  ctx: ContextMessageUpdate,
  duel: InstanceType<Duel>
) {
  return Extra.HTML()
    .webPreview(false)
    .markup(m =>
      m.inlineKeyboard([
        m.callbackButton(ctx.i18n.t('fight'), `fight~${duel.id}`),
        m.callbackButton(ctx.i18n.t('flee'), `flee~${duel.id}`),
      ])
    )
}

function activeDuelText(duel: InstanceType<Duel>, ctx: ContextMessageUpdate) {
  const duelers =
    duel.attackerBalance > duel.defenderBalance
      ? `(${format(duel.attackerBalance)}) <b>${getName(
          duel.attacker.chat
        )}</b>\n(${format(duel.defenderBalance)}) <b>${getName(
          duel.defender.chat
        )}</b>`
      : `(${format(duel.defenderBalance)}) <b>${getName(
          duel.defender.chat
        )}</b>\n(${format(duel.attackerBalance)}) <b>${getName(
          duel.attacker.chat
        )}</b>`
  return `${ctx.i18n.t('active_duel', {
    attacker: getName(duel.attacker.chat),
    defender: getName(duel.defender.chat),
    duelers,
    duelEndTime: `${getUTCDate(duel.endDate)} ${getUTCTime(duel.endDate)}`,
  })}\n${ctx.i18n.t('updated', { time: getUTCTime() })}`
}

function activeDuelInlineButton(
  ctx: ContextMessageUpdate,
  duel: InstanceType<Duel>,
  side: DuelSide
) {
  return Extra.HTML()
    .webPreview(false)
    .markup(m =>
      m.inlineKeyboard([
        m.callbackButton(ctx.i18n.t('duel_action'), `duel~${duel.id}~${side}`),
      ])
    )
}

const updateLocks = {}
const messageUpdateRequests = {}

export async function waitWhenUpdatesAreOver(duel: InstanceType<Duel>) {
  while (messageUpdateRequests[duel.id]) {
    await delay(0.5)
  }
}

async function updateMessages(
  ctx: ContextMessageUpdate,
  duel: InstanceType<Duel>
) {
  // Get the unique id of the message
  const msgId = duel.id
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
    // If requested, change to occupied
    if (messageUpdateRequests[msgId] === MessageUpdateRequestStatus.Requested) {
      messageUpdateRequests[msgId] = MessageUpdateRequestStatus.Occupied
    }
    // Get fresh duel
    duel = await DuelModel.findOne({ _id: duel.id }).populate(
      'attacker defender'
    )
    // Update attacker message
    try {
      await ctx.telegram.editMessageText(
        duel.attackerMessage.chat.id,
        duel.attackerMessage.message_id,
        undefined,
        activeDuelText(duel, ctx),
        activeDuelInlineButton(ctx, duel, DuelSide.attacker)
      )
    } catch (err) {
      await report(ctx.telegram, err)
    }
    // Update defender message
    try {
      await ctx.telegram.editMessageText(
        duel.defenderMessage.chat.id,
        duel.defenderMessage.message_id,
        undefined,
        activeDuelText(duel, ctx),
        activeDuelInlineButton(ctx, duel, DuelSide.defender)
      )
    } catch (err) {
      await report(ctx.telegram, err)
    }
    // Release the locks
    if (messageUpdateRequests[msgId] !== MessageUpdateRequestStatus.Requested) {
      messageUpdateRequests[msgId] = MessageUpdateRequestStatus.Empty
    }
  } while (
    messageUpdateRequests[msgId] === MessageUpdateRequestStatus.Requested
  )
}
