const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

// Configuração do banco de dados SQLite
const dbPath = path.join(__dirname, 'prd.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
        process.exit(1);
    }
    console.log('Conectado ao banco de dados SQLite.');
});

// Criação das tabelas, se não existirem
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS requisicoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            om TEXT NOT NULL,
            nl TEXT NOT NULL,
            vez INTEGER NOT NULL,
            mecanico TEXT NOT NULL,
            status TEXT NOT NULL,
            tempoDeEspera INTEGER DEFAULT 0,
            etapa TEXT DEFAULT 'Recebido',
            inicioTimestamp INTEGER DEFAULT NULL,
            envioTimestamp INTEGER DEFAULT NULL,
            separacaoTimestamp INTEGER DEFAULT NULL,
            timestamp INTEGER NOT NULL
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS historico (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            om TEXT NOT NULL,
            nl TEXT NOT NULL,
            vez INTEGER NOT NULL,
            mecanico TEXT NOT NULL,
            status TEXT NOT NULL,
            tempoDeEspera INTEGER DEFAULT 0,
            etapas TEXT NOT NULL,
            inicioTimestamp INTEGER DEFAULT NULL,
            envioTimestamp INTEGER DEFAULT NULL,
            separacaoTimestamp INTEGER DEFAULT NULL,
            timestamp INTEGER NOT NULL
        )
    `);
});

// Configuração do servidor HTTP e WebSocket
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuração do CORS
app.use(cors({ origin: 'https://seusite.com' })); // Substitua pelo domínio do seu frontend

// Serve arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Função para enviar mensagens a todos os clientes conectados
function broadcast(tipo, dados) {
    const mensagem = JSON.stringify({ tipo, dados });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(mensagem);
        }
    });
}

// Obter requisições pendentes do banco de dados
function obterRequisicoes(callback) {
    db.all('SELECT * FROM requisicoes WHERE status != "Entregue"', (err, rows) => {
        if (err) {
            console.error('Erro ao buscar requisições:', err.message);
            return callback([]);
        }
        callback(rows);
    });
}

// Configuração dos eventos WebSocket
wss.on('connection', (ws) => {
    console.log('Novo cliente conectado.');

    // Envia a lista de requisições ao cliente conectado
    obterRequisicoes((rows) => {
        ws.send(JSON.stringify({ tipo: 'requisicoes', dados: rows }));
    });

    // Configuração do ping/pong para manter a conexão ativa
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', async (data) => {
        try {
            const mensagem = JSON.parse(data);

            switch (mensagem.tipo) {
                case 'ping':
                    ws.isAlive = true;
                    break;

                case 'nova_requisicao': {
                    const { om, nl, vez, mecanico } = mensagem.dados;

                    // Validação dos dados
                    if (!om || !nl || !vez || !mecanico) {
                        console.error('Dados incompletos para nova requisição:', mensagem.dados);
                        ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Dados incompletos.' }));
                        return;
                    }

                    const timestamp = Math.floor(Date.now() / 1000);

                    try {
                        const result = await db.run(
                            'INSERT INTO requisicoes (om, nl, vez, mecanico, status, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                            [om, nl, vez, mecanico, 'Pendente', timestamp]
                        );
                        console.log('Nova requisição adicionada:', mensagem.dados);
                        broadcast('nova_requisicao', { id: result.lastID, ...mensagem.dados, timestamp });
                    } catch (err) {
                        console.error('Erro ao adicionar requisição:', err.message);
                        ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Erro ao adicionar requisição.' }));
                    }
                    break;
                }

                case 'confirmar_entrega': {
                    const { om, tempoDeEspera, etapas } = mensagem.dados;

                    try {
                        const row = await db.get('SELECT * FROM requisicoes WHERE om = ?', [om]);
                        if (!row) {
                            console.error('Requisição não encontrada:', om);
                            ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Requisição não encontrada.' }));
                            return;
                        }

                        await db.run(
                            'UPDATE requisicoes SET status = ?, tempoDeEspera = ? WHERE om = ?',
                            ['Entregue', tempoDeEspera, om]
                        );

                        await db.run(
                            'INSERT INTO historico (om, nl, vez, mecanico, status, tempoDeEspera, etapas, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                            [row.om, row.nl, row.vez, row.mecanico, 'Entregue', tempoDeEspera, etapas, row.timestamp]
                        );

                        console.log('Requisição confirmada como entregue e movida para o histórico:', om);
                        obterRequisicoes((rows) => broadcast('requisicoes', rows));
                    } catch (err) {
                        console.error('Erro ao confirmar entrega:', err.message);
                        ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Erro ao confirmar entrega.' }));
                    }
                    break;
                }

                case 'atualizar_etapa': {
                    const { om, etapa } = mensagem.dados;

                    try {
                        await db.run('UPDATE requisicoes SET etapa = ? WHERE om = ?', [etapa, om]);
                        console.log(`Etapa da requisição ${om} atualizada para: ${etapa}`);
                        obterRequisicoes((rows) => broadcast('requisicoes', rows));
                    } catch (err) {
                        console.error('Erro ao atualizar etapa:', err.message);
                        ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Erro ao atualizar etapa.' }));
                    }
                    break;
                }

                case 'obter_relatorio': {
                    try {
                        const rows = await db.all('SELECT * FROM historico');
                        ws.send(JSON.stringify({ tipo: 'relatorio', dados: rows }));
                    } catch (err) {
                        console.error('Erro ao buscar relatório:', err.message);
                        ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Erro ao carregar o relatório.' }));
                    }
                    break;
                }

                case 'relatorio_mensal': {
                    const inicioMes = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);
                    const fimMes = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getTime() / 1000);

                    try {
                        const nlsMaisRepetidos = await db.all(
                            'SELECT nl, COUNT(nl) AS total_nl FROM historico WHERE timestamp BETWEEN ? AND ? GROUP BY nl ORDER BY total_nl DESC LIMIT 3',
                            [inicioMes, fimMes]
                        );

                        const rankingOms = await db.all(
                            'SELECT om, COUNT(om) AS total_om FROM historico WHERE timestamp BETWEEN ? AND ? GROUP BY om ORDER BY total_om DESC LIMIT 3',
                            [inicioMes, fimMes]
                        );

                        ws.send(JSON.stringify({ tipo: 'relatorio_mensal', nlsMaisRepetidos, rankingOms }));
                    } catch (err) {
                        console.error('Erro ao gerar relatório mensal:', err.message);
                        ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Erro ao gerar relatório mensal.' }));
                    }
                    break;
                }

                default:
                    console.warn('Tipo de mensagem desconhecido:', mensagem.tipo);
                    ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Tipo de mensagem desconhecido.' }));
                    break;
            }
        } catch (err) {
            console.error('Erro ao processar mensagem:', err.message);
            ws.send(JSON.stringify({ tipo: 'erro', mensagem: 'Erro ao processar mensagem.' }));
        }
    });

    ws.on('close', () => {
        console.log('Cliente desconectado.');
    });
});

// Intervalo para verificar conexões inativas
setInterval(() => {
    wss.clients.forEach((client) => {
        if (!client.isAlive) {
            client.terminate();
            return;
        }
        client.isAlive = false;
        client.ping();
    });
}, 30000); // A cada 30 segundos

// Inicializa o servidor
const PORT = 3030;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});