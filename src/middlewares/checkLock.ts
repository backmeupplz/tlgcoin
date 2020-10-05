// Dependencies
import { ContextMessageUpdate } from 'telegraf'
import { tryReport } from '../helpers/tryReport'

export async function checkLock(ctx: ContextMessageUpdate, next: () => any) {
  // Non-group
  if (
    !ctx.dbuser.adminLocked ||
    ctx.chat.type === 'private' ||
    ctx.chat.type === 'channel'
  ) {
    next()
    return
  }
  // Superadmin (yay!)
  if (ctx.from.id === parseInt(process.env.ADMIN)) {
    next()
    return
  }
  // Anonymous admins
  if (
    ctx.from &&
    ctx.from.username &&
    ctx.from.username === 'GroupAnonymousBot'
  ) {
    next()
    return
  }
  // Chat admins
  if (await checkIfAdmin(ctx)) {
    next()
  } else {
    // Delete if needed
    await tryReport(
      ctx.telegram.deleteMessage(
        ctx.chat.id,
        (ctx.message || ctx.channelPost).message_id
      )
    )
  }
}

export async function checkIfAdmin(ctx: ContextMessageUpdate) {
  const admins = await tryReport(ctx.getChatAdministrators())
  if (!admins) {
    return true
  }
  let isAdmin = false
  for (const admin of admins) {
    if (admin.user.id === ctx.from.id) {
      isAdmin = true
      break
    }
  }
  return isAdmin
}

export async function checkIfAdminCB(
  ctx: ContextMessageUpdate,
  next: () => any
) {
  // Check if admin in nonprivate
  if (ctx.chat.type !== 'private' && !(await checkIfAdmin(ctx))) {
    await ctx.answerCbQuery(ctx.i18n.t('only_admins_error'))
  } else {
    return next()
  }
}
