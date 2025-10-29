import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

const AppFooter: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.disclaimerText}>
        For life-threatening emergencies, call 911 immediately
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});

export default AppFooter;

