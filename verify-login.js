/**
 * Script de Verificación de Login - SADERH
 * 
 * Este script prueba la conexión y autenticación con el backend.
 * Ejecutar con: node verify-login.js
 */

const API_URL = 'https://campo-api-app-campo-saas.up.railway.app';

async function checkServerHealth() {
  console.log('\n🏥 1. Verificando salud del servidor...');
  try {
    const res = await fetch(`${API_URL}/health`);
    if (res.ok) {
      console.log('   ✅ Servidor respondiendo correctamente');
      return true;
    } else {
      console.log(`   ❌ Servidor respondió con código ${res.status}`);
      return false;
    }
  } catch (e) {
    console.log(`   ❌ Error de conexión: ${e.message}`);
    return false;
  }
}

async function testLogin(codigo) {
  console.log(`\n🔐 2. Probando login con código: ${codigo}`);
  try {
    const res = await fetch(`${API_URL}/auth/tecnico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      console.log('   ✅ Login exitoso!');
      console.log(`   📋 Token: ${data.token.substring(0, 50)}...`);
      console.log(`   👤 Usuario: ${data.usuario?.nombre || 'N/A'}`);
      return { success: true, data };
    } else {
      console.log(`   ❌ Error: ${data.error || 'Desconocido'}`);
      return { success: false, error: data.error };
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

async function testAssignments(token) {
  console.log('\n📋 3. Verificando asignaciones...');
  try {
    const res = await fetch(`${API_URL}/mis-actividades`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await res.json();
    
    if (res.ok) {
      console.log(`   ✅ Asignaciones carregadas: ${data.asignaciones?.length || 0}`);
      return { success: true, count: data.asignaciones?.length || 0 };
    } else {
      console.log(`   ⚠️  Sin asignaciones o error: ${data.error || 'Desconocido'}`);
      return { success: false, error: data.error };
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

async function runVerification(codigo = '12345') {
  console.log('═'.repeat(50));
  console.log('  VERIFICACIÓN DE LOGIN - SADERH');
  console.log('═'.repeat(50));
  
  // 1. Verificar servidor
  const serverOk = await checkServerHealth();
  if (!serverOk) {
    console.log('\n⛔ El servidor no está disponible. Verifica la conexión.');
    process.exit(1);
  }
  
  // 2. Probar login
  const loginResult = await testLogin(codigo);
  if (!loginResult.success) {
    console.log('\n⛔ El login falló. Verifica:');
    console.log('   - El código de acceso existe en la base de datos');
    console.log('   - El usuario tiene rol "tecnico"');
    console.log('   - El campo "activo" es true');
    process.exit(1);
  }
  
  // 3. Verificar asignaciones
  const assignmentsResult = await testAssignments(loginResult.data.token);
  
  // Resumen final
  console.log('\n' + '═'.repeat(50));
  console.log('  RESUMEN DE VERIFICACIÓN');
  console.log('═'.repeat(50));
  console.log(`✅ Servidor:        OK`);
  console.log(`✅ Login:           OK`);
  console.log(`✅ Asignaciones:    ${assignmentsResult.success ? 'OK (' + assignmentsResult.count + ')' : 'Sin datos'}`);
  console.log('═'.repeat(50));
  console.log('\n🎉 La aplicación está lista para uso!');
  
  process.exit(0);
}

// Ejecutar si se llama directamente
runVerification(process.argv[2] || '12345').catch(console.error);