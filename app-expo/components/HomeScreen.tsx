import React from 'react';
import { StyleSheet, Dimensions, View, TouchableOpacity, Animated, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface HomeScreenProps {
  onCameraPress: () => void;
  onArchivePress?: () => void;
}

const { width, height } = Dimensions.get('window');

const HomeScreen: React.FC<HomeScreenProps> = ({ onCameraPress, onArchivePress }) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Gentle breathing animation for the main button
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Gentle rotation for the decorative elements
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      }),
    ).start();
  }, [scaleAnim, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#f0f9ff', '#e0f2fe', '#bae6fd']}
      style={styles.container}
    >
      {/* Background decorative elements */}
      <Animated.View
        style={[
          styles.backgroundCircle,
          styles.circle1,
          { transform: [{ rotate: spin }] },
        ]}
      />
      <Animated.View
        style={[
          styles.backgroundCircle,
          styles.circle2,
          { transform: [{ rotate: spin }] },
        ]}
      />

      {/* Main Content */}
      <View style={styles.content}>
        {/* Header Section */}
        <View style={[styles.header, { alignItems: 'center' }]}>
          <Text style={styles.appTitle}>CAC Vision</Text>
          <Text style={styles.appSubtitle}>
            Instant incident identification & reporting
          </Text>
        </View>

        {/* Main Camera Button */}
        <View style={styles.cameraButtonContainer}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={styles.mainCameraButton}
              onPress={onCameraPress}
              activeOpacity={0.9}
            >
              {/* Outer ring */}
              <View style={styles.outerRing}>
                {/* Inner button */}
                <LinearGradient
                  colors={['#1e40af', '#2563eb']}
                  style={styles.innerButton}
                >
                  <Ionicons name="camera" size={48} color="white" />
                </LinearGradient>
              </View>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Button Label */}
          <Text style={styles.buttonLabel}>CAPTURE</Text>
        </View>

        {/* Archive Button */}
        {onArchivePress && (
          <TouchableOpacity style={styles.archiveButton} onPress={onArchivePress}>
            <Ionicons name="folder-open-outline" size={20} color="#1e40af" />
            <Text style={styles.archiveButtonText}>View Archive</Text>
          </TouchableOpacity>
        )}

        {/* Quick Stats or Info */}
        <View style={styles.infoSection}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons name="shield-checkmark" size={24} color="#1e40af" />
              </View>
              <Text style={styles.statNumber}>24/7</Text>
              <Text style={styles.statLabel}>Response</Text>
            </View>
            
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons name="flash" size={24} color="#1e40af" />
              </View>
              <Text style={styles.statNumber}>AI</Text>
              <Text style={styles.statLabel}>Analysis</Text>
            </View>
            
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons name="lock-closed" size={24} color="#1e40af" />
              </View>
              <Text style={styles.statNumber}>100%</Text>
              <Text style={styles.statLabel}>Secure</Text>
            </View>
          </View>

          {/* Instruction Text */}
          <Text style={styles.instructionText}>
            Point camera at incident • Take photo • Get instant analysis
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
    paddingTop: height * 0.15,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 40,
    gap: 48,
  },
  backgroundCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.1,
  },
  circle1: {
    width: width * 0.8,
    height: width * 0.8,
    backgroundColor: '#3b82f6',
    top: -width * 0.3,
    left: -width * 0.2,
  },
  circle2: {
    width: width * 0.6,
    height: width * 0.6,
    backgroundColor: '#1e40af',
    bottom: -width * 0.2,
    right: -width * 0.3,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: width * 0.8,
  },
  cameraButtonContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  mainCameraButton: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  innerButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e40af',
    marginTop: 20,
    letterSpacing: 2,
  },
  infoSection: {
    alignItems: 'center',
    width: '100%',
    gap: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 48,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(30, 64, 175, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  instructionText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  archiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  archiveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
  },
});

export default HomeScreen;
