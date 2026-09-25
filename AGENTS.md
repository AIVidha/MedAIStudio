# AGENTS.md — MedAI Studio Repository Guide & Rules

**Tagline:** Build. Annotate. Benchmark. Optimize. Deploy Medical AI.
**Maturity Level:** TRL-4/TRL-5 Research Prototype & Technology Demonstrator.

---

## 1. NON-NEGOTIABLE RULES

### Clinical Safety & Framing
- **Persistent Banner:** Every UI page must render: `"Research prototype — not for clinical use."`
- **Quantitative Measurement Disclaimer:** All metrics/volumes carry: `"Research / AI-derived quantitative measurements — not clinical diagnosis."`
- **Classifier Disclaimer:** All classifier outputs carry: `"Research classification output (ACDC challenge categories) — not a diagnosis."`
- **Wording Constraints:** Never use terms like `"diagnosis"`, `"diagnose"`, `"patient has"`, or `"abnormal/normal heart"` for subjects. Use `"research category"`, `"model output"`, `"measurement"`.
- **No Clinical Decisions:** No treatment advice, no patient advice, no clinical decision support.

### Scientific Honesty
- **No Fabricated Metrics:** Every Dice, IoU, FLOPs, parameter count, latency, and size shown in UI must be dynamically computed by backend code or loaded from empirical database benchmark results with full provenance.
- **Unbenchmarked State:** Show `"—"` with `"Not yet benchmarked"` when metrics do not exist.
- **Precomputed Benchmarks:** Pre-packaged benchmark files must be labelled `"Precomputed research benchmark"`.
- **Synthetic Data:** Always labelled `"SYNTHETIC — not real anatomy"` and never mixed with real ACDC metrics.
- **No Absolute "Best Model":** Use `"Decision-support ranking"` tailored to specific user objectives.

### Data Governance & Licensing
- **Public Datasets Only:** ACDC (CC BY-NC-SA 4.0) primary. No private patient data.
- **Git Safety:** Never commit `data/raw/`, `data/processed/`, `storage/`, or trained model weights (`.pt`, `.pth`, `.onnx`).
- **Citation:** Mandatory ACDC citation in README, About page, reports, and exports.
- **Data Privacy:** Local execution only. No external telemetry, remote inference, or cloud API calls.

### Engineering Rigor
- **Patient-Level Splits:** Zero data leakage. Split validation tests must verify patient IDs exist in exactly one split.
- **Affine-based Quantities:** Physical volumes must derive from NIfTI header affine/spacing, never assumed defaults.
- **Dynamic Frames:** ED/ES frames derive strictly from `Info.cfg`.

---

## 2. TECHNOLOGY STACK

- **Frontend:** React 18+, TypeScript, Vite, Tailwind CSS, Radix UI (shadcn/ui style), Lucide icons, `@niivue/niivue` WebGL2 image viewer, Recharts, Plotly (`react-plotly.js`), TanStack Query, Zustand, React Router v6.
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, PostgreSQL 16 (SQLite for dev/test), Uvicorn.
- **AI/ML:** PyTorch 2.8.x, MONAI 1.5.x, ONNX Runtime, scikit-learn, NiBabel, SimpleITK, pydicom.
- **Infrastructure:** Docker Compose (`frontend`, `api`, `worker`, `inference`, `db`), Local/S3 storage interface.

---

## 3. REPOSITORY STRUCTURE

```
medai-studio/
├── AGENTS.md
├── MEDAI_STUDIO_PROMPT.md
├── TASK_TRACKER.md
├── docker-compose.yml
├── .env.example
├── Makefile
├── .agents/
│   ├── rules/
│   │   ├── 00-safety-and-honesty.md
│   │   ├── 10-backend.md
│   │   ├── 20-frontend.md
│   │   └── 30-ml.md
│   └── workflows/
│       ├── verify-phase.md
│       └── run-benchmark.md
├── docs/
│   ├── SPEC.md
│   ├── DECISIONS.md
│   └── screenshots/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   ├── core/
│   │   ├── db/
│   │   ├── services/
│   │   ├── storage/
│   │   ├── verticals/
│   │   └── ml/
│   ├── worker/
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── pages/
│   │   └── api/
│   └── public/
├── inference_service/
├── configs/
│   ├── verticals/cardiac_mri.yaml
│   └── training/
└── scripts/
```

---

## 4. COMMAND QUICK REFERENCE

```bash
# Local Setup & Launch
make setup            # Install backend/frontend dependencies
make dev              # Run local backend & frontend dev servers
docker compose up -d  # Boot full stack in containers

# Data & Seeding
python scripts/make_synthetic.py  # Generate synthetic dataset fallback
python scripts/seed_demo.py       # Seed DB with initial demo project & user

# Testing & Verification
pytest backend/tests              # Backend unit & integration tests
cd frontend && npm test           # Frontend tests
cd frontend && npm run build      # Frontend build verification
```
