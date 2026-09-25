# Rule 00: Clinical Safety, Scientific Honesty & Data Governance

**Activation:** Always On

## 1. Clinical Safety Guidelines
- MedAI Studio is a **research prototype** and technology demonstrator (TRL-4/TRL-5).
- Every UI view must render a global persistent banner: `"Research prototype — not for clinical use."`
- Never output diagnostic terminology in relation to patient imaging or segmentation.
- Approved terminology: `"research category"`, `"model output"`, `"measurement"`, `"segmentation result"`.
- Forbidden terminology: `"diagnosis"`, `"diagnose"`, `"patient has"`, `"abnormal/normal heart"`.
- Do not provide clinical advice or patient treatment recommendations.

## 2. Scientific Honesty & Provenance
- No hard-coded metrics, fake benchmark scores, or fabricated Dice/IoU scores.
- Metric display prior to benchmarking must show `"—"` (Not yet benchmarked).
- Synthetic data must always be flagged `"SYNTHETIC — not real anatomy"` and isolated from real ACDC metrics.
- Model rankings must be framed as `"Decision-support ranking"` dependent on objective weights.

## 3. Data Governance & Privacy
- Only use open public datasets (ACDC primary, CC BY-NC-SA 4.0).
- Strip PHI DICOM headers on import.
- No network telemetry or external API dependencies. All inference, storage, and processing remain local.
