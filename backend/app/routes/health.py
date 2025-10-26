"""
Health check and system status endpoints.
"""

from flask import Blueprint, jsonify
import logging
import os

logger = logging.getLogger(__name__)

bp = Blueprint('health', __name__, url_prefix='/api')


@bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint.
    
    Response:
        {
            "status": "healthy",
            "version": "1.0.0",
            "services": {
                "yolo_detector": bool,
                "rag_tagger": bool,
                "multiframe_analyzer": bool,
                "georeport_client": bool
            }
        }
    """
    try:
        services_status = {
            'yolo_detector': True,
            'rag_tagger': True,
            'multiframe_analyzer': True,
            'georeport_client': True
        }
        
        try:
            from app.services.yolo_detector import YOLODetector
        except Exception as e:
            logger.error(f"YOLODetector check failed: {e}")
            services_status['yolo_detector'] = False
        
        try:
            from app.services.rag_tagger import RAGTagger
        except Exception as e:
            logger.error(f"RAGTagger check failed: {e}")
            services_status['rag_tagger'] = False
        
        try:
            from app.services.multiframe_analyzer import MultiFrameAnalyzer
        except Exception as e:
            logger.error(f"MultiFrameAnalyzer check failed: {e}")
            services_status['multiframe_analyzer'] = False
        
        try:
            from app.services.georeport_client import GeoReportClient
        except Exception as e:
            logger.error(f"GeoReportClient check failed: {e}")
            services_status['georeport_client'] = False
        
        return jsonify({
            'status': 'healthy',
            'version': '1.0.0',
            'services': services_status
        })
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500


@bp.route('/status', methods=['GET'])
def system_status():
    """
    Detailed system status endpoint.
    
    Response:
        {
            "status": "operational",
            "components": {
                "detection": {...},
                "tagging": {...},
                "multiframe": {...},
                "georeport": {...}
            }
        }
    """
    try:
        components = {
            'detection': {
                'status': 'operational',
                'description': 'YOLOv8-based urban issue detection',
                'endpoint': '/api/detect'
            },
            'tagging': {
                'status': 'operational',
                'description': 'LangChain RAG-based intelligent tagging',
                'endpoint': '/api/tag'
            },
            'multiframe': {
                'status': 'operational',
                'description': 'Multi-frame spatial analysis',
                'endpoint': '/api/multiframe'
            },
            'georeport': {
                'status': 'operational',
                'description': 'Open311 GeoReport integration',
                'endpoint': '/api/georeport'
            }
        }
        
        return jsonify({
            'status': 'operational',
            'components': components
        })
        
    except Exception as e:
        logger.error(f"Status check error: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/', methods=['GET'])
def root():
    """
    Root endpoint with API information.
    
    Response:
        {
            "name": "CAC-every Backend API",
            "version": "1.0.0",
            "description": str,
            "endpoints": {...}
        }
    """
    return jsonify({
        'name': 'CAC-every Backend API',
        'version': '1.0.0',
        'description': 'Urban issue detection and reporting system with YOLOv8, LangChain RAG, multi-frame analysis, and Open311 integration',
        'endpoints': {
            'detection': {
                'single': 'POST /api/detect/single',
                'batch': 'POST /api/detect/batch',
                'info': 'GET /api/detect/info'
            },
            'tagging': {
                'enrich': 'POST /api/tag/enrich',
                'enrich_batch': 'POST /api/tag/enrich-batch',
                'routing_info': 'GET /api/tag/routing-info/<issue_type>',
                'issue_types': 'GET /api/tag/issue-types'
            },
            'multiframe': {
                'analyze': 'POST /api/multiframe/analyze',
                'analyze_detections': 'POST /api/multiframe/analyze-detections',
                'validate': 'POST /api/multiframe/validate'
            },
            'georeport': {
                'submit': 'POST /api/georeport/submit',
                'submit_batch': 'POST /api/georeport/submit-batch',
                'status': 'GET /api/georeport/status/<service_request_id>',
                'jurisdictions': 'GET /api/georeport/jurisdictions',
                'services': 'GET /api/georeport/services',
                'auto_route': 'POST /api/georeport/auto-route'
            },
            'health': {
                'health': 'GET /api/health',
                'status': 'GET /api/status'
            }
        },
        'documentation': 'See README.md for full API documentation'
    })
