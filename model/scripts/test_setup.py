#!/usr/bin/env python3
"""
Test script to verify the pipeline setup
"""

import os
import sys
import json
import yaml
from pathlib import Path

def test_imports():
    """Test that all required packages can be imported"""
    print("Testing imports...")
    try:
        import huggingface_hub
        print("  ✓ huggingface_hub")
    except ImportError as e:
        print(f"  ✗ huggingface_hub: {e}")
        return False
    
    try:
        import datasets
        print("  ✓ datasets")
    except ImportError as e:
        print(f"  ✗ datasets: {e}")
        return False
    
    try:
        import ultralytics
        print("  ✓ ultralytics")
    except ImportError as e:
        print(f"  ✗ ultralytics: {e}")
        return False
    
    try:
        import PIL
        print("  ✓ PIL")
    except ImportError as e:
        print(f"  ✗ PIL: {e}")
        return False
    
    try:
        import cv2
        print("  ✓ opencv")
    except ImportError as e:
        print(f"  ✗ opencv: {e}")
        return False
    
    try:
        import tqdm
        print("  ✓ tqdm")
    except ImportError as e:
        print(f"  ✗ tqdm: {e}")
        return False
    
    return True

def test_directories():
    """Test that required directories exist"""
    print("\nTesting directories...")
    
    required_dirs = [
        "scripts",
        "data/sources",
        "data/merged/images/train",
        "data/merged/images/val",
        "data/merged/annotations",
        "config"
    ]
    
    all_exist = True
    for dir_path in required_dirs:
        path = Path(dir_path)
        if path.exists():
            print(f"  ✓ {dir_path}")
        else:
            print(f"  ✗ {dir_path} (creating...)")
            path.mkdir(parents=True, exist_ok=True)
            all_exist = False
    
    return all_exist

def test_config_files():
    """Test that configuration files are valid"""
    print("\nTesting configuration files...")
    
    # Test label schema
    try:
        with open("config/label_schema.json", 'r') as f:
            schema = json.load(f)
        
        if isinstance(schema, list) and len(schema) == 10:
            print(f"  ✓ label_schema.json (10 classes)")
        else:
            print(f"  ✗ label_schema.json (expected 10 classes, got {len(schema)})")
            return False
    except Exception as e:
        print(f"  ✗ label_schema.json: {e}")
        return False
    
    # Test mapping rules
    try:
        with open("config/dataset_map_rules.yaml", 'r') as f:
            rules = yaml.safe_load(f)
        
        if isinstance(rules, dict):
            print(f"  ✓ dataset_map_rules.yaml ({len(rules)} rules)")
        else:
            print(f"  ✗ dataset_map_rules.yaml (invalid format)")
            return False
    except Exception as e:
        print(f"  ✗ dataset_map_rules.yaml: {e}")
        return False
    
    # Test YOLO config
    try:
        with open("seesomething.yaml", 'r') as f:
            yolo_config = yaml.safe_load(f)
        
        if 'nc' in yolo_config and yolo_config['nc'] == 10:
            print(f"  ✓ seesomething.yaml (10 classes)")
        else:
            print(f"  ✗ seesomething.yaml (class count mismatch)")
            return False
    except Exception as e:
        print(f"  ✗ seesomething.yaml: {e}")
        return False
    
    return True

def test_environment():
    """Test environment variables"""
    print("\nTesting environment variables...")
    
    hf_transfer = os.environ.get('HF_HUB_ENABLE_HF_TRANSFER', '')
    if hf_transfer == '1':
        print(f"  ✓ HF_HUB_ENABLE_HF_TRANSFER = 1")
    else:
        print(f"  ⚠ HF_HUB_ENABLE_HF_TRANSFER not set (downloads will be slower)")
        os.environ['HF_HUB_ENABLE_HF_TRANSFER'] = '1'
    
    timeout = os.environ.get('HF_HUB_DOWNLOAD_TIMEOUT', '')
    if timeout:
        print(f"  ✓ HF_HUB_DOWNLOAD_TIMEOUT = {timeout}")
    else:
        print(f"  ⚠ HF_HUB_DOWNLOAD_TIMEOUT not set (using default)")
        os.environ['HF_HUB_DOWNLOAD_TIMEOUT'] = '120'
    
    return True

def test_utils_import():
    """Test that custom utilities can be imported"""
    print("\nTesting custom modules...")
    
    try:
        sys.path.insert(0, 'scripts')
        import utils_yolo
        print("  ✓ utils_yolo module")
        
        # Test key functions exist
        funcs = ['coco_poly_to_bbox', 'find_coco_jsons', 'read_yolo_txts_to_coco']
        for func_name in funcs:
            if hasattr(utils_yolo, func_name):
                print(f"    ✓ {func_name}()")
            else:
                print(f"    ✗ {func_name}() not found")
                return False
        
    except Exception as e:
        print(f"  ✗ utils_yolo: {e}")
        return False
    
    return True

def main():
    """Run all tests"""
    print("="*60)
    print("Urban Issue Detection Pipeline - Setup Test")
    print("="*60)
    
    all_pass = True
    
    # Run tests
    all_pass &= test_imports()
    all_pass &= test_directories()
    all_pass &= test_config_files()
    all_pass &= test_environment()
    all_pass &= test_utils_import()
    
    print("\n" + "="*60)
    if all_pass:
        print("✓ All tests passed! Pipeline is ready.")
        print("\nNext steps:")
        print("  1. Run 'make download' to fetch datasets")
        print("  2. Run 'make merge' to prepare training data")
        print("  3. Run 'make train' to start YOLO training")
    else:
        print("✗ Some tests failed. Please fix issues before proceeding.")
        return 1
    
    print("="*60)
    return 0

if __name__ == "__main__":
    exit(main())
