// Dependencies
import { MessageUpdater } from '../helpers/MessageUpdater'
import { format } from '../helpers/format'
import { Telegraf, ContextMessageUpdate, Extra } from 'telegraf'
import Semaphore from 'semaphore-async-await'
import { InstanceType } from 'typegoose'
import { DuelModel, DuelState, Duel, DuelSide } from '../models/Duel'
import { getName, getNameWithLink } from '../helpers/name'
import { ExtraEditMessage } from 'telegraf/typings/telegram-types'
import { getUTCTime, getUTCDate, dateMinutesAfterNow } from '../helpers/date'
import { checkLock, checkIfAdminCB } from '../middlewares/checkLock'
import { attachDuelToCB } from '../middlewares/attachDuel'
import { checkDuel } from '../helpers/checkDuel'
import { getAttackerDefender } from '../helpers/getAttackerDefender'
import { tryReport } from '../helpers/tryReport'
import {
  confirmDuelInlineButton,
  requestDuelInlineButton,
  activeDuelInlineButton,
} from '../helpers/buttons'

const duelLock = new Semaphore(1)
export const messageUpdater = new MessageUpdater()

export function setupDuel(bot: Telegraf<ContextMessageUpdate>) {
  bot.command('duel', checkLock, async ctx => {
    // Lock semaphore
    await duelLock.wait()
    // Try setting up duel
    await tryReport(async () => {
      // Get players
      const players = await getAttackerDefender(ctx)
      if (!players) {
        return
      }
      const { attacker, defender } = players
      // Check duel
      if (!(await checkDuel(attacker, defender, ctx))) {
        return
      }
      // Create request
      let duel = await new DuelModel({
        attacker,
        attackerId: attacker.id,
        defender,
        defenderId: defender.id,
      }).save()
      // Confirm with attacker
      duel.attackerMessage = await ctx.telegram.sendMessage(
        attacker.id,
        ctx.i18n.t('duel_confirm', {
          attacker: getName(attacker.chat),
          defender: getName(defender.chat),
          attackerBalance: format(attacker.balance),
          defenderBalance: format(defender.balance),
        }),
        confirmDuelInlineButton(ctx, duel)
      )
      // Save duel
      await duel.save()
    })
    // Unlock semaphore
    duelLock.signal()
  })

  bot.action(/attack.+/g, checkIfAdminCB, attachDuelToCB, async ctx => {
    const duel = ctx.duel
    // Change state
    duel.state = DuelState.requested
    // Send request to defender
    ctx.i18n.locale(duel.defender.language)
    const attackerName = duel.defender.attackerAnonimity
      ? `<b>${ctx.i18n.t('anonymous_fighters')}</b>`
      : getNameWithLink(duel.attacker.chat)
    duel.defenderMessage = await tryReport(
      ctx.telegram.sendMessage(
        duel.defender.id,
        ctx.i18n.t('duel_request', {
          attacker: attackerName,
          defender: getName(duel.defender.chat),
          attackerBalance: format(duel.attacker.balance),
          defenderBalance: format(duel.defender.balance),
          type: ctx.i18n.t(duel.attacker.type),
        }),
        requestDuelInlineButton(ctx, duel)
      )
    )
    // Save duel
    await duel.save()
    // Update message for attacker
    ctx.i18n.locale(duel.attacker.language)
    await tryReport(
      ctx.editMessageText(
        ctx.i18n.t('duel_requested', {
          attacker: getName(duel.attacker.chat),
          defender: getName(duel.defender.chat),
        }),
        Extra.HTML() as ExtraEditMessage
      )
    )
    // Finish callback query
    await ctx.answerCbQuery()
  })

  bot.action(/cancel.+/g, checkIfAdminCB, attachDuelToCB, async ctx => {
    // Remove duel
    await ctx.duel.remove()
    // Edit message
    await tryReport(ctx.deleteMessage())
    // Answer callback query
    await ctx.answerCbQuery(ctx.i18n.t('duel_cancelled'))
  })

  bot.action(/flee.+/g, checkIfAdminCB, attachDuelToCB, async ctx => {
    const duel = ctx.duel
    // Update attacker message
    ctx.i18n.locale(duel.attacker.language)
    await tryReport(
      ctx.telegram.editMessageText(
        duel.attackerMessage.chat.id,
        duel.attackerMessage.message_id,
        undefined,
        ctx.i18n.t('defender_fled', {
          defender: getName(duel.defender.chat),
        }),
        Extra.HTML() as ExtraEditMessage
      )
    )
    // Cancel duel
    duel.state = DuelState.cancelled
    await duel.save()
    // Edit message
    await tryReport(ctx.deleteMessage())
    // Answer callback query
    ctx.i18n.locale(duel.defender.language)
    await ctx.answerCbQuery(ctx.i18n.t('flee_success'))
  })

  bot.action(/fight.+/g, checkIfAdminCB, attachDuelToCB, async ctx => {
    const duel = ctx.duel
    // Update the state
    duel.state = DuelState.active
    duel.endDate = dateMinutesAfterNow(10)
    await duel.save()
    // Update attacker message
    ctx.i18n.locale(duel.attacker.language)
    await tryReport(
      ctx.telegram.editMessageText(
        duel.attackerMessage.chat.id,
        duel.attackerMessage.message_id,
        undefined,
        activeDuelText(duel, ctx),
        activeDuelInlineButton(ctx, duel, DuelSide.attacker)
      )
    )
    // Update defender message
    ctx.i18n.locale(duel.defender.language)
    await tryReport(
      ctx.editMessageText(
        activeDuelText(duel, ctx),
        activeDuelInlineButton(ctx, duel, DuelSide.defender)
      )
    )
    await ctx.answerCbQuery(ctx.i18n.t('fight_message'))
  })

  bot.action(/duel.+/, attachDuelToCB, async ctx => {
    const duel = ctx.duel
    if (duel.state !== DuelState.active) {
      return ctx.answerCbQuery(ctx.i18n.t('duel_finished'))
    }
    // Get options
    const options = ctx.callbackQuery.data.split('~')
    // Answer callback query right away
    await tryReport(ctx.answerCbQuery())
    // Get if attacker or defender
    const side = parseInt(options[2], 10) as DuelSide
    // Increment the right side
    if (side === DuelSide.attacker) {
      await DuelModel.findOneAndUpdate(
        { _id: duel.id, state: DuelState.active },
        { $inc: { attackerBalance: 1 } }
      )
    } else {
      await DuelModel.findOneAndUpdate(
        { _id: duel.id, state: DuelState.active },
        { $inc: { defenderBalance: 1 } }
      )
    }
    await messageUpdater.update(duel.id, async () => {
      await updateMessages(ctx, duel)
    })
  })
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

async function updateMessages(
  ctx: ContextMessageUpdate,
  duel: InstanceType<Duel>
) {
  // Get fresh duel
  duel = await DuelModel.findOne({ _id: duel.id }).populate('attacker defender')
  // Update attacker message
  ctx.i18n.locale(duel.attacker.language)
  await tryReport(
    ctx.telegram.editMessageText(
      duel.attackerMessage.chat.id,
      duel.attackerMessage.message_id,
      undefined,
      activeDuelText(duel, ctx),
      activeDuelInlineButton(ctx, duel, DuelSide.attacker)
    )
  )
  // Update defender message
  ctx.i18n.locale(duel.defender.language)
  await tryReport(
    ctx.telegram.editMessageText(
      duel.defenderMessage.chat.id,
      duel.defenderMessage.message_id,
      undefined,
      activeDuelText(duel, ctx),
      activeDuelInlineButton(ctx, duel, DuelSide.defender)
    )
  )
}
