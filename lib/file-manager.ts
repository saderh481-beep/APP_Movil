import * as FileSystem from 'expo-file-system/legacy';

const BASE_DIR = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';

const ensureTrailingSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`);
const safeBaseDir = ensureTrailingSlash(BASE_DIR);

const resolveDirectory = (name: string) => `${safeBaseDir}${name}/`;
const resolveFile = (directory: string, filename: string) => `${resolveDirectory(directory)}${filename}`;

const ensureDirectory = async (directory: string): Promise<void> => {
  if (!safeBaseDir) return;
  const info = await FileSystem.getInfoAsync(directory);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  }
};

export const saveFile = async (
  subdirectory: string,
  filename: string,
  content: string
): Promise<{ success: boolean; uri?: string }> => {
  try {
    const directory = resolveDirectory(subdirectory);
    await ensureDirectory(directory);
    const fileUri = resolveFile(subdirectory, filename);
    await FileSystem.writeAsStringAsync(fileUri, content);
    return { success: true, uri: fileUri };
  } catch (error) {
    console.error('[FileManager] Error guardando archivo:', error);
    return { success: false };
  }
};

export const FileManager = {
  initializeAppDirectories: async () => {
    await Promise.all([
      ensureDirectory(resolveDirectory('EXPORTS')),
      ensureDirectory(resolveDirectory('REPORTS')),
      ensureDirectory(resolveDirectory('MEDIA')),
    ]);
    console.log('[FileManager] App directories initialized');
  },

  saveFile,

  listFilesInDirectory: async (subdirectory: string): Promise<string[]> => {
    try {
      const directory = resolveDirectory(subdirectory);
      await ensureDirectory(directory);
      return await FileSystem.readDirectoryAsync(directory);
    } catch (error) {
      console.error('[FileManager] Error listando archivos:', error);
      return [];
    }
  },

  readFile: async (subdirectory: string, filename: string): Promise<{ success: boolean; content?: string }> => {
    try {
      const fileUri = resolveFile(subdirectory, filename);
      const content = await FileSystem.readAsStringAsync(fileUri);
      return { success: true, content };
    } catch (error) {
      console.error('[FileManager] Error leyendo archivo:', error);
      return { success: false };
    }
  },

  deleteFile: async (subdirectory: string, filename: string): Promise<boolean> => {
    try {
      const fileUri = resolveFile(subdirectory, filename);
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists) return true;
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      return true;
    } catch (error) {
      console.error('[FileManager] Error eliminando archivo:', error);
      return false;
    }
  },
} as const;

export const getSubdirectory = (name: string): string => resolveDirectory(name);
