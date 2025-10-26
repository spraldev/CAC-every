"""
LangChain RAG-based Intelligent Tagging Service
Enriches detection reports with municipal metadata using retrieval augmented generation.
"""

import os
import logging
from typing import Dict, List, Optional
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document

logger = logging.getLogger(__name__)


class RAGTagger:
    """
    LangChain-based RAG system for enriching urban issue reports.
    Uses vector embeddings of municipal infrastructure protocols.
    """
    
    KNOWLEDGE_BASE = {
        "pothole": {
            "department": "Department of Public Works - Street Maintenance Division",
            "urgency": "high",
            "response_time": "24-48 hours",
            "technical_specs": "Road surface depression > 2 inches deep, potential vehicle damage risk",
            "routing_category": "street_maintenance",
            "required_fields": ["location", "size_estimate", "traffic_level"],
            "safety_priority": "high"
        },
        "road_crack": {
            "department": "Department of Public Works - Pavement Management",
            "urgency": "medium",
            "response_time": "7-14 days",
            "technical_specs": "Pavement surface cracking, alligator patterns, longitudinal/transverse cracks",
            "routing_category": "pavement_maintenance",
            "required_fields": ["location", "crack_type", "length_estimate"],
            "safety_priority": "medium"
        },
        "road_debris": {
            "department": "Department of Public Works - Street Cleaning",
            "urgency": "high",
            "response_time": "4-8 hours",
            "technical_specs": "Objects, rocks, branches, or other obstacles on roadway",
            "routing_category": "emergency_cleanup",
            "required_fields": ["location", "debris_type", "lane_blockage"],
            "safety_priority": "high"
        },
        "overflowing_trash": {
            "department": "Department of Sanitation - Waste Management",
            "urgency": "medium",
            "response_time": "24-48 hours",
            "technical_specs": "Garbage overflow, litter accumulation, illegal dumping",
            "routing_category": "waste_collection",
            "required_fields": ["location", "volume_estimate", "waste_type"],
            "safety_priority": "low"
        },
        "damaged_sign": {
            "department": "Department of Transportation - Traffic Signs Division",
            "urgency": "high",
            "response_time": "24 hours",
            "technical_specs": "Broken, bent, vandalized, or missing traffic/street signage",
            "routing_category": "traffic_control",
            "required_fields": ["location", "sign_type", "damage_description"],
            "safety_priority": "high"
        },
        "graffiti": {
            "department": "Department of Public Works - Graffiti Removal",
            "urgency": "low",
            "response_time": "5-7 days",
            "technical_specs": "Spray paint, vandalism markings on public property",
            "routing_category": "property_maintenance",
            "required_fields": ["location", "surface_type", "offensive_content"],
            "safety_priority": "low"
        },
        "bad_streetlight": {
            "department": "Department of Public Works - Street Lighting Division",
            "urgency": "medium",
            "response_time": "48-72 hours",
            "technical_specs": "Non-functional, damaged, or flickering street lighting",
            "routing_category": "electrical_maintenance",
            "required_fields": ["location", "pole_number", "light_status"],
            "safety_priority": "medium"
        },
        "sidewalk_obstruction": {
            "department": "Department of Public Works - Sidewalk Maintenance",
            "urgency": "medium",
            "response_time": "48-72 hours",
            "technical_specs": "Blocked walkways, overgrown vegetation, ADA compliance issues",
            "routing_category": "pedestrian_infrastructure",
            "required_fields": ["location", "obstruction_type", "ada_impact"],
            "safety_priority": "medium"
        },
        "utility_line_defect": {
            "department": "Department of Public Utilities - Infrastructure Division",
            "urgency": "critical",
            "response_time": "2-4 hours",
            "technical_specs": "Power line damage, cable issues, insulator defects, potential electrical hazard",
            "routing_category": "utility_emergency",
            "required_fields": ["location", "utility_type", "hazard_level"],
            "safety_priority": "critical"
        },
        "flooded_road": {
            "department": "Department of Public Works - Drainage Division",
            "urgency": "critical",
            "response_time": "1-2 hours",
            "technical_specs": "Water accumulation on roadway, drainage system failure, flooding",
            "routing_category": "emergency_response",
            "required_fields": ["location", "water_depth", "road_closure"],
            "safety_priority": "critical"
        }
    }
    
    def __init__(self, use_vector_db: bool = True):
        """
        Initialize RAG tagger.
        
        Args:
            use_vector_db: Whether to use vector database for retrieval (True) or direct lookup (False)
        """
        self.use_vector_db = use_vector_db
        self.vector_store = None
        
        if use_vector_db:
            try:
                self._initialize_vector_store()
                logger.info("Initialized vector store for RAG tagging")
            except Exception as e:
                logger.warning(f"Failed to initialize vector store, falling back to direct lookup: {e}")
                self.use_vector_db = False
    
    def _initialize_vector_store(self):
        """Initialize ChromaDB vector store with municipal knowledge."""
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        
        documents = []
        for issue_type, metadata in self.KNOWLEDGE_BASE.items():
            text = f"""
            Issue Type: {issue_type}
            Department: {metadata['department']}
            Urgency: {metadata['urgency']}
            Response Time: {metadata['response_time']}
            Technical Specifications: {metadata['technical_specs']}
            Routing Category: {metadata['routing_category']}
            Safety Priority: {metadata['safety_priority']}
            Required Fields: {', '.join(metadata['required_fields'])}
            """
            
            doc = Document(
                page_content=text,
                metadata={
                    'issue_type': issue_type,
                    **metadata
                }
            )
            documents.append(doc)
        
        persist_directory = os.path.join(
            os.path.dirname(__file__),
            '..',
            '..',
            'data',
            'knowledge_base'
        )
        
        self.vector_store = Chroma.from_documents(
            documents=documents,
            embedding=embeddings,
            persist_directory=persist_directory
        )
    
    def enrich_detection(
        self,
        detection: Dict,
        location: Optional[Dict] = None
    ) -> Dict:
        """
        Enrich a detection with municipal metadata.
        
        Args:
            detection: Detection dict from YOLOv8 detector
            location: Optional GPS coordinates {"lat": float, "lon": float}
            
        Returns:
            Enriched detection with municipal metadata
        """
        issue_type = detection['class_name']
        
        if self.use_vector_db and self.vector_store:
            query = f"Information about {issue_type} urban infrastructure issue"
            results = self.vector_store.similarity_search(query, k=1)
            
            if results:
                metadata = results[0].metadata
            else:
                metadata = self.KNOWLEDGE_BASE.get(issue_type, {})
        else:
            metadata = self.KNOWLEDGE_BASE.get(issue_type, {})
        
        enriched = {
            **detection,
            'enrichment': {
                'department': metadata.get('department', 'Unknown'),
                'urgency': metadata.get('urgency', 'medium'),
                'response_time': metadata.get('response_time', 'Unknown'),
                'technical_specs': metadata.get('technical_specs', ''),
                'routing_category': metadata.get('routing_category', 'general'),
                'required_fields': metadata.get('required_fields', []),
                'safety_priority': metadata.get('safety_priority', 'medium')
            }
        }
        
        if location:
            enriched['location'] = location
        
        return enriched
    
    def enrich_multiple_detections(
        self,
        detections: List[Dict],
        location: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Enrich multiple detections with municipal metadata.
        
        Args:
            detections: List of detection dicts from YOLOv8 detector
            location: Optional GPS coordinates {"lat": float, "lon": float}
            
        Returns:
            List of enriched detections
        """
        return [self.enrich_detection(det, location) for det in detections]
    
    def get_routing_info(self, issue_type: str) -> Dict:
        """
        Get routing information for a specific issue type.
        
        Args:
            issue_type: Type of urban issue
            
        Returns:
            Routing information dict
        """
        metadata = self.KNOWLEDGE_BASE.get(issue_type, {})
        
        return {
            'department': metadata.get('department', 'Unknown'),
            'routing_category': metadata.get('routing_category', 'general'),
            'urgency': metadata.get('urgency', 'medium'),
            'safety_priority': metadata.get('safety_priority', 'medium')
        }
    
    def get_all_issue_types(self) -> List[str]:
        """Get list of all supported issue types."""
        return list(self.KNOWLEDGE_BASE.keys())
