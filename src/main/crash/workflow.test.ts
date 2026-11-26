import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const file = join(__dirname, '../../../.github/workflows/crash-report.yml')

describe('crash workflow', () => {
  it("the crash workflow turns a marked issue into a pull request safely", () => {
    const yml = readFileSync(file, 'utf8')
    const script = yml.slice(yml.indexOf('script: |'))

    // Only when an issue is opened.
    expect(yml).toMatch(/\non:\n {2}issues:\n {4}types: \[opened\]\n/)
    expect(yml.match(/^on:[\s\S]*?\n(?=\S)/m)?.[0].trim()).toBe('on:\n  issues:\n    types: [opened]')
    // Exactly these three permissions.
    expect(yml.match(/^permissions:\n((?: {2}.*\n)+)/m)?.[1]).toBe('  contents: write\n  pull-requests: write\n  issues: write\n')
    // Only for a marked title and body: a cheap `if:` first, the exact check inside the script.
    expect(yml).toMatch(/if: startsWith\(github\.event\.issue\.title, 'Crash '\)/)
    expect(script).toContain('/^Crash ([0-9a-f]{12}): /')
    expect(script).toContain('`<!-- atril-crash ${sig} -->`')
    // One step, github-script pinned to a full commit SHA.
    expect(yml.match(/^\s+- (?:uses|name|run):/gm)).toHaveLength(1)
    expect(yml).toMatch(/uses: actions\/github-script@[0-9a-f]{40} # v7\.0\.1\n/)
    // The issue only from context.payload; no expression inside the script.
    expect(script).toContain('context.payload.issue')
    expect(script).not.toContain('${{')
    expect(yml).not.toMatch(/run:/)
    // Too long a body is skipped.
    expect(script).toMatch(/body\.length > 65536\) return/)
    // Branch from the default branch unless it exists; the file unless it exists.
    expect(script).toContain('context.payload.repository.default_branch')
    expect(script).toMatch(/if \(!\(await exists\(\(\) => github\.rest\.git\.getRef\(\{ owner, repo, ref: `heads\/\$\{branch\}` \}\)\)\)\)/)
    expect(script).toContain('github.rest.git.createRef({ owner, repo, ref: `refs/heads/${branch}`')
    expect(script).toMatch(/if \(!\(await exists\(\(\) => github\.rest\.repos\.getContent\(\{ owner, repo, path, ref: branch \}\)\)\)\)/)
    expect(script).toContain('github.rest.repos.createOrUpdateFileContents({ owner, repo, path, branch, message: `docs(crash): ${sig}`,')
    // Public text in English: no Spanish, nothing named «fallos».
    expect(yml).not.toMatch(/fallo|[áéíóúñ]/i)
    expect(script).toContain('const path = `crash-reports/${sig}.md`')
    expect(script).toContain('const branch = `atril-crash/${sig}`')
    // The PR, titled as the issue, and its URL on the issue.
    expect(script).toContain('github.rest.pulls.create({ owner, repo, title: issue.title, head: branch, base, body: `From #${issue.number}.` })')
    expect(script).toContain('github.rest.issues.createComment({ owner, repo, issue_number: issue.number, body: pr.data.html_url })')
  })
})
