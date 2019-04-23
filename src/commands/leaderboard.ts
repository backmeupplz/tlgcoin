// Dependencies
import { checkLock } from '../middlewares/checkLock'
import { Telegraf, ContextMessageUpdate } from 'telegraf'
import { UserModel } from '../models'
import { getName, getNameWithLink } from '../helpers/name'
import { format } from '../helpers/format'
import { getUTCTime } from '../helpers/date'
import { refreshInlineButton } from '../helpers/buttons'

export function setupLeaderboard(bot: Telegraf<ContextMessageUpdate>) {
  bot.command('leaderboard', checkLock, async ctx => {
    await ctx.replyWithHTML(
      await leaderboardText(ctx),
      refreshInlineButton(ctx)
    )
  })
  bot.action('refresh', async ctx => {
    await ctx.editMessageText(
      await leaderboardText(ctx),
      refreshInlineButton(ctx)
    )
  })
}

async function leaderboardText(ctx: ContextMessageUpdate) {
  // Get stats
  const topUsers = await UserModel.find({ type: 'private' })
    .sort({ balance: -1 })
    .limit(10)
  const topChannels = await UserModel.find({ type: 'channel' })
    .sort({ balance: -1 })
    .limit(10)
  const topChats = await UserModel.find({
    type: ['group', 'supergroup'],
  })
    .sort({ balance: -1 })
    .limit(10)
  return `${ctx.i18n.t('leaderboard', {
    players: topUsers.reduce(
      (prev, cur, i) =>
        `${prev ? `${prev}\n` : prev}${i + 1}. ${
          ctx.chat.type === 'private'
            ? getNameWithLink(cur.chat)
            : getName(cur.chat)
        } (${format(cur.balance)})`,
      ''
    ),
    chats: topChats.reduce(
      (prev, cur, i) =>
        `${prev ? `${prev}\n` : prev}${i + 1}. ${getNameWithLink(
          cur.chat
        )} (${format(cur.balance)})`,
      ''
    ),
    channels: topChannels.reduce(
      (prev, cur, i) =>
        `${prev ? `${prev}\n` : prev}${i + 1}. ${getNameWithLink(
          cur.chat
        )} (${format(cur.balance)})`,
      ''
    ),
  })}\n${ctx.i18n.t('updated', { time: getUTCTime() })}`
}
