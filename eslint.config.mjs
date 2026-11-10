import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { files: ['**/*.cjs'], languageOptions: { globals: { module: 'readonly', process: 'readonly' } } },
  { ignores: ['node_modules', 'out', 'dist', 'bocetos', '.agents'] },
  js.configs.recommended,
  ...tseslint.configs.recommended
)
