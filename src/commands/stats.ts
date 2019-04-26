// Dependencies
import { UserModel } from '../models/User'
import { checkLock } from '../middlewares/checkLock'
import { Telegraf, ContextMessageUpdate } from 'telegraf'
import { format } from '../helpers/format'

export function setupStats(bot: Telegraf<ContextMessageUpdate>) {
  bot.command('stats', checkLock, async ctx => {
    const stats = await UserModel.aggregate([
      {
        $group: {
          _id: 'Stats',
          totalAmount: { $sum: '$balance' },
          count: { $sum: 1 },
        },
      },
    ])[0]
    await ctx.replyWithHTML(
      ctx.i18n.t('stats', {
        count: format(stats.count),
        total: format(stats.totalAmount),
      })
    )
  })
}
