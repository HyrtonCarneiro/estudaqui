window.dashboardController = {
    chart: null,
    
    update: function() {
        const state = window.store.getState();
        this.updateKPIs(state);
        this.renderRevisoes(state);
        this.renderTopMaterias(state);
        this.renderCharts(state);
    },

    updateKPIs: function(state) {
        const elMaterias = document.getElementById('dash-total-materias');
        const elConteudos = document.getElementById('dash-total-conteudos');
        const elPaginas = document.getElementById('dash-total-paginas');
        
        const totalPaginas = (state.cronograma || []).filter(i => i.concluido).reduce((sum, i) => sum + (Number(i.paginas) || 0), 0);
        
        if (elMaterias) elMaterias.textContent = state.materias.length;
        if (elConteudos) elConteudos.textContent = state.cronograma.length;
        if (elPaginas) elPaginas.textContent = totalPaginas;
    },

    renderRevisoes: function(state) {
        const container = document.getElementById('list-revisoes-hoje');
        if (!container) return;
        
        const revisoesHoje = window.spacedRepetition ? window.spacedRepetition.getRevisoesParaHoje() : [];
        
        container.innerHTML = "";
        
        if (revisoesHoje.length === 0) {
            container.innerHTML = `
                <div class="py-12 text-center bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200">
                    <i class="ph ph-confetti text-primary-300 text-5xl mb-4"></i>
                    <p class="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Tudo revisado por hoje!</p>
                </div>
            `;
            return;
        }

        revisoesHoje.forEach(rev => {
            const conteudo = state.conteudos.find(c => c.id === rev.conteudoId);
            const materia = state.materias.find(m => m.id === (conteudo ? conteudo.materiaId : ''));
            
            const div = document.createElement('div');
            div.className = 'group flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm hover:shadow-premium hover:border-primary-100 transition-all';
            div.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 font-black text-xs">
                        <i class="ph-fill ph-book-open text-lg"></i>
                    </div>
                    <div>
                        <p class="text-[9px] font-black text-primary-500 uppercase tracking-widest mb-1">${materia ? materia.nome : '-'}</p>
                        <h4 class="font-bold text-gray-800 tracking-tight">${conteudo ? conteudo.nome : 'Desconhecido'}</h4>
                    </div>
                </div>
                <button onclick="window.dashboardController.concluirRevisao('${rev.id}')" class="w-10 h-10 rounded-xl bg-gray-50 text-gray-300 hover:bg-green-500 hover:text-white transition-all flex items-center justify-center active:scale-95 shadow-lg">
                    <i class="ph-bold ph-check"></i>
                </button>
            `;
            container.appendChild(div);
        });
    },

    renderTopMaterias: function(state) {
        const container = document.getElementById('list-top-materias');
        if (!container) return;
        
        container.innerHTML = "";
        
        const cronograma = state.cronograma || [];
        const counts = {};
        cronograma.filter(i => i.concluido).forEach(i => {
            const materia = state.materias.find(m => m.id === i.materiaId);
            const nome = materia ? materia.nome : 'Matéria';
            counts[nome] = (counts[nome] || 0) + 1;
        });

        const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 4);
        
        if (sorted.length === 0) {
            container.innerHTML = '<div class="py-10 text-center opacity-40"><p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Sem dados de progresso</p></div>';
            return;
        }

        sorted.forEach(([nome, total]) => {
            const perc = Math.min(100, (total / 10) * 100);
            const div = document.createElement('div');
            div.className = 'space-y-2';
            div.innerHTML = `
                <div class="flex justify-between items-center text-[10px]">
                    <span class="font-black text-gray-900 uppercase tracking-tight">${nome || 'Matéria'}</span>
                    <span class="font-black text-primary-600">${total} CONCLUÍDOS</span>
                </div>
                <div class="h-2 w-full bg-primary-50 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-primary-500 to-primary-700 transition-all duration-1000 shadow-sm" style="width: ${perc}%"></div>
                </div>
            `;
            container.appendChild(div);
        });
    },

    concluirRevisao: function(id) {
        if (window.spacedRepetition) {
            window.spacedRepetition.concluirRevisao(id);
            window.utils.showToast("Revisão concluída!", "success");
            this.update();
        }
    },

    renderCharts: function(state) {
        const canvas = document.getElementById('chart-dashboard-distrib');
        if (!canvas) return;

        if (this.chart) this.chart.destroy();
        if (state.materias.length === 0) return;

        const dataArr = state.materias.map(m => {
            return (state.cronograma || []).filter(i => i.materiaId === m.id).length;
        });

        this.chart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: state.materias.map(m => m.nome),
                datasets: [{
                    data: dataArr,
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
};
