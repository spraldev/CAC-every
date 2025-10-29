"""
GeoReport (Open311) endpoints for automated municipal reporting.
"""

from flask import Blueprint, request, jsonify
from app.services.georeport_client import GeoReportClient
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('georeport', __name__, url_prefix='/api/georeport')

_client = None

def get_client(jurisdiction='test', api_key=None):
    """Get or create GeoReportClient instance."""
    return GeoReportClient(jurisdiction=jurisdiction, api_key=api_key)


@bp.route('/submit', methods=['POST'])
def submit_report():
    """
    Submit a service request to Open311 API.
    
    Request:
        {
            "detection": {
                "class_name": str,
                "confidence": float,
                "enrichment": {...},
                ...
            },
            "location": {
                "lat": float,
                "lon": float,
                "address": str (optional)
            },
            "jurisdiction": str (optional, default: "test"),
            "api_key": str (optional),
            "description": str (optional),
            "image_url": str (optional)
        }
        
    Response:
        {
            "success": true,
            "service_request_id": str,
            "jurisdiction": str,
            "response": {...}
        }
    """
    try:
        data = request.get_json()
        
        if not data or 'detection' not in data or 'location' not in data:
            return jsonify({'error': 'Detection and location required'}), 400
        
        detection = data['detection']
        location = data['location']
        jurisdiction = data.get('jurisdiction', 'test')
        api_key = data.get('api_key')
        description = data.get('description')
        image_url = data.get('image_url')
        
        client = get_client(jurisdiction=jurisdiction, api_key=api_key)
        
        result = client.create_service_request(
            detection=detection,
            location=location,
            description=description,
            image_url=image_url
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Report submission error: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/submit-batch', methods=['POST'])
def submit_batch_reports():
    """
    Submit multiple service requests to Open311 API.
    
    Request:
        {
            "detections": [...],
            "location": {...},
            "jurisdiction": str (optional),
            "api_key": str (optional),
            "image_url": str (optional)
        }
        
    Response:
        {
            "success": true,
            "results": [...],
            "total_submitted": int,
            "total_successful": int
        }
    """
    try:
        data = request.get_json()
        
        if not data or 'detections' not in data or 'location' not in data:
            return jsonify({'error': 'Detections and location required'}), 400
        
        detections = data['detections']
        location = data['location']
        jurisdiction = data.get('jurisdiction', 'test')
        api_key = data.get('api_key')
        image_url = data.get('image_url')
        
        client = get_client(jurisdiction=jurisdiction, api_key=api_key)
        
        results = client.batch_create_reports(
            detections=detections,
            location=location,
            image_url=image_url
        )
        
        successful = sum(1 for r in results if r.get('success'))
        
        return jsonify({
            'success': True,
            'results': results,
            'total_submitted': len(results),
            'total_successful': successful
        })
        
    except Exception as e:
        logger.error(f"Batch submission error: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/status/<service_request_id>', methods=['GET'])
def get_status(service_request_id):
    """
    Get status of a service request.
    
    Query params:
        - jurisdiction: str (optional, default: "test")
        - api_key: str (optional)
        
    Response:
        {
            "service_request_id": str,
            "status": str,
            ...
        }
    """
    try:
        jurisdiction = request.args.get('jurisdiction', 'test')
        api_key = request.args.get('api_key')
        
        client = get_client(jurisdiction=jurisdiction, api_key=api_key)
        
        result = client.get_service_request(service_request_id)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Status check error: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/jurisdictions', methods=['GET'])
def get_jurisdictions():
    """
    Get list of available jurisdictions.
    
    Response:
        {
            "jurisdictions": [
                {
                    "id": str,
                    "name": str,
                    "endpoint": str,
                    "api_key_required": bool
                },
                ...
            ]
        }
    """
    try:
        client = get_client()
        jurisdictions = client.get_available_jurisdictions()
        
        return jsonify({
            'jurisdictions': jurisdictions
        })
        
    except Exception as e:
        logger.error(f"Jurisdictions error: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/services', methods=['GET'])
def get_services():
    """
    Get available services for a jurisdiction.
    
    Query params:
        - jurisdiction: str (optional, default: "test")
        - api_key: str (optional)
        
    Response:
        {
            "services": [...]
        }
    """
    try:
        jurisdiction = request.args.get('jurisdiction', 'test')
        api_key = request.args.get('api_key')
        
        client = get_client(jurisdiction=jurisdiction, api_key=api_key)
        
        services = client.get_services()
        
        return jsonify({
            'services': services
        })
        
    except Exception as e:
        logger.error(f"Services error: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/auto-route', methods=['POST'])
def auto_route_report():
    """
    Automatically route and submit a report based on GPS location.
    
    Request:
        {
            "detection": {...},
            "location": {
                "lat": float,
                "lon": float
            },
            "api_key": str (optional),
            "image_url": str (optional)
        }
        
    Response:
        {
            "success": true,
            "service_request_id": str,
            "jurisdiction": str,
            "response": {...}
        }
    """
    try:
        data = request.get_json()
        
        if not data or 'detection' not in data or 'location' not in data:
            return jsonify({'error': 'Detection and location required'}), 400
        
        detection = data['detection']
        location = data['location']
        api_key = data.get('api_key')
        image_url = data.get('image_url')
        
        client = get_client(jurisdiction='test', api_key=api_key)
        
        result = client.create_automated_report(
            detection=detection,
            location=location,
            image_url=image_url,
            auto_route=True
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Auto-route error: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/test-report', methods=['POST'])
def submit_test_report():
    """
    Submit a test report (simulated only, no actual Open311 submission).
    This endpoint simulates what would happen if a report was submitted to Open311.
    
    Request:
        {
            "detection": {
                "class_name": str,
                "confidence": float,
                "enrichment": {...} (optional)
            },
            "location": {
                "lat": float,
                "lon": float,
                "address": str (optional)
            }
        }
        
    Response:
        {
            "success": true,
            "service_request_id": str,
            "jurisdiction": "test",
            "test_mode": true,
            "response": {
                "message": str,
                "simulated_311_response": {...},
                "what_this_shows": str
            }
        }
    """
    try:
        data = request.get_json()
        
        if not data or 'detection' not in data or 'location' not in data:
            return jsonify({'error': 'Detection and location required'}), 400
        
        detection = data['detection']
        location = data['location']
        
        test_id = f"TEST-{hash(str(detection) + str(location)) & 0xFFFFFF:06X}"
        
        class_name = detection.get('class_name', 'unknown')
        confidence = detection.get('confidence', 0)
        enrichment = detection.get('enrichment', {})
        
        service_name = class_name.replace('_', ' ').title()
        department = enrichment.get('department', 'Municipal Services Department')
        urgency = enrichment.get('urgency', 'medium')
        
        address = location.get('address', f"Lat: {location['lat']}, Lon: {location['lon']}")
        
        response = {
            'success': True,
            'service_request_id': test_id,
            'jurisdiction': 'test',
            'test_mode': True,
            'response': {
                'message': 'TEST MODE: This is a simulated report. No actual Open311 submission was made.',
                'simulated_311_response': {
                    'service_request_id': test_id,
                    'status': 'open',
                    'service_name': f'{service_name} Issue',
                    'description': f'{service_name} detected with {int(confidence * 100)}% confidence',
                    'requested_datetime': __import__('datetime').datetime.now().isoformat(),
                    'address': address,
                    'lat': location['lat'],
                    'long': location['lon'],
                    'jurisdiction': 'Test Jurisdiction',
                    'agency_responsible': department,
                    'priority': urgency,
                },
                'what_this_shows': 'This simulates what your audience would see when an actual Open311-compatible municipality receives the report. In production, this would be sent to the real municipal API.'
            }
        }
        
        logger.info(f"Test report created: {test_id} for {class_name}")
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Test report error: {e}")
        return jsonify({'error': str(e)}), 500
