/** I24: first five [a-z0-9] runs of the text, accents dropped, at most 40 characters. */
export const slugBranch = (text: string): string =>
  (text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .slice(0, 5)
    .join('-')
    .slice(0, 40)
    .replace(/-+$/, '')
