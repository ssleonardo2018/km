// --- AUTENTICAÇÃO ---
async function fazerLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
        localStorage.setItem('token', data.session);
        localStorage.setItem('user_email', email);
        window.location.href = '/dashboard';
    } else {
        document.getElementById('msg').innerText = "Erro: " + data.error;
    }
}

function logout() {
    localStorage.clear();
    window.location.href = '/';
}

// --- DASHBOARD STATS & HISTÓRICO ---
async function atualizarCardsStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        const elementoKm = document.getElementById('total-km-mes');
        const elementoReg = document.getElementById('total-registros');

        if (elementoKm) elementoKm.innerText = `${(stats.total_km || 0).toFixed(2)} km`;
        if (elementoReg) elementoReg.innerText = stats.quantidade || 0;
    } catch (e) {
        console.error("Erro ao atualizar stats:", e);
    }
}

async function carregarHistorico() {
    try {
        const response = await fetch('/api/historico');
        const dados = await response.json();
        const lista = document.getElementById('lista-registros');
        if (!lista) return;

        lista.innerHTML = '';
        dados.forEach(reg => {
            const dataFormatada = new Date(reg.data).toLocaleDateString('pt-BR');
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="hist-item">
                    <span class="hist-carro">🚗 Carro: <b>${reg.veiculos?.carro || 'N/A'}</b></span>
                    <span class="hist-data">📅 ${dataFormatada}</span>
                    <div class="hist-detalhes">
                        KM: ${reg.km_inicial} ➔ ${reg.km_final} 
                        <b style="color: #27ae60;">(+${reg.km_total} km)</b>
                    </div>
                    <small class="hist-obs">${reg.observacoes || ''}</small>
                </div>
            `;
            lista.appendChild(li);
        });
    } catch (e) {
        console.error("Erro ao carregar histórico:", e);
    }
}

// --- PERFIL ---
async function atualizarEmail() {
    const novoEmail = document.getElementById('novo-email').value;
    if (!novoEmail) return alert("Digite um novo e-mail.");
    enviarAtualizacao({ email: novoEmail });
}

async function atualizarSenha() {
    const novaSenha = document.getElementById('nova-senha').value;
    if (novaSenha.length < 6) return alert("A senha deve ter no mínimo 6 caracteres.");
    enviarAtualizacao({ password: novaSenha });
}

async function enviarAtualizacao(dados) {
    const feedback = document.getElementById('perfil-feedback');
    if (feedback) feedback.innerText = "Processando...";
    try {
        const response = await fetch('/api/perfil/atualizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        const result = await response.json();
        if (response.ok) {
            feedback.style.color = "green";
            feedback.innerText = result.msg;
            if (dados.email) localStorage.setItem('user_email', dados.email);
        } else {
            feedback.style.color = "red";
            feedback.innerText = "Erro: " + result.error;
        }
    } catch (e) {
        if (feedback) feedback.innerText = "Erro de conexão.";
    }
}

// --- RELATÓRIOS E EXPORTAÇÃO ---
async function gerarRelatorio() {
    const inicio = document.getElementById('data-inicio').value;
    const fim = document.getElementById('data-fim').value;
    const tabela = document.getElementById('tabela-corpo');
    const stats = document.getElementById('stats-relatorio');
    const botoesExport = document.getElementById('export-buttons');

    const res = await fetch('/api/relatorio/filtrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inicio, fim })
    });

    const dados = await res.json();
    tabela.innerHTML = '';
    let kmTotal = 0;

    if (dados.length === 0) {
        tabela.innerHTML = '<tr><td colspan="5">Nenhum registro encontrado.</td></tr>';
        if (stats) stats.style.display = 'none';
        if (botoesExport) botoesExport.style.display = 'none';
        return;
    }

    dados.forEach(reg => {
        kmTotal += (reg.km_total || 0);
        tabela.innerHTML += `
            <tr>
                <td>${new Date(reg.data).toLocaleDateString('pt-BR')}</td>
                <td>${reg.veiculos?.carro || 'N/A'}</td>
                <td>${reg.km_inicial}</td>
                <td>${reg.km_final}</td>
                <td style="font-weight:bold">${reg.km_total} km</td>
            </tr>
        `;
    });

    if (stats) {
        stats.style.display = 'flex';
        document.getElementById('rel-total-km').innerText = `${kmTotal.toFixed(2)} km`;
        document.getElementById('rel-total-viagens').innerText = dados.length;
    }
    if (botoesExport) botoesExport.style.display = 'flex';
}

function exportarExcel() {
    const tabela = document.querySelector(".report-table");
    const wb = XLSX.utils.table_to_book(tabela, { sheet: "Relatorio_KM" });
    XLSX.writeFile(wb, `Relatorio_KM_Export.xlsx`);
}

// --- CARREGAMENTO INICIAL ---
async function carregarDados() {
    const email = localStorage.getItem('user_email') || "Usuário";
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) userNameElement.innerText = email.split('@')[0];

    try {
        const response = await fetch('/api/veiculos');
        const veiculos = await response.json();
        const select = document.getElementById('select-veiculos');
        const listaVeiculos = document.getElementById('lista-veiculos');
        
        if (select) {
            select.innerHTML = '<option value="">Selecione o veículo...</option>';
            veiculos.forEach(v => {
                let opt = document.createElement('option');
                opt.value = v.id; 
                opt.innerText = `Carro: ${v.carro} - Placa: ${v.placa}`;
                select.appendChild(opt);
            });
        }
        if (listaVeiculos) {
            listaVeiculos.innerHTML = '';
            veiculos.forEach(v => {
                listaVeiculos.innerHTML += `<li><span>🚗 <b>${v.carro}</b></span> <span>${v.placa}</span></li>`;
            });
        }
    } catch (e) { console.error("Erro ao carregar veículos:", e); }





    // Chamadas de inicialização dentro da função correta
    atualizarCardsStats();
    carregarHistorico();
}


// Carregar lista de motoristas no filtro ao abrir a página
async function carregarMotoristasFiltro() {
    const select = document.getElementById('select-motorista-rel');
    if (!select) return;

    try {
        const res = await fetch('/api/motoristas');
        const motoristas = await res.json();

        if (res.ok) {
            select.innerHTML = '<option value="">Selecione o Motorista...</option>';
            motoristas.forEach(m => {
                let opt = document.createElement('option');
                opt.value = m.id;
                // Usando 'truno' conforme está no seu banco de dados
                opt.innerText = `${m.nome} (${m.turno || 'Sem Turno'})`;
                select.appendChild(opt);
            });
        }
    } catch (error) {
        console.error("Erro ao carregar motoristas:", error);
    }
}

// Atualize também a parte que preenche o cabeçalho no gerarRelatorio()
// Procure esta linha dentro da função gerarRelatorio():



async function gerarRelatorio() {
    const motoristaId = document.getElementById('select-motorista-rel').value;
    const inicio = document.getElementById('data-inicio').value;
    const fim = document.getElementById('data-fim').value;
    const botoesExport = document.getElementById('export-buttons'); // Captura os botões

    if (!motoristaId) return alert("Selecione um motorista.");

    try {
        const res = await fetch('/api/relatorio/detalhado', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motorista_id: motoristaId, inicio, fim })
        });

        const data = await res.json();
        const tabela = document.getElementById('tabela-corpo');
        const cabecalho = document.getElementById('cabecalho-motorista');
        
        tabela.innerHTML = '';

        if (!data.registros || data.registros.length === 0) {
            tabela.innerHTML = '<tr><td colspan="6">Nenhum registro encontrado para este período.</td></tr>';
            cabecalho.style.display = 'none';
            if (botoesExport) botoesExport.style.display = 'none'; // Esconde se não houver dados
            return;
        }

        // Exibir Cabeçalho e Botões
        cabecalho.style.display = 'block';
        if (botoesExport) botoesExport.style.display = 'flex'; // ✅ MOSTRA OS BOTÕES AQUI

        // Preencher dados do motorista (usando 'truno' conforme seu banco)
        document.getElementById('rel-nome-motorista').innerText = data.motorista.nome;
        document.getElementById('rel-turno-motorista').innerText = data.motorista.truno || "N/A";
        
        const dataRef = inicio ? new Date(inicio) : new Date();
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        document.getElementById('rel-mes').innerText = meses[dataRef.getUTCMonth()];
        document.getElementById('rel-ano').innerText = dataRef.getUTCFullYear();

        // Preencher a Tabela
        data.registros.forEach(reg => {
            tabela.innerHTML += `
                <tr>
                    <td>${new Date(reg.data).toLocaleDateString('pt-BR')}</td>
                    <td>${reg.veiculos?.placa || ''}</td>
                    <td>${reg.km_inicial}</td>
                    <td>${reg.km_final}</td>
                    <td style="font-weight:bold">${reg.km_total} km</td>
                    <td>${reg.observacoes || '-'}</td>
                </tr>
            `;
        });

    } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        alert("Erro ao processar o relatório.");
    }
}

// Iniciar carregamento se estiver na página de relatórios
if (window.location.pathname.includes('relatorios')) {
    window.onload = carregarMotoristasFiltro;
}



// --- EVENTOS DE FORMULÁRIO ---
document.getElementById('form-registro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = {
        veiculo_id: document.getElementById('select-veiculos').value,
        km_inicial: document.getElementById('km_inicial').value,
        km_final: document.getElementById('km_final').value,
        observacao: document.getElementById('observacao').value
    };

    const res = await fetch('/api/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    });

    if (res.ok) {
        alert("✅ KM registrado!");
        document.getElementById('form-registro').reset();
        atualizarCardsStats();
        carregarHistorico();
    } else {
        alert("❌ Erro ao salvar.");
    }
});

// MODAL VEICULO
function abrirModalVeiculo() { document.getElementById('modal-veiculo').style.display = "block"; }
function fecharModalVeiculo() { document.getElementById('modal-veiculo').style.display = "none"; }

document.getElementById('form-veiculo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = {
        placa: document.getElementById('v_placa').value,
        numero_carro: document.getElementById('v_numero').value 
    };

    const response = await fetch('/api/registrar_veiculo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    });

    if (response.ok) {
        alert("✅ Veículo cadastrado!");
        fecharModalVeiculo();
        carregarDados();
    }
});
