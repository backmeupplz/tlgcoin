// Dependencies
import { User, DuelModel, DuelState } from '../models'
import { ContextMessageUpdate } from 'telegraf'
import { getName } from './name'
import { tryReport } from './tryReport'

export async function checkDuel(
  attacker: User,
  defender: User,
  ctx: ContextMessageUpdate
) {
  // Check if it's the same person
  if (attacker.id === defender.id) {
    await tryReport(ctx.replyWithHTML(ctx.i18n.t('duel_self_error')))
    return false
  }
  // Check balance
  if (attacker.balance < 1000) {
    await tryReport(ctx.replyWithHTML(ctx.i18n.t('duel_balance_error')))
    return false
  }
  // Check if defender is channel
  if (defender.type === 'channel') {
    await tryReport(ctx.replyWithHTML(ctx.i18n.t('duel_channel_error')))
    return false
  }
  // Check defender duel mode
  if (!defender.duelsOn) {
    await tryReport(
      ctx.replyWithHTML(
        ctx.i18n.t('duel_off_error', {
          defender: getName(defender.chat),
        })
      )
    )
    return false
  }
  // Check if attacker is in duel now as attacker
  const activeAttackDuel = await DuelModel.findOne({
    attacker,
    state: DuelState.active,
  }).populate('attacker defender')
  if (activeAttackDuel) {
    await tryReport(
      ctx.replyWithHTML(
        ctx.i18n.t('active_duel_error', {
          attacker: getName(attacker.chat),
          defender: getName(activeAttackDuel.defender.chat),
        })
      )
    )
    return false
  }
  // Check if attacker is in duel now as defender
  const activeDefendDuel = await DuelModel.findOne({
    defender: attacker,
    state: DuelState.active,
  }).populate('attacker defender')
  if (activeDefendDuel) {
    await tryReport(
      ctx.replyWithHTML(
        ctx.i18n.t('active_duel_error', {
          attacker: getName(activeDefendDuel.attacker.chat),
          defender: getName(attacker.chat),
        })
      )
    )
    return false
  }
  // Check if defender is in duel now as attacker
  const activeAttackDuelDefender = await DuelModel.findOne({
    attacker: defender,
    state: DuelState.active,
  }).populate('attacker defender')
  if (activeAttackDuelDefender) {
    await tryReport(
      ctx.replyWithHTML(
        ctx.i18n.t('active_duel_error', {
          attacker: getName(defender.chat),
          defender: getName(activeAttackDuelDefender.defender.chat),
        })
      )
    )
    return false
  }
  // Check if attacker is in duel now as defender
  const activeDefendDuelDefender = await DuelModel.findOne({
    defender,
    state: DuelState.active,
  }).populate('attacker defender')
  if (activeDefendDuelDefender) {
    await tryReport(
      ctx.replyWithHTML(
        ctx.i18n.t('active_duel_error', {
          attacker: getName(activeDefendDuelDefender.attacker.chat),
          defender: getName(defender.chat),
        })
      )
    )
    return false
  }
  // Check if request has been sent too early
  const pastRequest = await DuelModel.findOne({
    defenderId: defender.id,
    attackerId: attacker.id,
    state: { $in: [DuelState.requested, DuelState.cancelled] },
  })
    .sort({ createdAt: -1 })
    .populate('attacker defender')
  if (
    pastRequest &&
    (pastRequest.createdAt.getTime() - Date.now()) / 1000 < 60 * 60 * 1000
  ) {
    await tryReport(ctx.replyWithHTML(ctx.i18n.t('duel_request_early_error')))
    return false
  }
  // Success
  return true
}
