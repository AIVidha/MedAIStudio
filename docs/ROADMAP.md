# MedAI Studio — Roadmap

> All items below are **future work**. None are committed to a timeline. This document exists for research and institutional evaluation purposes.

---

## Near-Term (Phase 5 completion)

- Full annotation workspace (brush, polygon, eraser, undo/redo, AI-assisted segment accept/reject/edit)
- Experiment tracking with live loss curves and run comparison
- Model registry with version browser and status management
- Real JWT authentication with token expiry and password hash validation
- NiiVue full file streaming from the backend for ACDC 4D volumes
- Background worker fully wired to training and benchmark job triggers
- RBAC enforcement (admin, researcher, annotator, viewer roles)
- Admin audit log UI
- Data deletion endpoint (GDPR-style subject and dataset version removal)
- Playwright E2E test suite covering the 21-step demo workflow

---

## Data & Dataset Diversity

- **Multi-centre datasets:** M&Ms (Multi-Centre, Multi-Vendor & Multi-Disease Cardiac Segmentation Challenge) and M&Ms-2 for scanner and site generalisation studies.
- **Pathology coverage:** DCM, HCM, MINF, RV abnormalities beyond ACDC's five categories.
- **Longitudinal tracking:** multi-timepoint studies per subject.
- **Demographic diversity:** age, sex, BMI-stratified splits.
- **DICOM pipeline:** full pydicom + SimpleITK server-side conversion and PHI stripping for institutional DICOM upload workflows.

---

## AI Models & Training

- **nnU-Net v2 baseline:** automated configuration search for per-dataset-optimal U-Net topology; provides a strong, reproducible baseline.
- **3D and 2.5D architectures:** TransUNet, UNETR (ViT-based), SwinUNETR, nnFormer — models that exploit through-plane context for anisotropic MRI.
- **Self-supervised pre-training:** SimMIM, MAE on unlabelled cardiac MRI to reduce labelled data requirements.
- **Model uncertainty:** Monte Carlo Dropout and deep ensembles for uncertainty maps on predictions — crucial for annotation quality control.
- **Quantisation and pruning:** INT8/FP16 quantisation via ONNX Runtime and PyTorch's `torch.ao.quantization` for edge/mobile deployment targets.

---

## Platform Capabilities

- **Active learning loop:** MONAI Label integration — model queries the most uncertain unlabelled images, annotator labels them, model retrains; closes the annotation ↔ training cycle.
- **Federated learning prototype:** privacy-preserving model aggregation across sites using PySyft or FATE; each site keeps its data locally.
- **GPU notebook export:** `notebooks/train_full_on_gpu.ipynb` for Colab/Kaggle GPU training, with run-bundle import back into the platform.
- **PACS sandbox integration:** DICOMweb / WADO-RS adapter so hospital PACS systems can push studies directly to MedAI Studio via HL7 FHIR ImagingStudy + DICOMweb endpoints. OHIF / Cornerstone3D as an alternative viewer path for DICOM-first workflows.
- **Report generation:** HTML and PDF reports via Jinja2 + WeasyPrint, containing benchmark table, Pareto plot, MCDM weights and ranking, provenance, and mandatory disclaimers.
- **Dataset export:** versioned zip bundles (NIfTI images, masks, CSV metadata, split file, ATTRIBUTION.md with ACDC citation).

---

## Additional Organ Verticals

The vertical plug-in architecture is in place (`configs/verticals/*.yaml`). Template YAML configs are included for:

| Vertical | Modality | Task |
|----------|----------|------|
| Brain MRI | T1/T2/FLAIR | Tumour segmentation, white matter lesion |
| Lung CT | CT | Lobe segmentation, nodule detection |
| Liver CT | CT | Liver and lesion segmentation |
| Kidney CT | CT | Kidney and tumour segmentation |
| Prostate MRI | T2/DWI | Zone segmentation, PI-RADS grading |

Each additional vertical requires: dataset importer, preprocessing transforms, quantification plug-in, and model registry entries.

---

## Regulatory Pathway (Research → Product)

Any transition from research demonstrator to a medical device or software-as-a-medical-device (SaMD) product would require:

- **Quality Management System (QMS):** ISO 13485 or equivalent.
- **Software lifecycle:** IEC 62304 compliant development, maintenance, and release process.
- **Clinical evidence:** prospective clinical validation studies, multi-centre trials, performance on diverse populations.
- **Regulatory submission:** CDSCO (India), CE mark + MDR (EU), FDA 510(k)/De Novo (USA) depending on intended use and risk classification.
- **Cybersecurity:** FDA/MDCG cybersecurity guidance compliance, penetration testing, vulnerability management.
- **Post-market surveillance:** adverse event reporting, continuous real-world performance monitoring.

This roadmap item is listed for institutional awareness, not as a project commitment.

---

## Infrastructure

- PostgreSQL → managed cloud DB (AWS RDS, Azure Database) for multi-user production.
- S3-compatible storage (MinIO or AWS S3) for large NIfTI/ONNX file storage.
- Kubernetes deployment manifests for horizontal scaling.
- CI/CD pipeline: GitHub Actions for test, build, and container push.
- Monitoring: Prometheus + Grafana for API latency, job queue depth, and storage usage.

---

*This roadmap reflects research interest and capability, not a product commitment.*
