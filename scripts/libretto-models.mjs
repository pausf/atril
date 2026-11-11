// W151, W153: Libretto's reviewers only read and judge, so they run on Sonnet (half Opus's price);
// a model Libretto chose itself wins, and nothing else in the file changes.
const REVIEWERS = new Set(['converge-reader', 'review-lens-reliability', 'review-lens-security', 'spec-reviewer', 'work-reviewer'])

/** @param {string} text the agent file @param {string} name its file name without `.md` */
export function pinModels(text, name) {
  if (!REVIEWERS.has(name)) return text
  const front = /^---\n([\s\S]*?\n)---\n/.exec(text)
  if (!front || /^model:/m.test(front[1])) return text
  return `---\n${front[1]}model: sonnet\n---\n${text.slice(front[0].length)}`
}
