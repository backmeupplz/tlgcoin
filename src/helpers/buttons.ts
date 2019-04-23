// Dependencies
import { ContextMessageUpdate, Extra } from 'telegraf'
import { InstanceType } from 'typegoose'
import { Duel, DuelSide } from '../models'
import randomEmoji = require('random-emoji')

export function activeDuelInlineButton(
  ctx: ContextMessageUpdate,
  duel: InstanceType<Duel>,
  side: DuelSide
) {
  const n = Math.floor(Math.random() * 6 + 1)
  return Extra.HTML()
    .webPreview(false)
    .markup(m =>
      m.inlineKeyboard([
        [
          duelButton(m, ctx, n !== 1, duel, side),
          duelButton(m, ctx, n !== 2, duel, side),
        ],
        [
          duelButton(m, ctx, n !== 3, duel, side),
          duelButton(m, ctx, n !== 4, duel, side),
        ],
        [
          duelButton(m, ctx, n !== 5, duel, side),
          duelButton(m, ctx, n !== 6, duel, side),
        ],
      ])
    )
}

export function confirmDuelInlineButton(
  ctx: ContextMessageUpdate,
  duel: InstanceType<Duel>
) {
  return Extra.HTML()
    .webPreview(false)
    .markup(m =>
      m.inlineKeyboard([
        m.callbackButton(ctx.i18n.t('attack'), `attack~${duel.id}`),
        m.callbackButton(ctx.i18n.t('cancel'), `cancel~${duel.id}`),
      ])
    )
}

export function requestDuelInlineButton(
  ctx: ContextMessageUpdate,
  duel: InstanceType<Duel>
) {
  return Extra.HTML()
    .webPreview(false)
    .markup(m =>
      m.inlineKeyboard([
        m.callbackButton(ctx.i18n.t('fight'), `fight~${duel.id}`),
        m.callbackButton(ctx.i18n.t('flee'), `flee~${duel.id}`),
      ])
    )
}

export function refreshInlineButton(ctx: ContextMessageUpdate) {
  return Extra.HTML()
    .webPreview(false)
    .markup(m =>
      m.inlineKeyboard([m.callbackButton(ctx.i18n.t('refresh'), 'refresh')])
    )
}

export function mineButtonExtraInline(ctx, amount) {
  const n = Math.floor(Math.random() * 6 + 1)
  return Extra.HTML().markup(m =>
    m.inlineKeyboard([
      [
        mineButton(m, ctx, amount, n !== 1),
        mineButton(m, ctx, amount, n !== 2),
      ],
      [
        mineButton(m, ctx, amount, n !== 3),
        mineButton(m, ctx, amount, n !== 4),
      ],
      [
        mineButton(m, ctx, amount, n !== 5),
        mineButton(m, ctx, amount, n !== 6),
      ],
    ])
  )
}

function mineButton(m, ctx: ContextMessageUpdate, amount, isDud: boolean) {
  return m.callbackButton(
    isDud
      ? randomEmoji.random({ count: 1 })[0].character
      : ctx.i18n.t('mine_button', { amount }),
    isDud ? 'dud' : 'mine'
  )
}

function duelButton(m, ctx: ContextMessageUpdate, isDud: boolean, duel, side) {
  return m.callbackButton(
    isDud
      ? randomEmoji.random({ count: 1 })[0].character
      : ctx.i18n.t('duel_action'),
    isDud ? 'dud' : `duel~${duel.id}~${side}`
  )
}
