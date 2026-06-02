---
status: approved
date: 2026-05-25
decision-makers: SE SitRep team
---

# Use Vitest for Unit Testing

## Context and Problem Statement

The course requires unit and end-to-end testing to be demonstrated throughout the project, not just at the end. We need a unit testing framework that works with vanilla JavaScript (ES modules), runs quickly enough to include in our CI/CD pipeline on every pull request, and has a low setup cost for a team that may not have extensive testing experience. Which unit testing framework should we use?

## Decision Drivers

* Must support vanilla JavaScript with ES modules — no TypeScript or framework-specific setup required
* Must have a Jest-compatible API so team members familiar with Jest can transfer that knowledge
* Must run fast enough to be practical in CI on every pull request without consuming excessive GitHub Actions minutes
* Should require minimal configuration to get started
* Should support code coverage reporting out of the box
* Must not conflict with our no-framework, no-build-step frontend approach

## Considered Options

1. Vitest
2. Jest
3. Mocha + Chai
4. Node.js built-in test runner (`node:test`)

## Decision Outcome

Chosen option: "Vitest", because it has native ES module support without configuration workarounds, a Jest-compatible API that minimizes the learning curve, fast execution via Vite's transform pipeline, and built-in features like coverage and watch mode that reduce the number of tools we need to configure.

### Consequences

* Good, because ES module `import`/`export` syntax works out of the box — no Babel or transform configuration needed
* Good, because the Jest-compatible API (`describe`, `it`, `expect`) means team members can use existing knowledge and online resources
* Good, because test execution is fast, keeping CI feedback loops short
* Good, because built-in coverage reporting (`vitest --coverage`) means we don't need to configure a separate coverage tool
* Bad, because Vitest is built on Vite, which is a dev dependency the team must install even though we are not using Vite as a build tool for the application itself
* Bad, because while Vitest is widely adopted, it has a smaller community than Jest, so some edge-case questions may have fewer Stack Overflow answers

### Confirmation

Confirmation will occur when unit tests for at least one module (e.g., a utility function or data validation logic) run successfully both locally and in the GitHub Actions CI pipeline, with coverage output visible in the workflow logs.

## Pros and Cons of the Options

### Vitest

A modern testing framework built on Vite with a Jest-compatible API.

* Good, because it supports ES modules natively — no configuration or transforms needed
* Good, because the API is nearly identical to Jest, lowering the learning curve
* Good, because it is significantly faster than Jest for ES module projects due to Vite's transform pipeline
* Good, because coverage, watch mode, and snapshot testing are built in
* Good, because it can be installed and run via `npx vitest` in CI without a project-wide Vite config
* Neutral, because it pulls in Vite as a dependency, but this is a dev-only dependency that does not affect the production frontend
* Bad, because it is a newer tool (stable since 2023) with a smaller ecosystem than Jest

### Jest

The most widely used JavaScript testing framework.

* Good, because it has the largest community, extensive documentation, and the most online resources
* Good, because it includes coverage, mocking, and snapshot testing out of the box
* Bad, because Jest's ES module support has been experimental for years and requires `--experimental-vm-modules` flag or Babel transforms
* Bad, because configuring Jest for a project that uses native ES modules (which ours does) often requires a `babel.config.js` and `@babel/preset-env`, adding tooling complexity
* Bad, because Jest's startup time is slower than Vitest for module-heavy projects due to its CommonJS-first transform pipeline

### Mocha + Chai

A flexible test runner (Mocha) paired with an assertion library (Chai).

* Good, because Mocha is highly configurable and has been an industry standard for over a decade
* Good, because it supports ES modules with the `--experimental-specifier-resolution` flag
* Bad, because it requires assembling multiple packages (Mocha for running, Chai for assertions, nyc/c8 for coverage, Sinon for mocking) — more configuration overhead
* Bad, because the separate-package approach means more documentation to read and more potential version conflicts
* Bad, because there is no built-in watch mode — requires additional tooling

### Node.js built-in test runner (`node:test`)

The test runner included in Node.js since version 18.

* Good, because it has zero external dependencies — ships with Node.js
* Good, because it supports ES modules natively
* Bad, because the API is less ergonomic and less familiar than Jest/Vitest (`test()` and `assert` vs. `describe`/`it`/`expect`)
* Bad, because it lacks built-in coverage (requires `--experimental-test-coverage` with limited output formats)
* Bad, because it has minimal ecosystem support — no watch mode, no snapshot testing, limited reporter options
* Bad, because fewer team members and online resources are familiar with it compared to Jest-style APIs

## More Information

* [Vitest documentation](https://vitest.dev/)
* [Vitest Jest compatibility](https://vitest.dev/guide/migration.html)
* Course project spec requires unit and e2e testing demonstrated throughout the project, not only at the end
