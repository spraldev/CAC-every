const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5001/api' 
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
    try {
      // Step 1: Prepare images for multiframe analysis
      const formData = new FormData();
      
      imageUris.forEach((uri, index) => {
        const filename = uri.split('/').pop() || `image_${index}.jpg`;
        
        // Handle both base64 and file:// URIs
        if (uri.startsWith('data:')) {
          // Base64 image
          const match = /^data:(.+);base64,(.+)$/.exec(uri);
          if (match) {
            formData.append('files', {
              uri,
              type: 'image/jpeg',
              name: filename,
            } as any);
          }
        } else {
          // File URI
          formData.append('files', {
            uri,
            type: 'image/jpeg',
            name: filename,
          } as any);
        }
      });

      // Step 2: Call multiframe analysis endpoint (detects + validates)
      console.log('Calling multiframe analysis...');
      const multiframeResponse = await fetch(`${API_BASE_URL}/multiframe/analyze`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!multiframeResponse.ok) {
        throw new Error(`Multiframe analysis failed: ${multiframeResponse.statusText}`);
      }

      const multiframeData = await multiframeResponse.json();
      
      if (!multiframeData.success || !multiframeData.validated_detections) {
        throw new Error('Invalid response from multiframe analysis');
      }

      console.log('Multiframe analysis complete:', multiframeData.validated_detections.length, 'detections');

      // Step 3: Enrich detections with tagging
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

      // Step 4: Prepare result
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
    } catch (error) {
      console.error('Analysis error:', error);
      
      // Return mock data only if backend is completely unavailable
      console.log('Using fallback mock data');
      return this.getMockAnalysisResult();
    }
  }

  /**
   * Submit a test report - this is where we simulate Open311
   * The detection should already be enriched from the analysis pipeline
   */
  async submitTestReport(detection: DetectionResult, location: Location): Promise<TestReportResponse> {
    try {
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
        throw new Error(`Report submission failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Test report submitted:', data.service_request_id);
      return data;
    } catch (error) {
      console.error('Report submission error:', error);
      // Return mock response if backend unavailable
      return this.getMockTestReportResponse(detection, location);
    }
  }

  /**
   * Analyze video by extracting frames and processing them
   * Sends video to backend which extracts frames and runs multiframe analysis
   */
  async analyzeVideo(videoUri: string, location?: Location): Promise<AnalysisResult> {
    try {
      console.log('Analyzing video...');
      const formData = new FormData();

      const filename = videoUri.split('/').pop() || 'video.mp4';

      // Append video file
      formData.append('video', {
        uri: videoUri,
        type: 'video/mp4',
        name: filename,
      } as any);

      // Call video analysis endpoint
      const response = await fetch(`${API_BASE_URL}/multiframe/analyze-video`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`Video analysis failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success || !data.validated_detections) {
        throw new Error('Invalid response from video analysis');
      }

      console.log('Video analysis complete:', data.validated_detections.length, 'detections');

      // Enrich detections with tagging
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

      // Prepare result
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
    } catch (error) {
      console.error('Video analysis error:', error);
      console.log('Using fallback mock data');
      return this.getMockAnalysisResult();
    }
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

  /**
   * Mock analysis result ONLY for demo/fallback when backend is down
   */
  private getMockAnalysisResult(): AnalysisResult {
    // Return empty result when backend is unavailable - don't fake data
    return {
      detections: [],
      location: {
        lat: 0,
        lon: 0,
      },
      confidence: 0,
      summary: 'Backend unavailable - could not analyze images',
    };
  }

  /**
   * Mock test report response ONLY for demo/fallback when backend is down
   */
  private getMockTestReportResponse(detection: DetectionResult, location: Location): TestReportResponse {
    const testId = `TEST-${Date.now().toString(36).toUpperCase()}`;
    
    return {
      success: true,
      service_request_id: testId,
      jurisdiction: 'test',
      test_mode: true,
      response: {
        message: 'BACKEND UNAVAILABLE: This is simulated response because backend is not reachable',
        simulated_311_response: {
          service_request_id: testId,
          status: 'open',
          service_name: `${detection.class_name.replace('_', ' ')} Issue`,
          description: `Test report for ${detection.class_name} detected with ${(detection.confidence * 100).toFixed(0)}% confidence`,
          requested_datetime: new Date().toISOString(),
          address: location.address || `Lat: ${location.lat}, Lon: ${location.lon}`,
          lat: location.lat,
          long: location.lon,
          jurisdiction: 'Test Jurisdiction',
          agency_responsible: 'Municipal Services Department',
        },
        what_this_shows: 'This is what your audience would see when an actual Open311-compatible municipality receives the report',
      },
    };
  }
}

export default new ApiService();
