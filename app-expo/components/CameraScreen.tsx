import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  Image,
  StatusBar,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import ArchiveService from '../services/ArchiveService';

interface CameraScreenProps {
  onPhotoTaken: (imageUris: string[]) => void;
  onBack?: () => void;
}

const { width, height } = Dimensions.get('window');

const CameraScreen: React.FC<CameraScreenProps> = ({ onPhotoTaken, onBack }) => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentMediaIsVideo, setCurrentMediaIsVideo] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_IMAGES = 3;
  const MAX_VIDEO_DURATION = 5;

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    // Cleanup timer on unmount
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (cameraRef.current && !isCapturing) {
      setIsCapturing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          base64: false,
          skipProcessing: false,
        });
        if (photo) {
          setCurrentImage(photo.uri);
          setCurrentMediaIsVideo(false);
          await saveToArchive(photo.uri);
          setIsCapturing(false);
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        setIsCapturing(false);
        Alert.alert('Error', 'Failed to capture photo. Please try again.');
      }
    }
  };

  const startVideoRecording = async () => {
    if (cameraRef.current && !isRecording) {
      setIsRecording(true);
      setRecordingTime(0);

      try {
        // Start countdown timer
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime((prev) => {
            const newTime = prev + 0.1;
            if (newTime >= MAX_VIDEO_DURATION) {
              stopVideoRecording();
              return MAX_VIDEO_DURATION;
            }
            return newTime;
          });
        }, 100);

        const video = await cameraRef.current.recordAsync({
          maxDuration: MAX_VIDEO_DURATION,
        });

        if (video) {
          setCurrentImage(video.uri);
          setCurrentMediaIsVideo(true);
          await saveToArchive(video.uri);
        }
      } catch (error) {
        console.error('Error recording video:', error);
        Alert.alert('Error', 'Failed to record video. Please try again.');
      } finally {
        setIsRecording(false);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      }
    }
  };

  const stopVideoRecording = async () => {
    if (cameraRef.current && isRecording) {
      try {
        await cameraRef.current.stopRecording();
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const handleCapturePress = () => {
    if (captureMode === 'photo') {
      takePicture();
    } else {
      if (isRecording) {
        stopVideoRecording();
      } else {
        startVideoRecording();
      }
    }
  };

  const toggleCaptureMode = () => {
    setCaptureMode((prev) => (prev === 'photo' ? 'video' : 'photo'));
  };

  const saveToArchive = async (imageUri: string) => {
    try {
      await ArchiveService.saveToArchive(imageUri);
    } catch (error) {
      console.error('Error saving to archive:', error);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Media library permission is needed to select photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      setCurrentImage(imageUri);
      await saveToArchive(imageUri);
    }
  };

  const retakePhoto = () => {
    setCurrentImage(null);
    setCurrentMediaIsVideo(false);
  };

  const addAnotherImage = () => {
    if (currentImage && capturedImages.length < MAX_IMAGES) {
      setCapturedImages([...capturedImages, currentImage]);
      setCurrentImage(null);
    }
  };

  const confirmPhoto = () => {
    const allImages = currentImage 
      ? [...capturedImages, currentImage]
      : capturedImages;
    
    if (allImages.length > 0) {
      onPhotoTaken(allImages);
    }
  };

  // Permission screen
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <LinearGradient
          colors={['#f0f9ff', '#e0f2fe', '#bae6fd']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.permissionContent}>
          <Ionicons name="camera-outline" size={80} color="#1e40af" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera permission to capture incident photos
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Review captured image screen
  if (currentImage) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" hidden={true} />
        <Image source={{ uri: currentImage }} style={styles.capturedImageFull} />
        
        {/* Image counter */}
        {capturedImages.length > 0 && (
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {capturedImages.length + 1} / {MAX_IMAGES} images
            </Text>
          </View>
        )}

        {/* Bottom action bar */}
        <View style={styles.reviewBottomBar}>
          <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
            <Ionicons name="refresh-outline" size={24} color="white" />
            <Text style={styles.reviewButtonText}>Retake</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.confirmButton} onPress={confirmPhoto}>
            <LinearGradient
              colors={['#1e40af', '#2563eb']}
              style={styles.confirmGradient}
            >
              <Ionicons name="checkmark-circle" size={32} color="white" />
              <Text style={styles.confirmButtonText}>Analyze</Text>
            </LinearGradient>
          </TouchableOpacity>

          {!currentMediaIsVideo && capturedImages.length < MAX_IMAGES - 1 ? (
            <TouchableOpacity style={styles.addImageButton} onPress={addAnotherImage}>
              <Ionicons name="add-circle-outline" size={24} color="white" />
              <Text style={styles.reviewButtonText}>Add Image</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholderButton} />
          )}
        </View>
      </View>
    );
  }

  // Main camera view
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" hidden={true} />
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        {/* Top Controls Bar */}
        <SafeAreaView style={styles.topBar}>
          <View style={styles.topBarContent}>
            <View style={styles.topLeftButtons}>
              {/* Back Button */}
              {onBack && (
                <TouchableOpacity style={styles.iconButton} onPress={onBack}>
                  <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>
              )}
            </View>

            {/* Mode Toggle */}
            <View style={styles.modeToggleContainer}>
              <TouchableOpacity
                style={[styles.modeButton, captureMode === 'photo' && styles.modeButtonActive]}
                onPress={() => !isRecording && setCaptureMode('photo')}
                disabled={isRecording}
              >
                <Ionicons name="camera" size={20} color={captureMode === 'photo' ? '#1e40af' : 'white'} />
                <Text style={[styles.modeButtonText, captureMode === 'photo' && styles.modeButtonTextActive]}>
                  Photo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, captureMode === 'video' && styles.modeButtonActive]}
                onPress={() => !isRecording && setCaptureMode('video')}
                disabled={isRecording}
              >
                <Ionicons name="videocam" size={20} color={captureMode === 'video' ? '#1e40af' : 'white'} />
                <Text style={[styles.modeButtonText, captureMode === 'video' && styles.modeButtonTextActive]}>
                  Video
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.topRightButtons}>
              {/* Camera Flip Toggle */}
              <TouchableOpacity
                style={styles.iconButton}
                onPress={toggleCameraFacing}
                disabled={isRecording}
              >
                <Ionicons name="camera-reverse" size={26} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        {/* Center Crosshair/Focus Guide */}
        <View style={styles.centerGuide}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
          <Text style={styles.guideText}>
            {captureMode === 'photo' ? 'Center incident in frame' : 'Record up to 5 seconds'}
          </Text>
        </View>

        {/* Recording Timer */}
        {isRecording && (
          <View style={styles.recordingTimerContainer}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTimerText}>
              {(MAX_VIDEO_DURATION - recordingTime).toFixed(1)}s
            </Text>
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {/* Upload Button */}
          <TouchableOpacity style={styles.uploadButton} onPress={openGallery}>
            <Ionicons name="cloud-upload-outline" size={24} color="white" />
            <Text style={styles.uploadButtonText}>Upload</Text>
          </TouchableOpacity>

          {/* Capture Button */}
          <TouchableOpacity
            style={[styles.shutterButton, (isCapturing || isRecording) && styles.shutterButtonCapturing]}
            onPress={handleCapturePress}
            disabled={isCapturing}
            activeOpacity={0.7}
          >
            <View style={styles.shutterOuter}>
              <View style={[
                styles.shutterInner,
                isRecording && styles.shutterInnerRecording,
                isCapturing && styles.shutterInnerCapturing
              ]} />
            </View>
          </TouchableOpacity>

          {/* Image Count Indicator */}
          <View style={styles.imageCountContainer}>
            {capturedImages.length > 0 && (
              <View style={styles.imageCountBadge}>
                <Text style={styles.imageCountText}>{capturedImages.length}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Tips Overlay */}
        <View style={styles.tipsContainer}>
          <View style={styles.tipBadge}>
            <Ionicons name="information-circle" size={16} color="#1e40af" />
            <Text style={styles.tipText}>Point • Shoot • Analyze</Text>
          </View>
        </View>
      </CameraView>

      {/* Loading overlay when capturing */}
      {isCapturing && (
        <View style={styles.captureOverlay}>
          <ActivityIndicator size="large" color="white" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  // Top bar styles
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  topLeftButtons: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  topRightButtons: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
    justifyContent: 'flex-end',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 4,
    gap: 4,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modeButtonActive: {
    backgroundColor: 'white',
  },
  modeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#1e40af',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  // Center guide styles
  centerGuide: {
    position: 'absolute',
    top: height * 0.3,
    left: width * 0.15,
    right: width * 0.15,
    height: width * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 4,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 4,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 4,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 4,
  },
  guideText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    position: 'absolute',
    bottom: -40,
  },
  // Bottom controls
  bottomControls: {
    position: 'absolute',
    bottom: Math.max(40, height * 0.08),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 90,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  shutterButton: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterButtonCapturing: {
    opacity: 0.5,
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
  },
  shutterInnerCapturing: {
    backgroundColor: '#ff4444',
  },
  shutterInnerRecording: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    width: 40,
    height: 40,
  },
  recordingTimerContainer: {
    position: 'absolute',
    top: height * 0.15,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 10,
    zIndex: 100,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  recordingTimerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    minWidth: 50,
    textAlign: 'center',
  },
  placeholderButton: {
    width: 50,
    height: 50,
  },
  // Tips container
  tipsContainer: {
    position: 'absolute',
    top: height * 0.15,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  tipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tipText: {
    color: '#1e40af',
    fontSize: 12,
    fontWeight: '600',
  },
  // Capture overlay
  captureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  // Permission screen styles
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContent: {
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginTop: 20,
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    marginBottom: 15,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#1e40af',
    fontSize: 16,
  },
  // Review screen styles
  capturedImageFull: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  reviewTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  reviewBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    margin: 20,
    borderRadius: 25,
    alignSelf: 'flex-start',
  },
  reviewBackText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 4,
    fontWeight: '600',
  },
  reviewBottomBar: {
    position: 'absolute',
    bottom: Math.max(40, height * 0.08),
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 10,
  },
  retakeButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    minWidth: 70,
  },
  reviewButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  confirmButton: {
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmGradient: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 35,
    minWidth: 120,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  galleryButtonReview: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    minWidth: 70,
  },
  addImageButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    minWidth: 70,
  },
  imageCounter: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  imageCounterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  imageCountContainer: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCountBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  imageCountText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CameraScreen;
