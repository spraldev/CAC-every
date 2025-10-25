#!/usr/bin/env python3
"""
Utility functions for YOLO-COCO conversions and dataset processing
"""

import json
import os
import glob
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Any
from PIL import Image, ExifTags
import numpy as np
import logging

logger = logging.getLogger(__name__)

def fix_image_orientation(img_path: str) -> Image.Image:
    """
    Fix image orientation based on EXIF data
    """
    try:
        img = Image.open(img_path)
        
        # Check for EXIF orientation
        try:
            for orientation in ExifTags.TAGS.keys():
                if ExifTags.TAGS[orientation] == 'Orientation':
                    break
            
            exif = img._getexif()
            if exif is not None:
                orientation_value = exif.get(orientation)
                
                if orientation_value == 3:
                    img = img.rotate(180, expand=True)
                elif orientation_value == 6:
                    img = img.rotate(270, expand=True)
                elif orientation_value == 8:
                    img = img.rotate(90, expand=True)
        except (AttributeError, KeyError, IndexError):
            pass
        
        return img
    except Exception as e:
        logger.warning(f"Error fixing orientation for {img_path}: {e}")
        return Image.open(img_path)

def coco_poly_to_bbox(poly: List[float], img_width: int, img_height: int) -> List[float]:
    """
    Convert COCO polygon to bounding box [x, y, width, height]
    
    Args:
        poly: Flattened polygon coordinates [x1, y1, x2, y2, ...]
        img_width: Image width for bounds checking
        img_height: Image height for bounds checking
    
    Returns:
        Bounding box in COCO format [x, y, width, height]
    """
    if len(poly) < 6:  # Need at least 3 points for a polygon
        return [0, 0, 0, 0]
    
    # Extract x and y coordinates
    x_coords = poly[0::2]
    y_coords = poly[1::2]
    
    # Get bounding box
    x_min = max(0, min(x_coords))
    y_min = max(0, min(y_coords))
    x_max = min(img_width, max(x_coords))
    y_max = min(img_height, max(y_coords))
    
    # Calculate width and height
    width = x_max - x_min
    height = y_max - y_min
    
    return [x_min, y_min, width, height]

def yolo_to_coco_bbox(yolo_bbox: List[float], img_width: int, img_height: int) -> List[float]:
    """
    Convert YOLO bbox format to COCO format
    
    Args:
        yolo_bbox: [center_x, center_y, width, height] in normalized coordinates
        img_width: Image width
        img_height: Image height
    
    Returns:
        COCO bbox [x, y, width, height] in pixel coordinates
    """
    center_x, center_y, width, height = yolo_bbox
    
    # Convert from normalized to pixel coordinates
    center_x *= img_width
    center_y *= img_height
    width *= img_width
    height *= img_height
    
    # Convert from center to top-left corner
    x = center_x - width / 2
    y = center_y - height / 2
    
    return [x, y, width, height]

def coco_to_yolo_bbox(coco_bbox: List[float], img_width: int, img_height: int) -> List[float]:
    """
    Convert COCO bbox format to YOLO format
    
    Args:
        coco_bbox: [x, y, width, height] in pixel coordinates
        img_width: Image width
        img_height: Image height
    
    Returns:
        YOLO bbox [center_x, center_y, width, height] in normalized coordinates
    """
    x, y, width, height = coco_bbox
    
    # Convert to center coordinates
    center_x = x + width / 2
    center_y = y + height / 2
    
    # Normalize
    center_x /= img_width
    center_y /= img_height
    width /= img_width
    height /= img_height
    
    return [center_x, center_y, width, height]

def find_coco_jsons(root: str) -> List[str]:
    """
    Find all potential COCO JSON annotation files in a directory tree
    
    Args:
        root: Root directory to search
    
    Returns:
        List of paths to COCO JSON files
    """
    coco_files = []
    
    # Common COCO annotation file patterns
    patterns = [
        '**/annotations/*.json',
        '**/*annotations*.json',
        '**/*coco*.json',
        '**/train.json',
        '**/val.json',
        '**/test.json',
        '**/_annotations.coco.json',
        '**/labels.json',
        '**/instances_*.json'
    ]
    
    root_path = Path(root)
    for pattern in patterns:
        for json_file in root_path.glob(pattern):
            if json_file.is_file():
                try:
                    # Quick validation that it looks like COCO format
                    with open(json_file, 'r') as f:
                        data = json.load(f)
                        if isinstance(data, dict) and any(key in data for key in ['images', 'annotations', 'categories']):
                            coco_files.append(str(json_file))
                            logger.debug(f"Found COCO JSON: {json_file}")
                except (json.JSONDecodeError, Exception) as e:
                    logger.debug(f"Skipping non-COCO JSON {json_file}: {e}")
    
    return list(set(coco_files))  # Remove duplicates

def read_yolo_txts_to_coco(
    images_dir: str,
    labels_dir: str,
    class_names: List[str],
    dataset_name: str = "yolo_dataset"
) -> Dict[str, Any]:
    """
    Convert YOLO format dataset (txt files) to COCO format
    
    Args:
        images_dir: Directory containing images
        labels_dir: Directory containing YOLO txt annotations
        class_names: List of class names (index corresponds to YOLO class ID)
        dataset_name: Name for the dataset
    
    Returns:
        COCO format dictionary
    """
    coco_data = {
        "info": {
            "description": f"{dataset_name} converted from YOLO format",
            "version": "1.0",
            "year": 2024
        },
        "licenses": [],
        "images": [],
        "annotations": [],
        "categories": []
    }
    
    # Create categories
    for idx, name in enumerate(class_names):
        coco_data["categories"].append({
            "id": idx,
            "name": name,
            "supercategory": "object"
        })
    
    # Process images and annotations
    img_id = 0
    ann_id = 0
    
    image_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']
    image_files = []
    
    for ext in image_extensions:
        image_files.extend(Path(images_dir).glob(f'*{ext}'))
        image_files.extend(Path(images_dir).glob(f'*{ext.upper()}'))
    
    for img_path in image_files:
        img_id += 1
        
        # Get image dimensions
        try:
            img = Image.open(img_path)
            width, height = img.size
        except Exception as e:
            logger.warning(f"Could not open image {img_path}: {e}")
            continue
        
        # Add image to COCO data
        coco_data["images"].append({
            "id": img_id,
            "file_name": img_path.name,
            "width": width,
            "height": height
        })
        
        # Look for corresponding label file
        label_path = Path(labels_dir) / f"{img_path.stem}.txt"
        
        if label_path.exists():
            with open(label_path, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) < 5:
                        continue
                    
                    try:
                        class_id = int(parts[0])
                        center_x = float(parts[1])
                        center_y = float(parts[2])
                        bbox_width = float(parts[3])
                        bbox_height = float(parts[4])
                        
                        # Convert YOLO to COCO bbox
                        coco_bbox = yolo_to_coco_bbox(
                            [center_x, center_y, bbox_width, bbox_height],
                            width, height
                        )
                        
                        ann_id += 1
                        coco_data["annotations"].append({
                            "id": ann_id,
                            "image_id": img_id,
                            "category_id": class_id,
                            "bbox": coco_bbox,
                            "area": coco_bbox[2] * coco_bbox[3],
                            "iscrowd": 0,
                            "segmentation": []
                        })
                    except (ValueError, IndexError) as e:
                        logger.warning(f"Invalid YOLO annotation in {label_path}: {line.strip()}")
    
    logger.info(f"Converted {len(coco_data['images'])} images and {len(coco_data['annotations'])} annotations from YOLO format")
    return coco_data

def find_yolo_datasets(root: str) -> List[Dict[str, str]]:
    """
    Find YOLO format datasets in a directory tree
    
    Args:
        root: Root directory to search
    
    Returns:
        List of dictionaries with 'images_dir' and 'labels_dir' paths
    """
    yolo_datasets = []
    root_path = Path(root)
    
    # Look for typical YOLO directory structures
    for subdir in root_path.rglob('*'):
        if subdir.is_dir():
            # Check for images and labels subdirectories
            images_dir = None
            labels_dir = None
            
            # Common YOLO directory names
            for img_name in ['images', 'imgs', 'img']:
                img_path = subdir / img_name
                if img_path.exists() and img_path.is_dir():
                    images_dir = img_path
                    break
            
            for lbl_name in ['labels', 'lbls', 'annotations', 'anns']:
                lbl_path = subdir / lbl_name
                if lbl_path.exists() and lbl_path.is_dir():
                    # Check if it contains txt files
                    if list(lbl_path.glob('*.txt')):
                        labels_dir = lbl_path
                        break
            
            if images_dir and labels_dir:
                yolo_datasets.append({
                    'name': subdir.name,
                    'images_dir': str(images_dir),
                    'labels_dir': str(labels_dir)
                })
                logger.debug(f"Found YOLO dataset in {subdir}")
    
    return yolo_datasets

def validate_bbox(bbox: List[float], img_width: int, img_height: int) -> Optional[List[float]]:
    """
    Validate and clip bounding box to image dimensions
    
    Args:
        bbox: COCO format bbox [x, y, width, height]
        img_width: Image width
        img_height: Image height
    
    Returns:
        Validated bbox or None if invalid
    """
    if len(bbox) != 4:
        return None
    
    x, y, w, h = bbox
    
    # Clip to image boundaries
    x = max(0, min(x, img_width))
    y = max(0, min(y, img_height))
    
    # Adjust width and height if needed
    if x + w > img_width:
        w = img_width - x
    if y + h > img_height:
        h = img_height - y
    
    # Check if bbox is valid (non-zero area)
    if w <= 0 or h <= 0:
        return None
    
    return [x, y, w, h]

def parse_classes_txt(classes_path: str) -> List[str]:
    """
    Parse classes.txt or obj.names file for YOLO datasets
    
    Args:
        classes_path: Path to classes file
    
    Returns:
        List of class names
    """
    classes = []
    
    try:
        with open(classes_path, 'r') as f:
            for line in f:
                class_name = line.strip()
                if class_name:
                    classes.append(class_name)
    except Exception as e:
        logger.warning(f"Could not read classes file {classes_path}: {e}")
    
    return classes

def find_dataset_info(dataset_dir: str) -> Dict[str, Any]:
    """
    Try to find and extract dataset information (classes, config, etc.)
    
    Args:
        dataset_dir: Dataset directory
    
    Returns:
        Dictionary with dataset information
    """
    info = {
        'classes': [],
        'config': {},
        'format': 'unknown'
    }
    
    dataset_path = Path(dataset_dir)
    
    # Look for classes file
    for classes_file in ['classes.txt', 'obj.names', 'labels.txt', 'names.txt']:
        classes_path = dataset_path / classes_file
        if classes_path.exists():
            info['classes'] = parse_classes_txt(str(classes_path))
            break
    
    # Look for YOLO config
    for config_file in ['data.yaml', 'dataset.yaml', 'config.yaml']:
        config_path = dataset_path / config_file
        if config_path.exists():
            try:
                import yaml
                with open(config_path, 'r') as f:
                    config = yaml.safe_load(f)
                    info['config'] = config
                    if 'names' in config:
                        if isinstance(config['names'], list):
                            info['classes'] = config['names']
                        elif isinstance(config['names'], dict):
                            # Handle indexed names
                            max_idx = max(config['names'].keys())
                            info['classes'] = [''] * (max_idx + 1)
                            for idx, name in config['names'].items():
                                info['classes'][idx] = name
                    info['format'] = 'yolo'
            except Exception as e:
                logger.warning(f"Could not parse config {config_path}: {e}")
    
    # Check for COCO format
    if find_coco_jsons(dataset_dir):
        info['format'] = 'coco'
    
    return info
