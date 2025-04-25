// index.js - Servidor Proxy FINAL com Lógica CAPI e Variáveis de Ambiente

const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const app = express();

const PORT = process.env.PORT || 3000;

// --- CONFIGURAÇÕES LIDAS DAS VARIÁVEIS DE AMBIENTE DO RENDER ---
// Lê os valores que você configurou na seção 'Environment' do serviço no Render
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

// CORS - Permite acesso do seu site estático
app.use((req, res, next) => {
  const allowedOrigin = 'https://rosane-nails-gravatai.onrender.com'; // URL do seu site
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// --- Rota Principal da API (/api/conversion) ---
app.post('/api/conversion', async (req, res) => { // Rota agora é async
  const requestTimestamp = new Date();
  console.log('-----------------------------------------');
  console.log(`[${requestTimestamp.toLocaleString('pt-BR')}] Requisição recebida em /api/conversion`);
  const clientData = req.body;
  console.log('Dados recebidos do front-end:', JSON.stringify(clientData)); // Log completo dos dados

  // Verifica se as variáveis de ambiente foram carregadas
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
    // No Render, o IP do cliente geralmente está em 'x-forwarded-for'
    const clientIpAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    const clientUserAgent = req.headers['user-agent'];
    console.log(`IP Cliente: ${clientIpAddress}, User Agent: ${clientUserAgent ? clientUserAgent.substring(0, 100) + '...' : 'N/A'}`); // Log truncado do User Agent

    // Timestamp UNIX
    const eventTime = Math.floor(requestTimestamp.getTime() / 1000);

    // Montar UserData com hashing
    const userData = {
      em: hashData(clientData.user_data.em),
      ph: hashData(clientData.user_data.ph),
      fn: hashData(clientData.user_data.fn),
      ln: hashData(clientData.user_data.ln),
      external_id: clientData.external_id,
      fbp: clientData.fbp !== "NA" ? clientData.fbp : undefined, // Envia _fbp se não for "NA"
      client_ip_address: clientIpAddress,
      client_user_agent: clientUserAgent,
    };

    // Remover campos undefined do user_data
    Object.keys(userData).forEach(key => {
        if (userData[key] === undefined) {
            delete userData[key];
        }
    });

    // Montar Payload final para o Facebook
    const facebookPayload = {
      data: [
        {
          event_name: clientData.event_name, // "Lead"
          event_time: eventTime,
          action_source: 'website',
          event_source_url: clientData.event_source_url,
          user_data: userData,
        }
      ],
      // Se estiver testando com a ferramenta do Facebook, descomente e adicione seu código de teste:
      // test_event_code: 'TESTXXXXX'
    };

    console.log('Payload final para enviar ao Facebook:', JSON.stringify(facebookPayload, null, 2));

    // Enviar para a API do Facebook
    const fbApiUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PIXEL_ID}/events?access_token=${FACEBOOK_ACCESS_TOKEN}`;

    console.log(`Enviando para: ${fbApiUrl.replace(FACEBOOK_ACCESS_TOKEN, '*****')}`); // Log sem o token

    const response = await fetch(fbApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(facebookPayload),
    });

    const responseData = await response.json(); // Tenta ler a resposta como JSON

    // Tratar Resposta do Facebook
    if (!response.ok) {
      // Se a resposta não foi OK (ex: 4xx, 5xx)
      console.error(`Erro da API do Facebook (${response.status}):`, JSON.stringify(responseData));
      return res.status(502).json({ message: 'Erro ao enviar evento para o Facebook.', error: responseData });
    }

    // Se a resposta foi OK (2xx)
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
      console.warn('ALERTA: PIXEL_ID ou ACCESS_TOKEN não carregados das variáveis de ambiente!');
  } else {
      console.log(`Configurado para Pixel ID: ${FACEBOOK_PIXEL_ID.substring(0, 4)}...`); // Mostra só o início por segurança
  }
  console.log(`Aguardando requisições da origem: ${'https://rosane-nails-gravatai.onrender.com'}`);
});
