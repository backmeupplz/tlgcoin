// Dependencies
import { findOrCreateUser } from '../models'
import { ContextMessageUpdate } from 'telegraf'

export async function attachUser(ctx: ContextMessageUpdate, next) {
  const dbuser = await findOrCreateUser(ctx)
  ctx.dbuser = dbuser
  next()
}
