#!/usr/bin/env python3
"""
Merge multiple datasets (COCO/YOLO formats) into unified COCO format with label remapping
"""

import json
import os
import shutil
import uuid
import argparse
import logging
import random
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional
from collections import defaultdict
from tqdm import tqdm
import yaml
from PIL import Image
import numpy as np

from utils_yolo import (
    find_coco_jsons, find_yolo_datasets, read_yolo_txts_to_coco,
    coco_poly_to_bbox, fix_image_orientation, validate_bbox,
    find_dataset_info, parse_classes_txt
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DatasetMerger:
    def __init__(self, schema_path: str, rules_path: str):
        """Initialize merger with target schema and mapping rules"""
        # Load target schema
        with open(schema_path, 'r') as f:
            self.target_classes = json.load(f)
        
        # Load mapping rules
        with open(rules_path, 'r') as f:
            self.mapping_rules = yaml.safe_load(f)
        
        # Create reverse lookup for target classes
        self.class_to_idx = {name: idx for idx, name in enumerate(self.target_classes)}
        
        # Initialize COCO structure
        self.merged_data = {
            "info": {
                "description": "Merged urban issue detection dataset",
                "version": "1.0",
                "year": 2024,
                "contributor": "SSAI"
            },
            "licenses": [],
            "images": [],
            "annotations": [],
            "categories": []
        }
        
        # Create categories
        for idx, name in enumerate(self.target_classes):
            self.merged_data["categories"].append({
                "id": idx,
                "name": name,
                "supercategory": "urban_issue"
            })
        
        # ID counters
        self.next_image_id = 1
        self.next_annotation_id = 1
        
        # Track images for splitting
        self.all_images = []
        self.image_to_annotations = defaultdict(list)
        
        # Statistics
        self.stats = defaultdict(int)
        self.unmapped_labels = set()

    def map_label_to_target(self, source_label: str) -> Optional[int]:
        """Map source label to target class index using rules"""
        source_label_lower = source_label.lower().strip()
        
        # Direct match first
        if source_label_lower in self.class_to_idx:
            return self.class_to_idx[source_label_lower]
        
        # Check mapping rules (contains matching)
        for pattern, target_class in self.mapping_rules.items():
            if pattern.lower() in source_label_lower:
                if target_class in self.class_to_idx:
                    return self.class_to_idx[target_class]
        
        # Track unmapped labels
        self.unmapped_labels.add(source_label)
        return None

    def process_coco_dataset(self, json_path: str, source_name: str, output_dir: str):
        """Process a COCO format dataset"""
        logger.info(f"Processing COCO dataset: {json_path}")
        
        with open(json_path, 'r') as f:
            coco_data = json.load(f)
        
        if not isinstance(coco_data, dict):
            logger.warning(f"Invalid COCO format in {json_path}")
            return
        
        # Build category mapping
        category_mapping = {}
        for cat in coco_data.get('categories', []):
            target_idx = self.map_label_to_target(cat.get('name', ''))
            if target_idx is not None:
                category_mapping[cat['id']] = target_idx
        
        # Get base directory for images
        json_dir = Path(json_path).parent
        
        # Process images and annotations
        image_id_mapping = {}
        
        for img_info in tqdm(coco_data.get('images', []), desc=f"Processing {source_name}"):
            # Find actual image file
            img_filename = img_info.get('file_name', '')
            img_path = None
            
            # Try different possible locations
            possible_paths = [
                json_dir / img_filename,
                json_dir.parent / 'images' / img_filename,
                json_dir.parent / 'imgs' / img_filename,
                json_dir.parent / img_filename,
                json_dir / 'images' / img_filename,
            ]
            
            for p in possible_paths:
                if p.exists():
                    img_path = p
                    break
            
            if not img_path or not img_path.exists():
                logger.debug(f"Image not found: {img_filename}")
                continue
            
            # Generate new filename with UUID prefix
            new_filename = f"{uuid.uuid4().hex[:8]}_{source_name}_{img_filename}"
            new_path = Path(output_dir) / 'images' / 'train' / new_filename
            
            # Copy image
            try:
                new_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Fix orientation and copy
                img = fix_image_orientation(str(img_path))
                img.save(str(new_path), quality=95)
                
                width, height = img.size
            except Exception as e:
                logger.warning(f"Failed to process image {img_path}: {e}")
                continue
            
            # Create new image entry
            new_image_id = self.next_image_id
            self.next_image_id += 1
            
            new_img_info = {
                "id": new_image_id,
                "file_name": new_filename,
                "width": width,
                "height": height,
                "source_dataset": source_name
            }
            
            self.all_images.append(new_img_info)
            image_id_mapping[img_info['id']] = new_image_id
            self.stats['images_processed'] += 1
        
        # Process annotations
        for ann in coco_data.get('annotations', []):
            if ann['image_id'] not in image_id_mapping:
                continue
            
            # Map category
            if ann['category_id'] not in category_mapping:
                self.stats['annotations_skipped'] += 1
                continue
            
            new_category_id = category_mapping[ann['category_id']]
            new_image_id = image_id_mapping[ann['image_id']]
            
            # Get image info for validation
            img_info = next((img for img in self.all_images if img['id'] == new_image_id), None)
            if not img_info:
                continue
            
            # Handle bbox
            bbox = ann.get('bbox', [])
            
            # If no bbox but has segmentation, derive from polygon
            if not bbox and 'segmentation' in ann and ann['segmentation']:
                if isinstance(ann['segmentation'], list) and len(ann['segmentation']) > 0:
                    poly = ann['segmentation'][0]
                    bbox = coco_poly_to_bbox(poly, img_info['width'], img_info['height'])
            
            # Validate bbox
            bbox = validate_bbox(bbox, img_info['width'], img_info['height'])
            if not bbox:
                self.stats['invalid_bboxes'] += 1
                continue
            
            # Create new annotation
            new_ann = {
                "id": self.next_annotation_id,
                "image_id": new_image_id,
                "category_id": new_category_id,
                "bbox": bbox,
                "area": bbox[2] * bbox[3],
                "iscrowd": ann.get('iscrowd', 0),
                "segmentation": ann.get('segmentation', [])
            }
            
            self.image_to_annotations[new_image_id].append(new_ann)
            self.next_annotation_id += 1
            self.stats['annotations_processed'] += 1
            self.stats[f'class_{new_category_id}_count'] += 1

    def process_yolo_dataset(self, dataset_info: Dict, source_name: str, output_dir: str):
        """Process a YOLO format dataset"""
        logger.info(f"Processing YOLO dataset: {dataset_info['name']}")
        
        # Try to find class names
        class_names = []
        dataset_path = Path(dataset_info['images_dir']).parent
        
        # Look for dataset info
        info = find_dataset_info(str(dataset_path))
        if info['classes']:
            class_names = info['classes']
        else:
            # Use default class names or indices
            logger.warning(f"No class names found for {dataset_info['name']}, using indices")
            class_names = [str(i) for i in range(100)]  # Assume max 100 classes
        
        # Convert YOLO to COCO
        coco_data = read_yolo_txts_to_coco(
            dataset_info['images_dir'],
            dataset_info['labels_dir'],
            class_names,
            dataset_info['name']
        )
        
        # Process as COCO data
        self._process_converted_coco(coco_data, source_name, dataset_info['images_dir'], output_dir)

    def _process_converted_coco(self, coco_data: Dict, source_name: str, images_base: str, output_dir: str):
        """Process converted COCO data from YOLO"""
        # Build category mapping
        category_mapping = {}
        for cat in coco_data['categories']:
            target_idx = self.map_label_to_target(cat['name'])
            if target_idx is not None:
                category_mapping[cat['id']] = target_idx
        
        # Process images and annotations
        image_id_mapping = {}
        
        for img_info in tqdm(coco_data['images'], desc=f"Processing {source_name}"):
            img_path = Path(images_base) / img_info['file_name']
            
            if not img_path.exists():
                continue
            
            # Generate new filename
            new_filename = f"{uuid.uuid4().hex[:8]}_{source_name}_{img_info['file_name']}"
            new_path = Path(output_dir) / 'images' / 'train' / new_filename
            
            # Copy image
            try:
                new_path.parent.mkdir(parents=True, exist_ok=True)
                img = fix_image_orientation(str(img_path))
                img.save(str(new_path), quality=95)
                width, height = img.size
            except Exception as e:
                logger.warning(f"Failed to process image {img_path}: {e}")
                continue
            
            # Create new image entry
            new_image_id = self.next_image_id
            self.next_image_id += 1
            
            new_img_info = {
                "id": new_image_id,
                "file_name": new_filename,
                "width": width,
                "height": height,
                "source_dataset": source_name
            }
            
            self.all_images.append(new_img_info)
            image_id_mapping[img_info['id']] = new_image_id
            self.stats['images_processed'] += 1
        
        # Process annotations
        for ann in coco_data['annotations']:
            if ann['image_id'] not in image_id_mapping:
                continue
            
            if ann['category_id'] not in category_mapping:
                self.stats['annotations_skipped'] += 1
                continue
            
            new_category_id = category_mapping[ann['category_id']]
            new_image_id = image_id_mapping[ann['image_id']]
            
            # Get image info
            img_info = next((img for img in self.all_images if img['id'] == new_image_id), None)
            if not img_info:
                continue
            
            bbox = validate_bbox(ann['bbox'], img_info['width'], img_info['height'])
            if not bbox:
                continue
            
            new_ann = {
                "id": self.next_annotation_id,
                "image_id": new_image_id,
                "category_id": new_category_id,
                "bbox": bbox,
                "area": bbox[2] * bbox[3],
                "iscrowd": 0,
                "segmentation": []
            }
            
            self.image_to_annotations[new_image_id].append(new_ann)
            self.next_annotation_id += 1
            self.stats['annotations_processed'] += 1
            self.stats[f'class_{new_category_id}_count'] += 1

    def process_datasets_cache(self, cache_dir: str, source_name: str, output_dir: str):
        """Process datasets from HF datasets cache"""
        logger.info(f"Looking for cached dataset: {source_name}")
        
        # This is complex as HF cache structure varies
        # For now, log a warning
        logger.warning(f"Dataset {source_name} uses datasets cache - manual inspection may be needed")
        logger.warning(f"Check {cache_dir} for actual data files")
        
        # Try to find any COCO/YOLO data in the cache
        cache_path = Path(cache_dir)
        if cache_path.exists():
            # Look for COCO JSONs
            coco_files = find_coco_jsons(str(cache_path))
            for json_file in coco_files:
                self.process_coco_dataset(json_file, f"{source_name}_cached", output_dir)
            
            # Look for YOLO datasets
            yolo_datasets = find_yolo_datasets(str(cache_path))
            for yolo_ds in yolo_datasets:
                self.process_yolo_dataset(yolo_ds, f"{source_name}_cached", output_dir)

    def split_train_val(self, val_ratio: float = 0.2):
        """Split images into train and validation sets"""
        logger.info(f"Splitting dataset: {len(self.all_images)} images, {val_ratio:.0%} validation")
        
        # Group images by class presence for stratification
        class_to_images = defaultdict(set)
        for img_id, anns in self.image_to_annotations.items():
            for ann in anns:
                class_to_images[ann['category_id']].add(img_id)
        
        # Simple stratified split
        val_images = set()
        
        # Take some images from each class
        for class_id, img_ids in class_to_images.items():
            img_list = list(img_ids)
            random.shuffle(img_list)
            n_val = max(1, int(len(img_list) * val_ratio))
            val_images.update(img_list[:n_val])
        
        # Also add some random images to reach target ratio
        all_img_ids = [img['id'] for img in self.all_images]
        random.shuffle(all_img_ids)
        target_val_count = int(len(all_img_ids) * val_ratio)
        
        for img_id in all_img_ids:
            if len(val_images) >= target_val_count:
                break
            val_images.add(img_id)
        
        return val_images
    
    def _save_yolo_label(self, img_info: Dict, annotations: List[Dict], labels_dir: Path):
        """Save YOLO format label file for an image"""
        # Get base filename without extension
        base_name = Path(img_info['file_name']).stem
        label_file = labels_dir / f"{base_name}.txt"
        
        # Convert annotations to YOLO format
        yolo_lines = []
        for ann in annotations:
            # Get COCO bbox (x, y, width, height)
            x, y, w, h = ann['bbox']
            
            # Convert to YOLO format (normalized center x, center y, width, height)
            img_width = img_info['width']
            img_height = img_info['height']
            
            # Calculate center coordinates
            cx = (x + w / 2) / img_width
            cy = (y + h / 2) / img_height
            
            # Normalize width and height
            nw = w / img_width
            nh = h / img_height
            
            # Clamp values to [0, 1]
            cx = max(0, min(1, cx))
            cy = max(0, min(1, cy))
            nw = max(0, min(1, nw))
            nh = max(0, min(1, nh))
            
            # Format: class_id x_center y_center width height
            yolo_line = f"{ann['category_id']} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}"
            yolo_lines.append(yolo_line)
        
        # Write label file
        with open(label_file, 'w') as f:
            f.write('\n'.join(yolo_lines))

    def save_splits(self, output_dir: str, val_ratio: float = 0.2):
        """Save train and validation splits"""
        output_path = Path(output_dir)
        
        # Split images
        val_image_ids = self.split_train_val(val_ratio)
        
        train_data = {
            "info": self.merged_data["info"],
            "licenses": self.merged_data["licenses"],
            "categories": self.merged_data["categories"],
            "images": [],
            "annotations": []
        }
        
        val_data = {
            "info": self.merged_data["info"],
            "licenses": self.merged_data["licenses"],
            "categories": self.merged_data["categories"],
            "images": [],
            "annotations": []
        }
        
        # Create labels directories for YOLO format
        (output_path / 'labels' / 'train').mkdir(parents=True, exist_ok=True)
        (output_path / 'labels' / 'val').mkdir(parents=True, exist_ok=True)
        
        # Move validation images and create YOLO labels
        for img_info in self.all_images:
            if img_info['id'] in val_image_ids:
                # Move image file
                old_path = output_path / 'images' / 'train' / img_info['file_name']
                new_path = output_path / 'images' / 'val' / img_info['file_name']
                
                if old_path.exists():
                    new_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(old_path), str(new_path))
                
                val_data['images'].append(img_info)
                
                # Add annotations
                for ann in self.image_to_annotations[img_info['id']]:
                    val_data['annotations'].append(ann)
                
                # Create YOLO format label file
                self._save_yolo_label(img_info, self.image_to_annotations[img_info['id']], 
                                     output_path / 'labels' / 'val')
            else:
                train_data['images'].append(img_info)
                
                # Add annotations
                for ann in self.image_to_annotations[img_info['id']]:
                    train_data['annotations'].append(ann)
                
                # Create YOLO format label file
                self._save_yolo_label(img_info, self.image_to_annotations[img_info['id']], 
                                     output_path / 'labels' / 'train')
        
        # Save JSON files
        train_json = output_path / 'annotations' / 'train.json'
        val_json = output_path / 'annotations' / 'val.json'
        
        train_json.parent.mkdir(parents=True, exist_ok=True)
        
        with open(train_json, 'w') as f:
            json.dump(train_data, f, indent=2)
        
        with open(val_json, 'w') as f:
            json.dump(val_data, f, indent=2)
        
        logger.info(f"Saved train.json: {len(train_data['images'])} images, {len(train_data['annotations'])} annotations")
        logger.info(f"Saved val.json: {len(val_data['images'])} images, {len(val_data['annotations'])} annotations")
        
        # Count label files
        train_labels = len(list((output_path / 'labels' / 'train').glob('*.txt')))
        val_labels = len(list((output_path / 'labels' / 'val').glob('*.txt')))
        logger.info(f"Created YOLO labels: {train_labels} train, {val_labels} val")
        
        # Print statistics
        self.print_statistics()

    def print_statistics(self):
        """Print merge statistics"""
        print("\n" + "="*60)
        print("MERGE STATISTICS")
        print("="*60)
        
        print(f"\nTotal images processed: {self.stats['images_processed']}")
        print(f"Total annotations processed: {self.stats['annotations_processed']}")
        print(f"Annotations skipped (unmapped): {self.stats['annotations_skipped']}")
        print(f"Invalid bboxes: {self.stats.get('invalid_bboxes', 0)}")
        
        print("\nPer-class distribution:")
        for idx, class_name in enumerate(self.target_classes):
            count = self.stats.get(f'class_{idx}_count', 0)
            print(f"  {idx:2d}. {class_name:25s}: {count:6d} annotations")
        
        if self.unmapped_labels:
            print(f"\nUnmapped labels ({len(self.unmapped_labels)}):")
            for label in sorted(self.unmapped_labels)[:20]:
                print(f"  - {label}")
            if len(self.unmapped_labels) > 20:
                print(f"  ... and {len(self.unmapped_labels) - 20} more")

def main():
    parser = argparse.ArgumentParser(description="Merge multiple datasets to COCO format")
    parser.add_argument('--sources', type=str, default='data/sources',
                       help='Source datasets directory')
    parser.add_argument('--out', type=str, default='data/merged',
                       help='Output directory')
    parser.add_argument('--schema', type=str, default='config/label_schema.json',
                       help='Target label schema JSON')
    parser.add_argument('--rules', type=str, default='config/dataset_map_rules.yaml',
                       help='Label mapping rules YAML')
    parser.add_argument('--val-ratio', type=float, default=0.2,
                       help='Validation split ratio')
    
    args = parser.parse_args()
    
    # Initialize merger
    merger = DatasetMerger(args.schema, args.rules)
    
    # Process each source dataset
    sources_path = Path(args.sources)
    
    for dataset_dir in sources_path.iterdir():
        if not dataset_dir.is_dir():
            continue
        
        source_name = dataset_dir.name
        logger.info(f"\nProcessing dataset: {source_name}")
        
        # Check if it's from datasets cache
        cache_marker = dataset_dir / '_from_datasets_cache.txt'
        if cache_marker.exists():
            merger.process_datasets_cache('data/.hf_cache', source_name, args.out)
            continue
        
        # Look for COCO format files
        coco_files = find_coco_jsons(str(dataset_dir))
        for coco_file in coco_files:
            merger.process_coco_dataset(coco_file, source_name, args.out)
        
        # Look for YOLO format datasets
        yolo_datasets = find_yolo_datasets(str(dataset_dir))
        for yolo_ds in yolo_datasets:
            merger.process_yolo_dataset(yolo_ds, source_name, args.out)
    
    # Save train/val splits
    merger.save_splits(args.out, args.val_ratio)
    
    logger.info("\nMerge complete!")

if __name__ == "__main__":
    main()
