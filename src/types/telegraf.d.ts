// Dependencies
import I18N from 'telegraf-i18n'
import * as tt from 'telegraf/typings/telegram-types.d'
import { User, Duel } from '../models'
import { InstanceType } from '@hasezoey/typegoose'

declare module 'telegraf' {
  export class ContextMessageUpdate {
    dbuser: InstanceType<User>
    duel: InstanceType<Duel>
    i18n: I18N
    options: {
      username?: string
    }
  }

  export interface Composer<TContext extends ContextMessageUpdate> {
    action(
      action: string | string[] | RegExp,
      middleware: Middleware<TContext>,
      ...middlewares: Array<Middleware<TContext>>
    ): Composer<TContext>
  }
}
