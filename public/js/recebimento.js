// Conectar ao servidor WebSocket
const socket = new WebSocket(window.WEBSOCKET_URL);

let requisicoes = [];
let requisicaoAtual = null;

// Obter elementos HTML
const requisicoesLista = document.getElementById('requisicoes-lista');
const detalhesRequisicao = document.getElementById('detalhes-requisicao');
const historicoLista = document.getElementById('historico-lista');
const audioNotificacao = new Audio('assets/notification.mp3'); // Som de notificação

// Atualizar fila de requisições
function atualizarFila(dados) {
    requisicoes = dados.map((pedido) => ({
        ...pedido,
        // Se o tempoInicio não estiver presente, ele será atribuído ao momento atual
        tempoInicio: pedido.tempoInicio || Math.floor(Date.now() / 1000),
    }));
    requisicoesLista.innerHTML = ''; // Limpar fila anterior

    dados.forEach((pedido, index) => {
        const tempoDeEspera = isNaN(pedido.tempoInicio) ? 0 : Math.floor(Date.now() / 1000) - pedido.tempoInicio;
        const item = document.createElement('div');
        item.classList.add('requisicao-item');
        item.innerHTML = `
            OM: ${pedido.om} | NL: ${pedido.nl} | Vez: ${pedido.vez} | Mecânico: ${pedido.mecanico} <br>
            <button onclick="selecionarRequisicao(${index})">Selecionar</button>
        `;
        requisicoesLista.appendChild(item);
    });
}

// Selecionar uma requisição
function selecionarRequisicao(index) {
    requisicaoAtual = requisicoes[index];
    detalhesRequisicao.innerHTML = `
        <strong>OM:</strong> ${requisicaoAtual.om} <br>
        <strong>NL:</strong> ${requisicaoAtual.nl} <br>
        <strong>Vez:</strong> ${requisicaoAtual.vez} <br>
        <strong>Mecânico:</strong> ${requisicaoAtual.mecanico} <br>
        <strong>Tempo de Espera:</strong> ${Math.floor(Date.now() / 1000) - requisicaoAtual.tempoInicio}s
        <br>
        <button id="separar">Iniciar Separação</button>
        <button id="entregar">Confirmar Entrega</button>
    `;

    // Adicionar eventos aos botões de separação e entrega
    document.getElementById('separar').addEventListener('click', iniciarSeparacao);
    document.getElementById('entregar').addEventListener('click', confirmarEntrega);
}

// Iniciar separação da requisição
function iniciarSeparacao() {
    if (!requisicaoAtual) {
        alert('Nenhuma requisição selecionada para separação!');
        return;
    }

    socket.send(JSON.stringify({
        tipo: 'iniciar_separacao',
        dados: {
            om: requisicaoAtual.om,
            nl: requisicaoAtual.nl
        }
    }));

    alert('Separação iniciada para a OM: ' + requisicaoAtual.om);
}

// Confirmar a entrega de uma requisição
function confirmarEntrega() {
    if (!requisicaoAtual) {
        alert('Nenhuma requisição selecionada para confirmação!');
        return;
    }

    const tempoDeEspera = Math.floor(Date.now() / 1000) - requisicaoAtual.tempoInicio;

    socket.send(JSON.stringify({
        tipo: 'confirmar_entrega',
        dados: {
            om: requisicaoAtual.om,
            tempoDeEspera: tempoDeEspera
        }
    }));

    alert('Entrega confirmada para a OM: ' + requisicaoAtual.om);

    // Limpar requisição atual
    requisicaoAtual = null;
    detalhesRequisicao.innerHTML = '<p>Nenhuma requisição selecionada.</p>';
}

// Receber mensagens do servidor
socket.onmessage = (event) => {
    const mensagem = JSON.parse(event.data);

    switch (mensagem.tipo) {
        case 'nova_requisicao':
            const novaRequisicao = { ...mensagem.dados, tempoInicio: Math.floor(Date.now() / 1000) };
            requisicoes.push(novaRequisicao);
            atualizarFila(requisicoes);
            break;

        case 'requisicoes':
            atualizarFila(mensagem.dados);
            break;

        default:
            console.warn('Tipo de mensagem não reconhecido:', mensagem.tipo);
    }
};

// Solicitar dados iniciais ao servidor
function carregarFila() {
    socket.send(JSON.stringify({ tipo: 'obter_fila' }));
}

// Carregar a lista de requisições ao abrir a página
window.onload = carregarFila;

// Reproduzir som se houver requisições na fila a cada 5 segundos
setInterval(() => {
    if (requisicoes.length > 0) {
        audioNotificacao.play();
    }
}, 5000);