# DIAGRMR

DIAGRMR is a static web app for building large rail-based plot diagrams. It is designed around fixed visual rules: location rails, plot boxes, character boxes, orthogonal connector lines, and an optional location organization column.

## Run Locally

From this folder:

```powershell
python -m http.server 5177 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:5177/
```

The app can also be opened directly from `index.html`, but a local server is better for browser behavior that matches GitHub Pages.

## GitHub Pages

DIAGRMR is plain static HTML/CSS/JavaScript. To publish with GitHub Pages, push the folder contents to a repository and enable Pages for the repository branch/root.

Runtime files:

- `index.html`
- `styles.css`
- `app.js`
- `router.js`
- `favicon.svg`

Reference files such as source spreadsheets, screenshots, and route diagrams are useful project documentation but are not required at runtime.

## Core Workflow

- Start a new diagram with one location box and one plot box.
- Type directly inside newly created boxes. Press Enter to finish.
- Right-click boxes to add plot points, characters, notes, branches, scene/chapter boxes, time boxes, meta boxes, and time-passage boxes.
- Right-click empty canvas space to add rails, insert or remove horizontal timeline space, and toggle common modes.
- Use Auto Shift to automatically open timeline space when plot boxes are added or widened. Turn it off for simultaneous/manual diagramming.
- Use Manager for diagram info, styles, stats, export settings, location organization, and searchable lists.
- Use Details for the selected item specs, tags, and notes.
- Use undo/redo for recent edits. Diagrams autosave to browser local storage.
- Save and load editable `.diagrmr.json` files.

## Boxes And Rails

- Plot boxes support normal, beginning, end, dialogue, death, and speculation styles.
- Manager > Styles lets you click color swatches to open a safe pastel palette, change built-in box colors, and add custom plot box colors. Custom colors appear in the plot Type menu and dark mode uses darker shades of the same colors.
- Location boxes auto-size by text while preserving rail alignment rules.
- Character boxes stack below plot boxes, wrap into columns of four when a plot has many characters, and can auto-width for longer names.
- Note boxes are small white annotations with solid borders by default. Plot notes sit below the plot before character boxes; location notes sit to the left; character, meta, scene/chapter, year/time, and time-passage notes can sit to the right or left where supported. Notes can also stack from other notes.
- Meta, scene/chapter, and time boxes live above the plot rails in this order: Films, Scenes/Chapters, then Years. Meta and scene/chapter markers also create yellow spans directly above the related plot box, and deleting either paired marker removes both.
- Time passage boxes span rail height and keep their label visible in the current viewport when practical.
- Rails can be moved, gathered by group, and organized through the location diagram or Manager.

## Lines

- Line Mode connects boxes from edge-center ports.
- Connector lines support solid, dotted, dashed, dash-dot, long dash, and related Excel-style line types.
- Manager > Styles can label line types for the current diagram, such as "dotted = audio" or "dashed = dream".
- Connector context menus can delete, restyle, reset routes, change ports, and add arrows.
- Manual route handles snap to the diagram grid.
- Double-click a connector to enter Line Mode.

## Box Mode

Box Mode draws encompassing boxes with an editable note label. These are useful for dream sequences, flashbacks, grouped passages, or author notes. Box Mode supports resizing, dashed borders, note placement, and deletion from the context menu.

## Location Diagram

The Locations side tab opens a condensed organization column. It mirrors location text from the main diagram and supports:

- groups and subgroups,
- sub-locations,
- gathering related rails,
- moving grouped rails up or down,
- jumping to the first or last plot on a rail from the split blank plot box,
- marker rows for Films, Scenes/Chapters, and Years, where each segment jumps to the corresponding marker.

Location organization changes do not change plot text or story content. They affect the organization column and, where intended, rail order.

## Navigation

- Drag the canvas background to pan.
- Hold the middle mouse button and move the mouse to auto-pan.
- Use Topmost, Bottommost, Leftmost, and Rightmost to jump to diagram extremes.
- Fit Height fits the top and bottom of the current diagram into view.
- Zoom in/out anchors to the selected box when one is selected. If nothing is selected, zoom uses the mouse or viewport center.
- The Map can be clicked or dragged to pan around the diagram.

## Manager And Details

- Manager > Info stores the title, author, date/status/source fields, logline, and overall notes for the file.
- Manager > Styles manages built-in colors, custom plot colors, and line meanings through compact swatches and a pastel color popover.
- Manager > Stats shows detailed counts, plot word averages, character usage, type breakdowns, structure stats, and used diagram size.
- Manager > Export contains SVG export controls, including location diagram, legend, background, and margin options.
- Details shows the selected item specs and stores notes and comma-separated tags on boxes, connectors, and enclosing boxes. Its toolbar button stays highlighted while open.
- Search opens from the magnifying-glass button or Ctrl/Cmd+F and positions itself to avoid covering the Details drawer.
- Search can include or exclude boxes, connectors, groups, notes, and tags.
- Search highlights matches and lets you jump through them with previous/next controls.
- Manager also provides sortable/jumpable lists for diagram contents, notes, markers, and location organization.

## Export

Export creates an SVG using the used diagram bounds plus a configurable margin. Options include:

- file type: SVG,
- include or exclude the location diagram,
- include or exclude a legend for only the box colors and labeled line types actually used in the diagram,
- background: grid, white, or transparent,
- export margin in inches.

## Shortcuts

- `L`: toggle Line Mode when not editing text.
- `B`: toggle Box Mode when not editing text.
- `Middle mouse hold`: auto-pan until released.
- `Ctrl/Cmd+Enter`: add plot point after the selected box.
- `Ctrl/Cmd+Shift+C`: add character below the selected plot or character box.
- `Ctrl/Cmd+Shift+B`: add branch below the selected plot box.
- `Ctrl/Cmd+F`: open DIAGRMR search when not editing text.
- `Ctrl/Cmd+Z`: undo.
- `Ctrl/Cmd+Y` or `Ctrl/Cmd+Shift+Z`: redo.
- `Esc`: close menus, leave modes, or cancel connector work.
