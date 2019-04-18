import { User } from 'telegram-typings'

export function getName(user: User) {
  return user.username
    ? user.username
    : `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`
}
