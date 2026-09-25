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
