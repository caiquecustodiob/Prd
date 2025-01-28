document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Impede o envio padrão do formulário

    // Dicionários de usuários e senhas
    const usuariosRequisitar = {
        'lucasaraujo': '314159',
        'caique': '201823',
        'alexandre': '123456',
        'tyson': 'Tytyty',
        'luan': '12nordeste34l',
        'emanuel': 'manuadm',
        'luciano': '654321',
    };

    const usuariosReceber = {
        'oliveira': 'olioli',
        'manuel': 'manumanu',
        'custodio': '201823',
        'adm': 'receberadm',
    };

    // Obtém as informações do formulário
    const usuario = document.getElementById('usuario').value;
    const senha = document.getElementById('senha').value;

    // Valida se todos os campos foram preenchidos
    if (usuario === '' || senha === '') {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    // Verifica se o usuário está no dicionário de "Requisitar"
    if (usuario in usuariosRequisitar) {
        if (usuariosRequisitar[usuario] === senha) {
            window.location.href = 'requisicao.html'; // Redireciona para a tela de requisição
        } else {
            alert('Senha incorreta para o usuário requisitar.');
        }
        return;
    }

    // Verifica se o usuário está no dicionário de "Receber"
    if (usuario in usuariosReceber) {
        if (usuariosReceber[usuario] === senha) {
            window.location.href = 'recebimento.html'; // Redireciona para a tela de recebimento
        } else {
            alert('Senha incorreta para o usuário receber.');
        }
        return;
    }

    // Caso o usuário não esteja em nenhum dos dois dicionários
    alert('Usuário não encontrado. Verifique o nome de usuário e tente novamente.');
});
