// index.js - Servidor Proxy FINAL com Lógica CAPI e **LOGS DE DEBUG CORS**

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

// --- DEBUG CORS INÍCIO ---
// Middleware CORS com LOGS extras para depuração
app.use((req, res, next) => {
  console.log(`-- CORS Check --`);
  console.log(`> Método Recebido: ${req.method}`);
  console.log(`> Origem Recebida (req.headers.origin): ${req.headers.origin}`); // Vê o que o navegador está enviando

  const allowedOrigin = 'https://rosane-nails-gravatai.onrender.com';
  console.log(`> Origem Permitida Configurada: ${allowedOrigin}`); // Confirma a configuração

  // Define os cabeçalhos CORS
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Trata a requisição OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    console.log('> Respondendo à requisição OPTIONS com status 204.');
    // Envia a resposta vazia para o preflight e termina o processamento aqui
    return res.sendStatus(204);
  }

  // Se não for OPTIONS, continua para a próxima rota (ex: /api/conversion)
  console.log('> Chamando next() para continuar para a rota POST /api/conversion.');
  next();
});
// --- DEBUG CORS FIM ---


// --- Rota Principal da API (/api/conversion) ---
app.post('/api/conversion', async (req, res) => { // Rota agora é async
  const requestTimestamp = new Date();
  // Log inicial da rota POST (só deve aparecer se o CORS passar)
  console.log('-----------------------------------------');
  console.log(`[${requestTimestamp.toLocaleString('pt-BR')}] Requisição CHEGOU na rota POST /api/conversion`);
  const clientData = req.body;
  console.log('Dados recebidos do front-end:', JSON.stringify(clientData));

  // Verifica se as variáveis de ambiente foram carregadas
  // (Este log deve aparecer nos logs de inicialização, não aqui)
  if (!FACEBOOK_PIXEL_ID || !FACEBOOK_ACCESS_TOKEN) {
      console.error('ERRO CRÍTICO: PIXEL_ID ou ACCESS_TOKEN não encontrados nas variáveis de ambiente!');
      return res.status(500).json({ message: 'Erro interno de configuração no servidor.' });
  }

  // Valida dados básicos recebidos
  if (!clientData || !clientData.event_name || !clientData.user_data || !clientData.event_source_url) {
    console.error("Dados inválidos ou incompletos recebidos do front-end.");
    return res.status(400).json({ message: 'Dados inválidos enviados pelo cliente.' });
  }

  try {
    // Obter IP e User Agent
    const clientIpAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    const clientUserAgent = req.headers['user-agent'];
    console.log(`IP Cliente: ${clientIpAddress}, User Agent: ${clientUserAgent ? clientUserAgent.substring(0, 100) + '...' : 'N/A'}`);

    // Timestamp UNIX
    const eventTime = Math.floor(requestTimestamp.getTime() / 1000);

    // Montar UserData com hashing
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

    // Montar Payload final para o Facebook
    const facebookPayload = {
      data: [{
        event_name: clientData.event_name,
        event_time: eventTime,
        action_source: 'website',
        event_source_url: clientData.event_source_url,
        user_data: userData,
      }],
      // test_event_code: 'TESTXXXXX' // Descomente e adicione seu código de teste se precisar
    };
    console.log('Payload final para enviar ao Facebook:', JSON.stringify(facebookPayload, null, 2));

    // Enviar para a API do Facebook
    const fbApiUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PIXEL_ID}/events?access_token=${FACEBOOK_ACCESS_TOKEN}`;
    console.log(`Enviando para FB: ${fbApiUrl.replace(FACEBOOK_ACCESS_TOKEN, '*****')}`);

    const response = await fetch(fbApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(facebookPayload),
    });
    const responseData = await response.json();

    // Tratar Resposta do Facebook
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
  console.log(`Servidor proxy Node.js (CAPI Ready com DEBUG CORS) iniciado na porta ${PORT}`);
  // Verifica se as vars de ambiente foram carregadas na inicialização
  if (!FACEBOOK_PIXEL_ID || !FACEBOOK_ACCESS_TOKEN) {
      // Este log deve ter aparecido no deploy anterior se houve erro ao carregar as vars
      console.warn('ALERTA: PIXEL_ID ou ACCESS_TOKEN podem não ter sido carregados corretamente das variáveis de ambiente!');
  } else {
      console.log(`Configurado para Pixel ID: ${FACEBOOK_PIXEL_ID.substring(0, 4)}...`);
  }
  console.log(`Aguardando requisições da origem: ${'https://rosane-nails-gravatai.onrender.com'}`);
});
