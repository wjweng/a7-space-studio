# Validation and work history

## Modular cabinets and TV walls — 2026-09-24

The new cabinet editor supports template layouts, independent column widths and bottom clearances, adjustable shelf heights, per-cell open/door/drawer fronts, and a draggable elevation divider. TV cabinets can keep a TV as a separately positioned wall-mounted or cabinet-supported object. A TV wall combines a backboard, lower and upper cabinets, a TV, a wall anchor, editable outlet/conduit records, cable exits, access openings and a site-fact log; it exports an elevation SVG and a text schedule. A missing-data and obstruction-overlap list highlights records for field review.

All 17 automated test files pass (`npm test`). The new tests cover cabinet dimensions, resize and clearance geometry, TV-wall validation and resizing, outlet/conduit/service records, wall anchoring, SVG draft labels, site-obstruction warnings, standalone TVs and legacy consoles. `git diff --check` is clean. Headless Chrome with software WebGL loaded a saved layout containing a modular storage cabinet, a TV wall and a legacy console; the cabinet editor changed column width and added a shelf, the TV-wall editor selected a wall and added an outlet, conduit, cable exit and site record, the nested lower cabinet editor opened, and the legacy console converted to a modular cabinet plus a separate TV. Moving the converted console through the inspector moved its supported TV with it; typing a position along the wall moved the anchored TV wall and updated its offset. Desktop (1280 × 900) and mobile (390 × 844) dialog screenshots were reviewed. The new editors were usable and scrollable at both sizes; detailed elevations require scrolling.

All TV-wall exports visibly say **草案：未經現場核對，不可直接施工**. There are no measured wall, power or structural records for this project, so conduit specifications and positions are user-entered proposals. No construction compliance or site fit is certified. The remaining target-device checks are divider dragging by touch and electrical/structural review against actual survey data.

## Latest verified state — 2026-09-24

The application changes through `ca82a30` passed all 123 automated tests. Cloudflare Pages served files identical to the local `dist/` (checked by hash for the changed modules).

| Application commit | Work completed | How it was checked |
| --- | --- | --- |
| `4472a55` | Lights mount under beams; linear-light height works; fabric colours for sofas, chairs and beds (sofa board finish removed); walking passes plants; 3 mm floor-board end joints; unreadable saves set aside, persistent storage requested | Tests; browser with the owner's exported layout (beam-mounted light status, green sofa, floor joints, a deliberately corrupted save kept after the fallback overwrote the main save, discard button) |
| `8402f19` | Clear ceiling height 3.00 m; balcony opening and curtains follow it, doors and windows keep absolute heights; ratio lock applies to handle drags; example-beam line removed from the assumptions | Tests; browser (page text, height input maximum, typed ratio lock) |
| `ea59e21` | Door leaves hinge on the swing-side face corner and fill their frames; openings that start at a perpendicular wall use that wall's face | Tests sweeping every door 0–89° against walls; browser (front door closed, half open, open) |
| `22b29eb` | A1, A2 and A6 lobby door handles on the left, read from the plan's swing arcs | Tests; browser view from the front door (A6, A2, A3) |
| `b81905c` | Lift-lobby positions measured from A7's end wall at 4.73 cm per plan pixel: A6 and the A2 stair now open right beside A7's door (centres 1.2 / 1.35 m from the end wall, were 2.3 / 2.5 m); corridor 16.5 m long | Plan pixel measurement checked against the corridor's 2.66 m width; a test that fails on the old positions; browser view from the front door |
| `ca82a30` | Room floors choose from 55 SPC floorings (如沐, 如沐人字拼, 無限, 大匠) kept apart from the furniture board finishes; tiles generated plank by plank; saved board-finish floors fall back to the default | Tests on catalogue, tone distribution against the measured percentiles, joint spacing, herringbone period and texture repeat; catalogue-vs-generated sheets for all 55 (Dropbox `材質比對/地板比對-*.jpg`); browser (floor dialog groups, furniture dialog unchanged, herringbone and marble floors in the flat) |

Not verified in a browser: a dragged ratio-locked resize (synthetic drags could not target the handles), the paused-autosave path when storage is full, room doors other than the front door, and the A1 and A8 handles. How long the 55 flooring swatches take to appear on a machine with a GPU is unmeasured: headless Chrome renders the scene at about 1 fps, which starves the swatch queue, while each swatch alone takes about 30 ms.

## Earlier verified state — 2026-09-23

The application changes through `c402611` passed all 101 automated tests. Cloudflare Pages deployment succeeded, and the changed live JavaScript files were compared byte-for-byte with the local files. No application code changed in the subsequent documentation audit.

Desktop (1440 x 960) and mobile (390 x 844) screenshots were checked using the owner's exported furniture layout. The checks include all five window positions across the three rounds, plus roof/up, alley-side rings, the living room turned right and the work balcony turned right. Browser runs reported no console or shader errors. Dimensions, neighbouring floor alignment and colours remain estimates from ground-level photographs; exact matching to a real 14F view and target-device performance remain unverified.

| Application commit | Work completed | Comparison folder in the linked Dropbox project |
| --- | --- | --- |
| `07b4ab5` | Recessed north balconies and detailed east wall; initial version with two fitting columns | `window-view-review/` (historical) |
| `6e1ba50` | Horizontal perforated canopy, alley-side rings, three fitting columns, tile contrast and right-hand platform stack | `window-detail-review/` (historical; rings still near the corner) |
| `c402611` | Ring band centred on the actual side wall; broad openings and projecting floor details on both sides | `window-side-review/` (latest side-wall comparison) |

The sections below preserve each stage's results. Earlier test counts, rendering timings, assumptions and descriptions apply only to that stage; they are not the current specification. Current behaviour is documented in README.md and AGENTS.md. The two older comparison folders retain useful roof/east-wall views, but their right-tower ring placement has been superseded.

## First release (historical)

- Seven automated checks pass: import schema rejection, rotated collision detection, door-gap geometry, initial furniture placement, initial/minimum furniture geometry generation, resized cabinet pivots, walking collisions with extended drawers.
- JavaScript syntax and static local asset / HTML control references checked.
- Local HTTP entrypoint returned 200.
- No browser visual or interaction QA was performed in this run. Cross-device performance, perceived lighting quality, touch usability and persistence interaction should be reviewed in use.
- Optional WebMCP support is feature-detected; no supported model-context test session was available. The optional tool contracts were not verified in a live context.
- This is an approximate traced model. 3.00 m ceiling height is user-provided (2.79 m before 2026-09-24); other vertical dimensions and inferred horizontal chains are documented assumptions. Collision checks are approximate 2D extents and sampled opening sweeps, not construction certification.

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

## Exterior finish, curtains and bathroom operations

The entry bridge now shares the entry-column face, and the 104 cm entrance door begins below that column and opens inward to 89°. The exposed edge of the floor slab uses the wall finish, removing the brown strip outside the master-bedroom wall. Curtain geometry is bounded by the window and adjacent column; the living-room curtain starts at the column face in both closed and gathered states. Bath A's fixed door begins at the wall edge and opens to 80.5°.

Both shower enclosures now have hinged glass doors derived from the same geometry used for their swept collision checks. Default bathroom sinks and toilets touch their intended wall faces; the Bath B sink fills the 82 cm remaining run and Bath A uses the same width. Revision-nine migration updates only untouched old bathroom defaults. All seven automated test files pass. Headless Chrome checks at 1440 × 1000 and 390 × 844 opened both shower doors; the selected Bath B shower reported no planar interference.

## Kitchen and floor-board follow-up

Floor boards now exclude wall thicknesses, removing the remaining brown strip beside the master-bedroom east wall. Bath-A's default toilet moves to 6.00 m on the plan axis while remaining clear of the sink and shower. The kitchen default is 208 × 58 cm, fills the usable run to the inner face of the right wall and south exterior wall, and keeps the sink on the left with the cooktop on the right. Revision-ten migration updates only untouched legacy kitchen and Bath-A toilet defaults. All seven automated test files pass; a fresh headless Chrome top-view capture at 1440 × 1000 confirmed the three reported locations.

## Under-table clearance and adjustable fixtures

Bath-A's default toilet is now 5.92 m on the plan axis. Table and desk collision geometry separates tabletop clearance from four table legs: chairs may tuck under the top, while the chair back and legs remain collision checks. Bathroom sink recesses and kitchen sink/cooktop dimensions are persisted, clamped to their countertop zones, and editable from the inspector. The washer now renders a dark recessed drum behind its opening door. Eight automated test files pass; headless Chrome at 1440 × 1000 verified the kitchen controls, clamping behavior, top view and washer opening state.

## Lighting and direct resize editing

Lighting now uses lumens plus dimming percentage for the relative scene-light estimate. Ceiling fixtures stay attached to the ceiling, pendant fixtures expose drop length, and ceiling fixtures support round or square shapes. Lights are visible/selectable in top view and available from the add-furniture catalog. Four top-view edge handles resize furniture and beams in local coordinates; the resize solver shifts the center away from the apartment shell and only reduces the requested size when the full size cannot fit. Automated tests pass, `git diff --check` is clean, and headless Chrome verified light edits, catalog entries, top-view handles, and persisted chair resizing.

## Light temperatures and beam-edge editing

Default lights now use white light, while the inspector offers white, natural and warm/yellow temperatures. The fixture models use a smooth white body and diffuser without a dark centre. Top-view resizing no longer renders corner blocks: moving over a selected object edge changes to the corresponding resize cursor, and its geometry updates during the drag. Exterior-wall contact is valid when extending the opposite edge. Beam resizing preserves the opposite endpoint, may cross interior partitions, and remains constrained by the exterior shell. In orbit view with cutaway enabled, beams and their selection outline are hidden. All eight automated test files pass, including white-light migration, selected colour rendering, exterior-contact resizing, cross-partition beam resizing and cutaway beam visibility.

## Editor and rendering follow-up (historical)

All eight automated test files pass (`npm test`), including exterior-shell placement and boundary sliding, ceiling/floor layer separation, light-to-wall warnings, beam interior-partition traversal, 5 cm beam minimum dimensions, draft ceiling-object overlap, and fixed-door sweep clearance. The test suite also covers import validation, navigation, scene geometry, static assets and legacy layout migration.

Current interaction policy: exterior walls are hard placement boundaries; interior floor collisions and ceiling-object collisions remain editable red drafts. Floor objects do not check against ceiling objects. Lights check ceiling objects and walls; beams check other ceiling objects, may span interior partitions, and report clearance against exterior walls only. The "靠近牆面" action translates the object to a wall while preserving its rotation.

Ceiling material uses a depth offset to avoid the coplanar wall-top/ceiling rendering conflict. Beam rendering was reworked afterwards; see the next section. These are display-stability measures, not physical construction details. Current automated checks do not replace an interactive browser inspection at the target GPU, browser and display; lighting and visual seams should still be reviewed after future renderer/material changes.

## Beam seams against walls and the ceiling

A beam running inside a wall showed a dashed seam on the user's laptop panel (AMD integrated GPU) but not on an external monitor; browser zoom did not change it. The user's exported layout showed the beam face sat 0.2 mm proud of the bedroom A wall face after resizing (depth 0.11238817957503189 m). Beams now drop the footprint covered by walls, wall joints and structural solids that span the beam's full height (door and window lintels count only when they reach below the beam), emit no side face along the cut, and snap a face that overhangs a parallel full-height solid by less than 5 mm onto that face. Stored dimensions are unchanged. Clipped beams keep one top face over the whole outline, because top view shows beams from above.

Beams now hang exactly their entered depth below the ceiling. The former 12 mm upward shift made a 20 cm beam show 18.8 cm, and headless renders at 0 / 0.2 mm / 1.2 cm overlap differed from a 30 cm reference only by edge noise. A per-material depth offset was tried first and rejected: it moved the seam to the wall corner instead of removing it.

Sixty-eight automated tests pass, including the user's exact beam as a regression case, full-depth hanging, the retained top face and rebuild on move. Headless software-WebGL renders of the user's layout were compared version by version for the corridor view and top view. The user confirmed on the laptop panel that the wall seam and the ceiling junction are clean and that beams show in top view.

## Finishes, lighting rework and the view outside

Ninety-seven automated tests pass (`npm test`). Headless Chrome with software WebGL was used throughout at 1400 x 850, plus 1280 x 720 and 390 x 844 for the sidebar; frame times below are medians from that software renderer, so only their ratios mean anything.

Editing and catalogue. Beam resizing shares the exterior rule with dragging and nudging, so a beam can no longer sit inside a wall and freeze; arrow keys clamp to the shell instead of rejecting the move. Typed width/depth increases grow away from a wall or neighbour the item already touches. The object list filters by room and kind; reference drawings show cropped plan areas and open full size. Linear ceiling lights were added (120 x 4 cm default, 2 cm minimum width, resize cursors follow rotation). Migration 16 drops beams left at the catalogue template's (0,0).

Board finishes. 54 finishes from a supplier catalogue: each board's 10th/50th/90th percentile tones were measured from its large-board image at the texture's own resolution, and the textures are generated in code (straight, flame, soft, linen, concrete, solid, plus grain lines, pores and 12-18 cm veneer leaves), tiling seamlessly at 122 x 244 cm. No supplier image is stored; the comparison sheets are in the Dropbox project folder. Finishes apply to furniture's wooden parts and, per room, to floors. A finished room gets one continuous `roomFloorGeometry` panel, because `floorBoardRects()` covers only about three quarters of a room.

Lighting. Flush and linear fittings moved from point lights to RectAreaLights to kill ceiling hot spots, then to downward spot lights when nine area lights raised frame time from 390 to 600 ms; a gain keeps the panel brightness. Daylight is now shadowless sky light and lamps cast the shadows, redrawn only when the scene changes. Shadow-casting lamps are capped at eight: past `MAX_TEXTURE_IMAGE_UNITS` textured materials failed to compile and floors, wood and fabric vanished, which was reproduced with 39 lamps. A night-time hemisphere bounce lifts ceilings. Indoor ambient was rebalanced after sampling rendered pixels: with the old sky-heavy hemisphere and an unshadowed sun at 3.1, P64 walnut floor rendered (209,182,153), lighter than the default oak floor; it now renders (158,128,100) against a measured board colour of (140,112,88), with walls unchanged and ceilings neutral instead of brown.

The view outside. Neighbouring towers stand at the owner's estimated distances (18 m north across the lane, 8 m east on A7's setback), 14F sitting 41.6 m above the street, with painted facades from 2025 Street View: the louvred tower opposite (its right third facing A7's three north windows), a brown-slab tower, a ringed tower with fins across a small lane, and the east neighbour's grey tiled end wall with one column of slit windows. Outside materials are unlit with painted day and night looks, so they cost no shadow texture units and frame time did not change (520 vs 544 ms). The front door hinges on the south jamb, opens inward to 84.75 degrees with the handle on the right seen from inside, and its leaf fills the opening; this supersedes the 89-degree inward swing recorded above. Outside it is the lift lobby of the 5/7/9/11F plan (A6 then A5 on the right, the A2 stair, the open smoke lobby with its lifts out of sight inside, the A1 stair and A1 on the left, A3 and A2 ahead) on a polished light marble floor.

Not verified. All rendering judgements come from the software renderer and the owner's screenshots; the facades, lobby fittings, tower heights and window counts are estimates, and finish grain is not the real board. Shadow and lamp costs at the target GPU, and the perceived floor brightness after the ambient change, still need the owner's eye.


## Window facade depth and detail (2026-09-23, `07b4ab5`; historical)

All ten test files pass (`npm test`), including a new raycast regression verifying that the north balcony back wall is more than 1.3 m behind the projecting stone pier and that the east wall fittings project towards A7 without moving the eight-metre base wall. Existing tests still verify the three north windows' alignment with the tower's right third, estimated gaps, unlit materials, day/night switching and deterministic window illumination. `git diff --check` passes.

The north facade now has 1.35 m recessed glazing behind balcony slabs, parapets, rails, projecting stone piers and bronze louvres, plus small planted balconies at the east end. The east wall has fine vertical ceramic tiles with subpixel grout coverage, raised reveal edges, slit-window jambs/sills and two columns of projecting fittings. Repeated parts are instanced by colour with baked face shading, retaining unlit materials and no exterior shadow maps. Street View reference images remain outside the repository.

Headless Chromium with software WebGL rendered the owner's exported layout at 1440 x 960 and 390 x 844. Before/after captures use the same safe standing positions, open north curtains and camera settings for living, bedroom A, master bedroom, Bath B and work balcony, plus balcony night/mobile views. All final images were visually reviewed; no browser or shader errors were reported. Comparison images live in the linked Dropbox project's `window-view-review/` folder. The mobile balcony frame rose from 49 draw calls / 962 triangles to 72 / 31,526; this is a scene-complexity count, not a target-device timing measurement.

The 18 m / 8 m gaps, 3.2 m storey spacing and 41.6 m ground offset are retained. Tower heights, opening widths, balcony depths and floor-to-floor alignment are inferred, not surveyed. Ground-level photographs cannot establish the exact 14F view; final visual matching needs the owner's assessment or a photograph from that floor. Night window occupancy is illustrative.


## Facade reference corrections (2026-09-23, `6e1ba50`; ring placement superseded)

The north roof decoration is now a horizontal, 22 cm thick canopy with seven real elliptical openings, replacing the upright sky-painted panel. The right tower's rings are shallow annular geometry on its west wall facing the alley between the towers; the street-facing facade has recessed glazing, vertical fins and projecting floor blades. Ring placement is grouped in threes with a storey gap, inferred from the reference photograph.

The east neighbour now separates the warm darker central tiled band from pale flanking tiles, has three vertical exhaust-fitting columns, and includes a dark platform stack south/right of the direct balcony sightline. The body is split around that stack so its back wall is genuinely 1.25 m recessed. Platform floor slabs, low parapets and pale side piers are visible when turning right. Relative colours and dimensions are photographic estimates, not surveyed values.

Additional tests shoot rays through each canopy opening, check its horizontal bounds, verify rings lie on the alley wall, count three fittings per storey, compare centre/side tile pixels and measure the platform setback. Full `npm test` and `git diff --check` pass. Headless Chromium software-WebGL captures at 1440 x 960 and 390 x 844 used the owner's exported configuration, identical before/after camera poses, and open curtains. Reviewed all five window positions plus roof/up, right-tower side, balcony/right, mobile and night views with no console or shader errors. Images and the comparison page are in the Dropbox project's `window-detail-review/`; the preceding `window-view-review/` remains the earlier version.


## Centred ring band on the right tower's side wall (2026-09-23, `c402611`)

The preceding side-wall correction still placed the rings 3.5 m from the street corner. The ring geometry and dark slatted band now share the centre of the actual exposed side wall, accounting for the 1.05 m front-facade recess. The previous grid of small side windows is replaced by two broad stacks of dark openings flanking the centre band, with stone piers, projecting floor blades, parapets and sills. Paint and geometry share one side-layout calculation.

All 101 tests pass, including an assertion that every ring instance lies at the side-wall midpoint, balanced band margins, dark openings on both sides and two floor blades per storey. Desktop/mobile before-and-after captures use the owner's layout and identical camera positions, including the living-room view turned towards the side wall. Browser checks reported no errors. Comparison images live in `window-side-review/` in the linked Dropbox folder. Widths, colours and opening details remain inferred from oblique photographs.
