"""
Multi-frame analysis endpoints for spatial correlation and validation.
"""

from flask import Blueprint, request, jsonify
from app.services.multiframe_analyzer import MultiFrameAnalyzer
from app.services.yolo_detector import YOLODetector
import logging
import cv2
import numpy as np
import tempfile
import os

logger = logging.getLogger(__name__)

bp = Blueprint('multiframe', __name__, url_prefix='/api/multiframe')

_analyzer = None
_detector = None

def get_analyzer():
    """Get or create MultiFrameAnalyzer instance."""
    global _analyzer
    if _analyzer is None:
        _analyzer = MultiFrameAnalyzer()
    return _analyzer

def get_detector():
    """Get or create YOLODetector instance."""
    global _detector
    if _detector is None:
        _detector = YOLODetector()
    return _detector


@bp.route('/analyze', methods=['POST'])
def analyze_frames():
    """
    Analyze multiple frames together for improved detection accuracy.
    
    Request:
        - files: Multiple image files (multipart/form-data)
        - conf_threshold: Optional confidence threshold
        - min_frames_for_validation: Minimum frames needed to validate (default: 2)
        
    Response:
        {
            "success": true,
            "validated_detections": [...],
            "statistics": {
                "num_frames": int,
                "total_detections_before": int,
                "total_detections_after": int,
                "false_positive_reduction_rate": float,
                "detections_by_class": {...},
                "avg_confidence": float
            }
        }
    """
    try:
        if 'files' not in request.files:
            return jsonify({'error': 'No files provided'}), 400
        
        files = request.files.getlist('files')
        
        if len(files) < 2:
            return jsonify({'error': 'At least 2 frames required for multi-frame analysis'}), 400
        
        conf_threshold = request.form.get('conf_threshold', type=float)
        min_frames = request.form.get('min_frames_for_validation', type=int, default=2)
        
        detector = get_detector()
        analyzer = MultiFrameAnalyzer(min_frames_for_validation=min_frames)
        
        frame_detections = []
        
        for file in files:
            if file.filename == '':
                continue
            
            try:
                file_bytes = file.read()
                detections, _ = detector.detect_from_bytes(file_bytes, conf_threshold)
                frame_detections.append(detections)
            except Exception as e:
                logger.error(f"Error processing frame {file.filename}: {e}")
                continue
        
        if not frame_detections:
            return jsonify({'error': 'No valid frames processed'}), 400
        
        results = analyzer.analyze_frames(frame_detections)
        
        return jsonify({
            'success': True,
            **results
        })
        
    except Exception as e:
        logger.error(f"Multi-frame analysis error: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/analyze-detections', methods=['POST'])
def analyze_detections():
    """
    Analyze pre-computed detections from multiple frames.
    
    Request:
        {
            "frame_detections": [
                [...detections from frame 1...],
                [...detections from frame 2...],
                ...
            ],
            "frame_metadata": [
                {"timestamp": str, "angle": str, ...},
                ...
            ]
        }
        
    Response:
        {
            "success": true,
            "validated_detections": [...],
            "statistics": {...}
        }
    """
    try:
        data = request.get_json()
        
        if not data or 'frame_detections' not in data:
            return jsonify({'error': 'No frame_detections provided'}), 400
        
        frame_detections = data['frame_detections']
        frame_metadata = data.get('frame_metadata')
        
        if len(frame_detections) < 2:
            return jsonify({'error': 'At least 2 frames required for multi-frame analysis'}), 400
        
        analyzer = get_analyzer()
        
        results = analyzer.analyze_frames(frame_detections, frame_metadata)
        
        return jsonify({
            'success': True,
            **results
        })
        
    except Exception as e:
        logger.error(f"Detection analysis error: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/validate', methods=['POST'])
def validate_detection():
    """
    Validate a detection across multiple frames.
    
    Request:
        {
            "frame_detections": [...],
            "target_detection": {...}
        }
        
    Response:
        {
            "success": true,
            "validated": bool,
            "confidence_boost": float,
            "num_matching_frames": int
        }
    """
    try:
        data = request.get_json()
        
        if not data or 'frame_detections' not in data:
            return jsonify({'error': 'No frame_detections provided'}), 400
        
        frame_detections = data['frame_detections']
        target_detection = data.get('target_detection')
        
        analyzer = get_analyzer()
        
        results = analyzer.analyze_frames(frame_detections)
        
        validated = False
        matching_frames = 0
        
        if target_detection:
            for det in results['validated_detections']:
                if det['class_name'] == target_detection.get('class_name'):
                    validated = True
                    matching_frames = det.get('validation', {}).get('num_frames', 0)
                    break
        
        return jsonify({
            'success': True,
            'validated': validated,
            'num_matching_frames': matching_frames,
            'all_validated_detections': results['validated_detections']
        })
        
    except Exception as e:
        logger.error(f"Validation error: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/analyze-video', methods=['POST'])
def analyze_video():
    """
    Analyze a video by extracting frames and running multi-frame analysis.
    
    Request:
        - video: Video file (multipart/form-data)
        - conf_threshold: Optional confidence threshold
        - frame_interval: Optional frame extraction interval in seconds (default: 0.5)
        - max_frames: Optional maximum number of frames to extract (default: 10)
        
    Response:
        {
            "success": true,
            "validated_detections": [...],
            "statistics": {
                "num_frames": int,
                "total_detections_before": int,
                "total_detections_after": int,
                "false_positive_reduction_rate": float,
                "detections_by_class": {...},
                "avg_confidence": float
            }
        }
    """
    try:
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        video_file = request.files['video']
        
        if video_file.filename == '':
            return jsonify({'error': 'Empty video filename'}), 400
        
        conf_threshold = request.form.get('conf_threshold', type=float)
        frame_interval = request.form.get('frame_interval', type=float, default=0.5)
        max_frames = request.form.get('max_frames', type=int, default=10)
        
        temp_video = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
        try:
            video_file.save(temp_video.name)
            temp_video.close()
            
            logger.info(f"Extracting frames from video: {video_file.filename}")
            frames = extract_frames_from_video(temp_video.name, frame_interval, max_frames)
            
            if len(frames) < 2:
                return jsonify({'error': 'Could not extract enough frames from video (minimum 2 required)'}), 400
            
            logger.info(f"Extracted {len(frames)} frames from video")
            
            detector = get_detector()
            analyzer = get_analyzer()
            
            frame_detections = []
            for i, frame in enumerate(frames):
                try:
                    _, buffer = cv2.imencode('.jpg', frame)
                    frame_bytes = buffer.tobytes()
                    
                    detections, _ = detector.detect_from_bytes(frame_bytes, conf_threshold)
                    frame_detections.append(detections)
                    logger.info(f"Frame {i+1}: {len(detections)} detections")
                except Exception as e:
                    logger.error(f"Error processing frame {i}: {e}")
                    continue
            
            if not frame_detections:
                return jsonify({'error': 'No valid frames processed'}), 400
            
            results = analyzer.analyze_frames(frame_detections)
            
            return jsonify({
                'success': True,
                **results
            })
            
        finally:
            if os.path.exists(temp_video.name):
                os.unlink(temp_video.name)
        
    except Exception as e:
        logger.error(f"Video analysis error: {e}")
        return jsonify({'error': str(e)}), 500


def extract_frames_from_video(video_path, frame_interval=0.5, max_frames=10):
    """
    Extract frames from a video file.
    
    Args:
        video_path: Path to video file
        frame_interval: Time interval between frames in seconds
        max_frames: Maximum number of frames to extract
        
    Returns:
        List of frames as numpy arrays
    """
    frames = []
    
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        raise ValueError("Could not open video file")
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0:
        fps = 30  # Default to 30 fps if unable to get fps
    
    frame_skip = int(fps * frame_interval)
    if frame_skip < 1:
        frame_skip = 1
    
    frame_count = 0
    extracted_count = 0
    
    while extracted_count < max_frames:
        ret, frame = cap.read()
        
        if not ret:
            break
        
        if frame_count % frame_skip == 0:
            frames.append(frame)
            extracted_count += 1
        
        frame_count += 1
    
    cap.release()
    
    return frames
