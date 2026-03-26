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
            this.btnNovo.onclick = () => this.handleNovo();
        }
    },

    handleNovo: function() {
        const nome = prompt("Nome do simulado (ex: Simulado 01 - Receita):");
        if (!nome) return;
        const nota = prompt("Seu percentual de acertos (ex: 85):");
        if (nota === null) return;
        
        try {
            window.store.addSimulado(nome, nota);
            window.utils.showToast("Simulado registrado!", "success");
            // render will be called by state listener in real app, but we trigger here to be sure
            this.render();
        } catch (e) {
            window.utils.showToast("Erro: " + e.message, "error");
        }
    },

    render: function() {
        if (!this.listEl) return;
        const state = window.store.getState();
        const simulados = state.simulados || [];
        
        this.listEl.innerHTML = "";
        
        if (simulados.length === 0) {
            this.listEl.innerHTML = `
                <div class="py-10 text-center opacity-40">
                    <i class="ph ph-mask-sad text-4xl mb-2"></i>
                    <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Ainda sem histórico</p>
                </div>
            `;
            return;
        }

        [...simulados].reverse().forEach(s => {
            const date = s.data ? new Date(s.data).toLocaleDateString() : '--/--';
            const perc = s.percentual || 0;
            const colorClass = perc >= 80 ? 'text-green-500' : perc >= 60 ? 'text-orange-500' : 'text-red-500';
            
            const div = document.createElement('div');
            div.className = 'group bg-gray-50/50 p-5 rounded-[1.5rem] border border-transparent hover:border-primary-100 hover:bg-white transition-all flex items-center justify-between';
            div.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full border-2 border-dashed border-gray-100 flex items-center justify-center font-black ${colorClass} text-sm">
                        ${perc}%
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-800 text-sm leading-tight">${s.nome}</h4>
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">${date}</p>
                    </div>
                </div>
                <div class="flex gap-2 relative z-10">
                    <button onclick="window.simuladosController.handleEditar('${s.id}')" class="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all shadow-md active:scale-95"><i class="ph-bold ph-pencil-simple"></i> <span class="text-[9px] font-black uppercase">Editar</span></button>
                    <button onclick="window.simuladosController.handleRemover('${s.id}')" class="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-md active:scale-95"><i class="ph-bold ph-trash"></i> <span class="text-[9px] font-black uppercase">Excluir</span></button>
                </div>
            `;
            this.listEl.appendChild(div);
        });
        
        this.renderChart(simulados);
    },

    handleEditar: function(id) {
        const s = window.store.getState().simulados.find(sim => sim.id === id);
        if (!s) return;
        const novoNome = prompt("Novo nome:", s.nome);
        if (novoNome === null) return;
        const novaNota = prompt("Nova nota (%):", s.percentual || s.nota);
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

    renderChart: function(simulados) {
        if (!this.canvas) return;
        if (!simulados) simulados = window.store.getState().simulados || [];
        
        if (this.chart) this.chart.destroy();
        if (simulados.length === 0) return;

        const labels = simulados.map((s, index) => 'Sim ' + (index + 1));
        const data = simulados.map(s => s.percentual || s.nota);

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
                    pointBackgroundColor: '#3b82f6',
                    pointBorderWidth: 0,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { font: { size: 10, weight: 'bold' } } },
                    x: { ticks: { font: { size: 10, weight: 'bold' } } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
};
