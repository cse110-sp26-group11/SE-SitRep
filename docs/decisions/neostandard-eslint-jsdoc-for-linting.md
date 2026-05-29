---
status: accepted
date: 2026-05-22
decision-makers: SE SitRep team
---

# Use Neostandard with ESLint and eslint-plugin-jsdoc for Code Linting

## Context and Problem Statement

The course requires linting and quality checks to be performed both manually by developers and via the CI pipeline. We write vanilla JavaScript with JSDoc type annotations for documentation and type safety. We need a linting setup that enforces consistent code style, requires JSDoc on all functions, validates JSDoc types, and runs as a required check on every pull request. Which linting configuration should we use?

## Decision Drivers

- Must enforce a consistent code style across the team without lengthy debates about formatting rules
- Must require and validate JSDoc comments with `@param` and `@returns` type annotations
- Must be compatible with ESLint 9 and its flat config format (`eslint.config.mjs`)
- Must run in GitHub Actions as a required status check that blocks merging on failure
- Should require minimal configuration — preferably an opinionated ruleset the team adopts as-is
- Should not require a `package.json` or `node_modules` in the repository — linters are installed at CI time

## Considered Options

1. Neostandard + eslint-plugin-jsdoc (on ESLint 9)
2. eslint-config-standard + eslint-plugin-jsdoc (on ESLint 8)
3. StandardJS standalone
4. ESLint with a fully custom ruleset

## Decision Outcome

Chosen option: "Neostandard + eslint-plugin-jsdoc", because neostandard is the ESLint 9-compatible successor to eslint-config-standard, providing the same opinionated zero-debate style rules (no semicolons, 2-space indentation, single quotes) while supporting the modern flat config format. Combined with eslint-plugin-jsdoc, it enforces both code style and documentation requirements in a single CI step.

### Consequences

- Good, because the team adopts a fixed style ruleset — no time spent debating formatting preferences
- Good, because JSDoc enforcement catches undocumented functions at PR time, ensuring documentation stays current with code
- Good, because the entire setup is two files in the repository (`eslint.config.mjs` and `.github/workflows/lint.yml`) with no local `node_modules` required
- Good, because ESLint 9 with flat config is the current standard, so the setup will not need migration in the near future
- Bad, because neostandard's style is opinionated and non-negotiable — team members who prefer semicolons or tabs must adapt
- Bad, because requiring JSDoc on all function declarations and expressions adds overhead to writing code, especially during rapid prototyping

### Confirmation

Confirmation occurred when the linting workflow ran successfully in GitHub Actions on a pull request, correctly failing on a missing JSDoc comment and passing once the comment was added.

## Pros and Cons of the Options

### Neostandard + eslint-plugin-jsdoc

Neostandard provides Standard-style rules for ESLint 9 flat config; eslint-plugin-jsdoc enforces JSDoc presence and type validity.

- Good, because neostandard is purpose-built for ESLint 9 flat config — no compatibility issues or legacy config translation
- Good, because it provides the same well-known Standard style rules (no semicolons, 2-space indent, single quotes) that eliminate formatting debates
- Good, because eslint-plugin-jsdoc's function-call API (`jsdoc({ config: 'flat/recommended', rules: {...} })`) integrates cleanly into flat config
- Good, because Prettier is unnecessary — neostandard already handles formatting, reducing the number of tools
- Bad, because neostandard is newer and less widely known than eslint-config-standard, so some team members may not recognize the name
- Neutral, because neostandard is maintained by the same community as StandardJS, so the rules are identical in practice

### eslint-config-standard + eslint-plugin-jsdoc

The original Standard ruleset as an ESLint config, paired with JSDoc enforcement.

- Good, because eslint-config-standard is well-known and widely documented
- Bad, because eslint-config-standard@17 only supports ESLint 8 and uses the legacy `.eslintrc` config format
- Bad, because ESLint 8 requires the `ESLINT_USE_FLAT_CONFIG=true` flag for flat config, and eslint-config-standard uses `parserOptions` instead of the flat config `languageOptions.parserOptions`, causing runtime errors
- Bad, because peer dependency conflicts arise when installing eslint-config-standard alongside ESLint 9

### StandardJS standalone

A zero-config linter/formatter that bundles ESLint with a fixed Standard ruleset.

- Good, because it requires literally zero configuration — `npx standard` and it runs
- Good, because it enforces the same style as neostandard
- Bad, because it does not support adding plugins like eslint-plugin-jsdoc — JSDoc enforcement is not possible
- Bad, because without JSDoc enforcement, we cannot meet the course requirement for maintained code documentation

### ESLint with a fully custom ruleset

Configure ESLint from scratch with hand-picked rules.

- Good, because the team has full control over every rule
- Good, because rules can be tailored exactly to team preferences
- Bad, because selecting and justifying each rule requires significant upfront discussion and ongoing maintenance
- Bad, because custom rulesets tend to drift over time as team members add exceptions
- Bad, because the time spent debating rules (tabs vs spaces, semicolons vs none) does not contribute to the project deliverable

## More Information

- [Neostandard repository](https://github.com/neostandard/neostandard)
- [eslint-plugin-jsdoc documentation](https://github.com/gajus/eslint-plugin-jsdoc)
- [ESLint flat config documentation](https://eslint.org/docs/latest/use/configure/configuration-files)
- The CI workflow installs `eslint@9`, `neostandard`, and `eslint-plugin-jsdoc` at run time in GitHub Actions — no `package.json` is committed to the repository
- Related: HTMLHint and Stylelint are used alongside ESLint for HTML and CSS linting respectively, but are configured inline in the workflow and do not require separate ADRs at this time
