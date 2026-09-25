# MedAI Studio — Architecture

> Research prototype — not for clinical use.

---

## Service Architecture

```mermaid
graph TD
    Browser["Browser\nReact 18 + TypeScript\nVite + Tailwind CSS\nNiiVue (WebGL2)"]
    API["FastAPI (Python 3.11)\n/api/v1/*\nPort 8000"]
    Worker["Background Worker\nJob polling loop"]
    Inference["ONNX Runtime\nInference Service\nPort 8001"]
    DB["SQLite (dev)\nPostgreSQL 16 (Docker)\nPort 5432"]
    Storage["Local Storage\n./storage/\nNIfTI + ONNX files"]

    Browser -->|"HTTP REST\nlocalhost only"| API
    Browser -->|"ONNX test request\n/predict"| Inference
    API --> DB
    API --> Storage
    Worker --> DB
    Worker --> Storage
    Inference --> Storage
```

---

## Data Flow — Cardiac Quantification

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant A as API
    participant S as Storage
    participant DB as Database

    U->>A: GET /api/v1/datasets/scan-local
    A->>S: Read data/synthetic/ or data/raw/acdc/
    A-->>U: Subject list

    U->>A: POST /api/v1/datasets/import-synthetic
    A->>DB: Create Subject records
    A-->>U: Import confirmation

    U->>A: POST /api/v1/cardiac/compute-quantification/{subject_id}
    A->>S: Load NIfTI frames + GT masks
    Note over A: Compute EDV/ESV/SV/EF/mass\nfrom NIfTI header affine\n(voxel spacing, NOT assumed defaults)
    A->>DB: Store CardiacMeasurement
    A-->>U: Measurements + disclaimer label
```

---

## Data Flow — Benchmark & Optimization

```mermaid
sequenceDiagram
    participant U as User
    participant A as API
    participant DB as Database

    U->>A: POST /api/v1/benchmarks/run-suite
    Note over A: Simulate Dice/FLOPs/latency\nfor each architecture\n(synthetic data only in current build)
    A->>DB: Store BenchmarkResult rows
    A-->>U: Results with provenance

    U->>A: POST /api/v1/optimization/mcdm-rank
    Note over A: TOPSIS algorithm\n- Normalize criteria\n- Benefit: Dice (maximize)\n- Cost: Latency, Params, FLOPs (minimize)\n- Weights from user sliders (sum to 1.0)
    A-->>U: Ranked models + relative closeness scores\n"Decision-support ranking"

    U->>A: GET /api/v1/optimization/pareto
    Note over A: Non-dominated sorting\non Dice × Latency trade-off
    A-->>U: Models with is_pareto_optimal flag
```

---

## Frontend Page Architecture

```mermaid
graph LR
    subgraph Auth
        Login[LoginPage\n/login]
    end

    subgraph Core["Core (Implemented — Phases 0-4)"]
        Dashboard[DashboardPage\n/dashboard]
        Datasets[DatasetsPage\n/datasets]
        Viewer[ViewerPage\n/viewer\nNiiVue WebGL2]
        Cardiac[CardiacProfilePage\n/cardiac-profile]
        Benchmarks[BenchmarksPage\n/benchmarks]
        Optimization[OptimizationPage\n/optimization\nTOPSIS + Pareto]
        Deployments[DeploymentsPage\n/deployments\nONNX export]
    end

    subgraph Stubs["Stub Pages (Phase 5+)"]
        Annotations[AnnotationsPage\n/annotations]
        Experiments[ExperimentsPage\n/experiments]
        Models[ModelsPage\n/models]
        Projects[ProjectsPage\n/projects]
        Settings[SettingsPage\n/settings]
    end

    Login --> Dashboard
    Dashboard --> Datasets
    Dashboard --> Viewer
    Dashboard --> Cardiac
    Dashboard --> Benchmarks
    Dashboard --> Optimization
    Dashboard --> Deployments
```

---

## Vertical Plug-in Architecture

The system is designed so that new organ/modality verticals can be added by configuration without rewriting generic pages.

```mermaid
graph TD
    Config["configs/verticals/cardiac_mri.yaml\n- organ: Heart\n- modality: Short-axis Cine MRI\n- classes: [RV, MYO, LV]\n- input: {dims: 2, spacing: 1.5mm, size: 160x160}\n- quantification: cardiac_mri_quantifier\n- classifier: acdc_classifier"]

    Config --> Backend["backend/app/verticals/\ncardiac_mri plug-in\n(quantification + classifier)"]
    Config --> Frontend["Frontend\nClasses, colours, metrics,\nand available panels\nread from vertical config"]
    Backend --> API["FastAPI /cardiac/* endpoints"]

    Template1["configs/verticals/brain_mri.yaml\n(template — not implemented)"]
    Template2["configs/verticals/lung_ct.yaml\n(template — not implemented)"]
    Template3["configs/verticals/liver_ct.yaml\n(template — not implemented)"]
```

---

## Database Schema

Key entities and relationships:

```mermaid
erDiagram
    User {
        int id PK
        string email
        string hashed_password
        string role
    }
    Project {
        int id PK
        string name
        string vertical_id
        string anatomy
        string modality
    }
    Subject {
        int id PK
        string subject_id
        string acdc_group
        string split
        bool is_synthetic
    }
    ModelArchitecture {
        int id PK
        string name
        string display_name
        int num_parameters
        float flops
    }
    BenchmarkResult {
        int id PK
        int architecture_id FK
        float dice_lv
        float dice_rv
        float dice_myo
        float latency_ms
        string hardware
        string provenance
    }
    CardiacMeasurement {
        int id PK
        int subject_id FK
        float edv_ml
        float esv_ml
        float sv_ml
        float ef_pct
        float myo_mass_g
        string source
        string disclaimer
    }
    DeploymentRecord {
        int id PK
        int architecture_id FK
        string format
        string endpoint_url
        string status
    }

    Project ||--o{ Subject : contains
    ModelArchitecture ||--o{ BenchmarkResult : has
    Subject ||--o{ CardiacMeasurement : has
    ModelArchitecture ||--o{ DeploymentRecord : deployed_as
```

---

## Security Boundaries

- CORS locked to `localhost:3000` and `localhost:5173` (frontend origins only).
- No external API calls at runtime — all inference is local.
- `X-Clinical-Disclaimer` header added to every API response by FastAPI middleware.
- Secrets in `.env` (never committed; `.env.example` shipped).
- `data/`, `storage/`, and trained weights in `.gitignore`.

---

## Key Implementation Decisions

See [`docs/DECISIONS.md`](DECISIONS.md) for full ADRs.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ADR-001 | NiiVue (WebGL2) as viewer | ACDC is NIfTI-native; OHIF is DICOM-first and poorly suited |
| ADR-002 | Vertical YAML plug-in architecture | New organs by config, not rewrites |
| Cardiac quantification | Affine-derived voxel volumes from NIfTI header | Physical accuracy; never assumed spacing |
| MCDM | TOPSIS | Vectorised NumPy; deterministic; supports mix of benefit/cost criteria |
| Database (dev) | SQLite | Zero-install local dev; same SQLAlchemy 2 ORM for PostgreSQL in Docker |
