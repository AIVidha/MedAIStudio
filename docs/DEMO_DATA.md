# MedAI Studio — Demo Data Guide

> Research prototype — not for clinical use.

This document explains the data options for running MedAI Studio, from the zero-download synthetic fallback to the full ACDC research dataset.

---

## Option 1: Synthetic Data (No Download)

The repo includes a generator that produces short-axis cardiac MRI NIfTI phantoms — geometric shapes that follow ACDC's file layout and label conventions, but contain **no real anatomy**.

### Generate

```bash
python scripts/make_synthetic.py
```

This creates:

```
data/synthetic/
├── patient001/               ← NOR (Normal Physiology) — SYNTHETIC
│   ├── patient001_frame01.nii.gz       (ED frame image)
│   ├── patient001_frame01_gt.nii.gz    (ED ground truth mask)
│   ├── patient001_frame08.nii.gz       (ES frame image)
│   ├── patient001_frame08_gt.nii.gz    (ES ground truth mask)
│   └── Info.cfg
├── patient002/               ← MINF (Myocardial Infarction) — SYNTHETIC
└── patient003/               ← DCM (Dilated Cardiomyopathy) — SYNTHETIC
```

**Label values in masks:** `0 = background`, `1 = RV`, `2 = MYO`, `3 = LV`

**Realistic header:** affine matrix with 1.56 × 1.56 × 10 mm voxel spacing, matching typical ACDC acquisition parameters.

### Labelling

Every synthetic subject is flagged in the database and in the UI as:
> **SYNTHETIC — not real anatomy**

Synthetic metrics are never mixed with real ACDC metrics. Any benchmark or quantification result derived from synthetic data is labelled accordingly.

---

## Option 2: ACDC Dataset (Real Research Data)

ACDC (Automated Cardiac Diagnosis Challenge, MICCAI 2017) is a community benchmark dataset of 150 short-axis cardiac MRI exams from the University Hospital of Dijon, France.

### About ACDC

| Property | Value |
|----------|-------|
| Subjects | 150 (100 training, 50 testing) |
| Scanners | Siemens 1.5 T and 3.0 T (SSFP sequence) |
| Slice thickness | 5–8 mm (with possible inter-slice gap) |
| In-plane spacing | 1.37–1.68 mm |
| Frames per cycle | 28–40 |
| Research categories | NOR (30), MINF (30), DCM (30), HCM (30), RV (30) |
| Labels | 0 background, 1 RV cavity, 2 myocardium, 3 LV cavity |
| Licence | **CC BY-NC-SA 4.0** — non-commercial, share-alike, attribution required |

### Download Instructions

ACDC requires a **free account** on the CREATIS Human Heart Project portal. This cannot be automated.

1. Go to: https://humanheart-project.creatis.insa-lyon.fr/database/#collection/637218c173e9f0047faa00fb
2. Register for a free account and confirm your email.
3. Download the full dataset (approximately 2 GB).
4. Unzip to the following location in the repo:

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
│   ├── patient002/
│   └── ...  (100 patients total)
└── testing/
    ├── patient101/
    └── ...  (50 patients total)
```

> Note: the `testing/` folder in some download versions does not include `_gt` masks. If ground truth is absent for the test set, MedAI Studio holds out a stratified test split from `training/` automatically and documents this in `docs/DECISIONS.md`.

### Info.cfg Format

Each subject folder contains an `Info.cfg` with key metadata:

```
ED: 1
ES: 12
Group: DCM
Height: 177.0
Weight: 90.0
NbFrame: 28
```

ED and ES frame numbers come from this file — never assumed to be fixed frame indices.

### Alternative Mirror

If the official portal is unavailable, the same dataset is mirrored (same licence) at:
https://huggingface.co/datasets/YongchengYAO/ACDC

Verify the folder layout and file integrity against the description above before use.

---

## Importing Data into MedAI Studio

### Via the UI

1. Log in and navigate to **Datasets** in the sidebar.
2. Click **Scan Local Storage** — this discovers subjects in `data/synthetic/` and any configured ACDC path.
3. Click **Import Synthetic** to seed the three synthetic demo subjects.
4. Select a subject from the dropdown on the **Cardiac Profile** or **Viewer** pages.

### Via the API

```bash
# Scan local storage for available datasets
curl http://localhost:8000/api/v1/datasets/scan-local

# Import synthetic demo subjects
curl -X POST http://localhost:8000/api/v1/datasets/import-synthetic

# View existing splits
curl http://localhost:8000/api/v1/datasets/splits
```

---

## Data Governance

- **No private patient data:** ACDC is a public research dataset. Do not add real patient data from any hospital, clinic, or institution.
- **Git safety:** `data/raw/`, `data/processed/`, `storage/`, and trained model weights (`.pt`, `.pth`, `.onnx`) are listed in `.gitignore` and must never be committed.
- **Patient-level splits:** the split logic enforces that no patient ID appears in more than one split. A test failure on this constraint blocks the build.
- **Local only:** no imaging data leaves the machine. No cloud upload, no telemetry.

---

## Mandatory Citation

If you use ACDC data in any publication, presentation, or report generated by MedAI Studio:

> O. Bernard, A. Lalande, C. Zotti, F. Cervenansky, et al., **"Deep Learning Techniques for Automatic MRI Cardiac Multi-structures Segmentation and Diagnosis: Is the Problem Solved?"**, *IEEE Transactions on Medical Imaging*, 37(11):2514–2525, 2018. doi:[10.1109/TMI.2018.2837502](https://doi.org/10.1109/TMI.2018.2837502)

ACDC homepage: https://www.creatis.insa-lyon.fr/Challenge/acdc/
