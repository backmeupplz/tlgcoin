// Dependencies
import { ContextMessageUpdate } from 'telegraf'

export async function convertChannelPost(ctx: ContextMessageUpdate, next) {
  if (ctx.channelPost) {
    ctx.message = ctx.channelPost
  }
  next()
}
