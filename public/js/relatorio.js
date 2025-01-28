// Referências aos elementos HTML
const tabelaContainerGeral = document.getElementById('tabela-container-geral');
const searchBar = document.getElementById('pesquisa');
const filterTodayBtn = document.getElementById('filter-today-btn');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const refreshBtn = document.getElementById('refresh-btn');
const btnSair = document.getElementById('btn-sair');
const dataFiltro = document.getElementById('data-filtro');

// Dados carregados do banco
let dadosGerais = [];

// Função para processar os dados, incluindo contagem de vezes
function processarDados(dados) {
    // Ordena os dados por timestamp decrescente (mais recente para o mais antigo)
    return dados.sort((a, b) => b.timestamp - a.timestamp);
}

// Função para carregar dados do banco de dados via WebSocket
function carregarRelatorio() {
    const socket = new WebSocket(window.WEBSOCKET_URL);

    socket.onopen = () => {
        console.log('Conexão WebSocket aberta.');
        socket.send(JSON.stringify({ tipo: 'obter_relatorio' }));
    };

    socket.onmessage = (event) => {
        const mensagem = JSON.parse(event.data);

        if (mensagem.tipo === 'relatorio') {
            // Processa os dados para incluir ordenação
            dadosGerais = processarDados(mensagem.dados);
            gerarTabelaGeral(dadosGerais);
        } else {
            console.error('Mensagem não reconhecida:', mensagem);
        }
    };

    socket.onerror = () => {
        tabelaContainerGeral.innerHTML = '<p>Erro ao carregar o relatório. Tente novamente mais tarde.</p>';
    };

    socket.onclose = () => {
        console.log('Conexão WebSocket fechada.');
    };
}

// Função para gerar a tabela geral
function gerarTabelaGeral(dados) {
    if (dados.length === 0) {
        tabelaContainerGeral.innerHTML = '<p>Não há dados disponíveis para exibição.</p>';
        return;
    }

    let tabelaHTML = '<table>';
    tabelaHTML += `
        <thead>
            <tr>
                <th>ID</th>
                <th>OM</th>
                <th>NL</th>
                <th>Status</th>
                <th>Tempo de Espera</th>
                <th>Data e Hora</th>
                <th>Mecânico</th>
            </tr>
        </thead>
        <tbody>
    `;

    dados.forEach((item) => {
        tabelaHTML += `
            <tr>
                <td>${item.id}</td>
                <td>${item.om}</td>
                <td>${item.nl}</td>
                <td>${item.status}</td>
                <td>${item.tempoDeEspera}s</td>
                <td>${new Date(item.timestamp * 1000).toLocaleString()}</td>
                <td>${item.mecanico || 'N/A'}</td>
            </tr>
        `;
    });

    tabelaHTML += '</tbody></table>';
    tabelaContainerGeral.innerHTML = tabelaHTML;
}

// Função para gerar a tabela com base na data selecionada
function gerarTabelaPorData() {
    const dataSelecionada = dataFiltro.value;
    const dadosFiltrados = dadosGerais.filter((item) => {
        const dataItem = new Date(item.timestamp * 1000).toISOString().split('T')[0];
        return dataItem === dataSelecionada;
    });

    if (dadosFiltrados.length === 0) {
        tabelaContainerGeral.innerHTML = '<p>Não há dados para a data selecionada.</p>';
        return;
    }

    gerarTabelaGeral(dadosFiltrados);
}

// Função para pesquisar registros por ID ou outros campos
function pesquisarRelatorio(query) {
    const dadosFiltrados = dadosGerais.filter((item) => {
        return (
            item.id.toString().includes(query) ||
            item.om.toLowerCase().includes(query.toLowerCase()) ||
            item.nl.toLowerCase().includes(query.toLowerCase()) ||
            (item.mecanico && item.mecanico.toLowerCase().includes(query.toLowerCase()))
        );
    });

    gerarTabelaGeral(dadosFiltrados);
}

// Event Listeners
dataFiltro.addEventListener('change', gerarTabelaPorData);
filterTodayBtn.addEventListener('click', () => {
    const hoje = new Date().toISOString().split('T')[0];
    dataFiltro.value = hoje;
    gerarTabelaPorData();
});
clearFiltersBtn.addEventListener('click', () => gerarTabelaGeral(dadosGerais));
searchBar.addEventListener('input', (e) => pesquisarRelatorio(e.target.value));
refreshBtn.addEventListener('click', carregarRelatorio);

// Função para o botão "Sair" redirecionar para a página de recebimento
btnSair.addEventListener('click', () => {
    window.location.href = 'http://192.168.88.97:3030/recebimento.html';
});

// Define a data padrão como hoje e carrega os dados ao iniciar a página
window.onload = () => {
    const hoje = new Date().toISOString().split('T')[0];
    dataFiltro.value = hoje;
    carregarRelatorio();
};
