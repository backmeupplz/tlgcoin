// Dependencies
import { User, UserModel } from '../models/User'
import { Telegraf, ContextMessageUpdate } from 'telegraf'
import { report } from '../helpers/report'
import { InstanceType } from 'typegoose'
import { getName } from '../helpers/name'
import { checkLock } from '../middlewares/checkLock'

export function setupTransfer(bot: Telegraf<ContextMessageUpdate>) {
  bot.command('transfer', checkLock, async ctx => {
    if (!ctx.message || !ctx.message.text) {
      return
    }
    try {
      const components = ctx.message.text.split(' ')
      if (components.length < 3) {
        return ctx.replyWithHTML(ctx.i18n.t('transfer_format_error'))
      }
      const recipientHandleOrID = components[1]
      // Get sender
      const sender = await UserModel.findOne({ id: ctx.from.id })
      if (!sender) {
        return ctx.replyWithHTML(
          ctx.i18n.t('chat_not_found_error', {
            recipient: getName(ctx.from),
          })
        )
      }
      // Get recipient
      let recipient: InstanceType<User>
      if (recipientHandleOrID.indexOf('@') > -1) {
        recipient = await UserModel.findOne({
          username: recipientHandleOrID.substr(1).toLowerCase(),
        })
      } else {
        recipient = await UserModel.findOne({
          id: parseInt(recipientHandleOrID, 10),
        })
      }
      if (!recipient) {
        return ctx.replyWithHTML(
          ctx.i18n.t('chat_not_found_error', {
            recipient: recipientHandleOrID,
          })
        )
      }
      const amount = parseInt(components[2], 10)
      // Check if amount is non-positive
      if (!amount || amount <= 0 || isNaN(amount)) {
        return
      }
      // Check balance
      if (sender.balance < amount) {
        return ctx.replyWithHTML(
          ctx.i18n.t('transfer_balance_error', {
            balance: sender.balance,
            amount,
          })
        )
      }
      // Transfer
      await UserModel.findOneAndUpdate(
        { id: sender.id },
        { $inc: { balance: amount * -1 } }
      )
      await UserModel.findOneAndUpdate(
        { id: recipient.id },
        { $inc: { balance: amount } }
      )
      // Reply with success
      await ctx.replyWithHTML(
        ctx.i18n.t('transfer_success', {
          amount,
          sender: getName(sender.chat),
          recipient: getName(recipient.chat),
        })
      )
    } catch (err) {
      console.log(err)
      await report(bot.telegram, err)
    }
  })
}
