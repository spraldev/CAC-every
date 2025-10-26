"""
Tagging endpoints for LangChain RAG-based intelligent enrichment.
"""

from flask import Blueprint, request, jsonify
from app.services.rag_tagger import RAGTagger
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('tagging', __name__, url_prefix='/api/tag')

_tagger = None

def get_tagger():
    """Get or create RAGTagger instance."""
    global _tagger
    if _tagger is None:
        _tagger = RAGTagger(use_vector_db=False)  # Use direct lookup for faster response
    return _tagger


@bp.route('/enrich', methods=['POST'])
def enrich_detection():
    """
    Enrich a detection with municipal metadata.
    
    Request:
        {
            "detection": {
                "class_name": str,
                "confidence": float,
                "bbox": {...},
                ...
            },
            "location": {
                "lat": float,
                "lon": float
            }
        }
        
    Response:
        {
            "success": true,
            "enriched_detection": {
                ...detection fields...,
                "enrichment": {
                    "department": str,
                    "urgency": str,
                    "response_time": str,
                    "technical_specs": str,
                    "routing_category": str,
                    "required_fields": [...],
                    "safety_priority": str
                }
            }
        }
    """
    try:
        data = request.get_json()
        
        if not data or 'detection' not in data:
            return jsonify({'error': 'No detection provided'}), 400
        
        detection = data['detection']
        location = data.get('location')
        
        tagger = get_tagger()
        
        enriched = tagger.enrich_detection(detection, location)
        
        return jsonify({
            'success': True,
            'enriched_detection': enriched
        })
        
    except Exception as e:
        logger.error(f"Enrichment error: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/enrich-batch', methods=['POST'])
def enrich_batch():
    """
    Enrich multiple detections with municipal metadata.
    
    Request:
        {
            "detections": [...],
            "location": {
                "lat": float,
                "lon": float
            }
        }
        
    Response:
        {
            "success": true,
            "enriched_detections": [...],
            "num_enriched": int
        }
    """
    try:
        data = request.get_json()
        
        if not data or 'detections' not in data:
            return jsonify({'error': 'No detections provided'}), 400
        
        detections = data['detections']
        location = data.get('location')
        
        tagger = get_tagger()
        
        enriched = tagger.enrich_multiple_detections(detections, location)
        
        return jsonify({
            'success': True,
            'enriched_detections': enriched,
            'num_enriched': len(enriched)
        })
        
    except Exception as e:
        logger.error(f"Batch enrichment error: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/routing-info/<issue_type>', methods=['GET'])
def get_routing_info(issue_type):
    """
    Get routing information for a specific issue type.
    
    Response:
        {
            "department": str,
            "routing_category": str,
            "urgency": str,
            "safety_priority": str
        }
    """
    try:
        tagger = get_tagger()
        info = tagger.get_routing_info(issue_type)
        
        return jsonify(info)
        
    except Exception as e:
        logger.error(f"Routing info error: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/issue-types', methods=['GET'])
def get_issue_types():
    """
    Get list of all supported issue types.
    
    Response:
        {
            "issue_types": [...]
        }
    """
    try:
        tagger = get_tagger()
        issue_types = tagger.get_all_issue_types()
        
        return jsonify({
            'issue_types': issue_types
        })
        
    except Exception as e:
        logger.error(f"Issue types error: {e}")
        return jsonify({'error': str(e)}), 500
