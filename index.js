// index.js - TEMPORARILY SIMPLIFIED FOR DEBUGGING POST ROUTE

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURAÇÕES (Não usadas neste teste, mas úteis para log de inicialização) ---
const FACEBOOK_PIXEL_ID = process.env.PIXEL_ID;
const FACEBOOK_ACCESS_TOKEN = process.env.ACCESS_TOKEN;

// --- Middlewares ---
app.use(express.json());

// CORS Middleware (mantido com logs de debug)
app.use((req, res, next) => {
  console.log(`-- CORS Check --`);
  console.log(`> Método Recebido: ${req.method}`);
  console.log(`> Origem Recebida (req.headers.origin): ${req.headers.origin}`);
  const allowedOrigin = 'https://rosane-nails-gravatai.onrender.com';
  console.log(`> Origem Permitida Configurada: ${allowedOrigin}`);
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    console.log('> Respondendo à requisição OPTIONS com status 204.');
    return res.sendStatus(204);
  }
  console.log('> Chamando next() para continuar para a rota.');
  next();
});

// --- Rota Principal da API (/api/conversion) - SUPER SIMPLIFICADA ---
app.post('/api/conversion', (req, res) => {
  const requestTimestamp = new Date();
  console.log('-----------------------------------------');
  // Log *essencial* para ver se a rota foi alcançada
  console.log(`[${requestTimestamp.toLocaleString('pt-BR')}] SIMPLIFICADO: Requisição POST chegou em /api/conversion`);
  console.log('SIMPLIFICADO: Corpo da requisição recebida:', req.body);

  // Apenas envia uma resposta simples de sucesso IMEDIATAMENTE
  res.status(200).json({
    message: 'SIMPLIFICADO: Rota POST /api/conversion alcançada com sucesso!',
    received_data: req.body // Devolve os dados recebidos para confirmação
  });
  console.log(`[${requestTimestamp.toLocaleString('pt-BR')}] SIMPLIFICADO: Resposta 200 enviada para o cliente.`);
});

// --- Iniciar o Servidor ---
app.listen(PORT, () => {
  console.log(`Servidor proxy Node.js (DEBUG SIMPLIFICADO) iniciado na porta ${PORT}`);
  if (!FACEBOOK_PIXEL_ID || !FACEBOOK_ACCESS_TOKEN) {
     console.warn('ALERTA: PIXEL_ID ou ACCESS_TOKEN podem não ter sido carregados!');
   } else {
     console.log(`Configurado para Pixel ID: ${FACEBOOK_PIXEL_ID ? FACEBOOK_PIXEL_ID.substring(0, 4) + '...' : 'N/A'}`);
   }
  console.log(`Aguardando requisições da origem: ${'https://rosane-nails-gravatai.onrender.com'}`);
});
