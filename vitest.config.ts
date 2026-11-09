import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Tests that open a workspace must never touch the real ~/.claude.json.
    env: { ATRIL_CLAUDE_JSON: join(tmpdir(), 'atril-test-claude.json') },
    // ponytail: real git and tmux in tests are slow when the machine is busy; 5 s flaked under load.
    testTimeout: 20_000
  }
})
