"""
Detection endpoints for YOLOv8-based urban issue detection.
"""

from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
import cv2
import numpy as np
from app.services.yolo_detector import YOLODetector
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('detection', __name__, url_prefix='/api/detect')

_detector = None

def get_detector():
    """Get or create YOLODetector instance."""
    global _detector
    if _detector is None:
        _detector = YOLODetector()
    return _detector


@bp.route('/single', methods=['POST'])
def detect_single():
    """
    Detect urban issues in a single image.
    
    Request:
        - file: Image file (multipart/form-data)
        - conf_threshold: Optional confidence threshold (default: 0.25)
        
    Response:
        {
            "success": true,
            "detections": [...],
            "num_detections": int,
            "image_shape": [height, width, channels]
        }
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400
        
        conf_threshold = request.form.get('conf_threshold', type=float)
        
        file_bytes = file.read()
        
        detector = get_detector()
        
        detections, image = detector.detect_from_bytes(file_bytes, conf_threshold)
        
        return jsonify({
            'success': True,
            'detections': detections,
            'num_detections': len(detections),
            'image_shape': image.shape[:2]  # [height, width]
        })
        
    except Exception as e:
        logger.error(f"Detection error: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/batch', methods=['POST'])
def detect_batch():
    """
    Detect urban issues in multiple images.
    
    Request:
        - files: Multiple image files (multipart/form-data)
        - conf_threshold: Optional confidence threshold
        
    Response:
        {
            "success": true,
            "results": [
                {
                    "filename": str,
                    "detections": [...],
                    "num_detections": int
                },
                ...
            ],
            "total_images": int,
            "total_detections": int
        }
    """
    try:
        if 'files' not in request.files:
            return jsonify({'error': 'No files provided'}), 400
        
        files = request.files.getlist('files')
        
        if not files:
            return jsonify({'error': 'Empty file list'}), 400
        
        conf_threshold = request.form.get('conf_threshold', type=float)
        
        detector = get_detector()
        
        results = []
        total_detections = 0
        
        for file in files:
            if file.filename == '':
                continue
            
            try:
                file_bytes = file.read()
                detections, _ = detector.detect_from_bytes(file_bytes, conf_threshold)
                
                results.append({
                    'filename': secure_filename(file.filename),
                    'detections': detections,
                    'num_detections': len(detections)
                })
                
                total_detections += len(detections)
                
            except Exception as e:
                logger.error(f"Error processing {file.filename}: {e}")
                results.append({
                    'filename': secure_filename(file.filename),
                    'error': str(e)
                })
        
        return jsonify({
            'success': True,
            'results': results,
            'total_images': len(results),
            'total_detections': total_detections
        })
        
    except Exception as e:
        logger.error(f"Batch detection error: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/info', methods=['GET'])
def model_info():
    """
    Get information about the YOLOv8 model.
    
    Response:
        {
            "model_path": str,
            "num_classes": int,
            "class_names": [...],
            "default_conf_threshold": float
        }
    """
    try:
        detector = get_detector()
        info = detector.get_model_info()
        
        return jsonify(info)
        
    except Exception as e:
        logger.error(f"Model info error: {e}")
        return jsonify({'error': str(e)}), 500
