# MedAI Studio — Final Build Prompt for Google Antigravity

> **How to use this file (for you, not the agent)**
> 1. Create an empty folder `medai-studio/` and open it in Antigravity (File → Open Folder — open this folder itself, not its parent).
> 2. Save this file in that folder as `MEDAI_STUDIO_PROMPT.md`.
> 3. Download ACDC yourself (it needs a free account on the CREATIS portal, which the agent cannot sign up for) and unzip it to `medai-studio/data/raw/acdc/` so you have `training/` and `testing/` folders. The project still runs without it, using the synthetic fallback.
> 4. In Agent settings, keep **Terminal Command Auto Execution = Request Review** for the first phases.
> 5. Start a new agent conversation in **Planning** mode and send:
>    `Read MEDAI_STUDIO_PROMPT.md completely. Follow Section 1 exactly, then execute Phase 0 and stop at the Phase 0 gate for my review.`
> 6. After each gate, reply `Approved — continue with Phase N` (or give corrections).
>
> Everything below the line is the prompt.

---

## 0. ROLE AND MISSION

You are a senior full-stack AI engineer, medical-imaging engineer and product engineer working inside Google Antigravity.

Build a polished, working prototype called **MedAI Studio**.

Tagline: **Build. Annotate. Benchmark. Optimize. Deploy Medical AI.**

First vertical: **Cardiac MRI AI** (short-axis cine MRI segmentation of LV, RV, myocardium, plus research quantification).

Audience: an AI/healthcare incubation centre and potential institutional / B2G customers.

Target maturity: a polished, functional **TRL-4/TRL-5 research prototype** that runs locally from a clean install with documented commands and shows a credible path to an institutional medical-AI platform.

This is a **RESEARCH AND TECHNOLOGY DEMONSTRATOR, NOT A CLINICAL DIAGNOSTIC DEVICE.** It never diagnoses patients, never recommends treatment and never claims to replace clinicians.

---

## 1. HOW YOU MUST WORK IN THIS WORKSPACE (read first)

1. **Read this entire file before writing any code.**
2. **Create persistent project context first** (Antigravity agents do not remember earlier sessions, so these files are how context survives):
   - `AGENTS.md` at the repo root — the non-negotiable rules from Section 2, the stack from Section 5, repo layout, and build/test commands. Keep it under 12,000 characters (Antigravity's per-rules-file limit); link to longer docs instead of pasting them.
   - `.agents/rules/` — split rules by topic: `00-safety-and-honesty.md`, `10-backend.md`, `20-frontend.md`, `30-ml.md`. Each under 12,000 characters, activation "Always On".
   - `docs/SPEC.md` — a verbatim copy of this prompt so future sessions can re-read it.
   - `.agents/workflows/` — at least `verify-phase.md` (run tests, lint, type-check, start stack, browser smoke test, capture screenshots) and `run-benchmark.md`.
3. **Work in phases (Section 16).** For each phase: write/refresh the implementation plan → implement → run tests → start the stack → use the browser agent to click through the relevant UI → save screenshots to `docs/screenshots/phase-N/` → write a short walkthrough → **stop at the gate and wait for approval.**
4. **Never skip verification.** A phase is not done until its acceptance criteria pass on a clean `docker compose up`.
5. **Do not silently change scope.** If something in this spec is technically infeasible, say so, propose the closest honest alternative, and record it in `docs/DECISIONS.md` (ADR-style: context, decision, consequences).
6. **Pin versions** you actually install in `requirements.txt` / `pyproject.toml` and `package.json` lockfiles. Where this prompt names a version, treat it as the target; if it will not install, use the nearest compatible version and log it in `docs/DECISIONS.md`.
7. **No private data, ever.** Do not download anything that requires a login. If data is missing, use the synthetic fallback (Section 11.4) and tell me.
8. Assume the developer machine may be **Windows with Docker Desktop (WSL2)**, Linux or macOS, and possibly **no GPU**. Everything must work on CPU; GPU is an optional speed-up.

---

## 2. NON-NEGOTIABLE RULES (copy into AGENTS.md)

**Clinical safety and wording**
- Persistent banner on every page: **"Research prototype — not for clinical use."**
- Every quantitative output carries the label: **"Research / AI-derived quantitative measurements — not clinical diagnosis."**
- Every classifier output carries: **"Research classification output (ACDC challenge categories) — not a diagnosis."**
- Never use the words "diagnosis", "diagnose", "patient has", "abnormal/normal heart" in UI output about a subject. Use "research category", "model output", "measurement".
- No treatment recommendations, no patient-facing advice, no clinical decision support.

**Scientific honesty**
- **Never fabricate performance numbers.** Every Dice, IoU, FLOPs, parameter count, latency and size shown in the UI must come from code in this repo running on real inputs, stored in the database with provenance (dataset version, split, model version, git commit, hardware, timestamp).
- Before a metric exists, show "—" with "Not yet benchmarked", never a placeholder number. The example figures in this prompt (e.g. "Best Dice 0.914", "Efficient-UNet", "58 ms") describe **layout only** and must never be hard-coded.
- If a benchmark file is shipped with the repo for convenience, it must have been produced by the repo's own scripts, carry its provenance, and be labelled in the UI: **"Precomputed research benchmark."**
- Synthetic data is always labelled **"SYNTHETIC — not real anatomy"** and its metrics are never mixed with ACDC metrics.
- No "best model" as an absolute claim. Recommendations are **"Decision-support ranking"** that depend on the chosen objectives.

**Data governance**
- Only public/open datasets (ACDC primary). No hospital, AIIMS, or private patient data. No AIIMS-specific workflows.
- **ACDC is licensed CC BY-NC-SA 4.0 (non-commercial, share-alike, attribution).** Raw data and models trained on it are for non-commercial research demonstration. Never commit `data/raw/`, `data/processed/` or trained weights to Git (add to `.gitignore`); ship scripts that regenerate them.
- The ACDC citation must appear in the README, the About page, dataset exports and generated reports (Section 4.1).
- No image leaves the machine: no external upload, no telemetry, no CDN-hosted inference. Front-end assets are bundled locally.

**Engineering**
- Patient-level splits only; a test must fail the build if any patient ID appears in more than one split.
- Physical quantities always derive from the NIfTI header (voxel spacing/affine), never from assumed spacing.
- ED/ES frames always come from ACDC `Info.cfg`, never assumed to be frame 1.

---

## 3. PRODUCT VISION (unchanged)

MedAI Studio is a web platform for medical-imaging researchers and institutions with one integrated workflow:

Medical imaging data → visualization → annotation → AI-assisted annotation → dataset management → model inference → experiment tracking → model benchmarking → Pareto/model optimization → quantitative cardiac profiling → export/deployment.

Cardiac MRI is the first vertical; the architecture must let new organs/modalities be added by configuration and plug-ins, not rewrites (Section 7).

---

## 4. VERIFIED EXTERNAL RESOURCES (use these; do not invent alternatives without logging a decision)

### 4.1 Primary dataset — ACDC (Automated Cardiac Diagnosis Challenge, MICCAI 2017)
- Info page: https://www.creatis.insa-lyon.fr/Challenge/acdc/
- Download (Human Heart Project data portal, free registration): https://humanheart-project.creatis.insa-lyon.fr/database/#collection/637218c173e9f0047faa00fb
- Content: 150 exams from different patients, University Hospital of Dijon; 5 evenly distributed groups of 30: **NOR** (normal), **MINF** (previous myocardial infarction), **DCM** (dilated cardiomyopathy), **HCM** (hypertrophic cardiomyopathy), **RV** (abnormal right ventricle). Official split: 100 training, 50 testing.
- Acquisition: 1.5 T and 3.0 T Siemens, SSFP short-axis cine, slice thickness 5–8 mm (sometimes with inter-slice gap), in-plane 1.37–1.68 mm, 28–40 frames per cycle.
- Expected layout (verify by reading the files, do not assume):
  `patientXXX/patientXXX_4d.nii.gz`, `patientXXX_frameYY.nii.gz` (ED and ES volumes), `patientXXX_frameYY_gt.nii.gz` (reference masks for ED and ES only), `Info.cfg` (keys such as `ED`, `ES`, `Group`, `Height`, `Weight`, `NbFrame`).
- Label values in masks: **0 background, 1 RV cavity, 2 myocardium, 3 LV cavity.**
- Check whether the `testing/` folder includes `_gt` masks in the downloaded version. If yes, use it as the held-out test set; if not, hold out a stratified test set from `training/` and document it.
- Licence: **CC BY-NC-SA 4.0**, non-commercial scientific research.
- Mandatory citation:
  O. Bernard, A. Lalande, C. Zotti, F. Cervenansky, et al., "Deep Learning Techniques for Automatic MRI Cardiac Multi-structures Segmentation and Diagnosis: Is the Problem Solved?", IEEE Transactions on Medical Imaging, 37(11):2514–2525, 2018. doi:10.1109/TMI.2018.2837502
- Group definitions (for the About/Help text only, never shown as a subject's result): https://www.creatis.insa-lyon.fr/Challenge/acdc/databasesClassification.html
- Fallback mirror if the official portal is down (same licence, verify integrity against the official layout): https://huggingface.co/datasets/YongchengYAO/ACDC

### 4.2 Viewer and annotation engine
- **NiiVue** (`@niivue/niivue`, BSD-2-Clause, WebGL2) is the primary viewer: native NIfTI, slice scrolling, zoom/pan, window/level, overlays with opacity, 4D frame navigation (`setFrame4D`), and a built-in drawing layer (pen, filled pen/flood fill, eraser via pen value 0, `setDrawOpacity`, `drawUndo`, `loadDrawingFromUrl`, save drawing as NIfTI). Docs: https://niivue.com/docs/ and https://niivue.com/docs/drawing/
- Rationale: the spec prefers OHIF, but OHIF is DICOMweb-first and its NIfTI support is limited, whereas ACDC is NIfTI. Record this in `docs/DECISIONS.md` as ADR-001.
- DICOM: accept DICOM series on import and convert to NIfTI server-side (pydicom + SimpleITK) so one viewer path serves both. OHIF/Cornerstone3D (`@cornerstonejs/*`, which includes a `nifti-volume-loader`) is a documented future option, not part of the MVP.
- NiiVue has undo but no redo: implement redo in the app by snapshotting the drawing bitmap per stroke. Implement the polygon/contour tool in the app (collect clicked points → rasterize the closed polygon into the current slice of the drawing bitmap). Verify exact API names against the installed NiiVue version before coding.

### 4.3 AI / ML
- **PyTorch 2.8.x** (CPU wheels by default in Docker) and **MONAI 1.5.x** (1.5.1 added PyTorch 2.7/2.8 support; 1.5.2 is a security fix release).
- Networks, all from `monai.networks.nets` (2D, 4 output classes):
  1. **U-Net** — `UNet`
  2. **U-Net++** — `BasicUNetPlusPlus`
  3. **Efficient-UNet** — `FlexibleUNet(backbone="efficientnet-b0", pretrained=False)`; the name refers to the EfficientNet encoder. If this fails to build, fall back to a depthwise-separable lightweight U-Net and rename it honestly ("Lightweight U-Net").
  4. **SegResNet** — `SegResNet(spatial_dims=2)`
- Pretrained weights: I found no ready-made ACDC cardiac bundle in the MONAI Model Zoo, and no official nnU-Net v2 ACDC weights were published as of early 2024. Plan to **train all four models in-house** on ACDC with the repo's own training script. You may check the MONAI Model Zoo once; if something suitable and licence-compatible exists, log it as an ADR before using it.
- Loss/metrics: `monai.losses.DiceCELoss`, `monai.metrics.DiceMetric`, `MeanIoU`, optional `HausdorffDistanceMetric` (HD95).
- FLOPs: `torch.utils.flop_counter.FlopCounterMode` (built into PyTorch) at a fixed documented input size (e.g. 1×1×160×160). State the convention in the UI: FLOPs where one multiply-add = 2 FLOPs; also show MACs = FLOPs/2. Optionally cross-check with `ptflops` or `fvcore` in a test.
- Export: `torch.onnx.export` (opset ≥ 17) and validate with `onnxruntime` (max abs diff vs PyTorch below a stated tolerance).
- Classical ML for the research classifier: scikit-learn.

### 4.4 Medical imaging I/O
- NiBabel (NIfTI), pydicom (DICOM read + de-identification of PHI tags on import), SimpleITK (resampling, DICOM series → NIfTI).

### 4.5 Backend, storage, infra
- Python 3.11 or 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 + Alembic, PostgreSQL 16 in Docker (SQLite allowed for local dev/tests), Uvicorn.
- Storage abstraction with `LocalStorage` (default, `./storage`) and an `S3Storage` stub compatible with MinIO.
- Background jobs: a `jobs` table plus a separate `worker` service that polls it (keep it simple; no Celery required).
- Password hashing with a maintained library (e.g. `pwdlib` with argon2 or `bcrypt`); JWT auth.
- Reports: Jinja2 HTML with embedded interactive Plotly; PDF via WeasyPrint using Matplotlib-rendered PNG charts (avoid headless-Chrome dependencies).
- Docker Compose services: `frontend`, `api`, `worker`, `inference` (ONNX Runtime deployment demo), `db`.

### 4.6 Frontend
- React 18+ with TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix primitives), lucide-react icons, TanStack Query, React Router, Zustand for viewer/annotation state.
- Charts: Recharts for standard charts; `react-plotly.js` for interactive Pareto/scatter plots.
- E2E tests: Playwright.

---

## 5. TECHNICAL DECISIONS THAT RESOLVE AMBIGUITIES IN THE ORIGINAL BRIEF

1. **2D slice-wise segmentation**, applied slice by slice to 3D volumes (standard for ACDC's anisotropic slices). Preprocessing: resample in-plane to a fixed spacing (default 1.5 mm, configurable), per-slice z-score normalisation, centre crop/pad to 160×160 (configurable); invert the transform so predicted masks are saved in the original image geometry and header.
2. **Splits:** official 100 training patients → patient-level train/validation (80/20, stratified by `Group`, fixed seed); official 50 testing patients → test (if their ground truth is present). Split file versioned with the dataset.
3. **Evaluation:** per-class 3D Dice and IoU on ED and ES volumes of the test split, reported per class (LV, RV, MYO) and as the mean of the three foreground classes. Background is excluded.
4. **Cardiac quantification** (from either ground truth or prediction, always stating which):
   - Structure volume (mL) = voxel count × product of header voxel spacing (mm³) / 1000.
   - LV EDV, LV ESV, RV EDV, RV ESV from ED/ES frames in `Info.cfg`.
   - Stroke volume = EDV − ESV; EF (%) = 100 × (EDV − ESV) / EDV, for LV and RV.
   - Myocardial volume at ED and ES; myocardial mass (g) = myocardial volume × 1.05 g/mL.
   - Body surface area (Mosteller) = √(height_cm × weight_kg / 3600) → indexed values (mL/m², g/m²) when height and weight exist.
   - Basic dimensions: maximum myocardial wall thickness (distance transform on the mid-ventricular slices) and LV end-diastolic diameter (in-plane).
   - If ED/ES masks are missing or a structure is empty, show "not computable" instead of a number.
   - When ground truth exists, also show the error between predicted and ground-truth volumes/EF (research validation panel).
5. **Research classifier (Module 9):** Random Forest (or gradient boosting) on segmentation-derived features (LV/RV EDV, ESV, EF, indexed volumes, myocardial mass, max wall thickness, LV/RV volume ratio). Train on features from ground-truth masks of the train/validation patients; report 5-fold patient-level stratified CV accuracy and test accuracy using features from **predicted** masks. Display per-category probabilities with the mandatory wording. If the test accuracy cannot be computed, the panel says so.
6. **Latency protocol:** batch size 1, `torch.inference_mode()`, 5 warm-up runs, 30 timed runs; report median and p95 per slice and per full volume; record device string (CPU model/GPU), threads, framework (PyTorch or ONNX Runtime). Latency is only comparable within one hardware record — show the hardware next to every latency value.
7. **Model size:** size on disk of the state_dict (MB) and of the ONNX file (MB).
8. **Pareto analysis:** non-dominated sorting on (maximize Dice, minimize FLOPs, minimize parameters); a toggle adds latency as a 4th objective. Dominated models are shown with which model dominates them.
9. **MCDM:** min-max normalise each criterion across candidate models (accuracy = benefit; FLOPs, parameters, latency, size = cost); weighted sum → score and rank. Offer TOPSIS as a second method. Weights are sliders that renormalise to 100%. Presets:
   - Maximum Accuracy: Accuracy 80, Latency 5, Params 5, FLOPs 5, Size 5
   - Lightweight: Accuracy 30, Params 30, Size 25, FLOPs 15, Latency 0
   - Low Latency: Accuracy 30, Latency 50, FLOPs 20, Params 0, Size 0
   - Balanced: Accuracy 40, Latency 20, Params 15, FLOPs 15, Size 10
   Show a simple sensitivity view (how rank changes as the accuracy weight sweeps 0–100%).
10. **Training profiles:** `quick` (CPU-feasible: few epochs, small subset) and `full` (GPU: e.g. 100–150 epochs). Metrics from each run are stored and labelled with the profile — a quick-profile model shows its real, lower Dice. Also provide `notebooks/train_full_on_gpu.ipynb` that runs the same script on a free cloud GPU and exports the run bundle (weights + metrics JSON + provenance) for import through the UI.

---

## 6. ARCHITECTURE

Separate services and packages for: frontend, backend API, AI inference, dataset management, model registry, database, storage.

```
medai-studio/
├── AGENTS.md
├── .agents/rules/  .agents/workflows/
├── docker-compose.yml   .env.example   Makefile
├── frontend/                       # React + TS + Vite
│   └── src/{app,pages,components,features/{viewer,annotation,datasets,models,experiments,benchmarks,optimization,cardiac,deployments,settings},lib,api}
├── backend/
│   ├── app/
│   │   ├── api/v1/                 # FastAPI routers
│   │   ├── core/                   # config, security, logging, audit
│   │   ├── db/                     # models, session, alembic
│   │   ├── services/               # datasets, annotations, inference, experiments, benchmark, optimization, export
│   │   ├── storage/                # StorageBackend interface + Local/S3
│   │   ├── verticals/              # plug-in registry (Section 7)
│   │   │   └── cardiac_mri/        # classes, quantification, classifier, ACDC importer
│   │   └── ml/
│   │       ├── registry.py         # model factory registry
│   │       ├── models/             # unet.py, unetpp.py, efficient_unet.py, segresnet.py
│   │       ├── train.py  evaluate.py  profile.py  export_onnx.py
│   │       └── transforms.py
│   ├── worker/                     # job runner
│   └── tests/
├── inference_service/              # FastAPI + onnxruntime deployment demo
├── scripts/                        # prepare_acdc.py, make_demo_subset.py, make_synthetic.py, seed_demo.py, run_benchmark.py
├── configs/verticals/cardiac_mri.yaml   configs/training/{quick,full}.yaml
├── notebooks/train_full_on_gpu.ipynb
├── data/ (gitignored)   storage/ (gitignored)
└── docs/ README-level docs, ARCHITECTURE.md (Mermaid), API.md, DEMO_SCRIPT.md, DECISIONS.md, LIMITATIONS.md, ROADMAP.md, PRODUCT.md, screenshots/
```

Core database entities: `User`, `Role`, `Project`, `ProjectMember`, `Dataset`, `DatasetVersion`, `Subject` (pseudonymous ID only), `Study`, `Series/Volume` (path, shape, spacing, modality, frame info), `Split`, `Annotation` (versioned; source = manual | ai | ai_edited; status = draft | accepted | rejected), `ModelArchitecture`, `ModelVersion` (weights path, ONNX path, status: registered → trained → validated → deployed), `Experiment`, `EpochMetric`, `BenchmarkResult` (with hardware record), `InferenceRun`, `CardiacMeasurement`, `ClassifierOutput`, `Deployment`, `Job`, `AuditLog`.

---

## 7. MULTI-ORGAN EXTENSIBILITY (Module 18)

- A project is defined by a **vertical config** (`configs/verticals/*.yaml`) with: `organ`, `modality`, `task`, `classes` (id, name, colour), `input` (dims, spacing, normalisation), `models` (registry keys), `metrics`, and optional `quantification` / `classifier` plug-ins.
- `backend/app/verticals/__init__.py` exposes a registry; `cardiac_mri` is the only implemented plug-in. The UI reads classes, colours, metrics and available panels from the project's vertical, so nothing about cardiac anatomy is hard-coded in generic pages.
- Ship commented **template** configs (not implemented) for Brain MRI, Lung CT, Liver CT, Kidney CT and Prostate MRI showing how they would be declared. Add a test that loads each template schema without errors.

---

## 8. MODULE REQUIREMENTS AND ACCEPTANCE CRITERIA

Navigation (left sidebar): Dashboard · Projects · Datasets · Viewer · Annotations · Models · Experiments · Benchmarks · Optimization · Cardiac Profile · Deployments · Settings.

**M1 — Project Dashboard.** Cards for project name, modality, anatomy, task, dataset, number of studies, annotation progress, best model **for the selected deployment profile**, its Dice, parameters, FLOPs, latency, experiment count. All values live from the DB; "—" when absent. Links into each module.
*Accept:* with no benchmark run, no metric card shows a number; after the benchmark, values match the Benchmarks table exactly.

**M2 — Medical Image Viewer (NiiVue).** NIfTI (and converted DICOM), slice scroll, zoom, pan, window/level with presets, metadata panel (dims, spacing, orientation, modality, frames, ED/ES), segmentation overlay with opacity slider, per-class visibility, cine frame slider and play/pause for 4D, jump-to-ED/ES buttons.
*Accept:* loads an ACDC 4D volume and its ED ground truth aligned correctly.

**M3 — Annotation workspace.** Tools: brush (size), eraser, polygon/contour, fill, undo, redo, mask visibility, opacity, class selector. Classes and colours: Background (0), Right Ventricle (1, blue), Myocardium (2, green), Left Ventricle (3, red) — values match ACDC labels. Clear legend with keyboard shortcuts. Save creates a new annotation version (never overwrites) with author, timestamp and source.
*Accept:* draw, undo, redo, save, reload the page → the saved mask reappears; mask file is valid NIfTI with the source image's affine.

**M4 — AI-Assisted Annotation.** "AI Segment" button: choose model version → run on the current frame → prediction loads into the editable drawing layer, side-by-side or overlay with the original. Actions: Accept, Reject, Edit, Save. Status and provenance (model version, time) stored.
*Accept:* AI prediction → edit a region → save → annotation source = `ai_edited`, and the diff from the raw prediction is kept.

**M5 — Dataset Manager.** Import: ACDC folder importer, zip upload of NIfTI, DICOM series upload (converted + PHI tags stripped, with a warning). Show patients, studies, images, classes, annotated %, image dimensions, voxel spacing, modality, research group distribution. Dataset versions (immutable snapshots with a changelog). Patient-level train/val/test split UI (stratified, seed) with a **leakage check** badge.
*Accept:* statistics match a script count from disk; the leakage test passes; moving one patient into two splits is rejected.

**M6 — Model Zoo.** Registry of the four architectures (Section 4.3) with name, task, architecture summary, parameters, FLOPs at the documented input size, model size, supported input, status. Parameters/FLOPs computed by code, even before training. Adding a model = one registry entry + one factory function (documented in `docs/ADDING_A_MODEL.md`).

**M7 — One-Click Inference.** Select dataset (or subset) + model version → "Run Inference" → job with progress; per-volume predicted mask, overlay preview, processing time, status. Stored as `InferenceRun`.

**M8 — Cardiac Quantification.** Table and cards for LV/RV/myocardium volumes, EDV, ESV, SV, EF, myocardial mass, indexed values, wall thickness, LV diameter, per Section 5.4, with source (ground truth vs model) and the mandatory label. CSV export.

**M9 — Cardiac AI Profile.** A visually strong single-subject page: STRUCTURE (LV, RV, MYO with mini 3D-ish or slice thumbnails and volumes), FUNCTION (EDV, ESV, EF, SV with reference bars *only if* taken from a cited published reference-range source; otherwise no ranges), AI PROFILE (research classifier probabilities over the five ACDC categories, with CV/test accuracy shown next to it). Mandatory wording on every section. Printable.

**M10 — Experiment Tracking.** Every training and inference run stored with: experiment ID, dataset version, split, model, encoder/backbone, epochs, best epoch, training loss, validation loss, Dice, IoU, parameters, FLOPs, model size, inference latency, hardware, git commit, config, timestamp. Experiment list with filters, and a detail page with curves and config.

**M11 — Model Benchmarking.** Sortable table: Model, Dice (mean + per class), IoU, Parameters, FLOPs, Model Size, Latency (median/p95, hardware). Charts: Dice vs FLOPs, Dice vs Parameters, Dice vs Latency.

**M12 — Pareto Optimization.** Interactive Plotly plot with Pareto-optimal models highlighted and the frontier drawn, dominated models greyed with "dominated by" tooltip. Deployment profile selector (Maximum Accuracy / Lightweight / Low Latency / Balanced) that updates the highlighted recommendation. Explanatory text: model choice depends on deployment objectives.

**M13 — MCDM Model Selection.** Weight sliders for Accuracy, FLOPs, Parameters, Latency, Model size; preset buttons; method toggle (weighted sum / TOPSIS); ranked list titled **"Decision-support ranking"**; score breakdown per criterion; sensitivity chart.
*Accept:* unit tests with a hand-computed 3-model example; in the demo, moving weights visibly changes the top-ranked model if the trained models actually trade off (if they do not, the UI states that one model dominates on all chosen criteria).

**M14 — Experiment Visualization.** Presentation-quality charts: training loss, validation loss, Dice, IoU per epoch, model comparison bars, Pareto frontier; consistent theme, export PNG/SVG.

**M15 — Model Registry.** Models → Versions → Metrics → Deployment status (registered, trained, validated, deployed). "Validated" means benchmarked on the held-out split with stored results. Formats listed (PyTorch, ONNX) with checksums.

**M16 — Export.** Dataset export (zip: NIfTI images, NIfTI masks, CSV metadata, split file, `ATTRIBUTION.md` with ACDC citation and CC BY-NC-SA 4.0 notice). Model export (PyTorch state_dict + ONNX, validated). Report export: HTML and PDF containing dataset, model(s), metrics, benchmark table, Pareto plot, selected profile, MCDM weights and resulting ranking, provenance, disclaimers.

**M17 — Deployment Demo.** Page showing model, format (ONNX), target (REST API), status (Ready/Stopped), endpoint URL, health, example `curl`, and a live "test request" panel that sends a sample volume and shows the returned mask. The `inference` container runs ONNX Runtime, exposes `/health`, `/model-card`, `/predict`, and has its own OpenAPI docs. Clearly marked "Prototype deployment — not a clinical deployment."

**M18 — Multi-organ architecture.** Section 7.

---

## 9. API (FastAPI, versioned under `/api/v1`, OpenAPI auto-docs at `/docs`)

Minimum routers: `auth` (login, me), `projects`, `datasets` (import, versions, stats, splits, export), `studies` (list, metadata, volume file streaming with range support), `annotations` (list, get, create version, accept/reject), `inference` (segment single, batch run, runs), `models` (architectures, versions, export, upload run bundle), `experiments` (list, detail, metrics), `benchmarks` (run, results), `optimization` (pareto, mcdm), `cardiac` (measurements, profile, classifier), `reports` (generate, download), `deployments` (list, start/stop, health proxy), `audit` (list, admin only), `settings` (data deletion, retention).
Document every endpoint in `docs/API.md` with request/response examples.

---

## 10. TRAINING AND BENCHMARK PIPELINE

- `scripts/prepare_acdc.py`: validate layout, parse `Info.cfg`, compute stats, write normalized metadata, create the versioned split.
- `backend/app/ml/train.py --model {unet,unetpp,efficient_unet,segresnet} --profile {quick,full}`: MONAI transforms (random rotation, flip, intensity scaling, elastic optional), DiceCE loss, Adam/AdamW + cosine schedule, AMP when CUDA exists, best-epoch checkpoint by validation Dice, per-epoch metrics written to the DB (or to a run bundle JSON when run offline in the notebook).
- `evaluate.py`: 3D per-class Dice/IoU (and optional HD95) on the test split at ED and ES.
- `profile.py`: parameters, FLOPs, model size, latency per Section 5.
- `export_onnx.py`: ONNX export + numerical parity check.
- `scripts/run_benchmark.py`: runs evaluate + profile for every validated model and stores `BenchmarkResult`s with hardware.
- Make targets: `make setup`, `make up`, `make seed-demo`, `make train-quick`, `make train-all-quick`, `make benchmark`, `make test`, `make e2e`, `make report`.

---

## 11. DEMO DATA

11.1 **Full ACDC** at `data/raw/acdc/{training,testing}` → `make prepare-acdc`.
11.2 **Demo subset** (`scripts/make_demo_subset.py`): 10 training patients (2 per group) + 5 test patients for fast demos; documented as a subset.
11.3 **Seeding** (`make seed-demo`): creates the demo user, "Cardiac MRI Segmentation" project, imports the subset, registers the four architectures.
11.4 **Synthetic fallback** (`scripts/make_synthetic.py`): if ACDC is absent, generate a few 4D NIfTI "phantom" volumes (concentric ellipses for LV/MYO, crescent for RV, contracting over frames) with the same schema and labels, flagged SYNTHETIC in the DB and UI. The full demo flow must still run end-to-end on synthetic data, with all metrics labelled synthetic.
11.5 Write `docs/DEMO_DATA.md` explaining registration, download, folder placement, licence and citation.

---

## 12. UI AND VISUAL DESIGN

- Modern professional SaaS look: dark-first clinical-technical theme with a light mode, generous spacing, one accent colour, consistent 8-px grid, Inter (bundled locally) for UI text and a monospaced font for metrics.
- First screen (landing/login) immediately communicates **MedAI Studio** and **Build. Annotate. Benchmark. Optimize. Deploy Medical AI.**
- Global header: project switcher, dataset version, user menu; persistent research-only banner.
- Empty, loading and error states for every page; toasts for job completion; skeleton loaders.
- Class colours consistent across viewer, legend, charts and reports.
- Responsive down to laptop widths; the viewer page prioritises canvas space.
- Accessibility: keyboard navigation, visible focus, colour-blind-safe chart palette with shape/label redundancy.
- Avoid anything that looks like a student project: no default component styling, no lorem ipsum, no mismatched fonts.

---

## 13. SECURITY AND PRIVACY (prototype level)

- Local deployment only; CORS locked to the frontend origin; no external calls at runtime.
- Basic authentication (JWT) with roles: admin, researcher, annotator, viewer; project-level access control enforced in the API, not only the UI.
- Audit log (who, what, when, object, IP) for login, import, annotation save/accept/reject, inference, export, deletion, deployment changes; admin-only audit page.
- Configurable data deletion: delete a dataset version or a subject (DB rows + files), with confirmation and audit entry; retention setting in Settings.
- Secrets via `.env` (ship `.env.example` only); demo credentials documented and changeable.
- DICOM import strips PHI tags and records that it did so.

---

## 14. TESTING

- Unit (pytest): Dice/IoU on known masks, volume/EF on synthetic masks with analytically known volumes, BSA formula, Pareto on a hand-made set, weighted-sum and TOPSIS on a hand-computed example, split leakage, Info.cfg parsing, NIfTI round-trip preserves affine, ONNX parity.
- API tests with a test DB.
- Frontend: type-check, lint, component tests for the annotation toolbar and MCDM sliders.
- **E2E (Playwright): the 21-step demo workflow in Section 15**, runnable against the synthetic dataset in CI and against ACDC locally.

---

## 15. REQUIRED DEMO WORKFLOW (Definition of Done)

1 Open MedAI Studio → 2 Create Cardiac MRI project → 3 Load public ACDC sample → 4 Open image viewer → 5 Select a study → 6 Show cardiac MRI (cine) → 7 Click AI Segment → 8 Generate LV/RV/MYO masks → 9 Edit/accept mask → 10 Save annotation → 11 Show dataset statistics → 12 Run a cardiac segmentation model on the dataset → 13 Display quantitative metrics → 14 Show Cardiac AI Profile → 15 Compare multiple models → 16 Show Dice/FLOPs/latency table → 17 Show Pareto frontier → 18 Change optimization weights → 19 Show changed model recommendation → 20 Export experiment report → 21 Show deployment page (and send a live test request).

The whole flow must work without external or private datasets, from a clean clone, using only documented commands.

---

## 16. PHASED BUILD PLAN WITH GATES

Priorities from the brief are preserved: never sacrifice the core working demo for advanced features.

- **Phase 0 — Foundation.** AGENTS.md, rules, workflows, SPEC copy, DECISIONS (ADR-001 viewer choice), repo skeleton, Docker Compose with all services booting, DB migrations, auth stub, app shell with navigation, banner, theme, landing screen. *Gate:* `docker compose up` → login → empty dashboard screenshot.
- **Phase 1 — Priority 1 core.** ACDC importer + synthetic generator + demo subset, Dataset Manager with stats and leakage-safe splits, NiiVue viewer, annotation workspace, model registry skeleton, `train.py` quick profile for at least one model, AI Segment with accept/reject/edit/save, cardiac quantification, Cardiac AI Profile (classifier included once features exist). *Gate:* demo steps 1–14 pass in the browser; screenshots saved.
- **Phase 2 — Priority 2.** All four architectures, experiment tracking and detail pages, profiling (params/FLOPs/size/latency), evaluation, benchmark table and charts, model registry versions/status, GPU notebook + run-bundle import. *Gate:* steps 15–16 with real computed numbers.
- **Phase 3 — Priority 3.** Pareto module and MCDM with presets, TOPSIS, sensitivity chart. *Gate:* steps 17–19.
- **Phase 4 — Priority 4.** Exports (dataset, model, HTML/PDF report), ONNX deployment service and page, full RBAC, audit log UI, data deletion, multi-organ template configs. *Gate:* steps 20–21 and the full Playwright run green.
- **Phase 5 — Polish and deliverables.** UI polish pass, screenshots of every page, all docs in Section 17, final clean-install test on a fresh clone following only the README.

---

## 17. DELIVERABLES

1. Working source code.
2. `README.md` — overview, disclaimer, quick start (Docker and local dev), data setup, demo credentials, commands, troubleshooting (Windows/WSL2 notes), citation and licences.
3. `docker-compose.yml` (+ `.env.example`).
4. Setup instructions (in README).
5. `docs/DEMO_DATA.md` — dataset instructions.
6. `docs/ARCHITECTURE.md` — Mermaid architecture diagram, service boundaries, data flow, vertical plug-in design.
7. `docs/API.md` + live OpenAPI.
8. `docs/screenshots/` — every major page and each demo step.
9. `docs/DEMO_SCRIPT.md` — a 10–12 minute presenter script following Section 15, with what to say at each step, including the research-only framing.
10. `docs/PRODUCT.md` — short product description (one page, incubation-centre audience).
11. `docs/LIMITATIONS.md` — honest current limitations, including: research-only, not a medical device, no regulatory certification; ACDC is single-centre, Siemens-only, 150 subjects and CC BY-NC-SA (non-commercial) so trained weights are demo-only and any commercial or B2G pilot needs properly licensed or institution-owned data with ethics approval; 2D models ignore through-plane context; latency depends on hardware; classifier trained on a small balanced research cohort and does not generalise to clinical populations; synthetic data is not anatomy.
12. `docs/ROADMAP.md` — e.g. multi-centre data (M&Ms-style), 3D/2.5D models, nnU-Net baseline, OHIF/DICOMweb and PACS-sandbox integration, MONAI Label active learning, uncertainty maps, quantisation/pruning for edge, federated learning, additional verticals, regulatory pathway (quality management, CDSCO/IEC 62304-style documentation) — all as future work.

---

## 18. NON-GOALS (do not build)

Autonomous diagnosis; treatment recommendations; clinical decision-making; patient-facing medical advice; hospital PACS integration; regulatory certification; real clinical deployment; AIIMS-specific workflows; private clinical datasets; dozens of organs or dozens of models.

---

## 19. REFERENCES TO CITE IN README / ABOUT PAGE

- ACDC: Bernard et al., IEEE TMI 37(11):2514–2525, 2018, doi:10.1109/TMI.2018.2837502 — https://www.creatis.insa-lyon.fr/Challenge/acdc/ (CC BY-NC-SA 4.0)
- MONAI: https://monai.io — https://github.com/Project-MONAI/MONAI (Apache-2.0)
- NiiVue: https://niivue.com — https://github.com/niivue/niivue (BSD-2-Clause)
- PyTorch: https://pytorch.org
- ONNX Runtime: https://onnxruntime.ai
- NiBabel, pydicom, SimpleITK, FastAPI, scikit-learn, Plotly, Recharts — list with licences in `THIRD_PARTY_LICENSES.md`.
