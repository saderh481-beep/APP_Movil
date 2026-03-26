/**
 * SADERH — Gestor de Archivos y Carpetas
 * Maneja la creación y gestión de carpetas exclusivas para la app
 * usando el sistema de archivos del dispositivo
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const APP_DIRECTORY_NAME = 'SADERHApp';
const SUBDIRECTORIES = {
  EXPORTS: 'exports',
  BITACORAS: 'bitacoras',
  BACKUPS: 'backups',
  TEMP: 'temp',
  LOGS: 'logs',
} as const;

export type SubdirectoryKey = keyof typeof SUBDIRECTORIES;

/**
 * Obtiene el directorio base de la app
 */
export const getAppDirectory = async (): Promise<string> => {
  const baseDir = FileSystem.documentDirectory ?? '';
  return baseDir;
};

/**
 * Obtiene el directorio de un subdirecorio específico
 */
export const getSubdirectory = async (key: SubdirectoryKey): Promise<string> => {
  const baseDir = await getAppDirectory();
  return `${baseDir}${APP_DIRECTORY_NAME}/${SUBDIRECTORIES[key]}/`;
};

/**
 * Asegura que existe un directorio, créalo si no existe
 */
const ensureDirectory = async (path: string): Promise<boolean> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(path);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(path, { intermediates: true });
      console.log(`[FILE MANAGER] Directorio creado: ${path}`);
    }
    return true;
  } catch (error) {
    console.error(`[FILE MANAGER] Error creando directorio ${path}:`, error);
    return false;
  }
};

/**
 * Inicializa todas las carpetas de la app
 */
export const initializeAppDirectories = async (): Promise<{
  success: boolean;
  directories: Record<SubdirectoryKey, string>;
}> => {
  const baseDir = await getAppDirectory();
  const appDir = `${baseDir}${APP_DIRECTORY_NAME}/`;
  
  // Crear directorio principal de la app
  await ensureDirectory(appDir);
  
  const directories: Record<SubdirectoryKey, string> = {} as Record<SubdirectoryKey, string>;
  
  // Crear todos los subdirectorios
  for (const [key, subdir] of Object.entries(SUBDIRECTORIES)) {
    const path = `${appDir}${subdir}/`;
    await ensureDirectory(path);
    directories[key as SubdirectoryKey] = path;
  }
  
  console.log('[FILE MANAGER] Todos los directorios inicializados');
  return { success: true, directories };
};

/**
 * Obtiene la lista de archivos en un directorio
 */
export const listFilesInDirectory = async (subdir: SubdirectoryKey): Promise<string[]> => {
  try {
    const dirPath = await getSubdirectory(subdir);
    const dirInfo = await FileSystem.getInfoAsync(dirPath);
    
    if (!dirInfo.exists) {
      return [];
    }
    
    const files = await FileSystem.readDirectoryAsync(dirPath);
    return files;
  } catch (error) {
    console.error(`[FILE MANAGER] Error listando archivos en ${subdir}:`, error);
    return [];
  }
};

/**
 * Guarda contenido en un archivo
 */
export const saveFile = async (
  subdir: SubdirectoryKey,
  filename: string,
  content: string,
  encoding: 'utf8' | 'base64' = 'utf8'
): Promise<{ success: boolean; path: string }> => {
  try {
    const dirPath = await getSubdirectory(subdir);
    await ensureDirectory(dirPath);
    
    const filePath = `${dirPath}${filename}`;
    await FileSystem.writeAsStringAsync(filePath, content, { encoding });
    
    console.log(`[FILE MANAGER] Archivo guardado: ${filePath}`);
    return { success: true, path: filePath };
  } catch (error) {
    console.error(`[FILE MANAGER] Error guardando archivo:`, error);
    return { success: false, path: '' };
  }
};

/**
 * Lee el contenido de un archivo
 */
export const readFile = async (
  subdir: SubdirectoryKey,
  filename: string,
  encoding: 'utf8' | 'base64' = 'utf8'
): Promise<{ success: boolean; content: string }> => {
  try {
    const dirPath = await getSubdirectory(subdir);
    const filePath = `${dirPath}${filename}`;
    
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      return { success: false, content: '' };
    }
    
    const content = await FileSystem.readAsStringAsync(filePath, { encoding });
    return { success: true, content };
  } catch (error) {
    console.error(`[FILE MANAGER] Error leyendo archivo:`, error);
    return { success: false, content: '' };
  }
};

/**
 * Elimina un archivo
 */
export const deleteFile = async (
  subdir: SubdirectoryKey,
  filename: string
): Promise<boolean> => {
  try {
    const dirPath = await getSubdirectory(subdir);
    const filePath = `${dirPath}${filename}`;
    
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(filePath);
      console.log(`[FILE MANAGER] Archivo eliminado: ${filePath}`);
    }
    
    return true;
  } catch (error) {
    console.error(`[FILE MANAGER] Error eliminando archivo:`, error);
    return false;
  }
};

/**
 * Obtiene el tamaño total de archivos en un directorio
 */
export const getDirectorySize = async (subdir: SubdirectoryKey): Promise<number> => {
  try {
    const dirPath = await getSubdirectory(subdir);
    const files = await listFilesInDirectory(subdir);
    
    let totalSize = 0;
    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${dirPath}${file}`);
      if (fileInfo.exists && 'size' in fileInfo) {
        totalSize += fileInfo.size ?? 0;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error(`[FILE MANAGER] Error calculando tamaño:`, error);
    return 0;
  }
};

/**
 * Limpia archivos temporales
 */
export const clearTempDirectory = async (): Promise<{ deleted: number; freedBytes: number }> => {
  try {
    const dirPath = await getSubdirectory('TEMP');
    const files = await listFilesInDirectory('TEMP');
    
    let deleted = 0;
    let freedBytes = 0;
    
    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${dirPath}${file}`);
      if (fileInfo.exists && 'size' in fileInfo) {
        freedBytes += fileInfo.size ?? 0;
      }
      await FileSystem.deleteAsync(`${dirPath}${file}`);
      deleted++;
    }
    
    console.log(`[FILE MANAGER] Limpiados ${deleted} archivos temporales`);
    return { deleted, freedBytes };
  } catch (error) {
    console.error(`[FILE MANAGER] Error limpiando directorio temporal:`, error);
    return { deleted: 0, freedBytes: 0 };
  }
};

/**
 * Obtiene información del espacio de almacenamiento
 */
export const getStorageInfo = async (): Promise<{
  totalUsed: number;
  exports: number;
  bitacoras: number;
  backups: number;
  logs: number;
  temp: number;
}> => {
  const dirs: SubdirectoryKey[] = ['EXPORTS', 'BITACORAS', 'BACKUPS', 'LOGS', 'TEMP'];
  const sizes: Record<SubdirectoryKey, number> = {} as Record<SubdirectoryKey, number>;
  
  for (const dir of dirs) {
    sizes[dir] = await getDirectorySize(dir);
  }
  
  const totalUsed = Object.values(sizes).reduce((a, b) => a + b, 0);
  
  return {
    totalUsed,
    exports: sizes.EXPORTS,
    bitacoras: sizes.BITACORAS,
    backups: sizes.BACKUPS,
    logs: sizes.LOGS,
    temp: sizes.TEMP,
  };
};

export const FileManager = {
  getAppDirectory,
  getSubdirectory,
  initializeAppDirectories,
  listFilesInDirectory,
  saveFile,
  readFile,
  deleteFile,
  getDirectorySize,
  clearTempDirectory,
  getStorageInfo,
  SUBDIRECTORIES,
};
