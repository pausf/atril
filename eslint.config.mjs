import js from '@eslint/js'
import tseslint from 'typescript-eslint'

const BOUNDARY = 'renderer y main solo hablan por preload'
const homeMessage = 'las rutas de casa salen de paths.ts (ATRIL_HOME en tests)'
const HOME = [
  "CallExpression[callee.name='homedir']",
  "ImportSpecifier[imported.name='homedir']",
  "CallExpression[callee.property.name='homedir']",
  "MemberExpression[object.object.name='process'][object.property.name='env'][property.name='HOME']",
  "MemberExpression[object.object.name='process'][object.property.name='env'][property.value='HOME']"
].map((selector) => ({ selector, message: homeMessage }))
const MOCK = { selector: "AssignmentExpression > MemberExpression.left[property.name='atril']", message: 'usa mockApi() de src/renderer/mockApi.ts' }

export default tseslint.config(
  { files: ['**/*.cjs'], languageOptions: { globals: { module: 'readonly', process: 'readonly' } } },
  { ignores: ['node_modules', 'out', 'dist', 'bocetos', '.agents'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    ignores: ['**/*.test.ts', '**/*.test.tsx'],
    rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['**/main', '**/main/**'], message: BOUNDARY }] }] }
  },
  {
    files: ['src/main/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['**/renderer', '**/renderer/**'], message: BOUNDARY }] }] }
  },
  { files: ['**/*.{ts,tsx}'], ignores: ['src/renderer/mockApi.ts'], rules: { 'no-restricted-syntax': ['error', MOCK] } },
  // A later no-restricted-syntax replaces the earlier one for the same file, so this one repeats MOCK.
  {
    files: ['src/main/**/*.ts'],
    ignores: ['**/*.test.ts', 'src/main/paths.ts', 'src/main/trust.ts', 'src/main/qa.ts'],
    rules: { 'no-restricted-syntax': ['error', MOCK, ...HOME] }
  }
)
