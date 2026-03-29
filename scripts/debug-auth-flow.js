#!/usr/bin/env node

const axios = require('axios');

const API_URL = 'https://campo-api-app-campo-saas.up.railway.app';

async function testCompleteFlow() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 PRUEBA COMPLETA: LOGIN → ASIGNACIONES');
    console.log('='.repeat(80) + '\n');

    // PASO 1: LOGIN
    console.log('⏳ PASO 1: Intentando login...\n');
    const codigo = '48165';
    console.log(`Código: ${codigo}`);
    console.log(`URL: ${API_URL}/auth/tecnico`);
    console.log(`Payload: { codigo: "${codigo}" }\n`);

    const loginResponse = await axios.post(`${API_URL}/auth/tecnico`, { codigo });
    console.log(`✅ Status: ${loginResponse.status}\n`);
    
    const token = loginResponse.data.token;
    const tecnico = loginResponse.data.tecnico;

    if (!token) {
      console.error('❌ No se recibió token');
      process.exit(1);
    }

    console.log(`✅ Token recibido: ${token.substring(0, 50)}...`);
    console.log(`✅ Técnico: ${tecnico.nombre} (${tecnico.id})\n`);

    // PASO 2: INTENTAR OBTENER ASIGNACIONES SIN TOKEN
    console.log('⏳ PASO 2: Obtener asignaciones SIN token...\n');
    console.log(`URL: ${API_URL}/mis-actividades`);
    console.log(`Headers: (sin Authorization)\n`);

    try {
      const noTokenResponse = await axios.get(`${API_URL}/mis-actividades`);
      console.log(`✅ Status: ${noTokenResponse.status}`);
      console.log(`Respuesta:`, noTokenResponse.data, '\n');
    } catch (noTokenError) {
      console.log(`❌ Status: ${noTokenError.response?.status}`);
      console.log(`Error: ${noTokenError.response?.data?.error || noTokenError.message}\n`);
    }

    // PASO 3: INTENTAR OBTENER ASIGNACIONES CON TOKEN
    console.log('⏳ PASO 3: Obtener asignaciones CON token...\n');
    console.log(`URL: ${API_URL}/mis-actividades`);
    console.log(`Headers: Authorization: Bearer ${token.substring(0, 30)}...\n`);

    try {
      const withTokenResponse = await axios.get(
        `${API_URL}/mis-actividades`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log(`✅ Status: ${withTokenResponse.status}`);
      console.log(`Respuesta:`, withTokenResponse.data, '\n');
    } catch (withTokenError) {
      console.log(`❌ Status: ${withTokenError.response?.status}`);
      console.log(`Error: ${withTokenError.response?.data?.error || withTokenError.message}`);
      console.log(`Respuesta completa:`, withTokenError.response?.data, '\n');
    }

    // PASO 4: VERIFICAR TOKEN
    console.log('⏳ PASO 4: Validar estructura del token...\n');
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error(`❌ Token inválido: esperaba 3 partes, obtuvo ${parts.length}`);
      process.exit(1);
    }

    console.log(`✅ Token tiene 3 partes (JWT válido)`);
    
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log(`✅ Payload decodificado:`);
      console.log(`   - id: ${payload.id}`);
      console.log(`   - sub: ${payload.sub}`);
      console.log(`   - iat: ${new Date(payload.iat * 1000)}`);
      if (payload.exp) {
        const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
        console.log(`   - exp: ${new Date(payload.exp * 1000)} (${expiresIn}s restantes)`);
      }
    } catch (e) {
      console.error('❌ No se pudo decodificar payload:', e.message);
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN');
    console.log('='.repeat(80));
    console.log(`✅ Login: EXITOSO`);
    console.log(`✅ Token: RECIBIDO Y VÁLIDO`);
    console.log(`❓ Asignaciones sin token: VISTO ARRIBA`);
    console.log(`❓ Asignaciones con token: VISTO ARRIBA`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error.message);
    if (error.response?.data) {
      console.error('Respuesta del servidor:', error.response.data);
    }
    process.exit(1);
  }
}

testCompleteFlow();
