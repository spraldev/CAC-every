import React, { useState, useEffect } from 'react';
import { StyleSheet, Animated, Alert, ScrollView, View, Text, TouchableOpacity } from 'react-native';
import CollapsibleSection from './CollapsibleSection';

interface ReportingScreenProps {
  onReportComplete: () => void;
}

const ReportingScreen: React.FC<ReportingScreenProps> = ({ onReportComplete }) => {
  const [reportingText, setReportingText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  
  const reportingPhases = [
    {
      title: "Emergency Services Portal Access",
      content: "I'm now connecting to the Fire Department's emergency dispatch system. Establishing secure connection to emergency services portal...\n\nAuthentication successful. I have verified access to the emergency reporting system and confirmed all protocols are operational.",
      duration: 3000,
    },
    {
      title: "Automated Report Generation", 
      content: "\n\nNow generating the official incident report with all necessary details:\n\n- Incident classification: Structure Fire (High Priority)\n- Location coordinates and address verification\n- Visual evidence attachment and metadata\n- Severity assessment and risk factors\n- Recommended response units and equipment\n\nAll fields are being populated automatically based on my analysis.",
      duration: 4000,
    },
    {
      title: "Emergency Dispatch Submission",
      content: "\n\nSubmitting the incident report to emergency dispatch now...\n\nReport submitted successfully! The system has assigned incident ID #FD-2024-001247 and confirmed receipt by the dispatch center.\n\nEmergency services have been notified and are preparing immediate response.",
      duration: 3500,
    },
    {
      title: "Response Coordination",
      content: "\n\nI've successfully coordinated with emergency services and received confirmation of dispatch:\n\n✓ Fire Engine 7 - Dispatched (ETA: 4 minutes)\n✓ Ladder Truck 3 - En route (ETA: 5 minutes)  \n✓ Emergency Medical Unit 12 - Responding (ETA: 4 minutes)\n✓ Fire Chief Johnson - Notified and responding\n\nAll units are now en route to the incident location with priority response status.",
      duration: 2500,
    }
  ];

  const blinkAnim = React.useRef(new Animated.Value(1)).current;
  const typeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Blinking cursor animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Typing animation
    Animated.loop(
      Animated.timing(typeAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      }),
    ).start();
  }, [blinkAnim, typeAnim]);

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
            }
          }, 1500);
        }
      }, 25); // Typing speed

      return () => clearInterval(typeTimer);
    }
  }, [currentPhase, reportingPhases.length]);

  const getCurrentPhaseProgress = () => {
    return ((currentPhase + 1) / reportingPhases.length) * 100;
  };

  const handleNewReport = () => {
    Alert.alert(
      'New Report',
      'Would you like to report another incident?',
      [
        {
          text: 'Yes',
          onPress: onReportComplete,
        },
        {
          text: 'Exit App',
          style: 'destructive',
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View space="lg" alignItems="center" style={styles.content}>
        {/* Header */}
        <View space="sm" alignItems="center" style={styles.header}>
          <Text style={styles.aiControlText}>AI CONTROL INTERFACE</Text>
          <Text style={styles.title}>Automated Emergency Reporting</Text>
          <Text style={styles.subtitle}>
            AI is now controlling emergency systems to file your report
          </Text>
        </View>

        {/* Computer Screen Mockup */}
        <View style={styles.screenView}>
          <View space="md" style={styles.screenContainer}>
            {/* Screen Header */}
            <View space="sm" alignItems="center" style={styles.screenHeader}>
              <View style={[styles.screenTouchableOpacity, { backgroundColor: '#ef4444' }]} />
              <View style={[styles.screenTouchableOpacity, { backgroundColor: '#f59e0b' }]} />
              <View style={[styles.screenTouchableOpacity, { backgroundColor: '#10b981' }]} />
              <Text style={styles.screenTitle}>Emergency Services Portal - ACTIVE SESSION</Text>
            </View>

            {/* Screen Content */}
            <View style={styles.screenContent}>
              <View space="sm">
                <Text style={styles.terminalText}>
                  C:\emergency_services{'>'} ai_reporter.exe --urgent --fire
                </Text>
                <Text style={styles.terminalText}>
                  Initializing Emergency Response Protocol v2.1.4...
                </Text>
                <Text style={styles.terminalText}>
                  Connection established: [SECURE]
                </Text>
                <Text style={styles.terminalText}>
                  Location: 123 Oak Street, Downtown District
                </Text>
                <Text style={styles.terminalText}>
                  Incident: Structure Fire - Residential Building
                </Text>
                <Text style={styles.terminalText}>
                  Priority: HIGH - Immediate Response Required
                </Text>
                <View alignItems="center">
                  <Text style={styles.terminalText}>Status: Processing report</Text>
                  <Animated.Text style={[styles.cursor, { opacity: blinkAnim }]}>
                    _
                  </Animated.Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* AI Dispatcher Stream - Single Collapsible */}
        <CollapsibleSection
          title="AI Dispatcher & Reporting"
          content={reportingText || "Initializing emergency dispatch system..."}
          isCompleted={isComplete}
          isActive={!isComplete}
          icon="RPT"
        />

        {/* Status Information */}
        <View style={styles.statusView}>
          <View space="sm">
            <Text style={styles.statusTitle}>REPORT SUMMARY</Text>
            <View space="xs">
              <View justifyContent="space-between">
                <Text style={styles.statusLabel}>Report ID:</Text>
                <Text style={styles.statusValue}>#FD-2024-001247</Text>
              </View>
              <View justifyContent="space-between">
                <Text style={styles.statusLabel}>Dispatch ETA:</Text>
                <Text style={[styles.statusValue, styles.urgentValue]}>4 minutes</Text>
              </View>
              <View justifyContent="space-between">
                <Text style={styles.statusLabel}>Units Dispatched:</Text>
                <Text style={styles.statusValue}>Engine 7, Truck 3, EMS 12</Text>
              </View>
              <View justifyContent="space-between">
                <Text style={styles.statusLabel}>Contact Notified:</Text>
                <Text style={styles.statusValue}>Fire Chief Johnson</Text>
              </View>
            </View>
          </View>
        </View>

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
                Emergency services have been notified and are en route
              </Text>
            </View>
            <TouchableOpacity
              style={styles.newReportTouchableOpacity}
              onPress={handleNewReport}
            >
              <TouchableOpacityText style={styles.newReportTouchableOpacityText}>
                Report New Incident
              </TouchableOpacityText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
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
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 20,
  },
  aiControlText: {
    fontSize: 16,
    color: '#7c3aed',
    fontWeight: '600',
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  screenView: {
    width: '100%',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 2,
    borderColor: '#374151',
  },
  screenContainer: {
    minHeight: 200,
  },
  screenHeader: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  screenTouchableOpacity: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  screenTitle: {
    fontSize: 12,
    color: '#d1d5db',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'center',
  },
  screenContent: {
    flex: 1,
    padding: 12,
  },
  terminalText: {
    fontSize: 12,
    color: '#10b981',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  cursor: {
    fontSize: 12,
    color: '#10b981',
    fontFamily: 'monospace',
    marginLeft: 2,
  },

  statusView: {
    width: '100%',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
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
    marginTop: 20,
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
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 50,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 16,
  },
  newReportTouchableOpacityText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ReportingScreen;