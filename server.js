const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3000;

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Configurar o proxy para a API
app.use('/api', createProxyMiddleware({
    target: 'https://api.hgbrasil.com',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', // remove /api prefix when forwarding request
    },
}));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
