// Dependencies
import { ContextMessageUpdate } from 'telegraf'
import { report } from '../helpers/report'

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
  // Chat admins
  if (await checkIfAdmin(ctx)) {
    next()
  } else {
    try {
      // Delete if needed
      await ctx.telegram.deleteMessage(
        ctx.chat.id,
        (ctx.message || ctx.channelPost).message_id
      )
    } catch (err) {
      await report(ctx.telegram, err)
    }
  }
}

export async function checkIfAdmin(ctx: ContextMessageUpdate) {
  try {
    const admins = await ctx.getChatAdministrators()
    let isAdmin = false
    for (const admin of admins) {
      if (admin.user.id === ctx.from.id) {
        isAdmin = true
        break
      }
    }
    return isAdmin
  } catch (err) {
    await report(ctx.telegram, err)
    // In case of issues, assume the user can perform the action
    return true
  }
}

export async function checkIfAdminCB(
  ctx: ContextMessageUpdate,
  next: () => any
) {
  // Check if admin in nonprivate
  if (ctx.chat.type !== 'private' && !(await checkIfAdmin(ctx))) {
    return ctx.answerCbQuery(ctx.i18n.t('only_admins_error'))
  } else {
    return next()
  }
}
