window.simuladosController = {
    chart: null,
    
    init: function() {
        this.cacheDOM();
        this.bindEvents();
        this.render();
    },

    cacheDOM: function() {
        this.btnNovo = document.getElementById('btn-novo-simulado');
        this.listEl = document.getElementById('list-simulados');
        this.canvas = document.getElementById('chart-simulados');
    },

    bindEvents: function() {
        if (this.btnNovo) {
            this.btnNovo.addEventListener('click', () => this.handleNovo());
        }
    },

    handleNovo: function() {
        const nome = prompt("Nome do simulado (ex: Simulado 01 - CEF):");
        if (!nome) return;
        const nota = prompt("Sua nota / porcentagem de acertos (ex: 85):");
        if (nota === null) return;
        
        try {
            window.store.addSimulado(nome, nota);
            window.utils.showToast("Simulado registrado!", "success");
            this.render();
        } catch (e) {
            window.utils.showToast("Erro: " + e.message, "error");
        }
    },

    render: function() {
        this.renderList();
        this.renderChart();
    },

    renderList: function() {
        if (!this.listEl) return;
        const simulados = window.store.getState().simulados;
        this.listEl.innerHTML = "";
        
        if (simulados.length === 0) {
            this.listEl.innerHTML = '<p class="text-sm text-gray-500 italic">Nenhum simulado registrado.</p>';
            return;
        }

        simulados.slice().reverse().forEach(s => {
            const date = new Date(s.data).toLocaleDateString();
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-primary-100 transition-all group';
            div.innerHTML = `
                <div class="flex-1">
                    <p class="text-sm font-bold text-gray-800">${s.nome}</p>
                    <p class="text-[10px] text-gray-400 uppercase font-bold tracking-widest">${date}</p>
                </div>
                <div class="flex items-center gap-4">
                    <span class="text-lg font-black text-primary-600">${s.nota}%</span>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="window.simuladosController.handleEditar('${s.id}')" class="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><i class="ph ph-pencil-simple"></i></button>
                        <button onclick="window.simuladosController.handleRemover('${s.id}')" class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><i class="ph ph-trash"></i></button>
                    </div>
                </div>
            `;
            this.listEl.appendChild(div);
        });
    },

    handleEditar: function(id) {
        const s = window.store.getState().simulados.find(sim => sim.id === id);
        if (!s) return;
        const novoNome = prompt("Novo nome:", s.nome);
        if (novoNome === null) return;
        const novaNota = prompt("Nova nota (%):", s.nota);
        if (novaNota === null) return;
        
        window.store.updateSimulado(id, { nome: novoNome, nota: novaNota });
        window.utils.showToast("Simulado atualizado!", "success");
        this.render();
    },

    handleRemover: function(id) {
        if (confirm("Deseja remover este simulado?")) {
            window.store.removeSimulado(id);
            window.utils.showToast("Simulado removido.", "info");
            this.render();
        }
    },

    renderChart: function() {
        if (!this.canvas) return;
        const simulados = window.store.getState().simulados;
        
        if (this.chart) this.chart.destroy();
        
        if (simulados.length === 0) return;

        const labels = simulados.map((s, index) => 'Sim ' + (index + 1));
        const data = simulados.map(s => s.nota);

        this.chart = new Chart(this.canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Desempenho (%)',
                    data: data,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointBackgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100 }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
};
