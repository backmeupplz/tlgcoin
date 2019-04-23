// Dependencies
import { prop, Typegoose } from 'typegoose'
import { User } from './'
import { Message } from 'telegram-typings'

export enum DuelState {
  setup,
  requested,
  active,
  finished,
  cancelled,
}

enum DuelType {
  clicks,
  patience,
}

enum StakeType {
  percent,
  fixed,
}

export enum DuelSide {
  attacker = 0,
  defender = 1,
}

export class Duel extends Typegoose {
  @prop({
    enum: DuelType,
    required: true,
    default: DuelType.clicks,
    index: true,
  })
  type: DuelType

  @prop({ ref: User, required: true, index: true })
  attacker: User
  @prop({ required: true, index: true })
  attackerId: number
  @prop({ ref: User, required: true, index: true })
  defender: User
  @prop({ required: true, index: true })
  defenderId: number

  @prop()
  attackerMessage?: Message
  @prop()
  defenderMessage?: Message

  @prop({ required: true, default: 0 })
  attackerBalance: number
  @prop({ required: true, default: 0 })
  defenderBalance: number

  @prop({
    required: true,
    enum: DuelState,
    default: DuelState.setup,
    index: true,
  })
  state: DuelState

  @prop()
  endDate?: Date

  @prop({ enum: StakeType, required: true, default: StakeType.percent })
  stakeType: StakeType
  @prop({ required: true, default: 20 })
  stake: number

  @prop()
  createdAt?: Date
}

// Get Duel model
export const DuelModel = new Duel().getModelForClass(Duel, {
  schemaOptions: { timestamps: true },
})
