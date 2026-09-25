# Architecture Decision Records (ADRs) - MedAI Studio

## ADR-001: Selection of NiiVue as Primary Medical Image Viewer & Annotation Engine

### Status
Accepted

### Context
The original specification considered OHIF Viewer alongside native NIfTI visualizers. However, the primary dataset for our initial vertical (Cardiac MRI AI) is ACDC, which is provided natively in NIfTI (`.nii.gz`) format. OHIF Viewer is designed around DICOMweb/WADO REST protocols and requires DICOMweb servers or complex DICOM-conversion pipelines to visualize NIfTI datasets natively.

### Decision
We choose **NiiVue** (`@niivue/niivue`, BSD-2-Clause) as our primary WebGL2-powered 3D/4D image viewer and drawing engine in the frontend.
For DICOM series uploaded by users, the backend will automatically parse headers, strip PHI (de-identification), convert DICOM series to NIfTI using `SimpleITK` / `pydicom`, and store them as NIfTI. This keeps the viewer architecture unified around NIfTI.

### Consequences
- Single unified frontend rendering path for NIfTI volumes and 4D cine MRI series.
- WebGL2 hardware-accelerated slice rendering, 4D cine animation (`setFrame4D`), and built-in drawing layer canvas for annotation.
- DICOM series converted server-side on upload.

---

## ADR-002: Modular Multi-Organ Vertical Architecture

### Status
Accepted

### Context
MedAI Studio is designed as a multi-organ research demonstrator, starting with Cardiac MRI AI as its first vertical.

### Decision
System architecture uses declarative YAML vertical configuration files (`configs/verticals/*.yaml`) and plug-in registries (`backend/app/verticals/`) so new organs/modalities (Brain MRI, Lung CT, etc.) can be introduced via configuration and registered plug-ins without touching generic app/viewer/dashboard logic.

### Consequences
- Generic pages (Dashboard, Viewer, Benchmarks, Optimization) read classes, colours, metrics, and available panels from the project's vertical config.
- Nothing about cardiac anatomy is hard-coded in generic pages.
- Adding a new vertical = one YAML config + one registered plug-in module; no page rewrites.

---

## ADR-003: SQLite for Local Dev, PostgreSQL 16 for Docker

### Status
Accepted

### Context
The spec requires PostgreSQL 16 in Docker but the project must also work for local development without Docker.

### Decision
Use SQLite with SQLAlchemy 2 for local development and testing (zero-install, no separate DB process). Switch to PostgreSQL 16 via Docker Compose for the full stack. The same SQLAlchemy ORM layer and Pydantic v2 schemas serve both databases without code changes. `DATABASE_URL` in `.env` controls which backend is active.

### Consequences
- Developers can run `uvicorn app.main:app --reload` immediately after cloning with no DB setup.
- The test suite uses SQLite and runs without Docker.
- Any PostgreSQL-specific query optimisations would need testing on SQLite too; kept simple for the prototype.

---

## ADR-004: TOPSIS as Primary MCDM Algorithm

### Status
Accepted

### Context
The spec requires a multi-criteria decision-making algorithm for model selection with adjustable weights and a ranked output.

### Decision
Implement TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution) as the primary MCDM method. The implementation is fully vectorised with NumPy. Benefit criteria (Dice) are maximised; cost criteria (Latency, Parameters, FLOPs, Model Size) are minimised. Weights are normalised to sum to 1.0 before computation.

### Consequences
- Deterministic, numerically stable, and well-understood in operations research literature.
- Relative closeness scores provide an interpretable scalar ranking.
- The ranking is labelled "Decision-support ranking" — never "best model" — to reflect its dependence on chosen weights.
- A weighted-sum method is documented as a future alternative in the spec.

---

## ADR-005: Affine-Derived Voxel Volumes (Never Assumed Spacing)

### Status
Accepted

### Context
The spec requires physical cardiac volumes (EDV, ESV, mL) to be computed from NIfTI header voxel spacing. Assumed spacing (e.g. 1.56 mm in-plane) would introduce systematic error varying by scanner.

### Decision
All volume calculations use `nibabel.header.get_zooms()` to extract actual voxel dimensions from the NIfTI affine. The formula is:
`volume_mL = voxel_count × (dx × dy × dz) / 1000`
where dx, dy, dz are the actual mm spacings from the header.

Myocardial mass uses:
`mass_g = myocardial_volume_mL × 1.05 g/mL` (cardiac tissue density).

### Consequences
- Volumes are physically correct for any ACDC subject regardless of scanner or acquisition protocol.
- A test in `test_pipelines.py::test_cardiac_quantification` verifies volume computation on a synthetic NIfTI with known geometry.
- The mandatory disclaimer "Research / AI-derived quantitative measurements — not clinical diagnosis" appears on all outputs.

---

## ADR-006: Synthetic Data Generator as First-Class Demo Fallback

### Status
Accepted

### Context
ACDC requires a free account registration that cannot be automated. The spec requires the full demo workflow to run on a clean clone without manual data download.

### Decision
Implement `scripts/make_synthetic.py` as a first-class fallback that generates short-axis cardiac MRI NIfTI phantoms with the exact same file layout, affine matrix, label conventions, and `Info.cfg` format as ACDC. Three synthetic subjects cover NOR, MINF, and DCM categories.

### Consequences
- Full end-to-end demo (quantification, benchmarks, optimization, deployment) works without ACDC.
- All synthetic outputs are labelled "SYNTHETIC — not real anatomy" in the DB, API responses, and UI.
- Synthetic metrics are never mixed with or compared to ACDC metrics.

