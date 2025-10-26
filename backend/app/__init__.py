"""
Flask backend for CAC-every urban issue detection system.
Implements YOLOv8 detection, LangChain RAG tagging, multi-frame analysis, and OpenGeoReport integration.
"""

from flask import Flask
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), '..', 'uploads')
    
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    from app.routes import detection, tagging, multiframe, georeport, health
    
    app.register_blueprint(detection.bp)
    app.register_blueprint(tagging.bp)
    app.register_blueprint(multiframe.bp)
    app.register_blueprint(georeport.bp)
    app.register_blueprint(health.bp)
    
    return app
