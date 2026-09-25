import os
import sys
import json
import numpy as np
import nibabel as nib

def generate_synthetic_patient(patient_id: str, output_dir: str, num_slices: int = 8, dim: int = 160):
    """
    Generates synthetic short-axis cine cardiac MRI NIfTI volumes for ED and ES frames,
    along with ground truth multi-structure segmentations (1: RV, 2: MYO, 3: LV).
    Includes physical voxel spacing (1.25x1.25x10.0 mm) in NIfTI header.
    """
    pat_dir = os.path.join(output_dir, patient_id)
    os.makedirs(pat_dir, exist_ok=True)
    
    # Header affine: 1.25mm x 1.25mm x 10mm voxel size
    affine = np.diag([1.25, 1.25, 10.0, 1.0])
    
    frames = {"ED": "frame01", "ES": "frame08"}
    
    for frame_name, frame_suffix in frames.items():
        # Synthetic MRI Intensity Volume (Rician noise / Gaussian blurred circles)
        vol_img = np.random.normal(loc=30, scale=5, size=(dim, dim, num_slices)).astype(np.float32)
        vol_gt = np.zeros((dim, dim, num_slices), dtype=np.uint8)
        
        center_x, center_y = dim // 2, dim // 2
        
        for z in range(num_slices):
            # Dynamic radius per slice (apical to basal)
            factor = np.sin((z + 1) / (num_slices + 1) * np.pi)
            if frame_name == "ES":
                factor *= 0.75  # Contraction at ES
                
            lv_r = int(22 * factor)
            myo_r = int(32 * factor)
            rv_r = int(28 * factor)
            
            y_indices, x_indices = np.ogrid[:dim, :dim]
            
            # LV Pool (label 3)
            dist_lv = (x_indices - center_x)**2 + (y_indices - center_y)**2
            lv_mask = dist_lv <= (lv_r**2)
            
            # Myocardium Ring (label 2)
            myo_mask = (dist_lv <= (myo_r**2)) & (~lv_mask)
            
            # RV Crescent (label 1)
            dist_rv = (x_indices - (center_x - 20))**2 + (y_indices - center_y)**2
            rv_mask = (dist_rv <= (rv_r**2)) & (~lv_mask) & (~myo_mask)
            
            # Assign GT masks
            vol_gt[rv_mask, z] = 1
            vol_gt[myo_mask, z] = 2
            vol_gt[lv_mask, z] = 3
            
            # Assign Synthetic Intensity Values
            vol_img[rv_mask, z] += np.random.normal(180, 15, size=np.sum(rv_mask))
            vol_img[myo_mask, z] += np.random.normal(110, 12, size=np.sum(myo_mask))
            vol_img[lv_mask, z] += np.random.normal(210, 15, size=np.sum(lv_mask))
        
        # Save NIfTI files
        img_nii = nib.Nifti1Image(vol_img, affine)
        gt_nii = nib.Nifti1Image(vol_gt, affine)
        
        img_filename = f"{patient_id}_{frame_suffix}.nii.gz"
        gt_filename = f"{patient_id}_{frame_suffix}_gt.nii.gz"
        
        nib.save(img_nii, os.path.join(pat_dir, img_filename))
        nib.save(gt_nii, os.path.join(pat_dir, gt_filename))
        
    # Write Info.cfg
    info_cfg_path = os.path.join(pat_dir, "Info.cfg")
    with open(info_cfg_path, "w") as f:
        f.write("ED: 1\n")
        f.write("ES: 8\n")
        f.write("Group: NOR\n")
        f.write("Height: 175\n")
        f.write("NbFrame: 30\n")
        f.write("Weight: 70\n")
        f.write("SYNTHETIC: True — not real anatomy\n")

def generate_synthetic_dataset(num_patients: int = 5, output_dir: str = "./data/synthetic"):
    print(f"Generating synthetic dataset ({num_patients} patients) in {output_dir}...")
    os.makedirs(output_dir, exist_ok=True)
    
    for i in range(1, num_patients + 1):
        pat_id = f"patient{i:03d}"
        generate_synthetic_patient(pat_id, output_dir)
        
    metadata = {
        "dataset_name": "Synthetic Cardiac MRI Fallback",
        "disclaimer": "SYNTHETIC — not real anatomy",
        "num_patients": num_patients,
        "patients": [f"patient{i:03d}" for i in range(1, num_patients + 1)],
        "structures": {"1": "Right Ventricle (RV)", "2": "Myocardium (MYO)", "3": "Left Ventricle (LV)"}
    }
    
    with open(os.path.join(output_dir, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"[SUCCESS] Generated synthetic dataset successfully in {output_dir}.")

if __name__ == "__main__":
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "./data/synthetic"
    generate_synthetic_dataset(output_dir=out_dir)

