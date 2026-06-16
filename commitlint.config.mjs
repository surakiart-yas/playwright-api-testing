/**
 * Conventional Commits enforcement.
 * See: https://www.conventionalcommits.org/
 *
 * Format: <type>(<scope>): <subject>
 *
 * Example:
 *   feat(products): add bulk-publish endpoint
 *   fix(allure): correct story label index
 *   chore: bump playwright to 1.61
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Allowed commit types
    'type-enum': [
      2,
      'always',
      [
        'feat', // new feature
        'fix', // bug fix
        'docs', // documentation
        'style', // formatting only — no code change
        'refactor', // refactor — no behavior change
        'test', // adding / updating tests
        'chore', // tooling / config / deps
        'perf', // performance improvement
        'ci', // CI config change
        'revert', // revert a previous commit
        'build', // build system or external deps
      ],
    ],
    // Subject must not be empty
    'subject-empty': [2, 'never'],
    // Subject case — keep it flexible (sentence-case or lower-case)
    'subject-case': [0],
    // Header max length — generous so PR titles aren't truncated
    'header-max-length': [2, 'always', 100],
    // Body / footer line length — soft warning so wrap isn't forced
    'body-max-line-length': [1, 'always', 120],
  },
}
