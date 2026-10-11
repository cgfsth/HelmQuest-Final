# HelmQuest — System Documentation

Planning and architecture artifacts for the **HelmQuest** marine training simulator (`d:\tabang`).

## Feature Documentation

| Document | Description |
|----------|-------------|
| [post-docking-quiz.md](./post-docking-quiz.md) | Post-docking quiz system: architecture, API, integration guide |

## System Architecture
| Document | Description |
|----------|-------------|
| [system-planning.md](./system-planning.md) | Vision, scope, architecture, modules, risks |
| [gantt.md](./gantt.md) | Project timeline (Mermaid Gantt) |
| [data-flow.md](./data-flow.md) | Data flow diagrams (user, runtime, assets) |
| [erd.md](./erd.md) | Entity-relationship model |
| [json/](./json/) | Machine-readable schemas and project data |

## JSON files

| File | Purpose |
|------|---------|
| [helmquest-project.json](./json/helmquest-project.json) | Project manifest, stack, modules, screens |
| [helmquest-entities.json](./json/helmquest-entities.json) | Logical entities and relationships |
| [helmquest-schemas.json](./json/helmquest-schemas.json) | JSON Schema–style type definitions |
| [helmquest-training-modules.json](./json/helmquest-training-modules.json) | Training catalog (validators as metadata) |

## Viewing diagrams

Mermaid blocks render in GitHub, GitLab, VS Code (Markdown Preview), and many wiki tools. For Gantt charts, use a Mermaid-compatible viewer.
