/**
 * SADERH — Validadores Centralizados
 * Reúne todas las validaciones del proyecto en un solo lugar
 * Mejor mantenibilidad y reutilización
 */

export namespace Validators {
  /**
   * Validar código de acceso (5 dígitos exactos)
   */
  export function validateAccessCode(code: string): { valid: boolean; error?: string } {
    if (!code) return { valid: false, error: 'El código es requerido' };
    if (typeof code !== 'string') return { valid: false, error: 'El código debe ser texto' };
    if (code.length !== 5) return { valid: false, error: 'El código debe tener exactamente 5 dígitos' };
    if (!/^\d+$/.test(code)) return { valid: false, error: 'Solo se permiten números (0-9)' };
    return { valid: true };
  }

  /**
   * Validar URL de servidor
   */
  export function validateServerUrl(url: string): { valid: boolean; error?: string } {
    if (!url) return { valid: false, error: 'La URL es requerida' };
    if (typeof url !== 'string') return { valid: false, error: 'La URL debe ser texto' };
    
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return { valid: false, error: 'La URL debe comenzar con http:// o https://' };
    }
    
    try {
      new URL(trimmed);
      return { valid: true };
    } catch {
      return { valid: false, error: 'La URL no es válida' };
    }
  }

  /**
   * Validar CURP (formato mexicano)
   */
  export function validateCURP(curp: string): { valid: boolean; error?: string } {
    if (!curp) return { valid: false, error: 'CURP es requerido' };
    // Formato: 6 letras + 8 números (YYMMDD) + 8 caracteres
    if (!/^[A-ZÑ]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/.test(curp.toUpperCase())) {
      return { valid: false, error: 'Formato de CURP inválido' };
    }
    return { valid: true };
  }

  /**
   * Validar teléfono (formato flexible)
   */
  export function validatePhone(phone: string): { valid: boolean; error?: string } {
    if (!phone) return { valid: true }; // Opcional
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 7) return { valid: false, error: 'Teléfono muy corto' };
    if (cleaned.length > 15) return { valid: false, error: 'Teléfono muy largo' };
    return { valid: true };
  }

  /**
   * Validar nombre (no vacío, sin caracteres especiales peligrosos)
   */
  export function validateName(name: string): { valid: boolean; error?: string } {
    if (!name || !name.trim()) return { valid: false, error: 'Nombre es requerido' };
    if (name.length < 3) return { valid: false, error: 'Nombre muy corto' };
    if (name.length > 100) return { valid: false, error: 'Nombre muy largo' };
    if (/<|>|;|'|"|{|}|\[|\]|%|&|\^|\$|#|@/g.test(name)) {
      return { valid: false, error: 'Nombre contiene caracteres no permitidos' };
    }
    return { valid: true };
  }

  /**
   * Validar correo electrónico
   */
  export function validateEmail(email: string): { valid: boolean; error?: string } {
    if (!email) return { valid: true }; // Opcional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'formato de correo inválido' };
    }
    return { valid: true };
  }

  /**
   * Validar coordenadas GPS
   */
  export function validateGPSCoordinates(
    lat: unknown,
    lng: unknown
  ): { valid: boolean; error?: string } {
    const latitude = typeof lat === 'number' ? lat : parseFloat(String(lat));
    const longitude = typeof lng === 'number' ? lng : parseFloat(String(lng));

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { valid: false, error: 'Coordenadas inválidas' };
    }
    if (latitude < -90 || latitude > 90) {
      return { valid: false, error: 'Latitud fuera de rango (-90 a 90)' };
    }
    if (longitude < -180 || longitude > 180) {
      return { valid: false, error: 'Longitud fuera de rango (-180 a 180)' };
    }
    return { valid: true };
  }

  /**
   * Validar JSON
   */
  export function validateJSON(json: string): { valid: boolean; error?: string; data?: unknown } {
    if (!json || typeof json !== 'string') {
      return { valid: false, error: 'JSON debe ser texto' };
    }
    try {
      const data = JSON.parse(json);
      return { valid: true, data };
    } catch (e) {
      return { valid: false, error: `JSON inválido: ${e instanceof Error ? e.message : 'Desconocido'}` };
    }
  }

  /**
   * Validar JWT token
   */
  export function validateJWT(token: string): { valid: boolean; error?: string; payload?: Record<string, any> } {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token inválido' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Formato de JWT inválido' };
    }

    if (parts.some(p => !p || p.length < 4)) {
      return { valid: false, error: 'Partes de JWT inválidas' };
    }

    try {
      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
      if (!header.alg) {
        return { valid: false, error: 'JWT sin algoritmo' };
      }

      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      if (payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now + 30) {
          return { valid: false, error: 'JWT expirado o próximo a expirar' };
        }
      }

      return { valid: true, payload };
    } catch (e) {
      return { valid: false, error: `Error decodificando JWT: ${e instanceof Error ? e.message : 'Desconocido'}` };
    }
  }
}

/**
 * Utilidades de normalización
 */
export namespace Normalizers {
  export function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  export function normalizeCURP(curp: string): string {
    return curp.trim().toUpperCase();
  }

  export function normalizeURL(url: string): string {
    let normalized = url.trim().replace(/\/+$/, '');
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    return normalized;
  }

  export function normalizeWhitespace(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
  }
}
