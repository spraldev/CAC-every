"""
OpenGeoReport (Open311) API Client
Handles automated filing of urban issue reports to municipal systems.
"""

import requests
import logging
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class GeoReportClient:
    """
    Open311 GeoReport v2 API client for automated issue reporting.
    Handles jurisdiction routing, payload formatting, and submission.
    """
    
    JURISDICTIONS = {
        "san_francisco": {
            "name": "San Francisco",
            "endpoint": "https://mobile311.sfgov.org/open311/v2/",
            "api_key_required": True,
            "jurisdiction_id": "sfgov.org"
        },
        "boston": {
            "name": "Boston",
            "endpoint": "https://mayors24.cityofboston.gov:6443/open311/v2/",
            "api_key_required": True,
            "jurisdiction_id": "cityofboston.gov"
        },
        "chicago": {
            "name": "Chicago",
            "endpoint": "https://311api.cityofchicago.org/open311/v2/",
            "api_key_required": True,
            "jurisdiction_id": "cityofchicago.org"
        },
        "test": {
            "name": "Test Jurisdiction",
            "endpoint": "https://test.open311.org/v2/",
            "api_key_required": False,
            "jurisdiction_id": "test.open311.org"
        }
    }
    
    SERVICE_CODE_MAPPING = {
        "pothole": "POTHOLE",
        "road_crack": "ROADCRACK",
        "road_debris": "DEBRIS",
        "overflowing_trash": "TRASH",
        "damaged_sign": "SIGN",
        "graffiti": "GRAFFITI",
        "bad_streetlight": "STREETLIGHT",
        "sidewalk_obstruction": "SIDEWALK",
        "utility_line_defect": "UTILITY",
        "flooded_road": "FLOODING"
    }
    
    def __init__(self, jurisdiction: str = "test", api_key: Optional[str] = None):
        """
        Initialize GeoReport client.
        
        Args:
            jurisdiction: Jurisdiction identifier (e.g., "san_francisco", "boston")
            api_key: API key for the jurisdiction (if required)
        """
        if jurisdiction not in self.JURISDICTIONS:
            raise ValueError(f"Unknown jurisdiction: {jurisdiction}. Available: {list(self.JURISDICTIONS.keys())}")
        
        self.jurisdiction = jurisdiction
        self.config = self.JURISDICTIONS[jurisdiction]
        self.api_key = api_key
        
        if self.config['api_key_required'] and not api_key:
            logger.warning(f"API key required for {jurisdiction} but not provided. Requests may fail.")
    
    def get_services(self) -> List[Dict]:
        """
        Get list of available services from the jurisdiction.
        
        Returns:
            List of service definitions
        """
        url = f"{self.config['endpoint']}services.json"
        
        params = {}
        if self.api_key:
            params['api_key'] = self.api_key
        if self.config.get('jurisdiction_id'):
            params['jurisdiction_id'] = self.config['jurisdiction_id']
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get services: {e}")
            return []
    
    def create_service_request(
        self,
        detection: Dict,
        location: Dict,
        description: Optional[str] = None,
        image_url: Optional[str] = None
    ) -> Dict:
        """
        Create a service request (report) for a detected issue.
        
        Args:
            detection: Enriched detection dict with class_name and enrichment
            location: GPS coordinates {"lat": float, "lon": float}
            description: Optional custom description
            image_url: Optional URL to uploaded image
            
        Returns:
            Service request response from API
        """
        url = f"{self.config['endpoint']}requests.json"
        
        issue_type = detection['class_name']
        service_code = self.SERVICE_CODE_MAPPING.get(issue_type, "GENERAL")
        
        payload = {
            'service_code': service_code,
            'lat': location['lat'],
            'long': location['lon'],
            'address_string': location.get('address', ''),
            'description': description or self._generate_description(detection),
            'first_name': 'CAC',
            'last_name': 'System',
            'email': 'reports@cac-system.org',
            'phone': '',
        }
        
        if self.api_key:
            payload['api_key'] = self.api_key
        
        if self.config.get('jurisdiction_id'):
            payload['jurisdiction_id'] = self.config['jurisdiction_id']
        
        if image_url:
            payload['media_url'] = image_url
        
        if 'enrichment' in detection:
            enrichment = detection['enrichment']
            payload['attributes'] = {
                'urgency': enrichment.get('urgency', 'medium'),
                'safety_priority': enrichment.get('safety_priority', 'medium'),
                'confidence': detection.get('confidence', 0.0),
                'detection_method': 'AI-YOLOv8'
            }
        
        try:
            response = requests.post(url, data=payload, timeout=15)
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"Created service request: {result}")
            
            return {
                'success': True,
                'service_request_id': result[0].get('service_request_id') if result else None,
                'response': result,
                'jurisdiction': self.jurisdiction
            }
        except Exception as e:
            logger.error(f"Failed to create service request: {e}")
            return {
                'success': False,
                'error': str(e),
                'jurisdiction': self.jurisdiction
            }
    
    def _generate_description(self, detection: Dict) -> str:
        """
        Generate a description for the service request.
        
        Args:
            detection: Detection dict with class_name and enrichment
            
        Returns:
            Generated description string
        """
        issue_type = detection['class_name'].replace('_', ' ').title()
        confidence = detection.get('confidence', 0.0)
        
        description = f"AI-detected {issue_type} (confidence: {confidence:.1%}). "
        
        if 'enrichment' in detection:
            enrichment = detection['enrichment']
            description += f"Priority: {enrichment.get('safety_priority', 'medium')}. "
            
            if enrichment.get('technical_specs'):
                description += f"{enrichment['technical_specs']} "
        
        description += "Detected via CAC mobile app with YOLOv8 computer vision."
        
        return description
    
    def get_service_request(self, service_request_id: str) -> Dict:
        """
        Get status of a service request.
        
        Args:
            service_request_id: ID of the service request
            
        Returns:
            Service request details
        """
        url = f"{self.config['endpoint']}requests/{service_request_id}.json"
        
        params = {}
        if self.api_key:
            params['api_key'] = self.api_key
        if self.config.get('jurisdiction_id'):
            params['jurisdiction_id'] = self.config['jurisdiction_id']
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get service request: {e}")
            return {'error': str(e)}
    
    def determine_jurisdiction(self, location: Dict) -> str:
        """
        Determine jurisdiction based on GPS coordinates.
        
        Args:
            location: GPS coordinates {"lat": float, "lon": float}
            
        Returns:
            Jurisdiction identifier
        """
        
        lat, lon = location['lat'], location['lon']
        
        if 37.7 <= lat <= 37.8 and -122.5 <= lon <= -122.35:
            return "san_francisco"
        
        elif 42.2 <= lat <= 42.4 and -71.2 <= lon <= -71.0:
            return "boston"
        
        elif 41.6 <= lat <= 42.0 and -87.9 <= lon <= -87.5:
            return "chicago"
        
        else:
            logger.warning(f"Could not determine jurisdiction for location {location}, using test")
            return "test"
    
    def create_automated_report(
        self,
        detection: Dict,
        location: Dict,
        image_url: Optional[str] = None,
        auto_route: bool = True
    ) -> Dict:
        """
        Create an automated report with jurisdiction routing.
        
        Args:
            detection: Enriched detection dict
            location: GPS coordinates
            image_url: Optional image URL
            auto_route: Whether to automatically determine jurisdiction
            
        Returns:
            Report submission result
        """
        if auto_route:
            jurisdiction = self.determine_jurisdiction(location)
            
            client = GeoReportClient(jurisdiction=jurisdiction, api_key=self.api_key)
            return client.create_service_request(detection, location, image_url=image_url)
        else:
            return self.create_service_request(detection, location, image_url=image_url)
    
    def batch_create_reports(
        self,
        detections: List[Dict],
        location: Dict,
        image_url: Optional[str] = None
    ) -> List[Dict]:
        """
        Create multiple reports for multiple detections.
        
        Args:
            detections: List of enriched detections
            location: GPS coordinates
            image_url: Optional image URL
            
        Returns:
            List of report submission results
        """
        results = []
        
        for detection in detections:
            result = self.create_automated_report(detection, location, image_url)
            results.append(result)
        
        return results
    
    def get_available_jurisdictions(self) -> List[Dict]:
        """Get list of available jurisdictions."""
        return [
            {
                'id': jid,
                'name': config['name'],
                'endpoint': config['endpoint'],
                'api_key_required': config['api_key_required']
            }
            for jid, config in self.JURISDICTIONS.items()
        ]
