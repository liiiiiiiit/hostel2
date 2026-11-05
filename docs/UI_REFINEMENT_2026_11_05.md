# Discovery and navigation refinement

Updates to pull request #5, retaining the cream, forest and terracotta direction.

- Search is part of the hero grid. On phones the order is introduction, search, then destination photograph; desktop keeps the split introduction/photo with a full-width search panel.
- The featured hostel section has room-category shortcuts. Every shortcut carries the current destination, dates and guest count into the existing hostel filters.
- Property cards show only amenities present in the property data, using existing labels in all four languages. Consistent card structure and a full-width primary action improve comparison.
- Tablet navigation exposes the four main destinations without opening a menu. Small phones retain the existing collapsible menu, outside-tap dismissal and Escape behavior.
- The desktop search jump scrolls the destination field into view before focusing it, respecting reduced-motion preferences.
- Responsive spacing, focus visibility, dark appearance and reduced-motion image behavior are included. Existing gallery and booking improvements from #5 are retained.

## Verification for this refinement

Repository source and changed-file structure reviewed through GitHub. No local execution environment was available in this session, so TypeScript, production build, automated tests and visual/browser checks have **not** been run for this new commit. Earlier validation reported in #5 applies to its earlier commit only. The repository's existing Browser and responsive audit workflow remains unchanged; its status must be checked on this commit.

Recommended visual checks: Persian and English at 320, 390, 768, 1024 and 1440 px; Armenian and Russian for long labels; light/dark modes; keyboard navigation; room shortcuts and search; saved/compare controls; gallery and booking flow.

This change does not deploy the VPS.
