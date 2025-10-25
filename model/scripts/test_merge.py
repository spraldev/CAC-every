#!/usr/bin/env python3
"""
Test the merge functionality with downloaded test data
"""

import json
import shutil
from pathlib import Path
import sys
sys.path.insert(0, 'scripts')

from merge_to_coco import DatasetMerger
from utils_yolo import find_coco_jsons

def test_merge():
    """Test merging functionality with a small dataset"""
    print("Testing merge functionality...")
    
    # Check if test dataset exists
    test_dataset_path = Path("data/test_download/pothole-segmentation")
    if not test_dataset_path.exists():
        print("✗ Test dataset not found. Run test_download.py first.")
        return False
    
    # Copy to sources for testing
    test_source_path = Path("data/sources/test-pothole")
    if test_source_path.exists():
        shutil.rmtree(test_source_path)
    shutil.copytree(test_dataset_path, test_source_path)
    
    # Initialize merger
    try:
        merger = DatasetMerger(
            schema_path="config/label_schema.json",
            rules_path="config/dataset_map_rules.yaml"
        )
        print("✓ Merger initialized")
    except Exception as e:
        print(f"✗ Failed to initialize merger: {e}")
        return False
    
    # Look for COCO files
    coco_files = find_coco_jsons(str(test_source_path))
    print(f"Found {len(coco_files)} COCO JSON files")
    
    # Create test output directory
    test_output = Path("data/test_merged")
    test_output.mkdir(parents=True, exist_ok=True)
    
    # Process test dataset
    if coco_files:
        for coco_file in coco_files[:1]:  # Process just one file
            print(f"Processing: {coco_file}")
            merger.process_coco_dataset(coco_file, "test-pothole", str(test_output))
    else:
        print("No COCO files found, checking for YOLO format...")
        # Try other format detection here if needed
    
    # Check results
    print(f"\nProcessed {merger.stats['images_processed']} images")
    print(f"Processed {merger.stats['annotations_processed']} annotations")
    
    if merger.stats['images_processed'] > 0:
        # Save small test split
        merger.save_splits(str(test_output), val_ratio=0.2)
        
        # Check output files
        train_json = test_output / "annotations" / "train.json"
        val_json = test_output / "annotations" / "val.json"
        
        if train_json.exists() and val_json.exists():
            with open(train_json) as f:
                train_data = json.load(f)
            with open(val_json) as f:
                val_data = json.load(f)
            
            print(f"\n✓ Merge test successful!")
            print(f"  Train: {len(train_data['images'])} images, {len(train_data['annotations'])} annotations")
            print(f"  Val: {len(val_data['images'])} images, {len(val_data['annotations'])} annotations")
            
            # Clean up test output
            shutil.rmtree(test_output)
            shutil.rmtree(test_source_path)
            
            return True
    
    print("\n✗ No data was processed")
    return False

if __name__ == "__main__":
    success = test_merge()
    exit(0 if success else 1)


