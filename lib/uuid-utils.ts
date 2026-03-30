/**
 * Utilidades para manejo de UUIDs
 */

/**
 * Limpia y normaliza un UUID a formato estándar con guiones.
 * Acepta UUIDs con o sin guiones.
 * @param val - Valor a limpiar (puede ser string, undefined o null)
 * @returns UUID normalizado con guiones o undefined si no es válido
 */
export const cleanUuid = (val: string | undefined | null): string | undefined => {
  if (!val) return undefined;
  // Acepta UUIDs con o sin guiones
  const m = val.match(/[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (!m) return undefined;
  // Normaliza a formato con guiones
  const hex = m[0].replace(/-/g, '');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};
