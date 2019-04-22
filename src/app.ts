// Config dotenv
import * as dotenv from 'dotenv'
dotenv.config({ path: `${__dirname}/../.env` })
// Dependencies
import { bot } from './helpers/bot'
import { checkTime } from './middlewares/checkTime'
import { setupHelp } from './commands/help'
import { setupI18N } from './helpers/i18n'
import { setupLanguage } from './commands/language'
import { attachUser } from './middlewares/attachUser'
import { setupMine } from './commands/mine'
import { setupLeaderboard } from './commands/leaderboard'
import { updateUser } from './middlewares/updateUser'
import { setupTransfer } from './commands/transfer'
import { setupDuel } from './commands/duel'
import { setupDuelMode } from './commands/duelMode'
import { startCheckingDuels } from './helpers/duelChecker'
import { setupLock } from './commands/lock'

// Check time
bot.use(checkTime)
// Attach and update user
bot.use(attachUser)
bot.use(updateUser)
// Setup localization
setupI18N(bot)
// Setup commands
setupHelp(bot)
setupLanguage(bot)
setupMine(bot)
setupLeaderboard(bot)
setupTransfer(bot)
setupDuel(bot)
setupDuelMode(bot)
setupLock(bot)

// Start checking duels
startCheckingDuels(bot)

// Start bot
bot.startPolling()

// Log
console.info('Bot is up and running')
