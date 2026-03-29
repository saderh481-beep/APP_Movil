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
    const codigo = '72147';
    console.log(`Código: ${codigo}`);
    console.log(`URL: ${API_URL}/auth/tecnico\n`);

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

    // PASO 2: OBTENER ASIGNACIONES CON TOKEN
    console.log('⏳ PASO 2: Obtener asignaciones CON token...\n');
    console.log(`URL: ${API_URL}/mis-actividades`);
    console.log(`Header: Authorization: Bearer ${token.substring(0, 30)}...\n`);

    try {
      const actividades = await axios.get(
        `${API_URL}/mis-actividades`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      console.log(`✅ Status: ${actividades.status}`);
      console.log(`✅ Respuesta:`, JSON.stringify(actividades.data, null, 2), '\n');
    } catch (actividadesError) {
      console.log(`❌ Status: ${actividadesError.response?.status}`);
      console.log(`❌ Error: ${actividadesError.response?.data?.error || actividadesError.message}`);
      console.log(`❌ Respuesta:`, actividadesError.response?.data, '\n');
    }

    // PASO 3: OBTENER BENEFICIARIOS CON TOKEN
    console.log('⏳ PASO 3: Obtener beneficiarios CON token...\n');
    console.log(`URL: ${API_URL}/mis-beneficiarios\n`);

    try {
      const beneficiarios = await axios.get(
        `${API_URL}/mis-beneficiarios`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      console.log(`✅ Status: ${beneficiarios.status}`);
      console.log(`✅ Beneficiarios encontrados: ${beneficiarios.data.length || beneficiarios.data.beneficiarios?.length || 0}\n`);
    } catch (beneficiarioError) {
      console.log(`❌ Status: ${beneficiarioError.response?.status}`);
      console.log(`❌ Error: ${beneficiarioError.response?.data?.error || beneficiarioError.message}\n`);
    }

    console.log('='.repeat(80));
    console.log('✅ PRUEBA COMPLETADA');
    console.log('='.repeat(80) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error.message);
    if (error.response?.data) {
      console.error('Respuesta:', error.response.data);
    }
    process.exit(1);
  }
}

testCompleteFlow();
