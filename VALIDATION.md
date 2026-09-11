# Validation — first release

- Seven automated checks pass: import schema rejection, rotated collision detection, door-gap geometry, initial furniture placement, initial/minimum furniture geometry generation, resized cabinet pivots, walking collisions with extended drawers.
- JavaScript syntax and static local asset / HTML control references checked.
- Local HTTP entrypoint returned 200.
- No browser visual or interaction QA was performed in this run. Cross-device performance, perceived lighting quality, touch usability and persistence interaction should be reviewed in use.
- Optional WebMCP support is feature-detected; no supported model-context test session was available. The optional tool contracts were not verified in a live context.
- This is an approximate traced model. 2.79 m ceiling height is user-provided; other vertical dimensions and inferred horizontal chains are documented assumptions. Collision checks are approximate 2D extents and sampled opening sweeps, not construction certification.

## Navigation update

Thirteen automated tests pass, including pointer release/lost capture, grab direction, click versus drag, plan panning, per-mode camera retention, bounded walk FOV, simultaneous forward/turn input, optional furniture collision and inward door swing. Tests use real geometry with synthetic pointer events; no browser visual QA was performed.

## A7 drawing correction

Seventeen automated checks pass. Added continuous bedroom-B boundary, relocated glazing, fixture-only migration, click selection plus operation, keyboard nudge dispatch and Escape release. Source image comparison: primary glazing widths 188 / 164 / 163 cm; bedroom B to balcony 106 cm. Bath-B glazing width/offset remains traced approximation; all glazing vertical dimensions remain assumed. Two shower enclosures inferred from wet-area symbols; no bathtub identifiable. No browser visual QA was performed.

## Clearance, fixed doors and solid furniture

Twenty-three automated checks pass. Signed clearances distinguish contact from sub-centimetre overlap, furniture warnings are room-scoped, and structural columns count as obstacles. Door slabs and both handles clear walls through the complete opening sweep. Every default room has a continuous route; synthetic frame-by-frame navigation visits all rooms without entering furniture or reporting blockage. Camera clearance is 10 cm, not a human accessibility clearance assessment. Saved custom furniture edits remain preserved. No browser visual QA was performed.

## Contact-constrained editing and cabinet opening styles

Thirty checks pass. Added fractional final-step wall contact, repeated-boundary nudges, swept dragging against walls/furniture, outward recovery from legacy overlaps, low-table/chair camera passage, wet-area structural blocks, and persisted left/right/double cabinet hinges. Height-dependent passage applies to tables/chairs/desks only; other furniture remains solid. Bath-A shower reduced to 108 cm width around the traced stepped solid wall. Balcony upper/lower solid areas are traced approximations. No browser visual QA was performed.

## Plan joints, outside columns and draft selection

Wall intersections now include shared 12 cm joint solids, so rendering and collision use the same continuous footprint instead of leaving half-wall notches at corners. Outside columns follow the A7 dimensions and wall-face offsets: the entry column is 80 × 84 cm and the lower-right column is 85 × 85 cm. The entry opening is 104 cm and the untouched default TV cabinet migrates clear of the enlarged upper-left column without changing custom placements.

All seven automated test files pass, including highlighted wall-junction coverage, exact outside-column dimensions, default furniture clearance, full door sweeps, strong draft markers and foreground-draft pick priority. Headless Chrome with software WebGL was checked at 1440 × 1000 and 390 × 844. A chair was moved into the dining table: the chair rendered above the table with a red translucent fill and border, and after deselection a click on the overlap selected the chair again. Orbit/top rendering and top-view geometry were visually reviewed; final subjective comparison on the user's display remains appropriate.

## Column placement follow-up

The living-room north-west column now exposes the plan's 40 × 49 cm dimensions inside the wall faces. Bath A uses one continuous lower-left structural column, with no tiled notch inside its footprint. The work-balcony south-east 85 × 85 cm column projects to the drawing's right side; its left face terminates the 147 cm balcony clearance, and the railing, south wall and shell follow that projection. All seven automated test files pass, `git diff --check` is clean, and a fresh 1440 × 1000 top-view browser capture was compared with the source plan at the three corrected locations.
