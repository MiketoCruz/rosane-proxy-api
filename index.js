// index.js - Servidor Proxy Básico

const express = require('express');
const fetch = require('node-fetch'); // Usaremos depois para falar com o Facebook
const crypto = require('crypto');    // Usaremos depois para hashing (SHA256)
const app = express();

const PORT = process.env.PORT || 3000; // Usa a porta do Render ou 3000 localmente

app.use(express.json()); // Habilita o Express a entender JSON

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

// Rota Principal da API
app.post('/api/conversion', (req, res) => {
  console.log('-----------------------------------------');
  console.log(`[${new Date().toLocaleString('pt-BR')}] Requisição recebida em /api/conversion`);
  console.log('Dados recebidos do front-end:', req.body);

  // --- PONTO FUTURO: Lógica do Facebook Virá Aqui ---
  // -----------------------------------------------------

  res.status(200).json({
    message: 'Proxy recebeu os dados com sucesso!',
    dados_recebidos: req.body
  });
});

// Iniciar o Servidor
app.listen(PORT, () => {
  console.log(`Servidor proxy Node.js iniciado e ouvindo na porta ${PORT}`);
  console.log(`Aguardando requisições permitidas da origem: ${'https://rosane-nails-gravatai.onrender.com'}`);
});
