import React, { useState, useEffect } from 'react';
import { StyleSheet, Animated, ScrollView, View, Text, TouchableOpacity, Dimensions, Modal, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import CollapsibleSection from './CollapsibleSection';
import apiService, { TestReportResponse, AnalysisResult } from '../services/api';

const { width, height } = Dimensions.get('window');

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface ReportingScreenProps {
  onReportComplete: () => void;
  analysisResult?: AnalysisResult;
}

const ReportingScreen: React.FC<ReportingScreenProps> = ({ onReportComplete, analysisResult }) => {
  const [reportingText, setReportingText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [testReportResponse, setTestReportResponse] = useState<TestReportResponse | null>(null);
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  
  const reportingPhases = [
    {
      title: "Emergency Services Portal Access",
      content: "Connecting to the Open311/GeoReport API system...\n\nAuthentication successful. Access verified to municipal reporting system.",
      duration: 2000,
    },
    {
      title: "Automated Report Generation", 
      content: "\n\nNow generating the official incident report with all necessary details:\n\n- Incident classification and detection details\n- Location coordinates and address verification\n- Visual evidence attachment and metadata\n- Severity assessment and risk factors\n\nAll fields are being populated automatically based on AI analysis.",
      duration: 3000,
    },
    {
      title: "Emergency Dispatch Submission",
      content: "\n\nSubmitting the incident report to municipal services...\n\nReport submitted successfully! The system has generated a service request and confirmed receipt.",
      duration: 2000,
    },
    {
      title: "Response Coordination",
      content: "\n\nMunicipal services have been notified and the incident has been logged in their system for dispatch and tracking.",
      duration: 2000,
    }
  ];

  const cursorX = React.useRef(new Animated.Value(0)).current;
  const cursorY = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animated cursor moving across the browser
    Animated.loop(
      Animated.sequence([
        // Move to address bar
        Animated.parallel([
          Animated.timing(cursorX, {
            toValue: 80,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(cursorY, {
            toValue: -10,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(300),
        // Move to first form field
        Animated.parallel([
          Animated.timing(cursorX, {
            toValue: 60,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(cursorY, {
            toValue: 40,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(300),
        // Move to second form field
        Animated.parallel([
          Animated.timing(cursorX, {
            toValue: 60,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(cursorY, {
            toValue: 68,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(400),
        // Move to submit button
        Animated.parallel([
          Animated.timing(cursorX, {
            toValue: 30,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(cursorY, {
            toValue: 100,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(500),
        // Return to start
        Animated.parallel([
          Animated.timing(cursorX, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(cursorY, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(600),
      ]),
    ).start();
  }, [cursorX, cursorY]);

  useEffect(() => {
    // Submit the test report when component mounts
    const submitReport = async () => {
      if (analysisResult && analysisResult.detections.length > 0) {
        const detection = analysisResult.detections[0];
        const location = analysisResult.location;
        
        try {
          const response = await apiService.submitTestReport(detection, location);
          setTestReportResponse(response);
        } catch (error) {
          console.error('Failed to submit report:', error);
        }
      }
    };
    
    submitReport();
  }, [analysisResult]);

  useEffect(() => {
    if (currentPhase < reportingPhases.length) {
      const phase = reportingPhases[currentPhase];
      let currentText = reportingText;
      
      // Add title if it's a new phase
      if (currentPhase > 0) {
        currentText += `\n\n**${phase.title}**\n`;
      } else {
        currentText = `**${phase.title}**\n`;
      }
      
      // Type out the content character by character
      let charIndex = 0;
      const content = phase.content;
      
      const typeTimer = setInterval(() => {
        if (charIndex < content.length) {
          setReportingText(currentText + content.substring(0, charIndex + 1));
          charIndex++;
        } else {
          clearInterval(typeTimer);
          // Move to next phase after a brief pause
          setTimeout(() => {
            if (currentPhase + 1 < reportingPhases.length) {
              setCurrentPhase(currentPhase + 1);
            } else {
              setIsComplete(true);
              // Show success popup and send notification after a brief delay
              setTimeout(async () => {
                setShowSuccessPopup(true);
                // Schedule notification
                await scheduleNotification();
              }, 1000);
            }
          }, 1500);
        }
      }, 25); // Typing speed

      return () => clearInterval(typeTimer);
    }
  }, [currentPhase, reportingPhases.length]);

  const scheduleNotification = async () => {
    try {
      // Request permissions for notifications
      const { status } = await Notifications.requestPermissionsAsync();

      if (status === 'granted') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '✅ Report Successfully Submitted',
            body: 'Your incident report has been sent to municipal services. They will review and respond shortly.',
            data: {
              serviceRequestId: testReportResponse?.service_request_id || 'N/A',
              screen: 'reporting'
            },
            sound: true,
          },
          trigger: { seconds: 1 },
        });
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const handleNewReport = () => {
    setShowNewReportModal(true);
  };

  const serviceRequestId = testReportResponse?.service_request_id || 'PENDING';
  const isTestMode = testReportResponse?.test_mode === true;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View space="lg" alignItems="center" style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.mainTitle}>AI is Filing Your Report</Text>
        </View>

        {/* DEMO MODE BANNER */}
        {isTestMode && (
          <View style={styles.demoBanner}>
            <Text style={styles.demoBannerText}>
              🎬 DEMO MODE: This is what your audience would see when Open311 receives the report
            </Text>
          </View>
        )}

        {/* Browser Label - Hide when complete */}
        {!isComplete && (
          <>
            <View style={styles.browserLabel}>
              <Text style={styles.browserLabelText}>Using browser to report</Text>
            </View>

            {/* Browser Screen Mockup */}
            <View style={styles.screenView}>
          <View style={styles.browserContainer}>
            {/* Browser Chrome */}
            <View style={styles.browserChrome}>
              {/* Window Controls */}
              <View style={styles.windowControls}>
                <View style={[styles.windowButton, { backgroundColor: '#ef4444' }]} />
                <View style={[styles.windowButton, { backgroundColor: '#f59e0b' }]} />
                <View style={[styles.windowButton, { backgroundColor: '#10b981' }]} />
              </View>

              {/* Address Bar */}
              <View style={styles.addressBar}>
                <Text style={styles.addressText}>🔒 open311.gov/report</Text>
              </View>
            </View>

            {/* Browser Content */}
            <View style={styles.browserContent}>
              {/* Page Title */}
              <View style={styles.pageHeader}>
                <View style={styles.pageTitleBar} />
              </View>

              {/* Form Fields */}
              <View style={styles.formField}>
                <View style={styles.fieldInput} />
              </View>
              <View style={styles.formField}>
                <View style={styles.fieldInput} />
              </View>

              {/* Submit Button */}
              <View style={styles.submitButton}>
                <View style={styles.submitButtonInner} />
              </View>
            </View>

            {/* Animated Cursor */}
            <Animated.View
              style={[
                styles.cursor,
                {
                  transform: [
                    { translateX: cursorX },
                    { translateY: cursorY },
                  ],
                },
              ]}
            >
              <MaterialCommunityIcons
                name="cursor-default"
                size={24}
                color="#1e293b"
                style={styles.cursorIcon}
              />
            </Animated.View>
          </View>
        </View>
          </>
        )}

        {/* AI Dispatcher Stream - Single Collapsible */}
        <View style={styles.collapsibleWrapper}>
          <CollapsibleSection
            title="AI Dispatcher & Reporting"
            content={reportingText || "Initializing emergency dispatch system..."}
            isCompleted={isComplete}
            isActive={!isComplete}
            icon="RPT"
          />
        </View>

        {/* Status Information */}
        {testReportResponse && (
          <View style={styles.statusView}>
            <View space="sm">
              <Text style={styles.statusTitle}>REPORT SUMMARY</Text>
              <View space="xs">
                <View justifyContent="space-between">
                  <Text style={styles.statusLabel}>Report ID:</Text>
                  <Text style={styles.statusValue}>{serviceRequestId}</Text>
                </View>
                {analysisResult?.location && (
                  <>
                    <View justifyContent="space-between">
                      <Text style={styles.statusLabel}>Location:</Text>
                      <Text style={styles.statusValue}>
                        {analysisResult.location.address || `${analysisResult.location.lat.toFixed(4)}, ${analysisResult.location.lon.toFixed(4)}`}
                      </Text>
                    </View>
                  </>
                )}
                {analysisResult?.detections[0] && (
                  <View justifyContent="space-between">
                    <Text style={styles.statusLabel}>Detection:</Text>
                    <Text style={styles.statusValue}>
                      {analysisResult.detections[0].class_name.replace('_', ' ').toUpperCase()} ({(analysisResult.detections[0].confidence * 100).toFixed(0)}%)
                    </Text>
                  </View>
                )}
                <View justifyContent="space-between">
                  <Text style={styles.statusLabel}>Status:</Text>
                  <Text style={[styles.statusValue, styles.urgentValue]}>
                    {testReportResponse.response?.simulated_311_response?.status?.toUpperCase() || 'OPEN'}
                  </Text>
                </View>
              </View>
              
              {/* Demo Mode Message */}
              {isTestMode && (
                <View style={styles.demoMessage}>
                  <Text style={styles.demoMessageText}>
                    {testReportResponse.response?.what_this_shows || 'This is what your audience would see when an actual Open311-compatible municipality receives the report'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Completion Status */}
        {isComplete && (
          <View space="md" alignItems="center" style={styles.completionSection}>
            <View style={styles.successContainer}>
              <View style={styles.successIndicator}>
                <Text style={styles.successStatus}>COMPLETE</Text>
              </View>
              <Text style={styles.successText}>
                Emergency Report Successfully Filed!
              </Text>
              <Text style={styles.successSubtext}>
                {isTestMode ? 'Demo report submitted to test endpoint' : 'Report submitted to municipal services'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.newReportTouchableOpacity}
              onPress={handleNewReport}
            >
              <Text style={styles.newReportTouchableOpacityText}>
                Report New Incident
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>

    {/* Success Popup Modal */}
    <Modal
      visible={showSuccessPopup}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSuccessPopup(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.successPopup}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          </View>

          <Text style={styles.successPopupTitle}>Problem Successfully Reported!</Text>
          <Text style={styles.successPopupMessage}>
            Your incident report has been submitted to municipal services. You'll receive updates via notification.
          </Text>

          <TouchableOpacity
            style={styles.successPopupButton}
            onPress={() => setShowSuccessPopup(false)}
          >
            <Text style={styles.successPopupButtonText}>Got It</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* Custom New Report Modal */}
    <Modal
      visible={showNewReportModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowNewReportModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalIcon}>
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
          </View>

          <Text style={styles.modalTitle}>Report Complete!</Text>
          <Text style={styles.modalMessage}>
            Would you like to report another incident?
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={() => {
                setShowNewReportModal(false);
                onReportComplete();
              }}
            >
              <Text style={styles.modalButtonTextPrimary}>Go back to homepage</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => setShowNewReportModal(false)}
            >
              <Text style={styles.modalButtonTextSecondary}>Stay Here</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: Math.min(20, width * 0.05),
    paddingTop: Math.max(40, height * 0.05),
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
    paddingTop: 12,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e40af',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  browserLabel: {
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  browserLabelText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  screenView: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 24,
  },
  browserContainer: {
    minHeight: 160,
    position: 'relative',
  },
  browserChrome: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  windowControls: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 6,
  },
  windowButton: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  addressBar: {
    backgroundColor: '#ffffff',
    borderRadius: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  addressText: {
    fontSize: 10,
    color: '#64748b',
  },
  browserContent: {
    padding: 12,
    backgroundColor: '#ffffff',
  },
  pageHeader: {
    marginBottom: 10,
  },
  pageTitleBar: {
    width: '70%',
    height: 10,
    backgroundColor: '#e0f2fe',
    borderRadius: 3,
  },
  formField: {
    marginBottom: 8,
  },
  fieldInput: {
    width: '100%',
    height: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  submitButton: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  submitButtonInner: {
    width: 70,
    height: 24,
    backgroundColor: '#1e40af',
    borderRadius: 5,
  },
  cursor: {
    position: 'absolute',
    top: 50,
    left: 15,
  },
  cursorIcon: {
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  collapsibleWrapper: {
    width: '100%',
    marginBottom: 24,
  },
  statusView: {
    width: '100%',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginTop: 24,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  urgentValue: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  completionSection: {
    width: '100%',
    marginTop: 24,
  },
  successContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    width: '100%',
  },
  successIndicator: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  successText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    color: '#047857',
    textAlign: 'center',
  },
  newReportTouchableOpacity: {
    backgroundColor: '#1e40af',
    paddingHorizontal: Math.min(32, width * 0.08),
    paddingVertical: 16,
    borderRadius: 50,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 16,
    maxWidth: width * 0.9,
    alignSelf: 'center',
  },
  newReportTouchableOpacityText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  demoBanner: {
    backgroundColor: '#fef3c7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  demoBannerText: {
    fontSize: 14,
    color: '#d97706',
    fontWeight: '600',
  },
  demoMessage: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  demoMessageText: {
    fontSize: 12,
    color: '#4b5563',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    width: '100%',
    gap: 12,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#1e40af',
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonSecondary: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  successPopup: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 24,
  },
  successIconContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 50,
    padding: 16,
  },
  successPopupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  successPopupMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  successPopupButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  successPopupButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

export default ReportingScreen;