# A7 空間工作室

Static browser-based Three.js interior editor. The complete public output is `dist/`.

Run `node server.mjs` to preview at http://127.0.0.1:4173. Run `npm test` for model geometry / import checks. No build is required. All rendering dependencies are vendored with the Three.js MIT licence.

## Current editor capabilities

- Orbit overview, top-down editing and first-person indoor navigation.
- Add, rename, duplicate, resize, rotate and move furniture; top-view edge dragging resizes an object while preserving the opposite edge.
- A7 exterior walls are hard movement boundaries. Interior collisions remain editable drafts so overlapping objects can be brought to the foreground and moved apart; table and desk tops allow chairs to tuck underneath while protecting legs and backs.
- Fixed doors, curtains, cabinet fronts, washer doors and both shower doors can be opened for a simplified sweep/interference check.
- Ceiling lights support round/square ceiling or pendant forms, white/natural/warm colour temperature, lumens, dimming and pendant drop. Beams can cross interior partitions; lights report wall overlap. Ceiling-object interference is shown as an editable draft, like floor furniture interference.
- Local named scenarios can be saved, loaded and deleted. The current working layout is the non-deletable baseline. JSON export/import transfers the browser-local state.

The collision and clearance labels are planning aids: they use 2D oriented-rectangle geometry and do not replace site measurement or construction coordination.

## Cloudflare

Deploy the `dist` directory as a Cloudflare Pages static site, with no build command. The app has no server bindings or secrets. Configure access restrictions at the hosting layer before sharing residential plans. Browser storage is per origin / device. Export and import JSON to transfer arrangements between deployments or devices.

## Scope and assumptions

A7 raster plan is the source of wall layout; A8 is furniture reference only. Dimensions are in metres internally; editor input is centimetres. 2.79 m is assumed clear ceiling height, wall thickness 0.12 m, door height 2.10 m, typical sill 0.90 m / glazing 1.50 m. Wall chains, column sizes, beam position, furniture dimensions, openings and swing directions require field verification. Model is an approximation, not construction documentation.

Procedural furniture uses locally generated material textures and geometric details. There are no exact-brand assets. Bed, sofa and chair resizing defaults to locked proportions. Cabinet parts rebuild from dimensions. Exterior-boundary movement is constrained; interior collisions use 2D oriented rectangles and discrete samples of opening sweeps, then remain visible as editable drafts rather than being auto-resolved. Curtain animation is a simplified pleated opening, not cloth physics. Lighting is illustrative, not a lux calculation.

User states and up to 30 named scenarios are stored in localStorage with JSON import/export. The working layout is always retained; saved named scenarios can be removed. No account, cloud synchronisation or collaboration is implemented. Optional WebMCP tools are feature-detected.
