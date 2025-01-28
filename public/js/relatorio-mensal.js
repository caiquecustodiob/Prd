// Referências aos elementos HTML
const mesFiltro = document.getElementById('mes-filtro');
const rankingMecanicos = document.getElementById('ranking-mecanicos');
const rankingTempoEspera = document.getElementById('ranking-tempo-espera');
const btnVoltar = document.getElementById('btn-voltar');

// Dados carregados do banco
dataMensais = [];

// Função para carregar dados do banco de dados via WebSocket
function carregarRelatorioMensal(mesSelecionado) {
    const socket = new WebSocket(window.WEBSOCKET_URL);

    socket.onopen = () => {
        console.log('Conexão WebSocket aberta.');
        socket.send(JSON.stringify({ tipo: 'obter_relatorio_mensal', mes: mesSelecionado }));
    };

    socket.onmessage = (event) => {
        const mensagem = JSON.parse(event.data);

        if (mensagem.tipo === 'relatorio_mensal') {
            dadosMensais = mensagem.dados; // Armazena os dados recebidos
            gerarRankings(dadosMensais);
        } else {
            console.error('Mensagem não reconhecida:', mensagem);
        }
    };

    socket.onerror = () => {
        rankingMecanicos.innerHTML = '<p>Erro ao carregar o relatório. Tente novamente mais tarde.</p>';
        rankingTempoEspera.innerHTML = '<p>Erro ao carregar o relatório. Tente novamente mais tarde.</p>';
    };

    socket.onclose = () => {
        console.log('Conexão WebSocket fechada.');
    };
}

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
        // Garantindo que o tempo seja tratado como número
        const tempoEmSegundos = parseInt(item.tempoDeEspera, 10) || 0;
        const tempoFormatado = formatarTempo(tempoEmSegundos);

        tabelaHTML += `
            <tr>
                <td>${item.id}</td>
                <td>${item.om}</td>
                <td>${item.nl}</td>
                <td>${item.status}</td>
                <td>${tempoFormatado}</td>
                <td>${new Date(item.timestamp * 1000).toLocaleString()}</td>
                <td>${item.mecanico || 'N/A'}</td>
            </tr>
        `;
    });

    tabelaHTML += '</tbody></table>';
    tabelaContainerGeral.innerHTML = tabelaHTML;
}

function gerarRankings(dados) {
    const mecanicosRequisicoes = {};
    const mecanicosTempoEspera = {};

    dados.forEach((item) => {
        const mecanico = item.mecanico || 'Desconhecido';
        const tempoEmSegundos = parseInt(item.tempoDeEspera, 10) || 0;

        mecanicosRequisicoes[mecanico] = (mecanicosRequisicoes[mecanico] || 0) + 1;

        const tempoEmMinutos = tempoEmSegundos / 60;
        mecanicosTempoEspera[mecanico] = (mecanicosTempoEspera[mecanico] || 0) + tempoEmMinutos;
    });

    const rankingMecanicosOrdenado = Object.entries(mecanicosRequisicoes).sort((a, b) => b[1] - a[1]);
    const rankingTempoEsperaOrdenado = Object.entries(mecanicosTempoEspera).sort((a, b) => b[1] - a[1]);

    rankingMecanicos.innerHTML = rankingMecanicosOrdenado
        .slice(0, 3)
        .map(([mecanico, quantidade]) => `<div class="ranking-item"><span>${mecanico}</span><span>${quantidade} requisições</span></div>`)
        .join('');

    rankingTempoEspera.innerHTML = rankingTempoEsperaOrdenado
        .slice(0, 3)
        .map(([mecanico, tempo]) => `<div class="ranking-item"><span>${mecanico}</span><span>${tempo.toFixed(2)} minutos</span></div>`)
        .join('');
}

// Função para formatar o tempo de espera em "minutos:segundos"
function formatarTempo(tempoEmSegundos) {
    const minutos = Math.floor(tempoEmSegundos / 60);
    const segundos = tempoEmSegundos % 60;
    return `${minutos}m ${segundos}s`;
}


// Event Listener para o botão Voltar
btnVoltar.addEventListener('click', () => {
    window.location.href = 'http://192.168.88.97:3030/relatorio.html';
});

// Event Listener para o filtro de mês
mesFiltro.addEventListener('change', () => {
    const mesSelecionado = mesFiltro.value;
    carregarRelatorioMensal(mesSelecionado);
});

// Define o mês padrão como o mês atual e carrega os dados ao iniciar a página
window.onload = () => {
    const hoje = new Date();
    const mesAtual = hoje.toISOString().slice(0, 7); // Formato YYYY-MM
    mesFiltro.value = mesAtual;
    carregarRelatorioMensal(mesAtual);
};
