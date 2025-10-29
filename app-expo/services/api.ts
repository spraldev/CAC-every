const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000/api' 
  : 'https://your-production-backend.com/api';

export interface DetectionResult {
  class_name: string;
  confidence: number;
  bbox?: [number, number, number, number];
  enrichment?: {
    urgency?: string;
    safety_priority?: string;
    technical_specs?: string;
    department?: string;
    routing_category?: string;
  };
}

export interface Location {
  lat: number;
  lon: number;
  address?: string;
}

export interface TestReportResponse {
  success: boolean;
  service_request_id: string;
  jurisdiction: string;
  test_mode: boolean;
  response: {
    message: string;
    simulated_311_response: {
      service_request_id: string;
      status: string;
      service_name: string;
      description: string;
      requested_datetime: string;
      address: string;
      lat: number;
      long: number;
      jurisdiction: string;
      agency_responsible: string;
    };
    what_this_shows: string;
  };
}

export interface AnalysisResult {
  detections: DetectionResult[];
  location: Location;
  confidence: number;
  summary: string;
}

class ApiService {
  /**
   * FULL PIPELINE: Analyze images through the real backend
   * 1. Multi-frame analysis (detects with YOLO + validates)
   * 2. Enrich with tagging (RAG metadata)
   * 3. Returns complete analysis with enriched detections
   */
  async analyzeImages(imageUris: string[], location?: Location): Promise<AnalysisResult> {
    const formData = new FormData();
    
    imageUris.forEach((uri, index) => {
      const filename = uri.split('/').pop() || `image_${index}.jpg`;
      
      if (uri.startsWith('data:')) {
        const match = /^data:(.+);base64,(.+)$/.exec(uri);
        if (match) {
          formData.append('files', {
            uri,
            type: 'image/jpeg',
            name: filename,
          } as any);
        }
      } else {
        formData.append('files', {
          uri,
          type: 'image/jpeg',
          name: filename,
        } as any);
      }
    });

    console.log('Calling multiframe analysis...');
    const multiframeResponse = await fetch(`${API_BASE_URL}/multiframe/analyze`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!multiframeResponse.ok) {
      const errorText = await multiframeResponse.text();
      throw new Error(`Multiframe analysis failed: ${multiframeResponse.statusText} - ${errorText}`);
    }

    const multiframeData = await multiframeResponse.json();
    
    if (!multiframeData.success || !multiframeData.validated_detections) {
      throw new Error('Invalid response from multiframe analysis');
    }

    console.log('Multiframe analysis complete:', multiframeData.validated_detections.length, 'detections');

    const detections = multiframeData.validated_detections;
    let enrichedDetections = detections;
    
    if (detections.length > 0 && location) {
      console.log('Enriching detections with tagging...');
      const tagResponse = await fetch(`${API_BASE_URL}/tag/enrich-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          detections: detections,
          location: location,
        }),
      });

      if (tagResponse.ok) {
        const tagData = await tagResponse.json();
        if (tagData.success && tagData.enriched_detections) {
          enrichedDetections = tagData.enriched_detections;
          console.log('Enrichment complete');
        }
      }
    }

    const primaryDetection = enrichedDetections[0] || detections[0];
    const summary = primaryDetection 
      ? `AI detected: ${primaryDetection.class_name.replace('_', ' ')} with ${(primaryDetection.confidence * 100).toFixed(0)}% confidence`
      : 'No detections found';

    return {
      detections: enrichedDetections,
      location: location || { lat: 0, lon: 0 },
      confidence: primaryDetection?.confidence || 0,
      summary,
    };
  }

  /**
   * Submit a test report - this is where we simulate Open311
   * The detection should already be enriched from the analysis pipeline
   */
  async submitTestReport(detection: DetectionResult, location: Location): Promise<TestReportResponse> {
    console.log('Submitting test report...');
    const response = await fetch(`${API_BASE_URL}/georeport/test-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        detection,
        location,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Report submission failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Test report submitted:', data.service_request_id);
    return data;
  }

  /**
   * Analyze video by extracting frames and processing them
   * Sends video to backend which extracts frames and runs multiframe analysis
   */
  async analyzeVideo(videoUri: string, location?: Location): Promise<AnalysisResult> {
    console.log('Analyzing video...');
    const formData = new FormData();

    const filename = videoUri.split('/').pop() || 'video.mp4';

    formData.append('video', {
      uri: videoUri,
      type: 'video/mp4',
      name: filename,
    } as any);

    const response = await fetch(`${API_BASE_URL}/multiframe/analyze-video`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Video analysis failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.success || !data.validated_detections) {
      throw new Error('Invalid response from video analysis');
    }

    console.log('Video analysis complete:', data.validated_detections.length, 'detections');

    let enrichedDetections = data.validated_detections;

    if (data.validated_detections.length > 0 && location) {
      console.log('Enriching detections with tagging...');
      const tagResponse = await fetch(`${API_BASE_URL}/tag/enrich-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          detections: data.validated_detections,
          location: location,
        }),
      });

      if (tagResponse.ok) {
        const tagData = await tagResponse.json();
        if (tagData.success && tagData.enriched_detections) {
          enrichedDetections = tagData.enriched_detections;
          console.log('Enrichment complete');
        }
      }
    }

    const primaryDetection = enrichedDetections[0] || data.validated_detections[0];
    const summary = primaryDetection
      ? `AI detected: ${primaryDetection.class_name.replace('_', ' ')} with ${(primaryDetection.confidence * 100).toFixed(0)}% confidence (from video)`
      : 'No detections found in video';

    return {
      detections: enrichedDetections,
      location: location || { lat: 0, lon: 0 },
      confidence: primaryDetection?.confidence || 0,
      summary,
    };
  }

  /**
   * Get health status of the backend
   */
  async checkHealth(): Promise<{ status: string; version?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      
      if (!response.ok) {
        return { status: 'unavailable' };
      }

      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      return { status: 'unavailable' };
    }
  }
}

export default new ApiService();
