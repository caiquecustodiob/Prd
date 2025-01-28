const socket = new WebSocket(window.WEBSOCKET_URL); // Conectar ao servidor WebSocket

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

/**
 * Manter a conexão ativa com pings regulares.
 */
setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ tipo: 'ping' }));
    }
}, 30000);

let previousScrollPosition = window.scrollY; // Posição inicial do scroll
    
window.addEventListener("scroll", () => {
    const currentScrollPosition = window.scrollY;
    const header = document.querySelector(".sticky-header");

    if (currentScrollPosition > previousScrollPosition) {
        // Rolando para baixo, esconda o cabeçalho
        header.style.transform = "translateY(-100%)";
    } else {
        // Rolando para cima, mostre o cabeçalho
        header.style.transform = "translateY(0)";
    }

    previousScrollPosition = currentScrollPosition;
});

// Inicialize a biblioteca AOS
AOS.init({
    duration: 1000,
    once: true,
});