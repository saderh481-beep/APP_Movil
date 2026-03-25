#!/usr/bin/env node

/**
 * Monitor de servidor - Verifica continuamente el estado de /auth/tecnico
 * Alerta cuando vuelve a funcionar
 */

const API_URL = 'https://campo-api-app-campo-saas.up.railway.app';
const CHECK_INTERVAL = 30000; // cada 30 segundos
const LOG_FILE = './server-monitor.log';
const fs = require('fs');

function log(msg) {
  const timestamp = new Date().toLocaleString('es-ES');
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function getEmoji(status) {
  if (status < 300) return '✅';
  if (status < 400) return '⚠️';
  if (status === 503) return '🔴';
  return '❌';
}

async function checkServer() {
  try {
    const res = await fetch(`${API_URL}/auth/tecnico`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ codigo: '00000' }),
      timeout: 5000,
    });

    const emoji = getEmoji(res.status);
    let msg = `${emoji} Status: ${res.status}`;
    
    if (res.status < 300) {
      msg += ' ✨ ¡SERVIDOR RECUPERADO! ✨';
    } else if (res.status === 503) {
      msg += ' (Aún no disponible)';
    }
    
    log(msg);
    return res.status;
  } catch (e) {
    log(`❌ Error: ${e.message}`);
    return null;
  }
}

async function startMonitoring() {
  console.log('\n' + '='.repeat(60));
  console.log('📡 MONITOR DE SERVIDOR ACTIVADO');
  console.log('='.repeat(60));
  console.log(`URL: ${API_URL}/auth/tecnico`);
  console.log(`Verificando cada: ${CHECK_INTERVAL / 1000} segundos`);
  console.log(`Logs guardados en: ${LOG_FILE}\n`);

  log('Monitor iniciado');

  let lastStatus = null;
  let recoveredAlerted = false;

  setInterval(async () => {
    const status = await checkServer();
    
    // Alerta si se recupera
    if (lastStatus === 503 && status && status < 300 && !recoveredAlerted) {
      console.log('\n' + '🎉'.repeat(30));
      console.log('¡¡ SERVIDOR RECUPERADO !!');
      console.log('🎉'.repeat(30) + '\n');
      log('⭐ SERVIDOR SE RECUPERÓ - Tiempo para que usuarios intenten login');
      recoveredAlerted = true;
    }
    
    lastStatus = status;
  }, CHECK_INTERVAL);

  // Primer check inmediato
  await checkServer();
}

// Iniciar
startMonitoring().catch(e => {
  log(`Error fatal: ${e.message}`);
  process.exit(1);
});

// Mantener el proceso activo
process.on('SIGINT', () => {
  log('Monitor detenido por usuario');
  console.log('');
  process.exit(0);
});
