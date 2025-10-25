#!/usr/bin/env python3
"""
Test the full pipeline with a minimal set of datasets
"""

import os
import sys
import json
import shutil
from pathlib import Path

# Set environment variables
os.environ['HF_HUB_ENABLE_HF_TRANSFER'] = '1'
os.environ['HF_HUB_DOWNLOAD_TIMEOUT'] = '120'
os.environ['HF_DATASETS_CACHE'] = 'data/.hf_cache'

from huggingface_hub import snapshot_download
from datasets import load_dataset

sys.path.insert(0, 'scripts')
from merge_to_coco import DatasetMerger

def download_mini_datasets():
    """Download 2 small datasets for testing"""
    print("Downloading minimal dataset set for testing...")
    
    datasets = [
        ("keremberke/pothole-segmentation", "files"),
        ("keremberke/garbage-object-detection", "files"),
    ]
    
    success = []
    failed = []
    
    for repo_id, dataset_type in datasets:
        dataset_name = repo_id.split('/')[-1]
        local_dir = f"data/sources/{dataset_name}"
        
        print(f"\nDownloading: {repo_id}")
        
        try:
            if dataset_type == "files":
                # Download file-based dataset
                snapshot_path = snapshot_download(
                    repo_id=repo_id,
                    repo_type="dataset",
                    local_dir=local_dir,
                    max_workers=2
                )
                
                # Extract zips
                from extract_zips import extract_dataset_zips
                extract_dataset_zips(local_dir)
                
                success.append(repo_id)
                print(f"  ✓ Downloaded to {local_dir}")
                
            elif dataset_type == "script":
                # Load dataset script
                dataset = load_dataset(repo_id, cache_dir="data/.hf_cache")
                
                # Create marker
                marker_path = Path(local_dir) / "_from_datasets_cache.txt"
                marker_path.parent.mkdir(parents=True, exist_ok=True)
                with open(marker_path, 'w') as f:
                    f.write(f"Repository: {repo_id}\n")
                
                success.append(repo_id)
                print(f"  ✓ Loaded dataset script")
                
        except Exception as e:
            failed.append((repo_id, str(e)))
            print(f"  ✗ Failed: {e}")
    
    print(f"\nDownload summary:")
    print(f"  Success: {len(success)}")
    print(f"  Failed: {len(failed)}")
    
    return len(success) > 0

def test_merge():
    """Test merging the downloaded datasets"""
    print("\n" + "="*60)
    print("Testing merge functionality...")
    
    # Initialize merger
    merger = DatasetMerger(
        schema_path="config/label_schema.json",
        rules_path="config/dataset_map_rules.yaml"
    )
    
    # Process downloaded datasets
    sources_path = Path("data/sources")
    for dataset_dir in sources_path.iterdir():
        if dataset_dir.is_dir():
            print(f"\nProcessing: {dataset_dir.name}")
            
            # Look for COCO files
            from utils_yolo import find_coco_jsons, find_yolo_datasets
            
            coco_files = find_coco_jsons(str(dataset_dir))
            for coco_file in coco_files:
                print(f"  Found COCO: {Path(coco_file).relative_to(dataset_dir)}")
                merger.process_coco_dataset(coco_file, dataset_dir.name, "data/merged")
            
            # Look for YOLO datasets
            yolo_datasets = find_yolo_datasets(str(dataset_dir))
            for yolo_ds in yolo_datasets:
                print(f"  Found YOLO: {yolo_ds['name']}")
                merger.process_yolo_dataset(yolo_ds, dataset_dir.name, "data/merged")
    
    # Save splits
    if merger.stats['images_processed'] > 0:
        merger.save_splits("data/merged", val_ratio=0.2)
        return True
    else:
        print("No data was processed")
        return False

def verify_output():
    """Verify the output files exist and are valid"""
    print("\n" + "="*60)
    print("Verifying output...")
    
    train_json = Path("data/merged/annotations/train.json")
    val_json = Path("data/merged/annotations/val.json")
    
    if not train_json.exists() or not val_json.exists():
        print("✗ Output JSON files not found")
        return False
    
    with open(train_json) as f:
        train_data = json.load(f)
    with open(val_json) as f:
        val_data = json.load(f)
    
    print(f"✓ Train: {len(train_data['images'])} images, {len(train_data['annotations'])} annotations")
    print(f"✓ Val: {len(val_data['images'])} images, {len(val_data['annotations'])} annotations")
    
    # Check that images exist
    train_imgs = Path("data/merged/images/train")
    val_imgs = Path("data/merged/images/val")
    
    train_img_count = len(list(train_imgs.glob("*"))) if train_imgs.exists() else 0
    val_img_count = len(list(val_imgs.glob("*"))) if val_imgs.exists() else 0
    
    print(f"✓ Image files: {train_img_count} train, {val_img_count} val")
    
    # Check YOLO config
    with open("seesomething.yaml") as f:
        import yaml
        yolo_config = yaml.safe_load(f)
    
    if yolo_config['nc'] == 10:
        print(f"✓ YOLO config: {yolo_config['nc']} classes")
    else:
        print(f"✗ YOLO config: class mismatch")
        return False
    
    return True

def main():
    """Run the mini pipeline test"""
    print("Urban Issue Detection - Mini Pipeline Test")
    print("="*60)
    
    # Clean previous test data
    if Path("data/sources").exists():
        shutil.rmtree("data/sources")
    if Path("data/merged").exists():
        shutil.rmtree("data/merged")
    
    Path("data/sources").mkdir(parents=True, exist_ok=True)
    
    # Run pipeline steps
    success = True
    
    if not download_mini_datasets():
        print("✗ Download failed")
        success = False
    
    if success and not test_merge():
        print("✗ Merge failed")
        success = False
    
    if success and not verify_output():
        print("✗ Verification failed")
        success = False
    
    print("\n" + "="*60)
    if success:
        print("✓ Mini pipeline test SUCCESSFUL!")
        print("\nThe pipeline is ready for full dataset processing:")
        print("  1. Run 'make download' to fetch all datasets")
        print("  2. Run 'make merge' to prepare training data")
        print("  3. Run 'make train' to start YOLO training")
    else:
        print("✗ Mini pipeline test FAILED")
        print("Please check the errors above")
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())
