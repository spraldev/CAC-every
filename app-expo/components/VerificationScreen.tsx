import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnalysisResult } from '../services/api';
import Svg, { Rect } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface VerificationScreenProps {
  imageUris: string[];
  analysisResult: AnalysisResult;
  onConfirm: () => void;
  onGoBack: () => void;
}

const VerificationScreen: React.FC<VerificationScreenProps> = ({
  imageUris,
  analysisResult,
  onConfirm,
  onGoBack,
}) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Verify Detection</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Ionicons name="information-circle" size={24} color="#1e40af" />
          <Text style={styles.instructionsText}>
            Review the detected issues below. The boxes show what will be reported.
          </Text>
        </View>

        {/* Images with Detections */}
        {(analysisResult.annotatedImageUris && analysisResult.annotatedImageUris.length > 0 
          ? analysisResult.annotatedImageUris 
          : imageUris
        ).map((uri, index) => {
          const detection = analysisResult.detections[index] || analysisResult.detections[0];
          const useAnnotated = analysisResult.annotatedImageUris && analysisResult.annotatedImageUris.length > 0;

          return (
            <View key={index} style={styles.imageCard}>
              <View style={styles.imageContainer}>
                <Image source={{ uri }} style={styles.image} resizeMode="contain" />

                {!useAnnotated && detection && detection.bbox && (
                  <Svg style={styles.svgOverlay}>
                    <Rect
                      x={`${detection.bbox[0]}%`}
                      y={`${detection.bbox[1]}%`}
                      width={`${detection.bbox[2] - detection.bbox[0]}%`}
                      height={`${detection.bbox[3] - detection.bbox[1]}%`}
                      stroke="#ef4444"
                      strokeWidth="3"
                      fill="none"
                    />
                  </Svg>
                )}
              </View>

              {/* Detection Info */}
              {detection && (
                <View style={styles.detectionInfo}>
                  <View style={styles.detectionHeader}>
                    <View style={styles.detectionBadge}>
                      <Ionicons name="warning" size={16} color="#ef4444" />
                      <Text style={styles.detectionType}>
                        {detection.class_name.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>
                        {(detection.confidence * 100).toFixed(0)}% confident
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.reportText}>
                    This will be reported: {detection.class_name.replace('_', ' ')} detected at this location
                  </Text>

                  {detection.enrichment && (
                    <View style={styles.enrichmentInfo}>
                      {detection.enrichment.urgency && (
                        <View style={styles.enrichmentRow}>
                          <Text style={styles.enrichmentLabel}>Urgency:</Text>
                          <Text style={styles.enrichmentValue}>{detection.enrichment.urgency}</Text>
                        </View>
                      )}
                      {detection.enrichment.department && (
                        <View style={styles.enrichmentRow}>
                          <Text style={styles.enrichmentLabel}>Department:</Text>
                          <Text style={styles.enrichmentValue}>{detection.enrichment.department}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Report Summary</Text>
          <Text style={styles.summaryText}>{analysisResult.summary}</Text>

          {analysisResult.location.address && (
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={16} color="#64748b" />
              <Text style={styles.locationText}>{analysisResult.location.address}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.cancelButton} onPress={onGoBack}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
          <LinearGradient
            colors={['#1e40af', '#2563eb']}
            style={styles.confirmGradient}
          >
            <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
            <Text style={styles.confirmButtonText}>Confirm & Report</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: Math.max(20, height * 0.025),
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  instructionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#dbeafe',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  imageCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  detectionInfo: {
    marginTop: 16,
  },
  detectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detectionType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  confidenceBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16a34a',
  },
  reportText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  enrichmentInfo: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  enrichmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enrichmentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  enrichmentValue: {
    fontSize: 13,
    color: '#1e293b',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  confirmButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

export default VerificationScreen;
