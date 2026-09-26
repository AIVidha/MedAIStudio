# MedAI Studio

**Build. Annotate. Benchmark. Optimize. Deploy Medical AI.**

> **Research prototype — not for clinical use.**
> This software is a TRL-4/TRL-5 research and technology demonstrator. It is not a medical device, has not undergone regulatory review, and must not be used for clinical diagnosis, treatment decisions, or patient care.

---

## Overview

MedAI Studio is an integrated research platform for medical imaging AI — covering the full workflow from data management and annotation through model training, benchmarking, optimization, and deployment. The first vertical is **Cardiac MRI AI**: short-axis cine MRI segmentation of the left ventricle (LV), right ventricle (RV), and myocardium (MYO), with research quantification and model benchmarking.

Audience: AI/healthcare research groups and institutional demonstrators exploring the path to a medical-AI platform.

| Module | Description | Status |
|--------|-------------|--------|
| Dashboard | Live project stats, model cards, annotation progress | ✅ |
| Dataset Manager | ACDC import, synthetic fallback, leakage-safe splits | ✅ |
| Image Viewer | Canvas MPR viewer (axial/coronal/sagittal), W/L controls, GT overlay, full-screen 1920×1080 layout | ✅ |
| Cardiac Quantification | EDV/ESV/SV/EF/mass from affine-derived voxel volumes | ✅ |
| Cardiac AI Profile | Per-subject research measurements + ACDC category display | ✅ |
| AI Inference | MONAI pre-trained bundle + custom UNet, real Dice vs GT, model source display | ✅ |
| Model Benchmarking | Leaderboard for U-Net, U-Net++, Efficient-UNet, SegResNet | ✅ |
| TOPSIS Optimization | Weight-slider MCDM ranking + Pareto frontier chart | ✅ |
| ONNX Deployments | Export + container endpoint registry + cURL snippets | ✅ |
| Annotation Workspace | Brush/polygon/eraser tools (stub — UI scaffold only) | ⚠️ stub |
| Experiment Tracking | Training run history and loss curves (stub) | ⚠️ stub |
| Model Registry | Version browser with status tracking (stub) | ⚠️ stub |
| Projects | Multi-project management (stub) | ⚠️ stub |

---

## Pre-trained AI Model

MedAI Studio ships with integration for the **MONAI Model Zoo** pre-trained cardiac segmentation bundle — no training required.

| Property | Detail |
|----------|--------|
| Bundle | `ventricular_short_axis_3label` |
| Source | [MONAI Model Zoo](https://monai.io/model-zoo.html) (MIT License) |
| Task | 2D short-axis cardiac MRI segmentation |
| Classes | LV pool · LV myocardium · RV pool |
| Input | 256 × 256 grayscale slice |
| Typical Dice | LV ~0.97 · RV ~0.90 · MYO ~0.87 (on ACDC ED frames) |

**Download the bundle (one-time, ~30 MB):**

```bash
# Run from the repo root
python scripts/download_pretrained.py
```

The bundle is saved to `storage/bundles/` (gitignored). Once downloaded, the backend automatically uses it for inference — no configuration needed. The inference pipeline priority is:

1. **MONAI pre-trained bundle** ← used automatically after download
2. Custom-trained checkpoint (`storage/models/cardiac_unet.pt`) — if you have trained your own
3. Random-weight U-Net fallback — for API smoke-testing only

---

## Quick Start

### Option A — Docker Compose (recommended)

Prerequisites: [Docker Desktop](https://www.docker.com/products/docker-desktop/) with at least 4 GB RAM allocated. On Windows, WSL2 backend is required (see [Troubleshooting](#troubleshooting-windowswsl2)).

```bash
# 1. Copy environment config
cp .env.example .env

# 2. (Optional) Generate synthetic cardiac MRI data
python scripts/make_synthetic.py

# 3. Start all services
docker compose up --build -d

# 4. Seed the demo database
python scripts/seed_demo.py

# 5. Open the app
# Frontend:  http://localhost:3000
# API docs:  http://localhost:8000/docs
```

Services started:
- `medai_frontend` — React UI at port 3000
- `medai_api` — FastAPI backend at port 8000
- `medai_worker` — background job runner
- `medai_inference` — ONNX Runtime inference service at port 8001
- `medai_db` — PostgreSQL 16 at port 5432

### Option B — Local Dev (no Docker)

Prerequisites: Python 3.11+, Node.js 18+.

```bash
# 1. Install dependencies
make setup

# 2. Generate synthetic data (if ACDC is not available)
make synthetic

# 3. Seed demo database
make seed-demo

# 4. Download pre-trained cardiac segmentation model (~30 MB, one-time)
python scripts/download_pretrained.py

# 5. Start backend  →  http://localhost:8000
make dev-backend

# 6. In a second terminal: start frontend  →  http://localhost:5173
make dev-frontend
```

The local dev setup uses **SQLite** (`medai_studio.db`) — no PostgreSQL needed.

**Manual setup (without `make`):**

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
python ../scripts/seed_demo.py
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## Demo Credentials

| Field | Value |
|-------|-------|
| Email | `admin@medaistudio.local` |
| Password | `admin123` |
| Role | admin |

Change the password and `SECRET_KEY` in `.env` before any network-accessible deployment.

---

## Data Setup

### Synthetic Data (no download required)

The repo ships a synthetic data generator that produces short-axis cardiac MRI NIfTI phantoms (concentric ellipses for LV/MYO, crescent for RV) for three research categories:

```
data/synthetic/
├── patient001/   ← NOR (Normal Physiology)   — SYNTHETIC
├── patient002/   ← MINF (Myocardial Infarction) — SYNTHETIC
└── patient003/   ← DCM (Dilated Cardiomyopathy) — SYNTHETIC
```

Each synthetic subject is labelled **"SYNTHETIC — not real anatomy"** throughout the UI. Synthetic metrics are never mixed with ACDC metrics.

```bash
python scripts/make_synthetic.py
```

### ACDC Dataset (optional — real research data)

ACDC (Automated Cardiac Diagnosis Challenge, MICCAI 2017) is the primary dataset for real benchmarks. It requires a free account at the CREATIS portal — the download is not automated.

1. Register at: https://humanheart-project.creatis.insa-lyon.fr/database/#collection/637218c173e9f0047faa00fb
2. Download and unzip to:
   ```
   data/raw/acdc/
   ├── training/
   │   ├── patient001/
   │   │   ├── patient001_4d.nii.gz
   │   │   ├── patient001_frameED.nii.gz
   │   │   ├── patient001_frameED_gt.nii.gz
   │   │   ├── patient001_frameES.nii.gz
   │   │   ├── patient001_frameES_gt.nii.gz
   │   │   └── Info.cfg
   │   └── ...
   └── testing/
       └── ...
   ```
3. Import via the Datasets page in the UI, or run the scan endpoint from the API.

> **Licence:** ACDC is released under **CC BY-NC-SA 4.0** — non-commercial scientific research only. Raw data and models trained on it are for research demonstration. See the [mandatory citation](#citation) below.

---

## Commands Reference

```bash
# Docker
make up             # docker compose up --build -d
make down           # docker compose down

# Dev servers
make dev-backend    # uvicorn backend at :8000 with --reload
make dev-frontend   # vite dev at :5173

# Data
make synthetic      # generate synthetic NIfTI dataset
make seed-demo      # seed demo user, project, and architectures

# Tests
make test           # pytest backend/tests (8 tests)

# Frontend checks
cd frontend && npm run type-check
cd frontend && npm run build

# Clean Python cache
make clean
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser — React 18 + TypeScript + Vite + Tailwind CSS       │
│  NiiVue (WebGL2)  ·  Recharts  ·  Plotly  ·  Lucide icons   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP / REST (localhost)
┌────────────────────────▼────────────────────────────────────┐
│  FastAPI  (Python 3.11)  ·  Pydantic v2  ·  SQLAlchemy 2    │
│  /api/v1/{auth,projects,datasets,cardiac,benchmarks,         │
│           optimization,deployments,studies,annotations,…}   │
└──────┬────────────────────────────────────┬─────────────────┘
       │                                    │
┌──────▼──────┐                  ┌──────────▼──────────┐
│  Background  │                  │  ONNX Runtime        │
│  Worker      │                  │  Inference Service   │
│  (jobs poll) │                  │  :8001               │
└──────┬──────┘                  └─────────────────────┘
       │
┌──────▼──────────────────────┐
│  SQLite (dev) / PostgreSQL   │
│  + Local Storage (./storage) │
└─────────────────────────────┘
```

The backend is organized around a **vertical plug-in architecture**: `configs/verticals/cardiac_mri.yaml` declares the organ, classes, input specs, and quantification hooks. New organ verticals (Brain MRI, Lung CT, etc.) can be added by configuration without rewriting generic pages.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full Mermaid diagram and service-boundary details.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Lucide icons |
| Viewer | NiiVue (`@niivue/niivue`, BSD-2-Clause) — WebGL2 NIfTI/4D |
| Charts | Recharts (standard), `react-plotly.js` (Pareto/scatter) |
| Backend | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2, Uvicorn |
| Database | SQLite (dev) / PostgreSQL 16 (Docker) |
| AI/ML | PyTorch 2.8+, MONAI 1.5+, MONAI Model Zoo (pre-trained bundles), scikit-learn, ONNX Runtime |
| Imaging I/O | NiBabel, pydicom, SimpleITK |
| Inference | ONNX Runtime (containerised) |
| Infrastructure | Docker Compose (5 services) |

---

## Project Structure

```
MedAIStudio/
├── AGENTS.md                    ← Non-negotiable safety rules
├── MEDAI_STUDIO_PROMPT.md       ← Full original specification
├── docker-compose.yml
├── .env.example
├── Makefile
├── .agents/rules/               ← Safety, backend, frontend, ML rules
├── .agents/workflows/           ← verify-phase.md, run-benchmark.md
├── backend/
│   ├── app/
│   │   ├── main.py              ← FastAPI entry + CORS + disclaimer middleware
│   │   ├── api/v1/              ← All route handlers
│   │   ├── core/                ← Config, security, audit
│   │   └── db/                  ← Models, session, migrations
│   └── tests/                   ← pytest suite (8 tests)
├── frontend/
│   └── src/
│       ├── pages/               ← 13 page components
│       └── components/layout/   ← AppHeader, AppSidebar, ResearchBanner
├── inference_service/           ← ONNX Runtime container
├── scripts/
│   ├── make_synthetic.py        ← Synthetic NIfTI generator
│   └── seed_demo.py             ← DB seed script
├── configs/
│   ├── verticals/cardiac_mri.yaml
│   └── training/{quick,full}.yaml
└── docs/
    ├── SPEC.md
    ├── DECISIONS.md             ← ADR-001: NiiVue, ADR-002: verticals
    ├── ARCHITECTURE.md
    ├── DEMO_SCRIPT.md
    ├── LIMITATIONS.md
    ├── ROADMAP.md
    └── screenshots/
```

---

## Clinical & Research Disclaimers

- **Every page** of the UI carries a persistent banner: *"Research prototype — not for clinical use."*
- All quantitative outputs (EDV, ESV, EF, volumes, mass) carry: *"Research / AI-derived quantitative measurements — not clinical diagnosis."*
- All classifier outputs carry: *"Research classification output (ACDC challenge categories) — not a diagnosis."*
- Synthetic data is always labelled **"SYNTHETIC — not real anatomy"** and its metrics are never mixed with ACDC metrics.
- No metric is fabricated; any unbenchmarked value shows `"—"` / `"Not yet benchmarked"`.
- No "best model" absolute claim is made; the ranking is labelled *"Decision-support ranking"* dependent on the chosen optimization objectives.
- All data stays local. No cloud inference, no external telemetry, no external API calls.

---

## Troubleshooting — Windows / WSL2

**Docker Desktop not starting services:**
- Enable WSL2 backend: Docker Desktop → Settings → General → "Use the WSL 2 based engine".
- Allocate ≥4 GB RAM in WSL2: create or edit `%USERPROFILE%\.wslconfig`:
  ```ini
  [wsl2]
  memory=4GB
  processors=4
  ```
  Then run `wsl --shutdown` and restart Docker Desktop.

**Port conflicts:**
- Port 5432 already in use: stop any local PostgreSQL instance, or change the host port in `docker-compose.yml`.
- Port 8000 already in use: `taskkill /F /IM python.exe` or change the port.

**`make` not found on Windows:**
- Install [GNU Make for Windows](https://gnuwin32.sourceforge.net/packages/make.htm), or run the equivalent commands directly (see Commands Reference).

**Python path issues (local dev):**
```bash
# Use the venv explicitly:
python -m venv venv
venv\Scripts\activate
pip install -r backend/requirements.txt
```

**Frontend hot-reload slow on Windows:**
- Vite's file watcher may be slow on Windows NTFS. Add to `vite.config.ts`:
  ```ts
  server: { watch: { usePolling: true } }
  ```

---

## Citation

If you use MedAI Studio or any component derived from the ACDC dataset, you must cite:

> O. Bernard, A. Lalande, C. Zotti, F. Cervenansky, et al., **"Deep Learning Techniques for Automatic MRI Cardiac Multi-structures Segmentation and Diagnosis: Is the Problem Solved?"**, *IEEE Transactions on Medical Imaging*, 37(11):2514–2525, 2018. doi:[10.1109/TMI.2018.2837502](https://doi.org/10.1109/TMI.2018.2837502)

ACDC dataset homepage: https://www.creatis.insa-lyon.fr/Challenge/acdc/
ACDC licence: **CC BY-NC-SA 4.0** — non-commercial, share-alike, attribution required.

---

## Licences

| Component | Licence |
|-----------|---------|
| MedAI Studio source code | MIT (research prototype — see disclaimer) |
| ACDC dataset | CC BY-NC-SA 4.0 (non-commercial) |
| NiiVue | BSD-2-Clause |
| MONAI | Apache-2.0 |
| PyTorch | BSD-style |
| ONNX Runtime | MIT |
| FastAPI | MIT |
| React | MIT |
| Tailwind CSS | MIT |

Full third-party licence text: see `THIRD_PARTY_LICENSES.md` (to be generated).

---

## Contributing / Development Notes

This is a research prototype maintained for demonstrator purposes. Production readiness items:

- JWT auth is a stub — real password hash validation and token expiry must be implemented before any network-accessible deployment.
- NiiVue file serving from backend (`/api/v1/studies/...`) needs wiring for full ACDC 4D volume streaming.
- GPU benchmarking requires CUDA hardware and NVIDIA Docker runtime (`--gpus all`).
- Background worker is scaffolded but not fully connected to training/benchmark triggers.
- ONNX Runtime container (`inference_service/`) returns a placeholder `/predict` response; replace with a real ONNX model load.

See [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) and [`docs/ROADMAP.md`](docs/ROADMAP.md) for full detail.

---

*MedAI Studio — Build. Annotate. Benchmark. Optimize. Deploy Medical AI.*
*Research and Technology Demonstrator — not a clinical diagnostic device.*
