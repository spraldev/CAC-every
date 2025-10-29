import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title = "SeeSomething AI",
  subtitle = "Emergency Response System"
}) => {
  return (
    <View style={styles.container}>
      <View space="md" alignItems="center" style={styles.content}>
        {/* Logo/Icon */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>SS</Text>
        </View>
        
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        
        {/* Status Indicator */}
        <View style={styles.statusContainer}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Online</Text>
        </View>
      </View>
      
      {/* Bottom gradient border */}
      <View style={styles.bottomBorder} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e40af',
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    width: '100%',
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  titleSection: {
    flex: 1,
    marginLeft: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 12,
    color: '#bfdbfe',
    fontWeight: '500',
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#bfdbfe',
    fontWeight: '500',
  },
  bottomBorder: {
    height: 3,
    backgroundColor: '#3b82f6',
    marginTop: 8,
    borderRadius: 2,
  },
});

export default AppHeader;

