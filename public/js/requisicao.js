const socket = new WebSocket(window.WEBSOCKET_URL); // Conectar ao servidor WebSocket

// Referências aos elementos HTML
const formulario = document.getElementById('requisicao-form');
const logList = document.getElementById('log-list');
const btnRequisitar = document.getElementById('btnRequisitar');
const formularioContainer = document.getElementById('formulario');

// Lista para rastrear as requisições enviadas
const requisicoes = [];
const timers = {}; // Armazena os timers por OM

/**
 * Atualizar uma entrada no histórico de requisições.
 * @param {Object} requisicao - Objeto contendo os detalhes da requisição.
 */
function atualizarHistorico(requisicao) {
    let item = document.getElementById(`requisicao-${requisicao.om}`);

    if (!item) {
        // Criar novo item no log se não existir
        item = document.createElement('li');
        item.id = `requisicao-${requisicao.om}`;
        item.className = 'historico-item'; // Classe para estilização
        logList.appendChild(item);
    }

    // Atualizar o conteúdo do item
    item.textContent = `OM: ${requisicao.om} | NL: ${requisicao.nl} | Vez: ${requisicao.vez} | Mecânico: ${requisicao.mecanico} | Status: ${requisicao.status || 'Pendente'}`;
}

/**
 * Iniciar o apontamento e exibir o formulário.
 */
btnRequisitar.addEventListener('click', () => {
    if (socket.readyState === WebSocket.OPEN) {
        // Mostrar o formulário
        formularioContainer.style.display = 'block';

        // Iniciar o apontamento
        const om = prompt('Digite o número da OM para iniciar o apontamento:');
        if (om) {
            iniciarApontamento(om);
        }
    } else {
        alert('Erro na conexão com o servidor WebSocket. Não foi possível exibir o formulário.');
    }
});

/**
 * Iniciar o timer de uma etapa.
 * @param {string} om - O número da OM.
 */
function iniciarApontamento(om) {
    if (!timers[om]) {
        timers[om] = { inicio: new Date() };
        console.log(`Apontamento iniciado para OM: ${om}`);

        // Enviar para o servidor WebSocket
        socket.send(JSON.stringify({
            tipo: 'iniciar_apontamento',
            dados: { om }
        }));

        alert(`Apontamento iniciado para OM: ${om}`);
    } else {
        alert('O apontamento já foi iniciado para esta OM.');
    }
}

/**
 * Enviar o formulário e finalizar o apontamento.
 */
formulario.addEventListener('submit', (event) => {
    event.preventDefault(); // Impede o envio padrão do formulário

    // Coletar os dados do formulário
    const om = document.getElementById('om').value;
    const nl = document.getElementById('nl').value;
    const vez = document.getElementById('vez').value;
    const mecanico = document.getElementById('mecanico').value;

    // Verificar se todos os campos obrigatórios foram preenchidos
    if (!om || !nl || !vez || !mecanico) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    // Criar o objeto de requisição
    const pedido = {
        om,
        nl,
        vez,
        mecanico,
        status: 'Pendente'
    };

    // Adicionar a requisição à lista
    requisicoes.push(pedido);

    // Atualizar o histórico
    atualizarHistorico(pedido);

    // Enviar a requisição para o servidor WebSocket
    socket.send(JSON.stringify({ tipo: 'nova_requisicao', dados: pedido }));

    // Finalizar o apontamento
    enviarApontamento(om);

    // Limpar os campos do formulário
    formulario.reset();
    formularioContainer.style.display = 'none'; // Oculta o formulário depois de enviar
});

/**
 * Enviar o tempo final de uma etapa.
 * @param {string} om - O número da OM.
 */
function enviarApontamento(om) {
    if (timers[om] && timers[om].inicio) {
        timers[om].fim = new Date();
        const duracao = Math.floor((timers[om].fim - timers[om].inicio) / 1000); // Duração em segundos

        const apontamento = {
            om,
            inicio: Math.floor(timers[om].inicio.getTime() / 1000), // Timestamp em segundos
            fim: Math.floor(timers[om].fim.getTime() / 1000), // Timestamp em segundos
            duracao
        };

        // Enviar para o servidor WebSocket
        socket.send(JSON.stringify({
            tipo: 'confirmar_apontamento',
            dados: {
                om,
                tempoDeEspera: duracao,
                etapas: JSON.stringify({ inicio: apontamento.inicio, fim: apontamento.fim })
            }
        }));

        console.log(`Apontamento enviado para OM: ${om}`, apontamento);

        // Atualizar o histórico
        const requisicao = requisicoes.find(req => req.om === om);
        if (requisicao) {
            requisicao.status = `Concluído (${duracao}s)`;
            atualizarHistorico(requisicao);
        }

        // Limpar o timer
        delete timers[om];
    } else {
        alert('O apontamento ainda não foi iniciado para esta OM.');
    }
}

/**
 * Lidar com mensagens recebidas do servidor WebSocket.
 */
socket.onmessage = (event) => {
    const mensagem = JSON.parse(event.data);

    switch (mensagem.tipo) {
        case 'nova_requisicao': {
            const requisicao = mensagem.dados;

            // Adicionar a nova requisição ao histórico
            requisicoes.push(requisicao);
            atualizarHistorico(requisicao);
            console.log('Nova requisição adicionada:', requisicao);
            break;
        }

        case 'confirmar_apontamento': {
            const { om, tempoDeEspera } = mensagem.dados;

            // Atualizar o status da requisição no frontend
            const requisicao = requisicoes.find(req => req.om === om);
            if (requisicao) {
                requisicao.status = `Entregue (${tempoDeEspera}s)`;
                atualizarHistorico(requisicao);
            }
            break;
        }

        default:
            console.warn('Tipo de mensagem não reconhecido:', mensagem.tipo);
    }
};

/**
 * Lidar com erros na conexão WebSocket.
 */
socket.onerror = (error) => {
    console.error('Erro de WebSocket:', error);
    alert('Erro na conexão WebSocket. Verifique a conexão do servidor.');
};

/**
 * Lidar com o fechamento da conexão WebSocket.
 */
socket.onclose = () => {
    console.log('Conexão WebSocket fechada');
    alert('Conexão WebSocket encerrada.');
};