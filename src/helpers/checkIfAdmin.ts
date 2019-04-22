// Dependencies
import { ContextMessageUpdate } from 'telegraf'

export async function checkIfAdmin(ctx: ContextMessageUpdate) {
  const admins = await ctx.getChatAdministrators()
  let isAdmin = false
  for (const admin of admins) {
    if (admin.user.id === ctx.from.id) {
      isAdmin = true
      break
    }
  }
  return isAdmin
}
