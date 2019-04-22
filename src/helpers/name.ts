import { Chat, User } from 'telegram-typings'

export function getName(chat: Chat | User) {
  if (!('type' in chat) || chat.type === 'private') {
    return chat.username
      ? chat.username
      : `${chat.first_name}${chat.last_name ? ` ${chat.last_name}` : ''}`
  } else {
    return (chat as Chat).title
  }
}

export function getNameWithLink(chat: Chat) {
  if (chat.type === 'private') {
    return chat.username
      ? `<a href="tg://user?id=${chat.id}">@${chat.username}</a>`
      : `<a href="tg://user?id="${chat.id}">${chat.first_name}${
          chat.last_name ? ` ${chat.last_name}` : ''
        }</a>`
  } else {
    return chat.username
      ? `<a href="https://t.me/${chat.username}">${chat.title}</a>`
      : chat.invite_link
      ? `<a href="${chat.invite_link}">${chat.title}</a>`
      : `${chat.title}`
  }
}
