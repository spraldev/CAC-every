#!/usr/bin/env python3
"""
Test download of a single small dataset to verify functionality
"""

import os
import json
from pathlib import Path

# Set environment variables
os.environ['HF_HUB_ENABLE_HF_TRANSFER'] = '1'
os.environ['HF_HUB_DOWNLOAD_TIMEOUT'] = '120'
os.environ['HF_DATASETS_CACHE'] = 'data/.hf_cache'

from huggingface_hub import snapshot_download, HfApi
from datasets import load_dataset

def test_single_download():
    """Test downloading a single dataset"""
    print("Testing dataset download with keremberke/pothole-segmentation...")
    
    try:
        # Try downloading a file-based dataset
        api = HfApi()
        dataset_info = api.dataset_info("keremberke/pothole-segmentation")
        print(f"Dataset found: {dataset_info.id}")
        print(f"  Created: {getattr(dataset_info, 'created_at', 'Unknown')}")
        print(f"  Last modified: {getattr(dataset_info, 'last_modified', 'Unknown')}")
        
        # Create test directory
        test_dir = Path("data/test_download/pothole-segmentation")
        test_dir.mkdir(parents=True, exist_ok=True)
        
        # Download snapshot
        print("\nDownloading dataset files...")
        snapshot_path = snapshot_download(
            repo_id="keremberke/pothole-segmentation",
            repo_type="dataset",
            local_dir=str(test_dir),
            local_dir_use_symlinks=False,
            resume_download=True,
            max_workers=2
        )
        
        print(f"✓ Downloaded to: {snapshot_path}")
        
        # List downloaded files
        files = list(test_dir.glob("**/*"))[:10]
        print(f"\nSample downloaded files ({len(list(test_dir.glob('**/*')))} total):")
        for f in files:
            if f.is_file():
                size = f.stat().st_size / 1024
                print(f"  - {f.relative_to(test_dir)} ({size:.1f} KB)")
        
        # Try loading a dataset script
        print("\n\nTesting dataset script with Zesky665/TACO...")
        try:
            dataset = load_dataset(
                "Zesky665/TACO",
                cache_dir="data/.hf_cache",
                split="train",
                trust_remote_code=True,
                streaming=True  # Use streaming to avoid full download
            )
            print(f"✓ Dataset script loaded successfully")
            print(f"  Features: {dataset.features}")
        except Exception as e:
            print(f"⚠ Dataset script test: {e}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_single_download()
    if success:
        print("\n✓ Download test successful!")
        print("You can now run 'make download' to fetch all datasets.")
    else:
        print("\n✗ Download test failed. Check your connection and credentials.")
    exit(0 if success else 1)
