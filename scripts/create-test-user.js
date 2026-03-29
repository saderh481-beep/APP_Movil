/**
 * Script para crear un usuario de técnico de prueba
 * Ejecutar con: node create-test-user.js
 */

// Este script asume que tienes acceso a la variable DATABASE_URL
// En un ambiente de producción, esto debería hacerse desde el panel de Supabase

const SQL_INSERT = `
INSERT INTO usuarios (nombre, email, codigo_acceso, rol, activo, created_at)
VALUES ('Técnico Demo', 'tecnico@demo.com', '12345', 'tecnico', true, NOW())
ON CONFLICT DO NOTHING;
`;

console.log('Para crear un usuario de prueba, necesitas:');
console.log('1. Acceder al panel de Supabase');
console.log('2. Ir a SQL Editor');
console.log('3. Ejecutar:');
console.log(SQL_INSERT);
console.log('');
console.log('O alternativamente, conecta directamente a la base de datos.');