# A7 空間工作室

Static browser-based Three.js interior editor. The complete public output is `dist/`.

Run `node server.mjs` to preview at http://127.0.0.1:4173. Run `npm test` for model geometry / import checks. No build is required. All rendering dependencies are vendored with the Three.js MIT licence.

## Current editor capabilities

- Orbit overview, top-down editing and first-person indoor navigation.
- Add, rename, duplicate, resize, rotate and move furniture; top-view edge dragging resizes an object while preserving the opposite edge.
- A7 exterior walls are hard movement boundaries. Interior collisions remain editable drafts so overlapping objects can be brought to the foreground and moved apart; table and desk tops allow chairs to tuck underneath while protecting legs and backs.
- Fixed doors, curtains, cabinet fronts, washer doors and both shower doors can be opened for a simplified sweep/interference check.
- Typed width/depth changes grow away from a wall or furniture the item already touches instead of being rejected.
- Ceiling lights come as flush round/square fittings, pendants or recessed linear lights (2 cm minimum width), with white/natural/warm colour temperature, lumens, dimming and pendant drop. Flush and linear fittings light downward only; switched-on lamps cast shadows, up to a GPU-safe budget of the nearest eight. Beams can cross interior partitions; lights report wall overlap. Ceiling-object interference is shown as an editable draft, like floor furniture interference.
- 54 board finishes modelled on a supplier catalogue (colours measured, textures generated in code) can be applied to furniture's wooden parts and, room by room, to floors.
- The object list filters by room and by kind. The reference drawings show their plan areas and open full size.
- Walk view looks out on the neighbouring towers (north across the lane, east next door, modelled on 2025 Street View), the street below and the sky, and through the front door onto the lift lobby of the 5/7/9/11F plan. The north tower uses recessed balconies, projecting stone piers and bronze louvres; the east neighbour uses fine tiled walls, vertical reveals and framed slit windows with small wall fittings. Night darkens the sky and lights some windows.
- Local named scenarios can be saved, loaded and deleted. The current working layout is the non-deletable baseline. JSON export/import transfers the browser-local state.

The collision and clearance labels are planning aids: they use 2D oriented-rectangle geometry and do not replace site measurement or construction coordination.

## Cloudflare

Deploy the `dist` directory as a Cloudflare Pages static site, with no build command; pushes to `main` publish https://a7-space-studio.pages.dev/ in about 30 seconds. The app has no server bindings or secrets. The A7 plan is public marketing material, not the owner's residence (confirmed 2026-09-11), so no access restriction is needed. Browser storage is per origin / device. Export and import JSON to transfer arrangements between deployments or devices.

## Scope and assumptions

A7 raster plan is the source of wall layout; A8 is furniture reference only. Dimensions are in metres internally; editor input is centimetres. 2.79 m is assumed clear ceiling height, wall thickness 0.12 m, door height 2.10 m, typical sill 0.90 m / glazing 1.50 m. Wall chains, column sizes, beam position, furniture dimensions, openings and swing directions require field verification. Model is an approximation, not construction documentation.

Procedural furniture uses locally generated material textures and geometric details. There are no exact-brand assets: board finishes store only measured colours and a pattern type, and their grain is an approximation, not the real board. The view outside and the lift lobby are estimates from photos and the sales plan. Bed, sofa and chair resizing defaults to locked proportions. Cabinet parts rebuild from dimensions. Exterior-boundary movement is constrained; interior collisions use 2D oriented rectangles and discrete samples of opening sweeps, then remain visible as editable drafts rather than being auto-resolved. Curtain animation is a simplified pleated opening, not cloth physics. Lighting is illustrative, not a lux calculation; daylight is shadowless sky light.

User states and up to 30 named scenarios are stored in localStorage with JSON import/export. The working layout is always retained; saved named scenarios can be removed. No account, cloud synchronisation or collaboration is implemented. Optional WebMCP tools are feature-detected.
