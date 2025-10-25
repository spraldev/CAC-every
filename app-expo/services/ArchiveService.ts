import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Only import native modules if not on web
let FileSystem: any = null;
if (Platform.OS !== 'web') {
  try {
    FileSystem = require('expo-file-system');
  } catch (error) {
    console.warn('FileSystem not available:', error);
  }
}

export interface ArchiveItem {
  id: string;
  uri: string;
  timestamp: number;
  date: string;
  isWeb?: boolean;
}

class ArchiveService {
  private readonly ARCHIVE_KEY = 'archive_metadata';

  async saveToArchive(imageUri: string): Promise<void> {
    try {
      const timestamp = new Date().getTime();
      const item: ArchiveItem = {
        id: timestamp.toString(),
        uri: imageUri,
        timestamp,
        date: new Date().toISOString(),
        isWeb: Platform.OS === 'web',
      };

      if (Platform.OS !== 'web' && FileSystem) {
        // Native platforms: copy to app directory
        const archiveDir = FileSystem.documentDirectory + 'archive/';
        const dirInfo = await FileSystem.getInfoAsync(archiveDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(archiveDir, { intermediates: true });
        }
        
        const fileName = `incident_${timestamp}.jpg`;
        const newUri = archiveDir + fileName;
        await FileSystem.copyAsync({ from: imageUri, to: newUri });
        item.uri = newUri;
      }
      // For web, we keep the original URI (blob or data URL)

      // Update metadata
      const archive = await this.getArchiveItems();
      archive.unshift(item);
      await AsyncStorage.setItem(this.ARCHIVE_KEY, JSON.stringify(archive));
    } catch (error) {
      console.error('Error saving to archive:', error);
    }
  }

  async getArchiveItems(): Promise<ArchiveItem[]> {
    try {
      const archiveData = await AsyncStorage.getItem(this.ARCHIVE_KEY);
      if (!archiveData) return [];
      
      const items: ArchiveItem[] = JSON.parse(archiveData);
      
      if (Platform.OS !== 'web' && FileSystem) {
        // Verify files still exist on native platforms
        const validItems: ArchiveItem[] = [];
        for (const item of items) {
          if (item.isWeb) {
            // Web items don't have files to check
            validItems.push(item);
          } else {
            const fileInfo = await FileSystem.getInfoAsync(item.uri);
            if (fileInfo.exists) {
              validItems.push(item);
            }
          }
        }
        
        // Update metadata if some files were removed
        if (validItems.length !== items.length) {
          await AsyncStorage.setItem(this.ARCHIVE_KEY, JSON.stringify(validItems));
        }
        
        return validItems;
      }
      
      return items;
    } catch (error) {
      console.error('Error loading archive:', error);
      return [];
    }
  }

  async deleteItem(item: ArchiveItem): Promise<void> {
    try {
      // Delete file if it's a native platform file
      if (Platform.OS !== 'web' && FileSystem && !item.isWeb) {
        await FileSystem.deleteAsync(item.uri, { idempotent: true });
      }
      
      // Update metadata
      const items = await this.getArchiveItems();
      const newItems = items.filter(i => i.id !== item.id);
      await AsyncStorage.setItem(this.ARCHIVE_KEY, JSON.stringify(newItems));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  async clearArchive(): Promise<void> {
    try {
      const items = await this.getArchiveItems();
      
      // Delete all files on native platforms
      if (Platform.OS !== 'web' && FileSystem) {
        for (const item of items) {
          if (!item.isWeb) {
            await FileSystem.deleteAsync(item.uri, { idempotent: true });
          }
        }
      }
      
      // Clear metadata
      await AsyncStorage.removeItem(this.ARCHIVE_KEY);
    } catch (error) {
      console.error('Error clearing archive:', error);
      throw error;
    }
  }
}

export default new ArchiveService();
