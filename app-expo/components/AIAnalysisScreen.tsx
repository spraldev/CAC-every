import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface AIAnalysisScreenProps {
  imageUris: string[];
  onAnalysisComplete: () => void;
  onReturnHome: () => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (value: boolean) => void;
}

const ImageAnalyzer: React.FC = () => {
  const scanPosition = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanPosition, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(scanPosition, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [scanPosition, pulseAnim]);

  const translateX = scanPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.5],
  });

  return (
    <View style={styles.analyzerContainer}>
      <Animated.View style={[styles.imageFrame, { transform: [{ scale: pulseAnim }] }]}>
        {/* Mock image representation */}
        <View style={styles.mockImage}>
          <View style={styles.mockImageContent} />
          <View style={styles.mockImageContent2} />
          <View style={styles.mockImageLine} />
        </View>
        
        {/* Scanning line animation */}
        <Animated.View
          style={[
            styles.scanLine,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <LinearGradient
            colors={['transparent', '#1e40af', '#3b82f6', '#1e40af', 'transparent']}
            style={styles.scanGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </Animated.View>
        
        {/* Analysis dots */}
        <View style={styles.analysisIndicator}>
          <Ionicons name="analytics-outline" size={24} color="#1e40af" />
        </View>
      </Animated.View>
      <Text style={styles.analyzerText}>Analyzing Images...</Text>
    </View>
  );
};

const AIAnalysisScreen: React.FC<AIAnalysisScreenProps> = ({ 
  imageUris, 
  onAnalysisComplete,
  onReturnHome,
  isAnalyzing,
  setIsAnalyzing
}) => {
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (isAnalyzing) {
      // Start analysis
      const progressInterval = setInterval(() => {
        setAnalysisProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setIsComplete(true);
            setTimeout(() => {
              onAnalysisComplete();
            }, 1000);
            return 100;
          }
          return prev + 2;
        });
      }, 100);

      return () => clearInterval(progressInterval);
    }
  }, [isAnalyzing, onAnalysisComplete]);

  const handleReturnHome = () => {
    Alert.alert(
      'Stop Analysis?',
      'Are you sure you want to stop analyzing and filing the report?',
      [
        {
          text: 'Continue Analyzing',
          style: 'cancel',
        },
        {
          text: 'Return to Home',
          style: 'destructive',
          onPress: () => {
            setIsAnalyzing(false);
            onReturnHome();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleCancelReport = () => {
    Alert.alert(
      'Cancel Report?',
      'Are you sure you want to cancel this report?',
      [
        {
          text: 'Keep Report',
          style: 'cancel',
        },
        {
          text: 'Cancel Report',
          style: 'destructive',
          onPress: () => {
            setIsAnalyzing(false);
            onReturnHome();
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleReturnHome}>
          <Ionicons name="chevron-back" size={24} color="#1e40af" />
          <Text style={styles.backText}>Return to Home</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Analyzer Animation */}
        <ImageAnalyzer />

        {/* Images Preview */}
        <View style={styles.imagesContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.imagesScroll}
          >
            {imageUris.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.previewImage} />
                <Text style={styles.imageLabel}>Image {index + 1}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Analysis Progress</Text>
            <Text style={styles.progressValue}>{Math.round(analysisProgress)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${analysisProgress}%` }
              ]} 
            />
          </View>
        </View>

        {/* Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status:</Text>
            <Text style={[styles.statusValue, isComplete && styles.completeStatus]}>
              {isComplete ? 'Complete' : 'Analyzing...'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Images:</Text>
            <Text style={styles.statusValue}>{imageUris.length} captured</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Type:</Text>
            <Text style={styles.statusValue}>Incident Report</Text>
          </View>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelReport}>
          <Text style={styles.cancelButtonText}>Cancel Report</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontSize: 16,
    color: '#1e40af',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  analyzerContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  imageFrame: {
    width: width * 0.6,
    height: width * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  mockImage: {
    width: '80%',
    height: '80%',
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'space-between',
  },
  mockImageContent: {
    width: '60%',
    height: '25%',
    backgroundColor: '#bae6fd',
    borderRadius: 4,
  },
  mockImageContent2: {
    width: '80%',
    height: '20%',
    backgroundColor: '#dbeafe',
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  mockImageLine: {
    width: '90%',
    height: 2,
    backgroundColor: '#1e40af',
    borderRadius: 1,
    alignSelf: 'center',
  },
  analysisIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(30, 64, 175, 0.1)',
    borderRadius: 12,
    padding: 4,
  },
  scanLine: {
    position: 'absolute',
    width: 3,
    height: '100%',
    opacity: 0.9,
    left: 0,
  },
  scanGradient: {
    flex: 1,
    width: '100%',
  },
  analyzerText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1e40af',
  },
  imagesContainer: {
    marginBottom: 24,
  },
  imagesScroll: {
    flexGrow: 0,
  },
  imageWrapper: {
    marginRight: 12,
    alignItems: 'center',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  imageLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
  },
  progressSection: {
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  progressValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1e40af',
    borderRadius: 4,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  completeStatus: {
    color: '#10b981',
  },
  cancelButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
});

export default AIAnalysisScreen;