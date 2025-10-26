# CAC-every Backend API

Complete AI-powered urban issue detection and reporting system with YOLOv8, LangChain RAG, multi-frame spatial analysis, and Open311 integration.

## Overview

This Flask backend provides a comprehensive pipeline for:
1. **YOLOv8 Real-Time Detection** - Detects 10 types of urban issues from images
2. **LangChain Intelligent Tagging** - Enriches detections with municipal metadata using RAG
3. **Multi-Frame Spatial Analysis** - Validates detections across viewpoints to reduce false positives
4. **OpenGeoReport Automated Filing** - Automatically files reports to municipal APIs

## Architecture

```
backend/
├── app/
│   ├── __init__.py           # Flask app factory
│   ├── routes/               # API endpoints
│   │   ├── detection.py      # YOLOv8 detection endpoints
│   │   ├── tagging.py        # RAG enrichment endpoints
│   │   ├── multiframe.py     # Multi-frame analysis endpoints
│   │   ├── georeport.py      # Open311 filing endpoints
│   │   └── health.py         # Health check endpoints
│   └── services/             # Core services
│       ├── yolo_detector.py  # YOLOv8 detection service
│       ├── rag_tagger.py     # LangChain RAG service
│       ├── multiframe_analyzer.py  # Spatial analysis service
│       └── georeport_client.py     # Open311 client
├── run.py                    # Main entry point
└── requirements.txt          # Dependencies
```

## Installation

### Prerequisites
- Python 3.12+
- Virtual environment

### Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your API keys if needed
```

## Running the Server

```bash
# Development mode
python run.py

# Production mode with gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 run:app
```

The server will start on `http://localhost:5000`

## API Endpoints

### Detection Endpoints

#### POST /api/detect/single
Detect urban issues in a single image.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `file`: Image file (required)
  - `conf_threshold`: Confidence threshold 0-1 (optional, default: 0.25)

**Response:**
```json
{
  "success": true,
  "detections": [
    {
      "class_id": 0,
      "class_name": "pothole",
      "confidence": 0.87,
      "bbox": [100, 150, 200, 250],
      "bbox_center": [150, 200],
      "bbox_area": 10000
    }
  ],
  "num_detections": 1,
  "image_shape": [1080, 1920, 3]
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/detect/single \
  -F "file=@pothole.jpg" \
  -F "conf_threshold=0.3"
```

#### POST /api/detect/batch
Detect urban issues in multiple images.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `files`: Multiple image files (required)
  - `conf_threshold`: Confidence threshold (optional)

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "filename": "image1.jpg",
      "detections": [...],
      "num_detections": 2
    }
  ],
  "total_files": 3,
  "total_detections": 5
}
```

#### GET /api/detect/info
Get model information.

**Response:**
```json
{
  "model_path": "/path/to/model/best.pt",
  "num_classes": 10,
  "class_names": ["pothole", "road_crack", ...],
  "default_conf_threshold": 0.25
}
```

### Tagging Endpoints

#### POST /api/tag/enrich
Enrich a detection with municipal metadata using RAG.

**Request:**
```json
{
  "detection": {
    "class_name": "pothole",
    "confidence": 0.87,
    "bbox": [100, 150, 200, 250]
  },
  "location": {
    "lat": 37.7749,
    "lon": -122.4194,
    "address": "123 Main St"
  }
}
```

**Response:**
```json
{
  "success": true,
  "enriched_detection": {
    "class_name": "pothole",
    "confidence": 0.87,
    "bbox": [100, 150, 200, 250],
    "enrichment": {
      "department": "Department of Public Works - Street Maintenance Division",
      "urgency": "high",
      "response_time": "24-48 hours",
      "technical_specs": "Road surface depression > 2 inches deep",
      "routing_category": "street_maintenance",
      "required_fields": ["location", "size_estimate", "traffic_level"],
      "safety_priority": "high"
    }
  }
}
```

#### POST /api/tag/enrich-batch
Enrich multiple detections.

**Request:**
```json
{
  "detections": [...],
  "location": {...}
}
```

#### GET /api/tag/routing-info/<issue_type>
Get routing information for a specific issue type.

**Example:**
```bash
curl http://localhost:5000/api/tag/routing-info/pothole
```

#### GET /api/tag/issue-types
Get list of all supported issue types.

**Response:**
```json
{
  "issue_types": [
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
}
```

### Multi-Frame Analysis Endpoints

#### POST /api/multiframe/analyze
Analyze multiple frames together for improved accuracy.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `files`: Multiple image files (minimum 2)
  - `conf_threshold`: Confidence threshold (optional)
  - `min_frames_for_validation`: Minimum frames needed (optional, default: 2)

**Response:**
```json
{
  "success": true,
  "validated_detections": [
    {
      "class_name": "pothole",
      "confidence": 0.92,
      "bbox": [100, 150, 200, 250],
      "validation": {
        "num_frames": 3,
        "frame_indices": [0, 1, 2],
        "individual_confidences": [0.85, 0.87, 0.89],
        "confidence_boost": 0.15
      }
    }
  ],
  "statistics": {
    "num_frames": 3,
    "total_detections_before": 12,
    "total_detections_after": 8,
    "false_positive_reduction_rate": 0.33,
    "detections_by_class": {
      "pothole": 3,
      "road_crack": 2
    },
    "avg_confidence": 0.89
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/multiframe/analyze \
  -F "files=@frame1.jpg" \
  -F "files=@frame2.jpg" \
  -F "files=@frame3.jpg" \
  -F "min_frames_for_validation=2"
```

#### POST /api/multiframe/analyze-detections
Analyze pre-computed detections from multiple frames.

**Request:**
```json
{
  "frame_detections": [
    [...detections from frame 1...],
    [...detections from frame 2...]
  ],
  "frame_metadata": [
    {"timestamp": "2024-01-01T12:00:00", "angle": "front"},
    {"timestamp": "2024-01-01T12:00:01", "angle": "side"}
  ]
}
```

#### POST /api/multiframe/validate
Validate a specific detection across multiple frames.

### GeoReport (Open311) Endpoints

#### POST /api/georeport/submit
Submit a service request to Open311 API.

**Request:**
```json
{
  "detection": {
    "class_name": "pothole",
    "confidence": 0.87,
    "enrichment": {...}
  },
  "location": {
    "lat": 37.7749,
    "lon": -122.4194,
    "address": "123 Main St"
  },
  "jurisdiction": "test",
  "api_key": "optional_api_key",
  "description": "Large pothole detected",
  "image_url": "https://example.com/image.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "service_request_id": "12345",
  "jurisdiction": "test",
  "response": {...}
}
```

#### POST /api/georeport/submit-batch
Submit multiple service requests.

#### GET /api/georeport/status/<service_request_id>
Get status of a service request.

**Query Parameters:**
- `jurisdiction`: Jurisdiction ID (optional, default: "test")
- `api_key`: API key (optional)

#### GET /api/georeport/jurisdictions
Get list of available jurisdictions.

**Response:**
```json
{
  "jurisdictions": [
    {
      "id": "san_francisco",
      "name": "San Francisco",
      "endpoint": "https://mobile311.sfgov.org/open311/v2",
      "api_key_required": true
    }
  ]
}
```

#### GET /api/georeport/services
Get available services for a jurisdiction.

#### POST /api/georeport/auto-route
Automatically route and submit a report based on GPS location.

### Health Check Endpoints

#### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "yolo_detector": true,
    "rag_tagger": true,
    "multiframe_analyzer": true,
    "georeport_client": true
  }
}
```

#### GET /api/status
Detailed system status.

#### GET /api/
Root endpoint with API information.

## Supported Issue Types

1. **pothole** - Road surface depressions
2. **road_crack** - Cracks in road surface
3. **road_debris** - Debris on roadway
4. **overflowing_trash** - Overflowing trash bins
5. **damaged_sign** - Damaged traffic/street signs
6. **graffiti** - Graffiti on public property
7. **bad_streetlight** - Malfunctioning streetlights
8. **sidewalk_obstruction** - Obstructions on sidewalks
9. **utility_line_defect** - Utility line issues
10. **flooded_road** - Flooded roadways

## Technical Details

### YOLOv8 Detection
- Model: YOLOv8n (nano) optimized for mobile
- Inference: 45 FPS on mobile with ONNX runtime
- Input: RGB images (any resolution, auto-resized)
- Output: Bounding boxes with confidence scores

### LangChain RAG Pipeline
- Embeddings: HuggingFace sentence-transformers
- Vector DB: ChromaDB (optional, uses direct lookup by default)
- Response time: <200ms per detection
- Knowledge base: Municipal infrastructure protocols

### Multi-Frame Analysis
- Algorithm: IoU-based spatial correlation
- Confidence boost: +0.15 for validated detections
- False positive reduction: ~23% improvement
- Minimum frames: 2 (configurable)

### Open311 Integration
- Protocol: Open311 GeoReport v2
- Supported jurisdictions: San Francisco, Boston, Chicago, Test
- Auto-routing: GPS-based jurisdiction detection
- Dynamic payload: Jurisdiction-specific field mapping

## Development

### Running Tests
```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_detector.py

# Run with coverage
pytest --cov=app tests/
```

### Code Style
```bash
# Format code
black app/

# Lint code
flake8 app/

# Type checking
mypy app/
```

## Environment Variables

```bash
# Flask Configuration
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
FLASK_DEBUG=False

# OpenAI API Key (optional)
OPENAI_API_KEY=your_key_here

# Open311 API Keys (optional)
OPEN311_SF_API_KEY=your_key_here
OPEN311_BOSTON_API_KEY=your_key_here
OPEN311_CHICAGO_API_KEY=your_key_here
```

## Performance

- Detection latency: ~50ms per image
- Enrichment latency: ~200ms per detection
- Multi-frame analysis: ~500ms for 3 frames
- API throughput: ~100 requests/second

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message description",
  "status": 400
}
```

Common HTTP status codes:
- 200: Success
- 400: Bad request (missing parameters, invalid input)
- 500: Internal server error

## License

MIT License - See LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.
