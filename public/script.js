document.addEventListener('DOMContentLoaded', () => {
    // Definição das variáveis e seleção dos elementos DOM
    const API_KEY = '88a975d2';
    const stockSelect = document.getElementById('stock-select');
    const addStockBtn = document.getElementById('add-stock-btn');
    const stocksContainer = document.getElementById('stocks-container');
    const messageContainer = document.getElementById('message-container');
    const sidebarButtons = document.querySelectorAll('.nav-link');
    const contentCards = document.querySelectorAll('.content-card');

    let selectedStocks = [];  // Array para armazenar os códigos das ações selecionadas
    let portfolio = {};       // Objeto para armazenar o portfólio do usuário
    let pieChart;             // Variável para o gráfico de pizza

    // Configura os botões da barra lateral para alternar entre seções
    sidebarButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            contentCards.forEach(card => {
                if (card.id === targetId) {
                    card.classList.add('active');
                } else {
                    card.classList.remove('active');
                }
            });
        });
    });

    // Função para buscar dados de uma ação
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

    // Função para criar um elemento de ação na interface
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

        // Atualiza os dados da ação a cada 30 segundos
        setInterval(() => updateStock(stockData.symbol), 30000);
    };

    // Função para inicializar o gráfico de velas
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
                borderColor: 'rgb(242, 207, 86)',
                backgroundColor: 'rgba(242, 207, 86, 0.2)'
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

    // Função para atualizar o preço da ação e o gráfico
    const updateStock = async (symbol) => {
        const stockData = await fetchStockData(symbol);
        if (stockData) {
            const stockElement = document.getElementById(`stock-${symbol}`);
            const priceElement = stockElement.querySelector('.stock-price');
            const previousPrice = parseFloat(priceElement.textContent);
            const currentPrice = parseFloat(stockData.price);
            
            priceElement.textContent = currentPrice.toFixed(2);

            // Atualiza a cor do preço com base na variação
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

    // Adiciona uma nova ação ao portfólio quando o botão é clicado
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

        // Adicione a nova ação à grade de cotações
        updateQuotesGrid();
    });

    // Remove uma ação do portfólio
    const removeStock = (symbol) => {
        const stockElement = document.getElementById(`stock-${symbol}`);
        if (stockElement) {
            stocksContainer.removeChild(stockElement);
            selectedStocks = selectedStocks.filter(stock => stock !== symbol);
        }

        // Remove a ação à grade de cotações
        updateQuotesGrid();
    };

    // Atualiza a tabela do portfólio e o gráfico de pizza
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
    
            // Adiciona dados ao gráfico de pizza
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
        
        // Atualiza o gráfico de pizza e o total gasto
        updatePieChart(labels, data);
        document.getElementById('total-gasto').textContent = totalGasto.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    };

    // Atualiza o gráfico de pizza com base nos dados do portfólio
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
                        '#ff6f61', //(Rosa coral)
                        '#6a1b9a', //(Roxo vibrante)
                        '#00bfae', //(Turquesa)
                        '#fbc02d', //(Amarelo dourado)
                        '#d32f2f', //(Vermelho profundo)
                        '#1976d2', //(Azul elétrico)
                        '#388e3c', //(Verde esmeralda)
                        '#f57c00', //(Laranja queimado)
                        '#e91e63', //(Rosa choque)
                        '#0288d1', //(Azul ciano)
                        // Adicionar mais cores pessoal (o tanto de ações que tiver, para ficar 1 para 1)
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

    // Adiciona uma transação ao histórico de transações
    const addTransactionToHistory = (type, symbol, quantity, price) => {
        const transactionHistoryBody = document.getElementById('transaction-history-body');
        const transactionHistoryContainer = document.getElementById('transaction-history-container');
    
        // Cria uma nova linha para a tabela
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${type}</td>
            <td>${new Date().toLocaleString()}</td>
            <td>${symbol}</td>
            <td>${quantity}</td>
            <td>${price.toFixed(2).replace('.', ',')}</td>
        `;
        transactionHistoryBody.appendChild(row);

        // Exibe o histórico e remove a mensagem de vazio
        if (transactionHistoryContainer) {
            transactionHistoryContainer.style.display = 'block';
        }

        // Verifica se é a primeira transação
        const noTransactionsMessage = document.getElementById('no-transactions-message');
        if (noTransactionsMessage) {
            noTransactionsMessage.style.display = 'none';
        }
    };

    // Função para verificar e exibir mensagem quando não houver transações
    const checkEmptyHistory = () => {
        const transactionHistoryBody = document.getElementById('transaction-history-body');
        const transactionHistoryContainer = document.getElementById('transaction-history-container');

        if (transactionHistoryBody.children.length === 0) {
            if (transactionHistoryContainer) {
                transactionHistoryContainer.style.display = 'block';
            }

            const noTransactionsMessage = document.getElementById('no-transactions-message');
            if (!noTransactionsMessage) {
                // Cria e exibe a mensagem de "nenhuma transação"
                const message = document.createElement('p');
                message.id = 'no-transactions-message';
                message.textContent = 'Nenhuma transação registrada ainda.';
                message.style.color = '#f2cf56'; // Cor da mensagem (utilize sua paleta)
                message.style.fontSize = '1.2em';
                message.style.textAlign = 'center';
                transactionHistoryContainer.appendChild(message);
            } else {
                noTransactionsMessage.style.display = 'block';
            }
        }
    };
    
    // Chama a função para verificar o histórico vazio no início ou após alguma ação
    checkEmptyHistory();

    // Função para comprar ações
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

        // Adiciona a compra no histórico de transação
        addTransactionToHistory('Compra', symbol, quantity, currentPrice);

        // Atualiza a tabela do portfólio
        updatePortfolioTable();
    };

    // Função para vender ações
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

        // Adiciona a venda no histórico de transação
        addTransactionToHistory('Venda', symbol, quantity, currentPrice);

        // Atualiza a tabela do portfólio
        updatePortfolioTable();
    };

    // Função para exibir mensagens
    const showMessage = (message, type) => {
        if (messageContainer) {
            messageContainer.textContent = message;
            messageContainer.className = `alert ${type === 'success' ? 'alert-success' : 'alert-error'}`;
            
            // Rola a página até o contêiner de mensagens
            messageContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Limpa a mensagem após 5 segundos
            setTimeout(() => {
                messageContainer.textContent = '';
                messageContainer.className = '';
            }, 5000);
        } else {
            console.error('Message container not found.');
        }
    };

    // Configura o evento de clique para o botão de compra
    document.getElementById('buy-stock-btn').addEventListener('click', async () => {
        const symbol = document.getElementById('portfolio-stock-select').value;
        const quantity = parseInt(document.getElementById('quantity-input').value);
        if (isNaN(quantity) || quantity <= 0) {
            showMessage('Digite uma quantidade válida.', 'error');
            return;
        }

        const stockData = await fetchStockData(symbol);
        if (stockData) {
            buyStock(symbol, quantity, stockData.price);
            showMessage('Compra realizada com sucesso.', 'success');
        } else {
            showMessage('Código de ação inválido ou não encontrado.', 'error');
        }
    });

    // Configura o evento de clique para o botão de venda
    document.getElementById('sell-stock-btn').addEventListener('click', async () => {
        const symbol = document.getElementById('portfolio-stock-select').value;
        const quantity = parseInt(document.getElementById('quantity-input').value);
        if (isNaN(quantity) || quantity <= 0) {
            showMessage('Digite uma quantidade válida.', 'error');
            return;
        }

        const stockData = await fetchStockData(symbol);
        if (stockData) {
            if (portfolio[symbol] && portfolio[symbol].quantity >= quantity) {
                sellStock(symbol, quantity, stockData.price);
                showMessage('Venda realizada com sucesso.', 'success');
            } else {
                showMessage('Você não tem ações suficientes para vender.', 'error');
            }
        } else {
            showMessage('Código de ação inválido ou não encontrado.', 'error');
        }
    });


    //Gride de Cotações
    const updateQuotesGrid = async () => {
        const quotesContainer = document.getElementById('quotes-container');
        quotesContainer.innerHTML = '';
    
        if (selectedStocks.length === 0) {
            // Exibe a mensagem se não houver ações selecionadas
            const messageElement = document.createElement('p');
            messageElement.textContent = 'Nenhuma ação selecionada.';
            messageElement.style.color = '#f2cf56';  // Cor da mensagem (utilize sua paleta)
            messageElement.style.fontSize = '1.2em';
            messageElement.style.textAlign = 'center';
            quotesContainer.appendChild(messageElement);
        } else {
            // Se houver ações selecionadas, exibe as cotações
            for (const symbol of selectedStocks) {
                const stockData = await fetchStockData(symbol);
    
                if (stockData) {
                    const quoteElement = document.createElement('div');
                    quoteElement.classList.add('quote');
                    
                    const priceClass = stockData.price > stockData.openPrice ? 'price-up' : 'price-down';
    
                    quoteElement.innerHTML = `
                        <div class="quote-symbol">${stockData.symbol}</div>
                        <div class="quote-price ${priceClass}">${stockData.price.toFixed(2)}</div>
                    `;
                    
                    quotesContainer.appendChild(quoteElement);
                }
            }
        }
    };

    // Função para buscar dados de cotações de moedas
    const fetchCurrencyData = async () => {
        const url = `/api/finance?key=${API_KEY}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.results.currencies; // Assume que a resposta contém as moedas em 'results.currencies'
        } catch (error) {
            console.error('Error fetching currency data:', error);
            return null;
        }
    };  

    // Função para exibir cotações de moedas na interface
    const displayCurrencyData = (currencies) => {
        const coinsList = document.getElementById('coins-list');
        coinsList.innerHTML = '';

        if (!currencies) {
            const errorMessage = document.createElement('p');
            errorMessage.textContent = 'Não foi possível carregar as cotações de moedas.';
            coinsList.appendChild(errorMessage);
            return;
        }

        const currencySymbols = {
            'USD': 'Dólar Americano',
            'EUR': 'Euro',
            'BTC': 'Bitcoin',
            'BRL': 'Real Brasileiro'
        };

        for (const [symbol, currency] of Object.entries(currencies)) {
            if (currencySymbols[symbol]) {
                const currencyElement = document.createElement('div');
                currencyElement.classList.add('currency');
                currencyElement.innerHTML = `
                    <h3>${currencySymbols[symbol]} (${symbol})</h3>
                    <p>Compra: ${currency.buy.toFixed(2).replace('.', ',')}</p>
                    <p>Variação: ${currency.variation.toFixed(2).replace('.', ',')}%</p>
                `;
                coinsList.appendChild(currencyElement);
            }
        }
    };

        // Atualiza os dados das moedas a cada 30 segundos
        const updateCurrencyData = async () => {
            const currencies = await fetchCurrencyData();
            displayCurrencyData(currencies);
        };
    
        
    // Chama a função uma vez ao carregar a página e depois a cada 30 segundos
    updateCurrencyData();
    setInterval(updateCurrencyData, 30000);

    // Chama a função
    updateQuotesGrid();
    setInterval(updateQuotesGrid, 10000);
});
