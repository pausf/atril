// Usage: node scripts/seed-skills.mjs <empty dir>
// Seeds a fake ~/.claude and ATRIL_HOME with 171 example skills (two plugins, usage) to drive Skills in the real app.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const root = process.argv[2]
const claude = join(root, 'claude')
const home = join(root, 'home')
const repo = join(root, 'shop-web')
const verbs = ['review', 'write', 'check', 'plan', 'fix', 'test', 'ship', 'trace', 'sketch', 'audit', 'sort', 'tidy', 'draft', 'probe']
const nouns = ['api', 'docs', 'specs', 'tests', 'deps', 'ui', 'css', 'logs', 'notes', 'tasks', 'mr', 'release', 'schema']
let n = 0
const name = () => `${verbs[n % verbs.length]}-${nouns[Math.floor(n++ / verbs.length) % nouns.length]}`
const skill = (dir, nm, desc, extra = '') => {
  mkdirSync(join(dir, 'skills', nm), { recursive: true })
  writeFileSync(join(dir, 'skills', nm, 'SKILL.md'), `---\nname: ${nm}\ndescription: ${desc}\n${extra}---\n\nDo the ${nm} step and report what changed.\n`)
}
const desc = (nm) => `Use when you need to ${nm.replace('-', ' the ')} of an example project, step by step, with a short report at the end.`

const settings = { skillOverrides: {} }
const personal = []
for (let i = 0; i < 100; i++) {
  const nm = name()
  personal.push(nm)
  skill(claude, nm, desc(nm), i % 17 === 0 ? 'disable-model-invocation: true\n' : '')
  if (i % 8 === 3) settings.skillOverrides[nm] = 'off'
  if (i % 23 === 5) settings.skillOverrides[nm] = 'name-only'
}
mkdirSync(join(claude, 'commands'), { recursive: true })
for (let i = 0; i < 6; i++) writeFileSync(join(claude, 'commands', `quick-${i}.md`), `---\ndescription: A quick example command number ${i}.\n---\nRun it.\n`)
mkdirSync(join(repo, '.claude'), { recursive: true })
for (let i = 0; i < 4; i++) skill(join(repo, '.claude'), `repo-${nouns[i]}`, `Project example for ${nouns[i]}.`)
skill(join(repo, '.claude'), personal[0], 'Project copy that the personal one hides.')

const installed = { version: 2, plugins: {} }
for (const [plugin, count] of [['toolbox@example-market', 40], ['writer@example-market', 20]]) {
  const dir = join(claude, 'plugins/cache', plugin.replace('@', '-'))
  for (let i = 0; i < count; i++) skill(dir, `${plugin.split('@')[0]}-${verbs[i % verbs.length]}-${i}`, `Plugin example skill ${i} from ${plugin.split('@')[0]}.`)
  installed.plugins[plugin] = [{ scope: 'user', installPath: dir, version: '1.0.0' }]
}
mkdirSync(join(claude, 'plugins'), { recursive: true })
writeFileSync(join(claude, 'plugins/installed_plugins.json'), JSON.stringify(installed))
writeFileSync(join(claude, 'settings.json'), JSON.stringify(settings, null, 2))

// Usage: one session file today with uses spread over the last 25 days.
const sess = join(claude, 'projects/-example')
mkdirSync(sess, { recursive: true })
const lines = []
for (let i = 0; i < 70; i++) {
  const nm = i % 3 === 0 ? `toolbox:toolbox-${verbs[i % verbs.length]}-${i % 40}` : personal[(i * 7) % 100]
  const ts = new Date(Date.now() - (i % 25) * 86400000 - i * 60000).toISOString()
  lines.push(JSON.stringify({ type: 'assistant', timestamp: ts, message: { content: [{ type: 'tool_use', name: 'Skill', input: { skill: nm } }] } }))
}
writeFileSync(join(sess, 'a.jsonl'), lines.join('\n') + '\n')

mkdirSync(home, { recursive: true })
writeFileSync(join(home, 'repos.json'), JSON.stringify({ repos: [{ id: 'shop-web', path: repo }] }))
process.stdout.write(`ATRIL_CLAUDE_DIR=${claude} ATRIL_HOME=${home}\n`)
