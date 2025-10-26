"""
Multi-Frame Spatial Analysis Service
Analyzes multiple frames together to improve detection accuracy and eliminate false positives.
"""

import numpy as np
from typing import List, Dict, Tuple, Optional
from scipy.spatial.distance import cdist
import logging

logger = logging.getLogger(__name__)


class MultiFrameAnalyzer:
    """
    Multi-frame spatial analysis for urban issue detection.
    Validates detections across viewpoints using spatial correlation.
    """
    
    def __init__(
        self,
        iou_threshold: float = 0.3,
        confidence_boost: float = 0.15,
        min_frames_for_validation: int = 2
    ):
        """
        Initialize multi-frame analyzer.
        
        Args:
            iou_threshold: IoU threshold for matching detections across frames
            confidence_boost: Confidence boost for validated detections
            min_frames_for_validation: Minimum frames needed to validate a detection
        """
        self.iou_threshold = iou_threshold
        self.confidence_boost = confidence_boost
        self.min_frames_for_validation = min_frames_for_validation
    
    def calculate_iou(self, bbox1, bbox2) -> float:
        """
        Calculate Intersection over Union (IoU) between two bounding boxes.
        
        Args:
            bbox1: First bounding box (list [x1, y1, x2, y2] or dict with x1, y1, x2, y2)
            bbox2: Second bounding box (list [x1, y1, x2, y2] or dict with x1, y1, x2, y2)
            
        Returns:
            IoU score between 0 and 1
        """
        if isinstance(bbox1, list):
            x1_1, y1_1, x2_1, y2_1 = bbox1[0], bbox1[1], bbox1[2], bbox1[3]
        else:
            x1_1, y1_1, x2_1, y2_1 = bbox1['x1'], bbox1['y1'], bbox1['x2'], bbox1['y2']
        
        if isinstance(bbox2, list):
            x1_2, y1_2, x2_2, y2_2 = bbox2[0], bbox2[1], bbox2[2], bbox2[3]
        else:
            x1_2, y1_2, x2_2, y2_2 = bbox2['x1'], bbox2['y1'], bbox2['x2'], bbox2['y2']
        
        x1_i = max(x1_1, x1_2)
        y1_i = max(y1_1, y1_2)
        x2_i = min(x2_1, x2_2)
        y2_i = min(y2_1, y2_2)
        
        if x2_i < x1_i or y2_i < y1_i:
            return 0.0
        
        intersection = (x2_i - x1_i) * (y2_i - y1_i)
        
        area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
        area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
        union = area1 + area2 - intersection
        
        if union == 0:
            return 0.0
        
        return intersection / union
    
    def calculate_center_distance(self, bbox1, bbox2) -> float:
        """
        Calculate Euclidean distance between bounding box centers.
        
        Args:
            bbox1: First bounding box (list [x1, y1, x2, y2] or dict with bbox_center)
            bbox2: Second bounding box (list [x1, y1, x2, y2] or dict with bbox_center)
            
        Returns:
            Distance between centers
        """
        if isinstance(bbox1, list):
            center1 = np.array([(bbox1[0] + bbox1[2]) / 2, (bbox1[1] + bbox1[3]) / 2])
        elif 'bbox_center' in bbox1:
            if isinstance(bbox1['bbox_center'], list):
                center1 = np.array(bbox1['bbox_center'])
            else:
                center1 = np.array([bbox1['bbox_center']['x'], bbox1['bbox_center']['y']])
        else:
            center1 = np.array([(bbox1['x1'] + bbox1['x2']) / 2, (bbox1['y1'] + bbox1['y2']) / 2])
        
        if isinstance(bbox2, list):
            center2 = np.array([(bbox2[0] + bbox2[2]) / 2, (bbox2[1] + bbox2[3]) / 2])
        elif 'bbox_center' in bbox2:
            if isinstance(bbox2['bbox_center'], list):
                center2 = np.array(bbox2['bbox_center'])
            else:
                center2 = np.array([bbox2['bbox_center']['x'], bbox2['bbox_center']['y']])
        else:
            center2 = np.array([(bbox2['x1'] + bbox2['x2']) / 2, (bbox2['y1'] + bbox2['y2']) / 2])
        
        return np.linalg.norm(center1 - center2)
    
    def match_detections_across_frames(
        self,
        frame_detections: List[List[Dict]]
    ) -> List[Dict]:
        """
        Match detections across multiple frames using spatial correlation.
        
        Args:
            frame_detections: List of detection lists, one per frame
            
        Returns:
            List of validated detections with aggregated confidence
        """
        if not frame_detections or len(frame_detections) < self.min_frames_for_validation:
            logger.warning(f"Not enough frames for validation (got {len(frame_detections)}, need {self.min_frames_for_validation})")
            return frame_detections[0] if frame_detections else []
        
        class_groups = {}
        
        for frame_idx, detections in enumerate(frame_detections):
            for det in detections:
                class_name = det['class_name']
                
                if class_name not in class_groups:
                    class_groups[class_name] = []
                
                det_with_frame = {**det, 'frame_idx': frame_idx}
                class_groups[class_name].append(det_with_frame)
        
        validated_detections = []
        
        for class_name, detections in class_groups.items():
            clusters = self._cluster_detections(detections)
            
            for cluster in clusters:
                if len(cluster) >= self.min_frames_for_validation:
                    validated_det = self._aggregate_cluster(cluster)
                    validated_detections.append(validated_det)
        
        return validated_detections
    
    def _cluster_detections(self, detections: List[Dict]) -> List[List[Dict]]:
        """
        Cluster detections based on spatial overlap.
        
        Args:
            detections: List of detections from multiple frames
            
        Returns:
            List of detection clusters
        """
        if not detections:
            return []
        
        clusters = []
        used = set()
        
        for i, det1 in enumerate(detections):
            if i in used:
                continue
            
            cluster = [det1]
            used.add(i)
            
            for j, det2 in enumerate(detections):
                if j in used or j <= i:
                    continue
                
                if det1['frame_idx'] != det2['frame_idx']:
                    iou = self.calculate_iou(det1['bbox'], det2['bbox'])
                    
                    if iou >= self.iou_threshold:
                        cluster.append(det2)
                        used.add(j)
            
            clusters.append(cluster)
        
        return clusters
    
    def _aggregate_cluster(self, cluster: List[Dict]) -> Dict:
        """
        Aggregate a cluster of detections into a single validated detection.
        
        Args:
            cluster: List of matching detections from different frames
            
        Returns:
            Aggregated detection with boosted confidence
        """
        bbox_coords = []
        for d in cluster:
            if isinstance(d['bbox'], list):
                bbox_coords.append(d['bbox'])
            else:
                bbox_coords.append([d['bbox']['x1'], d['bbox']['y1'], d['bbox']['x2'], d['bbox']['y2']])
        
        avg_bbox = [
            np.mean([b[0] for b in bbox_coords]),
            np.mean([b[1] for b in bbox_coords]),
            np.mean([b[2] for b in bbox_coords]),
            np.mean([b[3] for b in bbox_coords])
        ]
        
        avg_center = [
            (avg_bbox[0] + avg_bbox[2]) / 2,
            (avg_bbox[1] + avg_bbox[3]) / 2
        ]
        
        avg_area = (avg_bbox[2] - avg_bbox[0]) * (avg_bbox[3] - avg_bbox[1])
        
        avg_confidence = np.mean([d['confidence'] for d in cluster])
        boosted_confidence = min(1.0, avg_confidence + self.confidence_boost)
        
        aggregated = {
            'class_id': cluster[0].get('class_id', 0),
            'class_name': cluster[0]['class_name'],
            'confidence': boosted_confidence,
            'original_confidence': avg_confidence,
            'bbox': avg_bbox,
            'bbox_center': avg_center,
            'bbox_area': avg_area,
            'validation': {
                'validated': True,
                'num_frames': len(cluster),
                'frame_indices': [d['frame_idx'] for d in cluster],
                'confidence_boost': self.confidence_boost,
                'individual_confidences': [d['confidence'] for d in cluster]
            }
        }
        
        return aggregated
    
    def analyze_frames(
        self,
        frame_detections: List[List[Dict]],
        frame_metadata: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Perform comprehensive multi-frame analysis.
        
        Args:
            frame_detections: List of detection lists, one per frame
            frame_metadata: Optional metadata for each frame (e.g., timestamps, angles)
            
        Returns:
            Analysis results with validated detections and statistics
        """
        validated_detections = self.match_detections_across_frames(frame_detections)
        
        total_detections_before = sum(len(dets) for dets in frame_detections)
        total_detections_after = len(validated_detections)
        
        if total_detections_before > 0:
            reduction_rate = (total_detections_before - total_detections_after) / total_detections_before
        else:
            reduction_rate = 0.0
        
        class_counts = {}
        for det in validated_detections:
            class_name = det['class_name']
            class_counts[class_name] = class_counts.get(class_name, 0) + 1
        
        return {
            'validated_detections': validated_detections,
            'statistics': {
                'num_frames': len(frame_detections),
                'total_detections_before': total_detections_before,
                'total_detections_after': total_detections_after,
                'false_positive_reduction_rate': reduction_rate,
                'detections_by_class': class_counts,
                'avg_confidence': np.mean([d['confidence'] for d in validated_detections]) if validated_detections else 0.0
            },
            'frame_metadata': frame_metadata or []
        }
    
    def filter_low_confidence(
        self,
        detections: List[Dict],
        min_confidence: float = 0.3
    ) -> List[Dict]:
        """
        Filter out low-confidence detections.
        
        Args:
            detections: List of detections
            min_confidence: Minimum confidence threshold
            
        Returns:
            Filtered detections
        """
        return [d for d in detections if d['confidence'] >= min_confidence]
    
    def handle_partial_occlusions(
        self,
        frame_detections: List[List[Dict]]
    ) -> List[Dict]:
        """
        Handle partial occlusions by validating across viewpoints.
        
        Args:
            frame_detections: List of detection lists from different viewpoints
            
        Returns:
            Validated detections that handle occlusions
        """
        
        validated = self.match_detections_across_frames(frame_detections)
        
        occlusion_handled = []
        
        for det in validated:
            if det.get('validation', {}).get('num_frames', 0) >= 2:
                occlusion_handled.append(det)
        
        return occlusion_handled
