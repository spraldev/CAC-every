#!/usr/bin/env python3
"""
Robust dataset downloader for Hugging Face datasets
Handles both dataset scripts and plain file repos with resume capability
"""

import os
import json
import logging
import traceback
import zipfile
from pathlib import Path
from typing import List, Dict, Tuple

# Set environment variables before imports
os.environ['HF_HUB_ENABLE_HF_TRANSFER'] = '1'
os.environ['HF_HUB_DOWNLOAD_TIMEOUT'] = '120'
os.environ['HF_DATASETS_CACHE'] = 'data/.hf_cache'

from huggingface_hub import snapshot_download, HfApi
from datasets import load_dataset
from tqdm import tqdm

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Dataset repository configurations
DATASET_CONFIGS = {
    # Road damage / potholes
    'ShixuanAn/RDD_2020': {'type': 'dataset_script'},
    'ShixuanAn/RDD2020': {'type': 'dataset_script'},
    'manot/pothole-segmentation': {'type': 'files'},
    'keremberke/pothole-segmentation': {'type': 'files'},
    'hf-vision/road-pothole-segmentation': {'type': 'files'},
    'Ryukijano/Pothole-detection-Yolov8': {'type': 'files'},
    'Programmer-RD-AI/road-issues-detection-dataset': {'type': 'files'},
    
    # Litter / trash / dumps
    'Zesky665/TACO': {'type': 'dataset_script'},
    'keremberke/garbage-object-detection': {'type': 'files'},
    'UniDataPro/outdoor-garbage': {'type': 'files'},
    'Yorai/detect-waste': {'type': 'files'},
    'INS-IntelligentNetworkSolutions/Waste-Dumpsites-DroneImagery': {'type': 'files'},
    
    # Visual pollution / signage
    'gtsaidata/Urban-Visual-Pollution-Dataset': {'type': 'files'},
    'gtsaidata/Damaged-Traffic-Signs-Dataset': {'type': 'files'},
    
    # Power/electrical hazards
    'EPDCL/Electrical-Lines-Defect-Detection': {'type': 'files'},
    
    # Optional context/negatives
    'dgural/bdd100k': {'type': 'files'},
    'huggan/cityscapes': {'type': 'dataset_script'},
}

def download_dataset_script(repo_id: str, cache_dir: str) -> Tuple[bool, str]:
    """
    Download dataset using datasets.load_dataset()
    Returns (success, error_message)
    """
    try:
        logger.info(f"Loading dataset script: {repo_id}")
        
        # Try to load the dataset
        dataset = load_dataset(
            repo_id,
            cache_dir=cache_dir
        )
        
        # Mark this as a dataset script source
        marker_path = Path(f"data/sources/{repo_id.split('/')[-1]}/_from_datasets_cache.txt")
        marker_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(marker_path, 'w') as f:
            f.write(f"Dataset loaded via datasets.load_dataset()\n")
            f.write(f"Repository: {repo_id}\n")
            f.write(f"Cache dir: {cache_dir}\n")
            f.write(f"Splits: {list(dataset.keys()) if dataset else 'None'}\n")
        
        logger.info(f"✓ Successfully loaded dataset script: {repo_id}")
        return True, ""
        
    except Exception as e:
        error_msg = f"Failed to load dataset script {repo_id}: {str(e)}"
        logger.error(error_msg)
        return False, error_msg

def extract_zips_in_dir(directory: str):
    """Extract all zip files in a directory"""
    dir_path = Path(directory)
    zip_files = list(dir_path.glob("**/*.zip"))
    
    if not zip_files:
        return
    
    logger.info(f"  Extracting {len(zip_files)} zip files...")
    for zip_path in zip_files:
        extract_dir = zip_path.parent / zip_path.stem
        if extract_dir.exists():
            continue
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
                logger.debug(f"    Extracted: {zip_path.name}")
        except Exception as e:
            logger.warning(f"    Failed to extract {zip_path.name}: {e}")

def download_file_repo(repo_id: str, local_dir: str) -> Tuple[bool, str]:
    """
    Download dataset files using snapshot_download()
    Returns (success, error_message)
    """
    try:
        logger.info(f"Downloading file repository: {repo_id}")
        
        # Check if dataset exists
        api = HfApi()
        try:
            api.dataset_info(repo_id)
        except Exception:
            # Try without checking if it fails
            pass
        
        # Download the repository
        snapshot_path = snapshot_download(
            repo_id=repo_id,
            repo_type="dataset",
            local_dir=local_dir,
            max_workers=4
        )
        
        # Extract any zip files
        extract_zips_in_dir(local_dir)
        
        logger.info(f"✓ Successfully downloaded files: {repo_id} to {snapshot_path}")
        return True, ""
        
    except Exception as e:
        error_msg = f"Failed to download file repo {repo_id}: {str(e)}"
        logger.error(error_msg)
        logger.debug(traceback.format_exc())
        return False, error_msg

def main():
    """Main download function"""
    logger.info("Starting dataset downloads...")
    logger.info(f"HF_HUB_ENABLE_HF_TRANSFER: {os.environ.get('HF_HUB_ENABLE_HF_TRANSFER')}")
    logger.info(f"HF_HUB_DOWNLOAD_TIMEOUT: {os.environ.get('HF_HUB_DOWNLOAD_TIMEOUT')}")
    
    # Create directories
    Path("data/.hf_cache").mkdir(parents=True, exist_ok=True)
    Path("data/sources").mkdir(parents=True, exist_ok=True)
    
    # Track results
    results = {
        'dataset_scripts': {'success': [], 'failed': []},
        'file_repos': {'success': [], 'failed': []},
    }
    
    # Process each dataset
    for repo_id, config in tqdm(DATASET_CONFIGS.items(), desc="Downloading datasets"):
        dataset_name = repo_id.split('/')[-1]
        
        if config['type'] == 'dataset_script':
            success, error = download_dataset_script(
                repo_id,
                cache_dir="data/.hf_cache"
            )
            if success:
                results['dataset_scripts']['success'].append(repo_id)
            else:
                results['dataset_scripts']['failed'].append((repo_id, error))
                
        elif config['type'] == 'files':
            local_dir = f"data/sources/{dataset_name}"
            success, error = download_file_repo(repo_id, local_dir)
            if success:
                results['file_repos']['success'].append(repo_id)
            else:
                results['file_repos']['failed'].append((repo_id, error))
    
    # Print report
    print("\n" + "="*60)
    print("DOWNLOAD REPORT")
    print("="*60)
    
    print(f"\nDataset Scripts (cached in data/.hf_cache):")
    print(f"  Success: {len(results['dataset_scripts']['success'])}")
    for repo_id in results['dataset_scripts']['success']:
        print(f"    ✓ {repo_id}")
    print(f"  Failed: {len(results['dataset_scripts']['failed'])}")
    for repo_id, error in results['dataset_scripts']['failed']:
        print(f"    ✗ {repo_id}: {error}")
    
    print(f"\nFile Repositories (mirrored to data/sources/<name>):")
    print(f"  Success: {len(results['file_repos']['success'])}")
    for repo_id in results['file_repos']['success']:
        print(f"    ✓ {repo_id}")
    print(f"  Failed: {len(results['file_repos']['failed'])}")
    for repo_id, error in results['file_repos']['failed']:
        print(f"    ✗ {repo_id}: {error}")
    
    # Save report to file
    report_path = Path("data/download_report.json")
    with open(report_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nDetailed report saved to: {report_path}")
    
    # Return success if at least some datasets downloaded
    total_success = (len(results['dataset_scripts']['success']) + 
                    len(results['file_repos']['success']))
    if total_success > 0:
        print(f"\n✓ Successfully downloaded {total_success} datasets")
        return 0
    else:
        print("\n✗ Failed to download any datasets")
        return 1

if __name__ == "__main__":
    exit(main())
