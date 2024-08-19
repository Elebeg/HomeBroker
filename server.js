const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 4000;

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Configurar o proxy para a API
app.use('/api', (req, res, next) => {
    console.log(`Requisição para: ${req.url}`); // Log para verificar se a requisição está chegando ao proxy
    next();
});

app.use('/api', createProxyMiddleware({
    target: 'https://api.hgbrasil.com',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', // Remove o prefixo '/api' quando for fazer a requisição
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log('Requisição Proxy:', proxyReq.path); // Log para verificar o caminho da requisição sendo feita pelo proxy
    },
    onError: (err, req, res) => {
        console.error('Erro no proxy:', err); // Log para capturar erros
        res.status(500).send('Proxy Error');
    }
}));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
