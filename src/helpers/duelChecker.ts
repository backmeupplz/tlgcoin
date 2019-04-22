// Dependencies
import { UserModel } from './../models/User'
import { Telegraf, ContextMessageUpdate, Extra } from 'telegraf'
import { DuelState, DuelModel, Duel } from '../models/Duel'
import { waitWhenUpdatesAreOver } from '../commands/duel'
import { ExtraEditMessage } from 'telegraf/typings/telegram-types'
import { getName } from './name'
import { format } from './format'
import I18N from 'telegraf-i18n'
import { report } from './report'
import { getUTCTime } from './date'

const dirtyI18N = require('telegraf-i18n')

let isChecking = false

let bot: Telegraf<ContextMessageUpdate>

export async function startCheckingDuels(
  newBot: Telegraf<ContextMessageUpdate>
) {
  bot = newBot
  setInterval(async () => {
    if (isChecking) {
      return
    }
    isChecking = true
    await checkDuels()
    isChecking = false
  }, 10 * 1000)
}

async function checkDuels() {
  try {
    const duels = await DuelModel.find({ state: DuelState.active }).populate(
      'attacker defender'
    )
    for (const duel of duels) {
      console.log(`Checking if ${duel.id} is finished`)
      if (duel.endDate && duel.endDate.getTime() < Date.now()) {
        duel.state = DuelState.finished
        await duel.save()
        const isTie = duel.attackerBalance === duel.defenderBalance
        const attackerWon = duel.attackerBalance > duel.defenderBalance
        let amountWon = 0
        if (!isTie) {
          amountWon = attackerWon
            ? Math.floor(duel.defender.balance * 0.2)
            : Math.floor(duel.attacker.balance * 0.2)
          await UserModel.findOneAndUpdate(
            { id: duel.defenderId },
            { $inc: { balance: amountWon * (attackerWon ? -1 : 1) } }
          )
          await UserModel.findOneAndUpdate(
            { id: duel.attackerId },
            { $inc: { balance: amountWon * (attackerWon ? 1 : -1) } }
          )
        }
        // Wait until message updates are over
        await waitWhenUpdatesAreOver(duel)
        // Get text
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
        const i18n = ((new dirtyI18N({
          directory: `${__dirname}/../../locales`,
          defaultLanguage: 'en',
          sessionName: 'session',
          useSession: false,
          allowMissing: false,
        }) as I18N).createContext(duel.attacker.language, {}) as any) as I18N
        // Update messages
        if (isTie) {
          try {
            let text = `${i18n.t('duel_finished_message_tie', {
              attacker: getName(duel.attacker.chat),
              defender: getName(duel.defender.chat),
              duelers,
            })}\n${i18n.t('updated', { time: getUTCTime() })}`
            if (ctx.chat.type === 'channel') {
              text = `${text} ${ctx.i18n.t('signature', {
                username: ctx.options.username,
              })}`
            }
            await bot.telegram.editMessageText(
              duel.attackerMessage.chat.id,
              duel.attackerMessage.message_id,
              undefined,
              text,
              Extra.HTML() as ExtraEditMessage
            )
          } catch (err) {
            report(bot.telegram, err)
          }
          try {
            let text = `${i18n.t('duel_finished_message', {
              attacker: getName(duel.attacker.chat),
              defender: getName(duel.defender.chat),
              duelers,
            })}\n${i18n.t('updated', { time: getUTCTime() })}`
            if (ctx.chat.type === 'channel') {
              text = `${text} ${ctx.i18n.t('signature', {
                username: ctx.options.username,
              })}`
            }
            await bot.telegram.editMessageText(
              duel.defenderMessage.chat.id,
              duel.defenderMessage.message_id,
              undefined,
              text,
              Extra.HTML() as ExtraEditMessage
            )
          } catch (err) {
            report(bot.telegram, err)
          }
        } else {
          try {
            let text = `${i18n.t('duel_finished_message', {
              attacker: getName(duel.attacker.chat),
              defender: getName(duel.defender.chat),
              duelers,
              winner: attackerWon
                ? getName(duel.attacker.chat)
                : getName(duel.defender.chat),
              looser: attackerWon
                ? getName(duel.defender.chat)
                : getName(duel.attacker.chat),
              amount: format(amountWon),
            })}\n${i18n.t('updated', { time: getUTCTime() })}`
            if (ctx.chat.type === 'channel') {
              text = `${text} ${ctx.i18n.t('signature', {
                username: ctx.options.username,
              })}`
            }
            await bot.telegram.editMessageText(
              duel.attackerMessage.chat.id,
              duel.attackerMessage.message_id,
              undefined,
              text,
              Extra.HTML() as ExtraEditMessage
            )
          } catch (err) {
            report(bot.telegram, err)
          }
          try {
            let text = `${i18n.t('duel_finished_message', {
              attacker: getName(duel.attacker.chat),
              defender: getName(duel.defender.chat),
              duelers,
              winner: attackerWon
                ? getName(duel.attacker.chat)
                : getName(duel.defender.chat),
              looser: attackerWon
                ? getName(duel.defender.chat)
                : getName(duel.attacker.chat),
              amount: format(amountWon),
            })}\n${i18n.t('updated', { time: getUTCTime() })}`
            if (ctx.chat.type === 'channel') {
              text = `${text} ${ctx.i18n.t('signature', {
                username: ctx.options.username,
              })}`
            }
            await bot.telegram.editMessageText(
              duel.defenderMessage.chat.id,
              duel.defenderMessage.message_id,
              undefined,
              text,
              Extra.HTML() as ExtraEditMessage
            )
          } catch (err) {
            report(bot.telegram, err)
          }
        }
      }
    }
  } catch (err) {
    await report(bot.telegram, err)
  }
}
