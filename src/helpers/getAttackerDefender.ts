// Dependencies
import { User, UserModel } from '../models/'
import { ContextMessageUpdate } from 'telegraf'
import { InstanceType } from 'typegoose'
import { tryReport } from './tryReport'

export async function getAttackerDefender(ctx: ContextMessageUpdate) {
  const components = (ctx.message || ctx.channelPost).text.split(' ')
  if (components.length < 2) {
    await tryReport(ctx.replyWithHTML(ctx.i18n.t('duel_format_error')))
    return false
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
    await tryReport(
      ctx.replyWithHTML(
        ctx.i18n.t('chat_not_found_error', {
          recipient: defenderHandleOrID,
        })
      )
    )
    return false
  }
  return {
    defender,
    attacker,
  }
}
