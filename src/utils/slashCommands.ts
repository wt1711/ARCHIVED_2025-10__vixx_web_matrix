export function parseMessageContent(text: string): {
  msgtype: string;
  body: string;
} {
  // /me emote command
  if (text.startsWith('/me ')) {
    return { msgtype: 'm.emote', body: text.substring(4) };
  }

  // /notice command
  if (text.startsWith('/notice ')) {
    return { msgtype: 'm.notice', body: text.substring(8) };
  }

  // Inline replacements
  let body = text;

  if (body.includes('/shrug')) {
    body = body.replace('/shrug', '¯\\_(ツ)_/¯');
  }

  if (body.includes('/tableflip')) {
    body = body.replace('/tableflip', '(╯°□°)╯︵ ┻━┻');
  }

  if (body.includes('/unflip')) {
    body = body.replace('/unflip', '┬─┬ノ( º _ ºノ)');
  }

  return { msgtype: 'm.text', body };
}
