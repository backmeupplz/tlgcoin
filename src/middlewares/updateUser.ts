// Dependencies
import { ContextMessageUpdate } from 'telegraf'
import { report } from '../helpers/report'

export async function updateUser(ctx: ContextMessageUpdate, next) {
  const user = ctx.dbuser
  try {
    user.type = ctx.chat.type
    user.chat = ctx.chat
    user.username = ctx.chat.username
      ? ctx.chat.username.toLowerCase()
      : undefined
    if (user.type !== 'private') {
      if (!user.chat.username && !user.chat.invite_link) {
        try {
          const link = await ctx.telegram.exportChatInviteLink(user.id)
          user.chat.invite_link = link
        } catch (err) {
          await report(ctx.telegram, err)
        }
      }
    }
    await user.save()
  } catch (err) {
    await report(ctx.telegram, err)
  }
  next()
}
