"""
YOLOv8 Detection Service
Handles real-time object detection for urban infrastructure issues.
"""

import os
import cv2
import numpy as np
from ultralytics import YOLO
from typing import List, Dict, Tuple, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class YOLODetector:
    """YOLOv8-based urban issue detector with ONNX runtime optimization."""
    
    CLASS_NAMES = [
        "pothole",
        "road_crack",
        "road_debris",
        "overflowing_trash",
        "damaged_sign",
        "graffiti",
        "bad_streetlight",
        "sidewalk_obstruction",
        "utility_line_defect",
        "flooded_road"
    ]
    
    def __init__(self, model_path: Optional[str] = None, conf_threshold: float = 0.25):
        """
        Initialize YOLOv8 detector.
        
        Args:
            model_path: Path to trained YOLOv8 model weights
            conf_threshold: Confidence threshold for detections
        """
        self.conf_threshold = conf_threshold
        
        if model_path is None:
            model_path = os.path.join(
                os.path.dirname(__file__), 
                '..', '..', '..', 
                'model', 'runs', 'detect', 'ssai_y8n4', 'weights', 'best.pt'
            )
        
        self.model_path = model_path
        
        try:
            self.model = YOLO(self.model_path)
            logger.info(f"Loaded YOLOv8 model from {self.model_path}")
        except Exception as e:
            logger.error(f"Failed to load YOLOv8 model: {e}")
            raise
    
    def detect_single_frame(
        self, 
        image: np.ndarray,
        conf_threshold: Optional[float] = None
    ) -> List[Dict]:
        """
        Detect urban issues in a single frame.
        
        Args:
            image: Input image as numpy array (BGR format)
            conf_threshold: Override default confidence threshold
            
        Returns:
            List of detections with bounding boxes and metadata
        """
        if conf_threshold is None:
            conf_threshold = self.conf_threshold
        
        results = self.model(image, conf=conf_threshold, verbose=False)
        
        detections = []
        
        for result in results:
            boxes = result.boxes
            
            for i in range(len(boxes)):
                box = boxes.xyxy[i].cpu().numpy()  # [x1, y1, x2, y2]
                conf = float(boxes.conf[i].cpu().numpy())
                cls = int(boxes.cls[i].cpu().numpy())
                
                detection = {
                    'class_id': cls,
                    'class_name': self.CLASS_NAMES[cls],
                    'confidence': conf,
                    'bbox': {
                        'x1': float(box[0]),
                        'y1': float(box[1]),
                        'x2': float(box[2]),
                        'y2': float(box[3])
                    },
                    'bbox_center': {
                        'x': float((box[0] + box[2]) / 2),
                        'y': float((box[1] + box[3]) / 2)
                    },
                    'bbox_area': float((box[2] - box[0]) * (box[3] - box[1]))
                }
                
                detections.append(detection)
        
        return detections
    
    def detect_from_file(
        self, 
        image_path: str,
        conf_threshold: Optional[float] = None
    ) -> Tuple[List[Dict], np.ndarray]:
        """
        Detect urban issues from an image file.
        
        Args:
            image_path: Path to input image
            conf_threshold: Override default confidence threshold
            
        Returns:
            Tuple of (detections, original_image)
        """
        image = cv2.imread(image_path)
        
        if image is None:
            raise ValueError(f"Failed to read image from {image_path}")
        
        detections = self.detect_single_frame(image, conf_threshold)
        
        return detections, image
    
    def detect_from_bytes(
        self,
        image_bytes: bytes,
        conf_threshold: Optional[float] = None
    ) -> Tuple[List[Dict], np.ndarray]:
        """
        Detect urban issues from image bytes.
        
        Args:
            image_bytes: Image data as bytes
            conf_threshold: Override default confidence threshold
            
        Returns:
            Tuple of (detections, original_image)
        """
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Failed to decode image from bytes")
        
        detections = self.detect_single_frame(image, conf_threshold)
        
        return detections, image
    
    def annotate_image(
        self,
        image: np.ndarray,
        detections: List[Dict]
    ) -> np.ndarray:
        """
        Draw bounding boxes and labels on image.
        
        Args:
            image: Input image
            detections: List of detections from detect_single_frame
            
        Returns:
            Annotated image
        """
        annotated = image.copy()
        
        for det in detections:
            bbox = det['bbox']
            x1, y1 = int(bbox['x1']), int(bbox['y1'])
            x2, y2 = int(bbox['x2']), int(bbox['y2'])
            
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            label = f"{det['class_name']}: {det['confidence']:.2f}"
            label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            
            cv2.rectangle(
                annotated,
                (x1, y1 - label_size[1] - 10),
                (x1 + label_size[0], y1),
                (0, 255, 0),
                -1
            )
            
            cv2.putText(
                annotated,
                label,
                (x1, y1 - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 0, 0),
                1
            )
        
        return annotated
    
    def get_model_info(self) -> Dict:
        """Get information about the loaded model."""
        return {
            'model_path': self.model_path,
            'num_classes': len(self.CLASS_NAMES),
            'class_names': self.CLASS_NAMES,
            'default_conf_threshold': self.conf_threshold
        }
