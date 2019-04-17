// Dependencies
import { ContextMessageUpdate } from 'telegraf'

export function bypass(_: ContextMessageUpdate, next) {
  dispatch(next)
}

async function dispatch(next) {
  next()
}
