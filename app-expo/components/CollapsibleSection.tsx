import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, Animated, LayoutAnimation, Platform, UIManager, View, Text } from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface CollapsibleSectionProps {
  title: string;
  content: string;
  isCompleted: boolean;
  isActive?: boolean;
  icon?: string;
}

// Helper function to parse markdown-style bold text
const parseFormattedText = (text: string) => {
  const parts: Array<{ text: string; bold: boolean }> = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the bold part
    if (match.index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.index),
        bold: false,
      });
    }
    // Add the bold part
    parts.push({
      text: match[1],
      bold: true,
    });
    lastIndex = regex.lastIndex;
  }

  // Add remaining text after the last match
  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      bold: false,
    });
  }

  return parts;
};

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  content,
  isCompleted,
  isActive = false,
  icon = 'AI'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rotateAnim] = useState(new Animated.Value(0));

  const toggleExpanded = () => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });

    setIsExpanded(!isExpanded);
    
    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const getStatusColor = () => {
    if (isCompleted) return '#10b981'; // green
    if (isActive) return '#f59e0b'; // amber
    return '#6b7280'; // gray
  };

  const getStatusIcon = () => {
    if (isCompleted) return '●';
    if (isActive) return '●';
    return '○';
  };

  return (
    <View style={[styles.container, { borderColor: getStatusColor() }]}>
      <TouchableOpacity onPress={toggleExpanded} activeOpacity={0.8}>
        <View space="sm" alignItems="center" style={styles.header}>
          <Text style={[styles.statusIcon, { color: getStatusColor() }]}>
            {getStatusIcon()}
          </Text>
          
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
          
          <View style={styles.titleContainer}>
            <Text style={[styles.title, isActive && styles.activeTitle]}>
              {title}
            </Text>
            {isActive && !isExpanded && (
              <Text style={styles.statusText}>
                Currently processing...
              </Text>
            )}
            {isCompleted && !isExpanded && (
              <Text style={styles.completedText}>
                Analysis complete
              </Text>
            )}
          </View>
          
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <Text style={styles.chevron}>⌄</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.contentContainer}>
          <View style={styles.divider} />
          <Text style={styles.content}>
            {parseFormattedText(content).map((part, index) => (
              <Text
                key={index}
                style={part.bold ? styles.boldText : undefined}
              >
                {part.text}
              </Text>
            ))}
          </Text>
          {isActive && (
            <Text style={styles.cursor}>_</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  header: {
    width: '100%',
    paddingVertical: 4,
  },
  statusIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 20,
    textAlign: 'center',
  },
  iconContainer: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  iconText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    lineHeight: 20,
  },
  activeTitle: {
    color: '#1e40af',
  },
  statusText: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 2,
    fontWeight: '500',
  },
  completedText: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  contentContainer: {
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  content: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#1e293b',
  },
  cursor: {
    fontSize: 16,
    color: '#1e40af',
    fontWeight: 'bold',
    marginTop: 4,
    paddingHorizontal: 4,
  },
});

export default CollapsibleSection;