# HelmQuest — Gantt Chart

Timeline for planning and roadmap communication. Dates are illustrative from **May 2026**; adjust `dateFormat` and task dates to match your sprint calendar.

> **Paper-style Gantt (Figure 9 format):** see **[helmquest-gantt-chart.md](./helmquest-gantt-chart.md)** and import **[helmquest-gantt.csv](./helmquest-gantt.csv)** into Excel for colored timeline bars (Apr 2026 – Mar 2027).

## Project phases (overview)

```mermaid
gantt
    title HelmQuest — Development Roadmap
    dateFormat YYYY-MM-DD
    axisFormat %b %Y

    section Foundation
    Vue 3 + Vite scaffold           :done, f1, 2026-01-15, 14d
    Three.js ocean + sky            :done, f2, after f1, 21d
  Boat load + normalize scale       :done, f3, after f2, 14d
    Tropical island world           :done, f4, after f3, 14d

    section Simulation
    Custom boat kinematics          :done, s1, 2026-03-01, 21d
    Chase + orbit cameras           :done, s2, after s1, 10d
    Anchor + sinking model          :done, s3, after s2, 10d
    Island AABB collision           :done, s4, after s3, 7d

    section Training
    Training module catalog (6)     :done, t1, 2026-04-01, 14d
    Step validator engine           :done, t2, after t1, 10d
    Mock auth + dashboards          :done, t3, after t2, 14d

    section Helm Bridge
    Helm camera + overlay HUD       :done, h1, 2026-04-20, 14d
    3D ship wheel GLB               :done, h2, after h1, 7d
    Procedural wheelhouse interior  :done, h3, after h2, 7d
    Radar + nav chart canvases      :done, h4, after h3, 7d

    section Documentation
    System planning docs            :active, d1, 2026-05-30, 3d
    JSON schemas + entity export    :active, d2, after d1, 2d

    section Next (planned)
    Geofence / waypoint validators  :crit, n1, 2026-06-05, 21d
    Missions screen UI              :n2, after n1, 14d
    Refactor App.vue composables    :n3, 2026-06-05, 28d
    Progress API + persistence      :n4, after n2, 35d
    LMS / instructor reporting      :n5, after n4, 21d
```

## Sprint breakdown (detail)

```mermaid
gantt
    title HelmQuest — Q2 2026 Sprint Detail
    dateFormat YYYY-MM-DD

    section Sprint A — Validation
    Harbor buoy zones               :a1, 2026-06-05, 5d
    Dock distance checks            :a2, after a1, 5d
    Storm gate positions            :a3, after a2, 5d
    Waypoint compass routes         :a4, after a3, 5d

    section Sprint B — UX
    Missions overlay screen         :b1, 2026-06-26, 7d
    Training progress persistence   :b2, after b1, 7d
    Mobile touch helm (optional)    :b3, after b2, 10d

    section Sprint C — Platform
    REST auth service design        :c1, 2026-07-17, 5d
    User + session API              :c2, after c1, 14d
    Telemetry export endpoint       :c3, after c2, 10d
```

## Milestones

| Milestone | Target | Deliverable |
|-----------|--------|-------------|
| M1 — Playable sim | Complete | Ocean, boat, islands, WASD |
| M2 — Training alpha | Complete | 6 modules, mock LMS UI |
| M3 — Helm MVP | Complete | Helm camera, wheel, MFDs, interior |
| M4 — Docs package | 2026-05-30 | `docs/` planning set |
| M5 — Validation beta | 2026-06-26 | Geo/step checks live |
| M6 — Backend MVP | 2026-08-15 | Auth + progress API |

## Dependencies

```mermaid
flowchart LR
  M1[M1 Playable sim] --> M2[M2 Training]
  M1 --> M3[M3 Helm]
  M2 --> M5[M5 Validators]
  M3 --> M5
  M2 --> M6[M6 Backend]
  M5 --> M6
```

## Resource assumptions

- 1 full-stack developer (Vue + Three.js)
- Optional: 3D artist for interior/textures (Sprint B+)
- Optional: backend developer from Sprint C
