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
