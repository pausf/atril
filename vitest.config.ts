import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The evals' sample repo and hidden acceptance tests are node:test files for a throwaway repo, not ours.
    exclude: [...configDefaults.exclude, 'evals/sample/**', 'evals/tasks/**'],
    // Tests that open a workspace must never touch the real ~/.claude.json.
    setupFiles: ['./test/setup.ts'],
    // ponytail: real git and tmux in tests are slow when the machine is busy; 5 s flaked under load.
    testTimeout: 20_000,
    // ponytail: ~10 workers each spawning real git/tmux starved one another (2 s tests took 35 s and timed out);
    // 4 keeps the slowest under 15 s for ~15 s more wall time. Split tmux suites into their own pool if it grows.
    maxWorkers: 4
  }
})
