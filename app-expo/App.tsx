import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { View, Alert } from 'react-native';
import { AnalysisResult } from './services/api';

// Screens (migrated into Expo app)
import SplashScreen from './components/SplashScreen';
import HomeScreen from './components/HomeScreen';
import CameraScreen from './components/CameraScreen';
import AIAnalysisScreen from './components/AIAnalysisScreen';
import VerificationScreen from './components/VerificationScreen';
import ReportingScreen from './components/ReportingScreen';
import ArchiveScreen from './components/ArchiveScreen';
import AppFooter from './components/AppFooter';

type AppScreen = 'splash' | 'home' | 'camera' | 'analysis' | 'verification' | 'reporting' | 'archive';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [capturedImageUris, setCapturedImageUris] = useState<string[]>([]);
  const [showSplash, setShowSplash] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | undefined>();

  const navigateToHome = () => {
    setCurrentScreen('home');
    setIsAnalyzing(false);
    setCapturedImageUris([]);
  };
  
  const navigateToCamera = () => {
    if (isAnalyzing) {
      Alert.alert(
        'Analysis in Progress',
        'A report is currently being analyzed. Please wait for it to complete or cancel it before starting a new one.',
        [{ text: 'OK' }]
      );
      return;
    }
    setCurrentScreen('camera');
  };
  
  const navigateToAnalysis = (imageUris: string[]) => {
    setCapturedImageUris(imageUris);
    setCurrentScreen('analysis');
    setIsAnalyzing(true);
  };

  const navigateToVerification = (analysisResult: AnalysisResult) => {
    setAnalysisResult(analysisResult);
    setCurrentScreen('verification');
    setIsAnalyzing(false);
  };

  const navigateToReporting = () => {
    setCurrentScreen('reporting');
  };
  
  const resetToHome = () => {
    setCurrentScreen('home');
    setIsAnalyzing(false);
    setCapturedImageUris([]);
  };
  
  const backToHome = () => {
    setCurrentScreen('home');
  };
  
  const navigateToArchive = () => {
    setCurrentScreen('archive');
  };

  // Show splash screen on initial load
  React.useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2000); // Show splash for 2 seconds
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  const renderCurrentScreen = () => {
    if (showSplash) {
      return <SplashScreen onFinish={() => setShowSplash(false)} />;
    }

    switch (currentScreen) {
      case 'home':
        return <HomeScreen onCameraPress={navigateToCamera} onArchivePress={navigateToArchive} />;
      case 'camera':
        return <CameraScreen onPhotoTaken={navigateToAnalysis} onBack={backToHome} />;
      case 'analysis':
        return (
          <AIAnalysisScreen
            imageUris={capturedImageUris}
            onAnalysisComplete={navigateToVerification}
            onReturnHome={navigateToHome}
            isAnalyzing={isAnalyzing}
            setIsAnalyzing={setIsAnalyzing}
          />
        );
      case 'verification':
        return (
          <VerificationScreen
            imageUris={capturedImageUris}
            analysisResult={analysisResult!}
            onConfirm={navigateToReporting}
            onGoBack={() => setCurrentScreen('analysis')}
          />
        );
      case 'reporting':
        return <ReportingScreen onReportComplete={resetToHome} analysisResult={analysisResult} />;
      case 'archive':
        return <ArchiveScreen onBack={backToHome} />;
      default:
        return <HomeScreen onCameraPress={navigateToCamera} onArchivePress={navigateToArchive} />;
    }
  };

  const showFooter = !showSplash && (currentScreen === 'home' || currentScreen === 'reporting');
  // For all screens, avoid top safe area to make content flush to the top (screens handle their own padding)
  const safeEdges = !showSplash ? ['left', 'right', 'bottom'] : [];
  // Transparent background to prevent white bar
  const safeBg = 'transparent';

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" translucent backgroundColor="transparent" />
      <SafeAreaView edges={safeEdges as any} style={{ flex: 1, backgroundColor: safeBg }}>
        <View style={{ flex: 1 }}>{renderCurrentScreen()}</View>
        {showFooter && <AppFooter />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
