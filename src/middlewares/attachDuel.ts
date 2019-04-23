// Dependencies
import { DuelModel } from '../models'
import { ContextMessageUpdate } from 'telegraf'
import { tryReport } from '../helpers/tryReport'

export async function attachDuelToCB(ctx: ContextMessageUpdate, next) {
  // Get duel
  const duelId = ctx.callbackQuery.data.split('~')[1]
  const duel = await DuelModel.findOne({ _id: duelId }).populate(
    'attacker defender'
  )
  if (!duel) {
    return tryReport(ctx.answerCbQuery(ctx.i18n.t('duel_not_found')))
  }
  ctx.duel = duel
  next()
}
