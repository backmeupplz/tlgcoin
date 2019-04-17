// Dependencies
import { findUser } from '../models'
import { ContextMessageUpdate } from 'telegraf'

export async function attachUser(ctx: ContextMessageUpdate, next) {
  const dbuser = await findUser(ctx.chat.id)
  ctx.dbuser = dbuser
  next()
}
