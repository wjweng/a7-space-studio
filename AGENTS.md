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

## Known Pitfalls

- A mesh with a single material ignores `geometry.groups`: every face is drawn. The unclipped beam box still calls `addGroup` for five faces, but its top face renders, and top view depends on it. Match what a mesh actually draws, not what its groups suggest.
- Do not fix coplanar seams with a depth offset. It only decides which surface wins, so the seam reappears on the other surface. Beams avoid seams geometrically instead (`beamVisiblePieces` / `beamGeometry` in `scene.js`); keep new solids that can hide beams in `ceilingOccluders`.
- Reproduce rendering bugs with the user's exported layout first. Resizing leaves sub-millimetre remainders that idealised test scenes never contain.
- Every edit path (drag, arrow-key nudge, handle resize, typed values) must share one exterior rule, `insideShell` in `model.js`: inside the outline *and* clear of the exterior walls' 12 cm thickness. When beam resizing checked only the outline, a beam could sit 6 cm inside a wall, and every later nudge was rejected because the start position already failed the rule.
- Lamp shadow maps are not redrawn every frame (`shadowMap.autoUpdate=false`). Scene methods that move, add, hide or relight geometry are wrapped at the end of `scene.js` to set `shadowsDirty`; door and cabinet animations request updates while they move. A new way of changing the scene must mark shadows dirty too, or shadows will lag behind it.
- Each shadow-casting light takes a texture unit in every lit material. Past `MAX_TEXTURE_IMAGE_UNITS` (16 on many GPUs, 32 in headless Chrome, so tests pass locally) textured materials fail to compile and silently vanish. `assignLampShadows` caps lamp shadows at `shadowBudget()`; keep any new shadow caster inside it.
- Every light costs shading on every pixel, and a shadow-casting light costs more. RectAreaLights more than doubled frame time in walk view, so fixtures use spot lights; measure frame time before adding lights.
- The view outside (`dist/surroundings.js`) is an estimate: tower kinds from 2025 Street View, distances (18 m north, 8 m east) from the owner. A7's three north windows face the right third of the louvred tower opposite; the east neighbour shares A7's setback, so it must not reach north past A7's north face. Outside materials are unlit `MeshBasicMaterial` with painted day and night looks, so indoor lamps and bounce never light the neighbours and they cost no shadow texture units; keep it that way.
- Some files mix CRLF and LF line endings (`dist/scene.js`, `tests/scene.test.mjs`, `VALIDATION.md`). Edit them byte-for-byte and confirm `git diff --stat` matches the size of the change; a text-mode rewrite silently converts every line.

## Security & Configuration

Do not commit secrets or user-exported layout JSON. Browser state is stored per origin in `localStorage`. Treat residential drawings as sensitive, and configure access controls at the hosting layer before broader sharing. Preserve `.openai/hosting.json` and the static `dist` publishing configuration.

Board finishes (`dist/finishes.js`) are modelled on a supplier catalogue whose images are all rights reserved. Never commit or hotlink supplier images: store only measured colours and pattern types, and generate textures in code. The side-by-side comparison sheets live in the Dropbox project folder (`材質比對/`), not here.
