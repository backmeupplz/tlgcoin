// Dependencies
import { ContextMessageUpdate } from 'telegraf'
import { tryReport } from '../helpers/tryReport'

export async function updateUser(ctx: ContextMessageUpdate, next) {
  await tryReport(async () => {
    const user = ctx.dbuser
    user.type = ctx.chat.type
    user.chat = ctx.chat
    user.username = ctx.chat.username
      ? ctx.chat.username.toLowerCase()
      : undefined
    if (user.type !== 'private') {
      if (!user.chat.username && !user.chat.invite_link) {
        const link = await tryReport(ctx.telegram.exportChatInviteLink(user.id))
        user.chat.invite_link = link
      }
    }
    await user.save()
  })
  next()
}
