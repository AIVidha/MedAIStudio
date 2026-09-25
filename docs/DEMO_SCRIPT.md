# MedAI Studio — Presenter Demo Script

**Duration:** 10–12 minutes
**Audience:** AI/healthcare incubation centre, institutional evaluators, B2G stakeholders
**Setup required:** MedAI Studio running locally (see README Quick Start), browser open at http://localhost:5173 (dev) or http://localhost:3000 (Docker)

> **Framing reminder:** At every step, use the language *research prototype*, *model output*, *research measurement*, and *decision-support tool* — never *diagnosis*, *patient result*, or *clinical recommendation*.

---

## Before You Start (2 minutes pre-demo setup)

1. Start the backend: `make dev-backend` (or `docker compose up -d`)
2. Start the frontend: `make dev-frontend`
3. Seed the demo DB: `make seed-demo`
4. Generate synthetic data if not already done: `make synthetic`
5. Open the browser at http://localhost:5173
6. Have the Benchmarks page ready to show a populated leaderboard

---

## Step 1 — Opening Screen (30 seconds)

**What to show:** Navigate to the root URL. The login page appears.

**What to say:**
> "This is MedAI Studio — an integrated research platform for medical imaging AI. The tagline captures the workflow: Build. Annotate. Benchmark. Optimize. Deploy. It's designed for research groups and institutions who want to evaluate the full medical AI pipeline in one place, starting with Cardiac MRI.
>
> You'll notice the persistent banner at the top — *Research prototype — not for clinical use* — that appears on every single page of the application. That's non-negotiable and hard-wired into the frontend."

---

## Step 2 — Login (30 seconds)

**What to show:** Log in with `admin@medaistudio.local` / `admin123`.

**What to say:**
> "Authentication is role-based — admin, researcher, annotator, viewer — scoped per project. In a research setting you'd change these credentials; for the demo the admin account is pre-seeded."

---

## Step 3 — Dashboard (1 minute)

**What to show:** The Dashboard page. Point to the stats cards, recent activity, and the model summary section.

**What to say:**
> "The dashboard is the project command centre. It shows dataset stats, annotation progress, and — critically — a model summary card that only shows real computed numbers. Any metric that hasn't been benchmarked yet shows *'—'* and *'Not yet benchmarked'*. We never hard-code placeholder numbers.
>
> The project here is *Cardiac MRI AI Demo* — short-axis cine MRI segmentation of LV, RV, and myocardium, the three main cardiac structures we care about in this vertical."

---

## Step 4 — Dataset Manager (1 minute)

**What to show:** Navigate to **Datasets**. Show the scan results and the three synthetic subjects.

**What to say:**
> "The dataset manager handles ACDC import and our synthetic fallback. ACDC is a well-established community benchmark from the MICCAI 2017 challenge — 150 exams, five research categories.
>
> For this demo we're using three synthetic subjects — you can see they're tagged *SYNTHETIC — not real anatomy* throughout. The platform runs end-to-end on synthetic data so you never need a dataset download to see the full workflow. The splits panel shows train/val/test assignment with a patient-level leakage check — a split with any patient in two sets would fail the badge and block the workflow."

---

## Step 5 — Image Viewer (1 minute)

**What to show:** Navigate to **Viewer**. Select `patient001` from the demo selector. Show the NIfTI volume with overlay.

**What to say:**
> "The viewer is powered by NiiVue — a WebGL2 library purpose-built for NIfTI, which is the native format for ACDC. We render slices with the segmentation overlay, and this demo shows the ED frame with the synthetic ground truth mask on top.
>
> In a full workflow this viewer also handles 4D cine playback — you'd see the heart contracting — and it has a built-in drawing layer for annotation. The overlay colours are consistent everywhere: LV in red, myocardium in green, RV in blue."

---

## Step 6 — Cardiac AI Profile (1.5 minutes)

**What to show:** Navigate to **Cardiac Profile**. Select `patient001`, then `patient002`, then `patient003` from the dropdown. Show the measurement cards and the research category label.

**What to say:**
> "The Cardiac AI Profile page is probably the most visually distinctive part of the demo. For each synthetic subject, we compute cardiac measurements from the ground truth masks — EDV, ESV, stroke volume, ejection fraction, and myocardial mass. Every number is derived from the NIfTI header's affine matrix — actual voxel spacing in millimetres — never from assumed defaults.
>
> Notice the label on every measurement: *Research / AI-derived quantitative measurements — not clinical diagnosis.* And the research category shown — NOR, MINF, DCM — carries the label *Research classification output — not a diagnosis.*
>
> Switch between the three subjects and you'll see how the measurements differ across categories. This is the kind of feature comparison a research group would use to validate whether a model's quantitative outputs are plausible."

---

## Step 7 — Model Benchmarking (1.5 minutes)

**What to show:** Navigate to **Benchmarks**. Show the leaderboard table. Click **Run Benchmark Suite** if the table is empty.

**What to say:**
> "The benchmarking module gives you an empirical comparison of four architectures — U-Net, U-Net++, Efficient-UNet, and SegResNet. These are all from MONAI's model zoo, representing a range of capacity and efficiency trade-offs.
>
> Every number in this table — Dice, IoU, parameters, FLOPs, latency — comes from code running in this repo on this hardware. The provenance label shows dataset version, split, hardware, and timestamp. Nothing is copied from a paper. If a metric hasn't been computed yet, you see *'—'* and *'Not yet benchmarked'*.
>
> On real ACDC data with trained weights, you'd see mean Dice around 0.85–0.93 for the LV, lower for the more complex RV and myocardium — consistent with published ACDC results."

---

## Step 8 — TOPSIS Optimization (2 minutes)

**What to show:** Navigate to **Optimization**. Show the weight sliders. Drag the Accuracy slider down and the Latency slider up. Show the ranking update. Then show the Pareto scatter chart.

**What to say:**
> "This is where the demo gets interesting for institutional procurement conversations. You don't just want the model with the highest Dice — you want the model that best fits your deployment constraints.
>
> The TOPSIS panel implements multi-criteria decision making. Accuracy, FLOPs, parameters, latency, and size are all weighted trade-offs. Watch what happens when I shift the weights toward low latency — [drag sliders] — the ranked list reorders. The ranking is always labelled *'Decision-support ranking tailored to user weight parameters'* — we're explicit that it depends on the chosen objectives, not an absolute best model claim.
>
> The Pareto chart shows the non-dominated models highlighted — those that aren't beaten on every criterion by any other model. Dominated models are shown greyed out. This is the canonical engineering trade-off visualization for model selection."

---

## Step 9 — ONNX Deployment (1 minute)

**What to show:** Navigate to **Deployments**. Show the architecture dropdown and ONNX export panel. Show the cURL snippet.

**What to say:**
> "Once you've selected a model, deployment is a one-click ONNX export. The registry shows the exported model, its endpoint URL, and an auto-generated cURL snippet so any downstream system can hit the inference endpoint immediately.
>
> The inference service is a containerised ONNX Runtime instance — entirely local, no cloud calls. The page is clearly marked *Prototype deployment — not a clinical deployment*, and the health endpoint confirms the service is running. In a real institutional deployment you'd swap in properly validated weights and add authentication to the inference container."

---

## Step 10 — Research Framing Close (30 seconds)

**What to say:**
> "To close the loop: MedAI Studio demonstrates a credible end-to-end medical AI pipeline — data, annotation, training, benchmarking, optimization, and deployment — all from one platform, all running locally, all on publicly available data with proper attribution.
>
> It's a TRL-4/TRL-5 research prototype — not a medical device, no regulatory certification, not for clinical use. What it shows is the architecture and methodology for an institutional medical-AI platform. The path from here to a validated clinical tool requires a quality management system, clinical evidence, and regulatory submission — that's documented in LIMITATIONS.md and ROADMAP.md."

---

## Demo Q&A Prep

**"Why not use OHIF as the viewer?"**
NiiVue is NIfTI-native; OHIF is DICOM-first and would require a full DICOM conversion pipeline for ACDC. This is documented as ADR-001 in `docs/DECISIONS.md`.

**"Are these real cardiac measurements?"**
The measurements are computed from synthetic NIfTI phantoms. On real ACDC data they'd be computed identically — the algorithm is the same. All measurements carry the research disclaimer.

**"Which model should we use?"**
That depends on your deployment constraints — the TOPSIS sliders let you specify those constraints explicitly. The platform doesn't make that claim for you.

**"Can this work with our hospital data?"**
The platform is designed for local execution with NIfTI and DICOM data. A real institutional deployment would need proper ethics approval, data governance, and clinical validation. See LIMITATIONS.md.

**"Is the Dice real?"**
On synthetic data, Dice values are computed from synthetic masks — not representative of real anatomy. On real ACDC with trained models, results are consistent with published ACDC benchmarks (mean LV Dice 0.88–0.93).
