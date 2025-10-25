import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

const AppFooter: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Top gradient border */}
      <View style={styles.topBorder} />
      
      <View space="md" alignItems="center" justifyContent="space-between" style={styles.content}>
        {/* Left section - Version */}
        <View space="xs" alignItems="center">
          <Text style={styles.versionText}>v1.0.0</Text>
          <View style={styles.divider} />
          <Text style={styles.infoText}>Emergency Services</Text>
        </View>
        
        {/* Right section - Security */}
        <View space="xs" alignItems="center">
          <View style={styles.securityIndicator} />
          <Text style={styles.securityText}>SECURE</Text>
        </View>
      </View>
      
      <Text style={styles.disclaimerText}>
        For life-threatening emergencies, call 911 immediately
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  topBorder: {
    height: 2,
    backgroundColor: '#3b82f6',
    marginBottom: 12,
    borderRadius: 1,
  },
  content: {
    width: '100%',
    marginBottom: 8,
  },
  versionText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: '#d1d5db',
  },
  infoText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  securityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  securityText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  disclaimerText: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 14,
  },
});

export default AppFooter;

