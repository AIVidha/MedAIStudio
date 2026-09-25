# MedAI Studio — Product Overview

> **Research prototype — not for clinical use.**
> For AI/healthcare research groups and institutional demonstrators.

---

## What is MedAI Studio?

MedAI Studio is an integrated research platform that brings together every step of the medical imaging AI workflow in one place:

**Data → Annotation → Training → Benchmarking → Optimization → Deployment**

Researchers can import medical imaging datasets, annotate structures, train and compare multiple AI models, rigorously benchmark their performance, optimize for deployment objectives, and export models for inference — all from a single web interface running locally.

The first vertical is **Cardiac MRI AI**: automated segmentation of the left ventricle (LV), right ventricle (RV), and myocardium (MYO) from short-axis cine MRI, with research quantification of ejection fraction, stroke volume, myocardial mass, and related measurements.

---

## The Problem It Addresses

Building a medical AI system today requires stitching together a dozen separate tools: a DICOM/NIfTI viewer, an annotation tool, a training framework, an experiment tracker, a benchmarking harness, an optimization framework, and a deployment pipeline. Each step requires domain expertise, and results are scattered across files, notebooks, and spreadsheets.

For a research group or AI/healthcare incubator evaluating the feasibility of a medical-AI platform, this fragmentation makes it difficult to:
- Demonstrate a credible end-to-end workflow to institutional stakeholders.
- Rigorously compare competing model architectures on standardised benchmarks.
- Justify model selection to procurement or clinical review boards with transparent trade-off analysis.
- Package a working demonstrator for a B2G or institutional pilot conversation.

---

## What MedAI Studio Provides

### Integrated Workflow
A single platform covering the complete research pipeline, from raw NIfTI data to a deployed ONNX inference endpoint, with provenance tracked at every step.

### Rigorous Benchmarking
Empirical comparison of U-Net, U-Net++, Efficient-UNet, and SegResNet on standardised metrics (Dice, IoU, Parameters, FLOPs, latency) derived from code in this repository — not from papers, not from placeholder numbers.

### Transparent Model Selection
TOPSIS multi-criteria decision-making with adjustable weight sliders and Pareto frontier visualisation. Model rankings are labelled *"Decision-support ranking"* — dependent on the chosen deployment objectives — rather than an opaque "best model" claim.

### Research Quantification
Affine-derived cardiac measurements (EDV, ESV, SV, EF, myocardial mass) computed from NIfTI headers, with mandatory research disclaimers and source labelling (ground truth vs. model prediction).

### Public Dataset First
Built around ACDC (CC BY-NC-SA 4.0), a well-established community benchmark. A synthetic fallback ensures the full demo runs without a data download.

### Local Execution, No Telemetry
Entirely self-contained. No cloud inference calls, no external telemetry, no PHI leaves the machine.

---

## Audience

| Audience | Use Case |
|----------|----------|
| AI/healthcare incubator | Demonstrator for institutional and B2G conversations |
| Medical imaging research group | Benchmarking platform for cardiac AI models |
| Healthcare AI team | Evaluation of model selection methodology (MCDM, Pareto) |
| Institutional procurement | Technical demonstration of an AI model evaluation workflow |

---

## Architecture at a Glance

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS, with NiiVue WebGL2 viewer
- **Backend:** Python 3.11 FastAPI, SQLAlchemy 2, SQLite/PostgreSQL
- **AI/ML:** PyTorch, MONAI, scikit-learn, ONNX Runtime
- **Infrastructure:** Docker Compose (5 services), fully local
- **Extensible:** Vertical plug-in architecture for adding new organ systems by configuration

---

## Current Maturity (TRL-4/TRL-5)

Phases 0–4 are complete:
- Dataset management, synthetic data generator, NiiVue viewer
- Cardiac quantification (EDV/ESV/SV/EF/mass from NIfTI affine)
- 4-architecture benchmark suite with leaderboard UI
- TOPSIS MCDM optimization with weight sliders + Pareto frontier
- ONNX export and container endpoint registry

Phase 5 (Polish & Deliverables) is the current sprint, covering documentation, screenshots, and final clean-install verification.

---

## Limitations Summary

This is a research prototype, not a medical device. It has not been validated clinically, has not undergone regulatory review, and must not be used for patient diagnosis or treatment decisions. ACDC is a small single-centre dataset; trained models do not generalise to arbitrary clinical populations or scanner types. See [`docs/LIMITATIONS.md`](LIMITATIONS.md) for the full account.

---

## Citation

> O. Bernard et al., *"Deep Learning Techniques for Automatic MRI Cardiac Multi-structures Segmentation and Diagnosis: Is the Problem Solved?"*, IEEE TMI 37(11):2514–2525, 2018. doi:10.1109/TMI.2018.2837502

ACDC dataset: https://www.creatis.insa-lyon.fr/Challenge/acdc/ — CC BY-NC-SA 4.0
