#!/usr/bin/env python3
"""
Extract zip files in dataset directories
"""

import zipfile
import os
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def extract_dataset_zips(dataset_dir: str):
    """Extract all zip files in a dataset directory"""
    dataset_path = Path(dataset_dir)
    
    # Find all zip files
    zip_files = list(dataset_path.glob("**/*.zip"))
    
    if not zip_files:
        logger.info(f"No zip files found in {dataset_dir}")
        return
    
    logger.info(f"Found {len(zip_files)} zip files to extract")
    
    for zip_path in zip_files:
        # Create extraction directory (same as zip name without extension)
        extract_dir = zip_path.parent / zip_path.stem
        
        if extract_dir.exists():
            logger.info(f"Already extracted: {zip_path.name}")
            continue
        
        logger.info(f"Extracting: {zip_path.name}")
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
                logger.info(f"  ✓ Extracted to {extract_dir}")
        except Exception as e:
            logger.error(f"  ✗ Failed to extract {zip_path}: {e}")

def main():
    """Extract zips in all source datasets"""
    sources_dir = Path("data/sources")
    
    if not sources_dir.exists():
        logger.error("No sources directory found")
        return 1
    
    # Process each dataset directory
    for dataset_dir in sources_dir.iterdir():
        if dataset_dir.is_dir():
            logger.info(f"\nProcessing: {dataset_dir.name}")
            extract_dataset_zips(str(dataset_dir))
    
    # Also process test download if it exists
    test_dir = Path("data/test_download")
    if test_dir.exists():
        for dataset_dir in test_dir.iterdir():
            if dataset_dir.is_dir():
                logger.info(f"\nProcessing test: {dataset_dir.name}")
                extract_dataset_zips(str(dataset_dir))
    
    logger.info("\n✓ Extraction complete")
    return 0

if __name__ == "__main__":
    exit(main())
