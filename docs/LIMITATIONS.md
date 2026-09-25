# MedAI Studio — Limitations

> Research prototype — not for clinical use.

This document provides an honest account of the current limitations of MedAI Studio. Researchers and evaluators should read this before using the platform for any purpose.

---

## 1. Research Prototype Status

MedAI Studio is a **TRL-4/TRL-5 technology demonstrator**, not a medical device.

- It has not undergone any regulatory review (FDA, CE, CDSCO, or equivalent).
- It has not been validated on clinical populations or in clinical workflows.
- It must not be used for diagnosis, treatment planning, patient monitoring, or any patient-facing clinical decision support.
- It does not meet the requirements of IEC 62304, ISO 13485, or any medical software quality management standard.

---

## 2. Dataset Limitations

**ACDC is a small, single-centre, single-vendor dataset:**
- 150 subjects total (100 training, 50 testing) from one university hospital (Dijon, France).
- Acquired exclusively on Siemens 1.5 T and 3.0 T scanners using the SSFP sequence.
- Does not represent scanner variability (GE, Philips, Canon), site variability, or demographic diversity.
- All five ACDC categories are balanced at 30 subjects each — this does not reflect real clinical prevalence.

**ACDC licence restricts use:**
- CC BY-NC-SA 4.0 — non-commercial, share-alike, attribution required.
- Trained weights are non-commercial demo artefacts. Any commercial or B2G pilot requires properly licensed or institution-owned data with appropriate ethics approval.

**Synthetic data is not anatomy:**
- The built-in synthetic generator produces geometric phantoms (ellipses, crescents). Metrics computed on synthetic data are not representative of real cardiac anatomy or pathology. All synthetic outputs are labelled "SYNTHETIC — not real anatomy" throughout the UI.

---

## 3. Model Limitations

**2D slice-wise segmentation ignores through-plane context:**
- All four architectures (U-Net, U-Net++, Efficient-UNet, SegResNet) operate on individual 2D short-axis slices. They do not model 3D spatial relationships between slices.
- Through-plane continuity is enforced only by the 3D volume reconstruction from per-slice predictions.
- 3D and 2.5D models (e.g. nnU-Net, 3D U-Net) typically achieve better performance, especially for basal and apical slices.

**No pretrained clinical weights:**
- The model weights shipped or trained by this platform are trained on ACDC only. They have not been validated for generalisation to other scanners, sites, pathologies, or imaging protocols.

**Benchmark metrics are hardware-dependent:**
- Latency, FLOPs, and parameter counts are measured on the specific hardware where benchmarks were run. Values shown alongside hardware identifiers should not be compared across different machines.

**Classifier trained on a small balanced cohort:**
- The research classifier (Random Forest on segmentation-derived features) is trained on ACDC's 100 training subjects — a small, balanced research cohort. It does not generalise to clinical populations with realistic class imbalances.
- Classifier outputs are labelled "Research classification output — not a diagnosis."

---

## 4. Engineering Limitations

**Authentication is a stub:**
- The current JWT implementation uses a hardcoded token without real password-hash validation or token expiry. This is unsuitable for any multi-user or network-accessible deployment without proper implementation.

**NiiVue viewer file serving:**
- The viewer currently loads demo/synthetic NIfTI files from a local path. Full NIfTI file streaming from the backend (`/api/v1/studies/...`) is scaffolded but not fully wired for ACDC 4D volume streaming.

**Background worker is scaffolded:**
- The worker service polls a jobs table but is not fully connected to training or benchmark triggers. Long-running jobs (training, full benchmark runs) require manual invocation of scripts.

**ONNX inference is a stub:**
- The inference service container returns a placeholder response from `/predict`. Real ONNX model loading and inference requires trained and exported model files.

**GPU benchmarking requires CUDA:**
- The benchmark suite runs on CPU only in the current configuration. Real GPU timing requires CUDA hardware, NVIDIA Docker runtime, and appropriate CUDA driver versions.

**No RBAC beyond role field:**
- The database schema includes a `role` field (admin, researcher, annotator, viewer) and project-level access control is scaffolded in the API, but full RBAC enforcement is not implemented.

**Annotation tools are UI stubs:**
- The annotation workspace page is a placeholder. Brush, polygon, eraser, undo/redo, and AI-assisted segmentation workflows are not yet wired up.

---

## 5. Privacy and Security Limitations

- Designed for local/private deployment only. CORS is locked to localhost origins.
- No penetration testing, security audit, or vulnerability assessment has been performed.
- Secrets in `.env` (JWT secret key, DB password) must be changed before any deployment beyond a developer laptop.
- DICOM PHI stripping on import is scaffolded in the spec but not yet implemented.
- Audit log is stored in SQLite/PostgreSQL but the admin audit UI is not implemented.

---

## 6. Platform Limitations

- No mobile or tablet UI support; optimised for desktop laptop screens.
- No offline-first or PWA capabilities.
- No data retention enforcement beyond manual deletion; configurable retention in Settings is a stub.
- No federated learning, differential privacy, or multi-site coordination.
- No multi-organ support beyond the Cardiac MRI vertical (architecture supports it; second vertical not implemented).

---

*This limitations document should be updated as gaps are closed or new limitations are identified.*
