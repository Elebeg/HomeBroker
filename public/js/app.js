const API_KEY = '88a975d2';
const API_URL = `https://api.hgbrasil.com/finance/stock_price?key=${API_KEY}&symbol=`;

// Lista de ações que o cliente possui
const clientStocks = ['AAPL', 'TSLA', 'AMZN'];

const loadStocks = async () => {
    const container = document.getElementById('stocks-container');
    container.innerHTML = '';

    for (let symbol of clientStocks) {
        const response = await fetch(`${API_URL}${symbol}`);
        const data = await response.json();

        const stockData = data.results[symbol];
        const stockCard = document.createElement('div');
        stockCard.className = 'stock-card';

        const priceClass = stockData.change_percent >= 0 ? 'stock-price-up' : 'stock-price-down';
        const blinkClass = stockData.change_percent !== 0 ? 'blink' : '';

        stockCard.innerHTML = `
            <h2>${stockData.name} (${stockData.symbol})</h2>
            <p>Price: $<span class="${priceClass} ${blinkClass}">${stockData.price.toFixed(2)}</span></p>
            <p>Change: ${stockData.change_percent.toFixed(2)}%</p>
        `;

        container.appendChild(stockCard);
    }
};

// Atualiza as ações a cada 30 segundos
setInterval(loadStocks, 30000);

// Carrega as ações ao iniciar
loadStocks();
