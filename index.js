// index.js - Servidor Proxy FINAL com Lógica CAPI e Variáveis de Ambiente

const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const app = express();

const PORT = process.env.PORT || 3000;

// --- CONFIGURAÇÕES LIDAS DAS VARIÁVEIS DE AMBIENTE DO RENDER ---
const FACEBOOK_PIXEL_ID = process.env.PIXEL_ID;
const FACEBOOK_ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const FACEBOOK_API_VERSION = 'v19.0'; // Ou a versão mais atual recomendada pelo FB

// Função para hashear dados em SHA256
function hashData(data) {
  if (!data) return undefined;
  return crypto.createHash('sha256').update(String(data).trim().toLowerCase()).digest('hex');
}

// --- Middlewares ---
app.use(express.json()); // Para entender JSON

// Middleware CORS (Pode remover os logs extras se quiser agora)
app.use((req, res, next) => {
  // console.log(`-- CORS Check --`); // Log opcional
  // console.log(`> Método Recebido: ${req.method}`);
  // console.log(`> Origem Recebida (req.headers.origin): ${req.headers.origin}`);
  const allowedOrigin = 'https://rosane-nails-gravatai.onrender.com';
  // console.log(`> Origem Permitida Configurada: ${allowedOrigin}`);
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    // console.log('> Respondendo à requisição OPTIONS com status 204.');
    return res.sendStatus(204);
  }
  // console.log('> Chamando next() para continuar para a rota.');
  next();
});

// --- Rota Principal da API (/api/conversion) ---
app.post('/api/conversion', async (req, res) => { // Rota é async
  const requestTimestamp = new Date();
  console.log('-----------------------------------------');
  console.log(`[${requestTimestamp.toLocaleString('pt-BR')}] Requisição CHEGOU na rota POST /api/conversion`);
  const clientData = req.body;
  console.log('Dados recebidos do front-end:', JSON.stringify(clientData));

  if (!FACEBOOK_PIXEL_ID || !FACEBOOK_ACCESS_TOKEN) {
      console.error('ERRO CRÍTICO: PIXEL_ID ou ACCESS_TOKEN não encontrados nas variáveis de ambiente!');
      return res.status(500).json({ message: 'Erro interno de configuração no servidor.' });
  }
  if (!clientData || !clientData.event_name || !clientData.user_data || !clientData.event_source_url) {
    console.error("Dados inválidos ou incompletos recebidos do front-end.");
    return res.status(400).json({ message: 'Dados inválidos enviados pelo cliente.' });
  }

  try {
    const clientIpAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    const clientUserAgent = req.headers['user-agent'];
    console.log(`IP Cliente: ${clientIpAddress}, User Agent: ${clientUserAgent ? clientUserAgent.substring(0, 100) + '...' : 'N/A'}`);

    const eventTime = Math.floor(requestTimestamp.getTime() / 1000);

    const userData = {
      em: hashData(clientData.user_data.em),
      ph: hashData(clientData.user_data.ph),
      fn: hashData(clientData.user_data.fn),
      ln: hashData(clientData.user_data.ln),
      external_id: clientData.external_id,
      fbp: clientData.fbp !== "NA" ? clientData.fbp : undefined,
      client_ip_address: clientIpAddress,
      client_user_agent: clientUserAgent,
    };
    Object.keys(userData).forEach(key => { if (userData[key] === undefined) { delete userData[key]; } });

    const facebookPayload = {
      data: [{
        event_name: clientData.event_name,
        event_time: eventTime,
        action_source: 'website',
        event_source_url: clientData.event_source_url,
        user_data: userData,
      }],
       // test_event_code: 'SEU_CODIGO_TESTE_AQUI' // Adicione se for usar Testar Eventos
    };
    console.log('Payload final para enviar ao Facebook:', JSON.stringify(facebookPayload, null, 2));

    const fbApiUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PIXEL_ID}/events?access_token=${FACEBOOK_ACCESS_TOKEN}`;
    console.log(`Enviando para FB: ${fbApiUrl.replace(FACEBOOK_ACCESS_TOKEN, '*****')}`);

    const response = await fetch(fbApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(facebookPayload),
    });
    const responseData = await response.json();

    if (!response.ok) {
      console.error(`Erro da API do Facebook (${response.status}):`, JSON.stringify(responseData));
      return res.status(502).json({ message: 'Erro ao enviar evento para o Facebook.', error: responseData });
    }

    console.log('Sucesso! Resposta do Facebook:', JSON.stringify(responseData));
    res.status(200).json({ message: 'Evento recebido e enviado com sucesso ao Facebook!', fb_response: responseData });

  } catch (error) {
    console.error('Erro inesperado durante o processamento ou envio para o Facebook:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao processar o evento CAPI.' });
  }
});

// --- Iniciar o Servidor ---
app.listen(PORT, () => {
  console.log(`Servidor proxy Node.js (CAPI Ready) iniciado na porta ${PORT}`);
  if (!FACEBOOK_PIXEL_ID || !FACEBOOK_ACCESS_TOKEN) {
      console.warn('ALERTA: PIXEL_ID ou ACCESS_TOKEN podem não ter sido carregados corretamente das variáveis de ambiente!');
  } else {
      console.log(`Configurado para Pixel ID: ${FACEBOOK_PIXEL_ID ? FACEBOOK_PIXEL_ID.substring(0, 4) + '...' : 'N/A'}`);
  }
  console.log(`Aguardando requisições da origem: ${'https://rosane-nails-gravatai.onrender.com'}`);
});
