// Dependencies
import { checkLock } from '../middlewares/checkLock'
import { Telegraf, ContextMessageUpdate, Extra } from 'telegraf'
import { UserModel } from '../models'
import { getName, getNameWithLink } from '../helpers/name'
import { format } from '../helpers/format'
import { report } from '../helpers/report'
import { getUTCTime } from '../helpers/date'

export function setupLeaderboard(bot: Telegraf<ContextMessageUpdate>) {
  bot.command('leaderboard', checkLock, async ctx => {
    await ctx.replyWithHTML(
      await leaderboardText(ctx),
      refreshInlineButton(ctx)
    )
  })
  bot.action('refresh', async ctx => {
    try {
      await ctx.editMessageText(
        await leaderboardText(ctx),
        refreshInlineButton(ctx)
      )
    } catch (err) {
      await report(bot.telegram, err)
    }
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
  let text = `${ctx.i18n.t('leaderboard', {
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
  if (ctx.chat.type === 'channel') {
    text = `${text} ${ctx.i18n.t('signature', {
      username: ctx.options.username,
    })}`
  }
  return text
}

function refreshInlineButton(ctx: ContextMessageUpdate) {
  return Extra.HTML()
    .webPreview(false)
    .markup(m =>
      m.inlineKeyboard([m.callbackButton(ctx.i18n.t('refresh'), 'refresh')])
    )
}
