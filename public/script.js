document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = '88a975d2';
    const stockSelect = document.getElementById('stock-select');
    const addStockBtn = document.getElementById('add-stock-btn');
    const stocksContainer = document.getElementById('stocks-container');

    let selectedStocks = [];
    let portfolio = {};
    let pieChart;

    const fetchStockData = async (symbol) => {
        const url = `/api/finance/stock_price?key=${API_KEY}&symbol=${symbol}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.results[symbol];
        } catch (error) {
            console.error('Error fetching stock data:', error);
            return null;
        }
    };

    const createStockElement = (stockData) => {
        const stockElement = document.createElement('div');
        stockElement.classList.add('stock');
        stockElement.id = `stock-${stockData.symbol}`;
    
        stockElement.innerHTML = `
            <button class="delete-btn">X</button>
            <h2>${stockData.name} (${stockData.symbol})</h2>
            <p class="stock-price">${stockData.price.toFixed(2)}</p>
            <p>Última atualização: ${new Date(stockData.updated_at).toLocaleString()}</p>
            <canvas id="chart-${stockData.symbol}" width="400" height="200"></canvas>
        `;
        stocksContainer.appendChild(stockElement);
    
        // Inicializa o gráfico deste stock
        initializeChart(stockData.symbol);
    
        // Configura o botão de excluir
        stockElement.querySelector('.delete-btn').addEventListener('click', () => {
            removeStock(stockData.symbol);
        });
    
        setInterval(() => updateStock(stockData.symbol), 30000);
    };

    const initializeChart = async (symbol) => {
        const chartElement = document.getElementById(`chart-${symbol}`);
        const stockData = await fetchStockData(symbol);
        
        if (!stockData) return;
    
        const chartData = {
            datasets: [{
                label: 'Preço',
                data: [{
                    x: new Date(stockData.updated_at),
                    o: stockData.openPrice,
                    h: stockData.highPrice,
                    l: stockData.lowPrice,
                    c: stockData.price
                }],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)'
            }]
        };
    
        new Chart(chartElement, {
            type: 'candlestick', 
            data: chartData,
            options: {
                responsive: true,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute',
                            tooltipFormat: 'll HH:mm'
                        },
                        title: {
                            display: true,
                            text: 'Tempo'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Preço'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });
    };

    const updateStock = async (symbol) => {
        const stockData = await fetchStockData(symbol);
        if (stockData) {
            const stockElement = document.getElementById(`stock-${symbol}`);
            const priceElement = stockElement.querySelector('.stock-price');
            const previousPrice = parseFloat(priceElement.textContent);
            const currentPrice = parseFloat(stockData.price);
            
            priceElement.textContent = currentPrice.toFixed(2);

            if (currentPrice > previousPrice) {
                priceElement.classList.remove('price-down');
                priceElement.classList.add('price-up');
            } else if (currentPrice < previousPrice) {
                priceElement.classList.remove('price-up');
                priceElement.classList.add('price-down');
            }

            // Atualiza o gráfico com os novos dados
            const chartElement = document.getElementById(`chart-${symbol}`);
            const chartInstance = chartElement.chartInstance;
            if (chartInstance) {
                chartInstance.data.labels.push(new Date());
                chartInstance.data.datasets[0].data.push(currentPrice);
                chartInstance.update();
            }
        }
    };

    addStockBtn.addEventListener('click', async () => {
        const symbol = stockSelect.value.toUpperCase().trim();
        if (symbol && !selectedStocks.includes(symbol)) {
            const stockData = await fetchStockData(symbol);
            if (stockData) {
                selectedStocks.push(symbol);
                createStockElement(stockData);
            } else {
                alert('Código de ação inválido ou não encontrado.');
            }
        }
    });

    const removeStock = (symbol) => {
        const stockElement = document.getElementById(`stock-${symbol}`);
        if (stockElement) {
            stocksContainer.removeChild(stockElement);
            selectedStocks = selectedStocks.filter(stock => stock !== symbol);
        }
    };

    //Mudança de seção -------------------------------------------------------------------

    const updatePortfolioTable = () => {
        const portfolioBody = document.getElementById('portfolio-body');
        portfolioBody.innerHTML = '';
    
        let totalGasto = 0;
        const labels = [];
        const data = [];
    
        for (const symbol in portfolio) {
            const stock = portfolio[symbol];
            const currentPrice = stock.currentPrice.toFixed(2).replace('.', ',');
            const totalGastoAção = (stock.quantity * stock.averagePrice).toFixed(2);
            totalGasto += parseFloat(totalGastoAção);
    
            // Formatação do total gasto
            const formattedTotalGasto = parseFloat(totalGastoAção).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
    
            // Adiciona dados ao gráfico
            labels.push(symbol);
            data.push(stock.quantity);
    
            const row = `
                <tr id="portfolio-row-${symbol}">
                    <td>${symbol}</td>
                    <td>${stock.quantity}</td>
                    <td>${stock.averagePrice.toFixed(2).replace('.', ',')}</td>
                    <td>${currentPrice}</td>
                    <td>${formattedTotalGasto}</td>
                </tr>
            `;
            portfolioBody.insertAdjacentHTML('beforeend', row);
        }
        
        // Atualiza o gráfico e o total gasto
        updatePieChart(labels, data);
        document.getElementById('total-gasto').textContent = totalGasto.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    };

    const updatePieChart = (labels, data) => {
        const ctx = document.getElementById('portfolio-pie-chart').getContext('2d');
    
        if (pieChart) {
            pieChart.destroy();
        }
    
        pieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#f2cf56',
                        '#0d1414',
                        '#b3b3b3',
                        '#1f78b4',
                        // Adicione mais cores se necessário
                    ],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.label}: ${context.raw} ações`
                        }
                    },
                    legend: {
                        position: 'top',
                    },
                }
            }
        });
    };

// Compra e venda de ações e histórico ---------------------------------------------------------

const toggleHistoryBtn = document.getElementById('toggle-history-btn');
    const transactionHistoryContainer = document.getElementById('transaction-history-container');

    toggleHistoryBtn.addEventListener('click', () => {
        const isHidden = transactionHistoryContainer.style.display === 'none';
        transactionHistoryContainer.style.display = isHidden ? 'block' : 'none';
        toggleHistoryBtn.textContent = isHidden ? 'Esconder Histórico de Transações' : 'Mostrar Histórico de Transações';
    });

    const addTransactionToHistory = (type, symbol, quantity, price) => {
        const transactionHistoryBody = document.getElementById('transaction-history-body');
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${type}</td>
            <td>${new Date().toLocaleString()}</td>
            <td>${symbol}</td>
            <td>${quantity}</td>
            <td>${price.toFixed(2).replace('.', ',')}</td>
        `;

        transactionHistoryBody.appendChild(row);
    };


    const buyStock = (symbol, quantity, currentPrice) => {
        if (!portfolio[symbol]) {
            portfolio[symbol] = {
                quantity: 0,
                averagePrice: 0,
                currentPrice: currentPrice
            };
    }

        const stock = portfolio[symbol];
        stock.averagePrice = (stock.averagePrice * stock.quantity + currentPrice * quantity) / (stock.quantity + quantity);
        stock.quantity += quantity;
        stock.currentPrice = currentPrice;

        //adiciona a compra no histórico de transação
        addTransactionToHistory('Compra', symbol, quantity, currentPrice);

        updatePortfolioTable();
    };

    const sellStock = (symbol, quantity, currentPrice) => {
        if (!portfolio[symbol] || portfolio[symbol].quantity < quantity) {
            alert('Você não tem ações suficientes para vender.');
            return;
        }

        const stock = portfolio[symbol];
        stock.quantity -= quantity;
        stock.currentPrice = currentPrice;

        if (stock.quantity === 0) {
            delete portfolio[symbol];
        }

        //adiciona a venda no histórico de transação
        addTransactionToHistory('Venda', symbol, quantity, currentPrice);

        updatePortfolioTable();
    };

    document.getElementById('buy-stock-btn').addEventListener('click', async () => {
        const symbol = document.getElementById('portfolio-stock-select').value;
        const quantity = parseInt(document.getElementById('quantity-input').value);
        if (isNaN(quantity) || quantity <= 0) {
            alert('Digite uma quantidade válida.');
            return;
        }

        const stockData = await fetchStockData(symbol);
        if (stockData) {
            buyStock(symbol, quantity, stockData.price);
        }
    });

    document.getElementById('sell-stock-btn').addEventListener('click', async () => {
        const symbol = document.getElementById('portfolio-stock-select').value;
        const quantity = parseInt(document.getElementById('quantity-input').value);
        if (isNaN(quantity) || quantity <= 0) {
            alert('Digite uma quantidade válida.');
            return;
        }

        const stockData = await fetchStockData(symbol);
        if (stockData) {
            sellStock(symbol, quantity, stockData.price);
        }
    });
});
