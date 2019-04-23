// Dependencies
import { ContextMessageUpdate, Extra } from 'telegraf'
import { InstanceType } from 'typegoose'
import { Duel, DuelSide } from '../models'

export function activeDuelInlineButton(
  ctx: ContextMessageUpdate,
  duel: InstanceType<Duel>,
  side: DuelSide
) {
  return Extra.HTML()
    .webPreview(false)
    .markup(m =>
      m.inlineKeyboard([
        m.callbackButton(ctx.i18n.t('duel_action'), `duel~${duel.id}~${side}`),
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
  return Extra.HTML().markup(m =>
    m.inlineKeyboard([
      [
        m.callbackButton(ctx.i18n.t('mine_button', { amount }), 'mine'),
        m.callbackButton(ctx.i18n.t('mine_button', { amount }), 'mine'),
      ],
      [
        m.callbackButton(ctx.i18n.t('mine_button', { amount }), 'mine'),
        m.callbackButton(ctx.i18n.t('mine_button', { amount }), 'mine'),
      ],
      [
        m.callbackButton(ctx.i18n.t('mine_button', { amount }), 'mine'),
        m.callbackButton(ctx.i18n.t('mine_button', { amount }), 'mine'),
      ],
    ])
  )
}
