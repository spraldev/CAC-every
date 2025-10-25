import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ArchiveService, { ArchiveItem } from '../services/ArchiveService';

const { width } = Dimensions.get('window');
const imageSize = (width - 60) / 3; // 3 columns with spacing

interface ArchiveScreenProps {
  onBack: () => void;
}

const ArchiveScreen: React.FC<ArchiveScreenProps> = ({ onBack }) => {
  const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ArchiveItem | null>(null);

  useEffect(() => {
    loadArchive();
  }, []);

  const loadArchive = async () => {
    try {
      const items = await ArchiveService.getArchiveItems();
      setArchiveItems(items);
    } catch (error) {
      console.error('Error loading archive:', error);
      Alert.alert('Error', 'Failed to load archive');
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (item: ArchiveItem) => {
    Alert.alert(
      'Delete Image',
      'Are you sure you want to delete this image from the archive?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ArchiveService.deleteItem(item);
              
              // Update local state
              const newItems = archiveItems.filter(i => i.id !== item.id);
              setArchiveItems(newItems);
              setSelectedItem(null);
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete image');
            }
          },
        },
      ]
    );
  };

  const clearArchive = () => {
    Alert.alert(
      'Clear Archive',
      'Are you sure you want to delete all archived images? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await ArchiveService.clearArchive();
              setArchiveItems([]);
            } catch (error) {
              console.error('Error clearing archive:', error);
              Alert.alert('Error', 'Failed to clear archive');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const renderItem = ({ item }: { item: ArchiveItem }) => (
    <TouchableOpacity
      style={styles.imageItem}
      onPress={() => setSelectedItem(item)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.uri }} style={styles.thumbnail} />
      <View style={styles.imageOverlay}>
        <Text style={styles.imageDate}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color="#1e40af" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Archive</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      </View>
    );
  }

  // Full screen image viewer
  if (selectedItem) {
    return (
      <View style={styles.viewerContainer}>
        <View style={styles.viewerHeader}>
          <TouchableOpacity
            style={styles.viewerBackButton}
            onPress={() => setSelectedItem(null)}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteItem(selectedItem)}
          >
            <Ionicons name="trash-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <Image source={{ uri: selectedItem.uri }} style={styles.fullImage} />
        <View style={styles.viewerInfo}>
          <Text style={styles.viewerDate}>{formatDate(selectedItem.date)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f0f9ff', '#ffffff']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color="#1e40af" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Archive</Text>
        {archiveItems.length > 0 ? (
          <TouchableOpacity onPress={clearArchive}>
            <Text style={styles.clearButton}>Clear</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Content */}
      {archiveItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={80} color="#cbd5e1" />
          <Text style={styles.emptyText}>No archived images</Text>
          <Text style={styles.emptySubtext}>
            Images you capture will be saved here
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.countContainer}>
            <Text style={styles.countText}>
              {archiveItems.length} {archiveItems.length === 1 ? 'image' : 'images'}
            </Text>
          </View>
          <FlatList
            data={archiveItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  clearButton: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '600',
  },
  placeholder: {
    width: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  countContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  countText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  imageItem: {
    width: imageSize,
    height: imageSize,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 4,
  },
  imageDate: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  viewerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  viewerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(220, 38, 38, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  viewerInfo: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  viewerDate: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});

export default ArchiveScreen;
