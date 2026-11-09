import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // ponytail: real git and tmux in tests are slow when the machine is busy; 5 s flaked under load.
    testTimeout: 20_000
  }
})
