import { tmpdir } from 'node:os'
import { join } from 'node:path'

// One Claude config per test file: parallel files writing trust into a shared file raced (review, 9 nov).
process.env['ATRIL_CLAUDE_JSON'] = join(tmpdir(), `atril-test-claude-${process.pid}-${Math.random().toString(36).slice(2)}.json`)
