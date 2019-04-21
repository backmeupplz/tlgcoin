// Dependencies
import { ContextMessageUpdate } from 'telegraf'
import { prop, Typegoose } from 'typegoose'
import * as Telegram from 'telegram-typings'

export class User extends Typegoose {
  @prop({ required: true, index: true, unique: true })
  id: number
  @prop({ required: true, default: 'en' })
  language: string

  @prop({ required: true, default: 0 })
  balance: number

  @prop({ required: true, index: true })
  type: string
  @prop({ required: true })
  chat: Telegram.Chat
}

// Get User model
export const UserModel = new User().getModelForClass(User, {
  schemaOptions: { timestamps: true },
})

// Get or create user
export async function findOrCreateUser(ctx: ContextMessageUpdate) {
  let user = await UserModel.findOne({ id: ctx.chat.id })
  if (!user) {
    try {
      user = await new UserModel({
        id: ctx.chat.id,
        chat: ctx.chat,
        type: ctx.chat.type,
      }).save()
    } catch (err) {
      user = await UserModel.findOne({ id: ctx.chat.id })
    }
  }
  return user
}
