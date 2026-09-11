# Repository Guidelines

## Location & Related Files

The code lives only in this local repository (`~/projects/a7-space-studio`); it moved out of Dropbox on 2026-09-11 because Dropbox must not sync `.git/`. Never move it back. Non-code materials (original floor plan and furniture reference images) live in `Dropbox/Agent/100_Todo/projects/a7-space-studio/`, whose `README.md` points back here. Keep this pointer and that one in sync if either location changes.

## Project Structure & Module Organization

This repository is a buildless Three.js apartment editor. The deployable application lives in `dist/`: `app.js` coordinates UI and persistence, `scene.js` owns Three.js rendering and navigation, `model.js` defines the A7 floor plan and furniture data, `geometry.js` contains low-level geometry helpers, and `spatial.js` handles placement, clearance, doors, and routing. Styles and markup are in `dist/style.css` and `dist/index.html`. Keep reference drawings in `dist/assets/` and vendored Three.js files in `dist/vendor/`. Tests are in `tests/*.test.mjs`. `server.mjs` serves the static application locally.

## Build, Test, and Development Commands

- `npm install` installs the pinned development dependency from `package-lock.json` when needed.
- `node server.mjs` serves `dist/` at `http://127.0.0.1:4173` for local review.
- `npm test` runs all Node test files with the built-in test runner.

There is no compilation step. Changes under `dist/` are source changes and deployment output. Cloudflare Pages publishes the `dist` directory.

## Coding Style & Naming Conventions

Use browser-native ES modules, semicolons, and single-quoted JavaScript strings. Prefer `const`; use `let` only for reassigned state. Use camelCase for functions and variables, PascalCase for classes such as `SpaceScene`, and descriptive kebab-case IDs in HTML. Internal geometry uses metres; convert to centimetres only at UI boundaries. Keep rendering concerns in `scene.js`, floor-plan data in `model.js`, and reusable collision math outside UI handlers. For new multiline code, use two-space indentation. No formatter or linter is configured, so keep edits focused and follow nearby style.

## Testing Guidelines

Use `node:test` with `node:assert/strict`. Name files by subsystem, for example `tests/navigation.test.mjs`, and describe behavior in each `test()` title. Add regression coverage for geometry, collision, camera, persistence, or interaction changes. Run `npm test` before committing. For visual or responsive changes, also review the local site at desktop and mobile widths.

## Commit & Pull Request Guidelines

Recent commits use short imperative subjects, such as `Fix kitchen door pivots and master corner`. Keep each commit limited to one coherent behavior. Pull requests should explain the user-visible change, identify affected views, list validation performed, and include before/after screenshots for 3D or responsive UI changes. Link an issue when one exists.

## Security & Configuration

Do not commit secrets or user-exported layout JSON. Browser state is stored per origin in `localStorage`. Treat residential drawings as sensitive, and configure access controls at the hosting layer before broader sharing. Preserve `.openai/hosting.json` and the static `dist` publishing configuration.
