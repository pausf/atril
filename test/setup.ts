import { tmpdir } from 'node:os'
import { join } from 'node:path'

// One Claude config per test file: parallel files writing trust into a shared file raced (review, 9 nov).
process.env['ATRIL_CLAUDE_JSON'] = join(tmpdir(), `atril-test-claude-${process.pid}-${Math.random().toString(36).slice(2)}.json`)
// A test that never sets its own home still gets a temporary one; a test whose env is gone
// (deleted by afterEach while its work is still running) hits envPath's error instead (W42).
process.env['ATRIL_HOME'] = join(tmpdir(), `atril-test-home-${process.pid}-${Math.random().toString(36).slice(2)}`)
