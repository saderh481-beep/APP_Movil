/**
 * SADERH — Sistema de Logging Centralizado
 * Facilita debugging y diagnostico del sistema
 * 
 * Niveles: debug, info, warn, error, critical
 */

import Constants from 'expo-constants';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

const LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '🔍 DEBUG',
  [LogLevel.INFO]: 'ℹ️  INFO',
  [LogLevel.WARN]: '⚠️  WARN',
  [LogLevel.ERROR]: '❌ ERROR',
  [LogLevel.CRITICAL]: '🚨 CRITICAL',
};

// En desarrollo mostrar todo, en producción solo warn+
const MIN_LEVEL = __DEV__ ? LogLevel.DEBUG : LogLevel.WARN;

// Cola de logs para debugging (max 500 items)
let logHistory: Array<{
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}> = [];

const MAX_LOGS = 500;

function addToHistory(level: LogLevel, category: string, message: string, data?: unknown) {
  logHistory.push({
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    data,
  });
  if (logHistory.length > MAX_LOGS) {
    logHistory.shift();
  }
}

/**
 * Logger centralizado
 */
export const Logger = {
  debug: (category: string, message: string, data?: unknown) => {
    if (LogLevel.DEBUG >= MIN_LEVEL) {
      console.log(`${LEVEL_NAMES[LogLevel.DEBUG]} [${category}] ${message}`, data ? data : '');
    }
    addToHistory(LogLevel.DEBUG, category, message, data);
  },

  info: (category: string, message: string, data?: unknown) => {
    if (LogLevel.INFO >= MIN_LEVEL) {
      console.log(`${LEVEL_NAMES[LogLevel.INFO]} [${category}] ${message}`, data ? data : '');
    }
    addToHistory(LogLevel.INFO, category, message, data);
  },

  warn: (category: string, message: string, data?: unknown) => {
    if (LogLevel.WARN >= MIN_LEVEL) {
      console.warn(`${LEVEL_NAMES[LogLevel.WARN]} [${category}] ${message}`, data ? data : '');
    }
    addToHistory(LogLevel.WARN, category, message, data);
  },

  error: (category: string, message: string, error?: Error | unknown) => {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (LogLevel.ERROR >= MIN_LEVEL) {
      console.error(`${LEVEL_NAMES[LogLevel.ERROR]} [${category}] ${message}`, errorMsg);
    }
    addToHistory(LogLevel.ERROR, category, message, error);
  },

  critical: (category: string, message: string, error?: Error | unknown) => {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`${LEVEL_NAMES[LogLevel.CRITICAL]} [${category}] ${message}`, errorMsg);
    addToHistory(LogLevel.CRITICAL, category, message, error);
  },

  /**
   * Retorna el historial completo de logs
   */
  getHistory: () => {
    return [...logHistory];
  },

  /**
   * Filtra logs por nivel y/o categoría
   */
  filter: (options?: { level?: LogLevel; category?: string; since?: Date }) => {
    return logHistory.filter((log) => {
      if (options?.level !== undefined && log.level !== options.level) return false;
      if (options?.category && !log.category.includes(options.category)) return false;
      if (options?.since && new Date(log.timestamp) < options.since) return false;
      return true;
    });
  },

  /**
   * Limpia el historial
   */
  clear: () => {
    logHistory = [];
  },

  /**
   * Exporta logs como JSON para compartir en reportes
   */
  export: (): string => {
    return JSON.stringify(
      {
        exported: new Date().toISOString(),
        appVersion: Constants.expoConfig?.version,
        isDev: __DEV__,
        logs: logHistory,
      },
      null,
      2
    );
  },
};

// Categorías estándar de logging
export const LogCategories = {
  AUTH: 'AUTH',
  API: 'API',
  NETWORK: 'NETWORK',
  STORAGE: 'STORAGE',
  SYNC: 'SYNC',
  UI: 'UI',
  PERFORMANCE: 'PERF',
  OFFLINE: 'OFFLINE',
  SYSTEM: 'SYSTEM',
} as const;
