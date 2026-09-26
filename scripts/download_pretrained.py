#!/usr/bin/env python3
"""
Download the MONAI Model Zoo pre-trained cardiac segmentation model.

Bundle: ventricular_short_axis_3label (MIT License)
  2D short-axis cardiac MRI — segments LV pool, LV myocardium, RV pool.

Run once from the repo root:
    python scripts/download_pretrained.py
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.ml.bundle_model import download_bundle, BUNDLE_PATH

print("Downloading MONAI pre-trained cardiac segmentation bundle …")
ok = download_bundle()
if ok:
    print(f"Done. Bundle at: {BUNDLE_PATH}")
    print("Run the backend — inference will automatically use this model.")
else:
    print("Download failed. Check your internet connection and MONAI version.")
    sys.exit(1)
