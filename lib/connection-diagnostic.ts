/**
 * SADERH — Diagnóstico de Conexiones
 * Valida la conexión entre la app y el servidor
 * 
 * Uso:
 * import { connectionDiagnostic } from '@/lib/connection-diagnostic';
 * const results = await connectionDiagnostic.runFullDiagnostic();
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from './api';

export interface DiagnosticResult {
  timestamp: string;
  serverUrl: string;
  online: boolean;
  tests: {
    name: string;
    status: 'PASS' | 'FAIL' | 'WARN';
    message: string;
    duration: number;
  }[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  recommendation: string;
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export const connectionDiagnostic = {
  /**
   * Prueba básica de conectividad ping/pong
   */
  async testConnectivity(url: string): Promise<{ ok: boolean; ms: number; error?: string }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const res = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      }).catch(() =>
        fetch(url, { signal: controller.signal })
      );

      clearTimeout(timeout);
      const ms = Date.now() - start;

      return { ok: res?.ok ?? false, ms };
    } catch (e) {
      const ms = Date.now() - start;
      return {
        ok: false,
        ms,
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }
  },

  /**
   * Verifica que el servidor responde con JSON válido
   */
  async testJsonResponse(url: string): Promise<{ ok: boolean; contentType?: string; error?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${url}/mis-actividades`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      clearTimeout(timeout);

      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return { ok: false, contentType: contentType ?? undefined, error: `Unexpected content-type: ${contentType}` };
      }

      const text = await res.text();
      try {
        JSON.parse(text);
        return { ok: true, contentType: contentType ?? undefined };
      } catch {
        return { ok: false, contentType: contentType ?? undefined, error: 'Invalid JSON response' };
      }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }
  },

  /**
   * Verifica que HTTPS es requerido (seguridad)
   */
  async testHttpsEnforcement(): Promise<{ ok: boolean; message: string }> {
    const url = API_CONFIG.APP_API_URL;

    if (!url.startsWith('https://')) {
      return {
        ok: false,
        message: `❌ HTTPS no enforced: ${url}`,
      };
    }

    return {
      ok: true,
      message: `✅ HTTPS enforced`,
    };
  },

  /**
   * Verifica almacenamiento local disponible
   */
  async testLocalStorage(): Promise<{ ok: boolean; message: string; sizeMB?: number }> {
    try {
      const testKey = '@test:connection_diagnostic';
      const testData = JSON.stringify({ test: true, timestamp: Date.now() });

      // Escribir
      await AsyncStorage.setItem(testKey, testData);

      // Leer
      const read = await AsyncStorage.getItem(testKey);
      if (read !== testData) {
        return { ok: false, message: '❌ LocalStorage data mismatch' };
      }

      // Limpiar
      await AsyncStorage.removeItem(testKey);

      // Estimar tamaño
      const estimatedSize = (await AsyncStorage.getAllKeys()).length * 0.1; // Aproximado

      return {
        ok: true,
        message: `✅ LocalStorage working`,
        sizeMB: estimatedSize,
      };
    } catch (e) {
      return {
        ok: false,
        message: `❌ LocalStorage error: ${e instanceof Error ? e.message : 'Unknown'}`,
      };
    }
  },

  /**
   * Verifica timeouts y latencia
   */
  async testLatency(url: string): Promise<{ ok: boolean; latency: number; status: string }> {
    const { ok, ms, error } = await this.testConnectivity(url);

    let status = '';
    if (!ok) {
      status = `❌ No response: ${error}`;
      return { ok: false, latency: ms, status };
    }

    if (ms > 5000) {
      status = `⚠️ High latency (${ms}ms)`;
      return { ok: false, latency: ms, status };
    }

    if (ms > 2000) {
      status = `⚠️ Medium latency (${ms}ms)`;
      return { ok: true, latency: ms, status };
    }

    status = `✅ Good latency (${ms}ms)`;
    return { ok: true, latency: ms, status };
  },

  /**
   * Diagnóstico completo: ejecutar todas las pruebas
   */
  async runFullDiagnostic(): Promise<DiagnosticResult> {
    const timestamp = new Date().toISOString();
    const serverUrl = API_CONFIG.APP_API_URL;
    const tests: DiagnosticResult['tests'] = [];

    // Test 1: Conectividad
    const start1 = Date.now();
    const conn = await this.testConnectivity(serverUrl);
    tests.push({
      name: 'Conectividad al servidor',
      status: conn.ok ? 'PASS' : 'FAIL',
      message: conn.ok ? `✅ OK (${conn.ms}ms)` : `❌ Fallo: ${conn.error}`,
      duration: Date.now() - start1,
    });

    // Test 2: Respuesta JSON
    const start2 = Date.now();
    const json = await this.testJsonResponse(serverUrl);
    tests.push({
      name: 'Respuesta JSON válida',
      status: json.ok ? 'PASS' : 'FAIL',
      message: json.ok ? `✅ OK (${json.contentType})` : `❌ Fallo: ${json.error}`,
      duration: Date.now() - start2,
    });

    // Test 3: HTTPS
    const start3 = Date.now();
    const https = await this.testHttpsEnforcement();
    tests.push({
      name: 'HTTPS enforced',
      status: https.ok ? 'PASS' : 'WARN',
      message: https.message,
      duration: Date.now() - start3,
    });

    // Test 4: LocalStorage
    const start4 = Date.now();
    const storage = await this.testLocalStorage();
    tests.push({
      name: 'Almacenamiento local',
      status: storage.ok ? 'PASS' : 'FAIL',
      message: storage.message,
      duration: Date.now() - start4,
    });

    // Test 5: Latencia
    const start5 = Date.now();
    const latency = await this.testLatency(serverUrl);
    tests.push({
      name: 'Latencia y timeouts',
      status: latency.ok ? 'PASS' : 'WARN',
      message: latency.status,
      duration: Date.now() - start5,
    });

    // Calcular resumen
    const summary = {
      total: tests.length,
      passed: tests.filter(t => t.status === 'PASS').length,
      failed: tests.filter(t => t.status === 'FAIL').length,
      warnings: tests.filter(t => t.status === 'WARN').length,
    };

    // Recomendación
    let recommendation = '';
    if (summary.failed === 0 && summary.warnings === 0) {
      recommendation = '✅ La aplicación está lista para producción.';
    } else if (summary.failed === 0) {
      recommendation = '⚠️ Hay advertencias pero la app puede funcionar. Considera revisar.';
    } else {
      recommendation = '❌ Hay errores críticos. Verifica la conexión y la configuración del servidor.';
    }

    return {
      timestamp,
      serverUrl,
      online: conn.ok,
      tests,
      summary,
      recommendation,
    };
  },

  /**
   * Exporta diagnóstico como JSON para debugging
   */
  async exportDiagnostic(): Promise<string> {
    const result = await this.runFullDiagnostic();
    return JSON.stringify(result, null, 2);
  },
};
