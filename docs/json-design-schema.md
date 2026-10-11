# HelmQuest — JSON Design Schema

Visual JSON structure for HelmQuest, in the same style as a **JSON Design Schema** diagram (nested cards connected by lines).

---

## Files

| File | Purpose |
|------|---------|
| [json/helmquest-design-schema.json](./json/helmquest-design-schema.json) | **Paste this** into JSON Crack / JSON Designer |
| [json/helmquest-design-schema.meta.json](./json/helmquest-design-schema.meta.json) | JSON Schema definitions (validation / documentation) |
| [helmquest-schema.dbml](./helmquest-schema.dbml) | Database ERD (dbdiagram.io) |

---

## How to view (like your sample diagram)

1. Open **[jsoncrack.com/editor](https://jsoncrack.com/editor)** or **[jsonformatter.org/json-viewer](https://jsonformatter.org/json-viewer)**
2. Open `docs/json/helmquest-design-schema.json` from this project
3. Copy all contents and paste into the editor
4. The tool draws nested boxes for `metadata`, `profile`, `settings`, `simulation_runtime`, `training_module`, etc.

---

## Root structure `[2 items]`

The root is an **array of two example documents** (same pattern as the silo monitoring sample).

### Item 1 — `MissionAttemptRecord`

One graded mission run (PASS/FAIL popup + instructor “Recent performance”).

```
attempt_id, student_id, mission_id, module_id
score, pass_score, passed, completed_at
└── metadata (nested)
    ├── elapsed_seconds, elapsed_label
    ├── max_speed_knots
    ├── steps_completed, steps_total
    ├── pass_score_required
    ├── review_mode
    └── result_label  → "PASS" | "FAIL"
```

**Maps to:** `progress.sessions[]` in `helpers/progressStore.js`

---

### Item 2 — `StudentProgressBundle`

Full student + app state (dashboard, simulation, catalog).

```
student_id, user_id, name, email
├── profile          → XP, rank, missions_completed
├── settings         → camera, graphics, sound
├── simulation_runtime
│   ├── physics
│   ├── wind
│   ├── anchor
│   └── telemetry    → speed, heading, hull state
├── active_training  → current module/step (runtime)
├── mission_attempts[]   → history (persisted)
├── module_passes[]      → passed modules (persisted)
├── instructor_feedback[] → planned
└── navigation_missions[]
    └── training_module (nested)
        ├── steps[]
        └── objectives[]
```

**Maps to:** `progress.students`, `progress.sessions`, `progress.completedModules` + `App.vue` refs

---

## Comparison to silo sample

| Silo system | HelmQuest equivalent |
|-------------|----------------------|
| Alert log + `metadata` | **Mission attempt** + `metadata` (score breakdown) |
| Silo + `settings` | **Student** + `settings` (UI prefs) |
| Silo + `sensor` | **Student** + `simulation_runtime` (physics, wind, anchor) |
| `latest_readings` | **telemetry** inside `simulation_runtime` |
| `forecast_logs` | *not used* |
| `alert_logs` | **mission_attempts** + **instructor_feedback** |

---

## Persisted vs runtime

| JSON path | Persisted? | Storage |
|-----------|------------|---------|
| `mission_attempts` | Yes | `localStorage` → `helmquest-progress-v1` |
| `module_passes` | Yes | `localStorage` → `completedModules` |
| `profile` (partial) | Partial | `demoStudent` ref (mock XP) |
| `settings` | No | Vue refs until backend |
| `simulation_runtime` | No | In-memory during simulation |
| `active_training` | No | In-memory during simulation |
| `navigation_missions` | No | Constants in `App.vue` |

---

## Related docs

- ERD: [erd.md](./erd.md)
- Data flow: [data-flow.md](./data-flow.md)
- JSON Schema types: [json/helmquest-schemas.json](./json/helmquest-schemas.json)
