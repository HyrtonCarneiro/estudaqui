window.dashboardController = {
    chartProgresso: null,
    chartEditais: null,

    init: function() {
        // Initialization if needed
    },

    update: function() {
        const state = window.store.getState();
        const materias = state.materias || [];
        const cronograma = state.cronograma || [];
        const editais = state.editais || [];

        // 1. Basic Stats
        const totalMaterias = materias.length;
        
        // Total Pages from ALL conteudos
        const conteudosSet = state.conteudos || [];
        const totalPaginas = conteudosSet.reduce((sum, c) => sum + (Number(c.paginas) || 0), 0);

        // Pages Read from cronograma items marked as completed
        const paginasLidas = cronograma.filter(i => i.concluido).reduce((sum, i) => sum + (Number(i.paginas) || 0), 0);
        
        const percGeral = totalPaginas > 0 ? Math.round((paginasLidas / totalPaginas) * 100) : 0;
        
        const semanasAtivas = (cronograma && cronograma.length > 0) ? new Set(cronograma.map(i => i.semana)).size : 0;

        // 2. Proximo Edital
        const now = new Date();
        const upcomingEditais = editais
            .filter(e => e.dataProva && new Date(e.dataProva) >= now)
            .sort((a, b) => new Date(a.dataProva) - new Date(b.dataProva));
        
        const proximo = upcomingEditais.length > 0 ? upcomingEditais[0].nome : "Nenhum";

        // 3. Update Stat Elements
        this.safeSetText('dash-stat-materias', totalMaterias);
        this.safeSetText('dash-stat-paginas', `${paginasLidas} / ${totalPaginas}`);
        this.safeSetText('dash-stat-semanas', semanasAtivas);
        this.safeSetText('dash-stat-proximo-edital', proximo);
        this.safeSetText('dash-perc-concluido', `${percGeral}%`);
        
        const progressBar = document.getElementById('dash-progress-bar');
        if (progressBar) progressBar.style.width = `${percGeral}%`;

        // 4. Chart: Progresso por Materia
        this.renderProgressoChart(materias, cronograma);
        
        // 5. Chart: Timeline de Editais
        this.renderEditaisChart(editais);
    },

    safeSetText: function(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    },

    renderProgressoChart: function(materias, cronograma) {
        if (typeof Chart === 'undefined') {
            console.warn("Dashboard: Chart.js not loaded yet.");
            return;
        }
        const state = window.store.getState();
        const conteudosSet = state.conteudos || [];
        const canvas = document.getElementById('chart-dash-progresso');
        const emptyMsg = document.getElementById('chart-dash-empty-msg');
        if (!canvas) return;

        if (this.chartProgresso) this.chartProgresso.destroy();

        if (materias.length === 0) {
            if (emptyMsg) emptyMsg.classList.remove('hidden');
            return;
        }
        if (emptyMsg) emptyMsg.classList.add('hidden');

        // Data: % of completion per subject
        const data = materias.map(m => {
            const totalPaginasMateria = conteudosSet
                .filter(c => c.materiaId === m.id)
                .reduce((sum, c) => sum + (Number(c.paginas) || 0), 0);
            
            if (totalPaginasMateria === 0) return 0;
            
            const lidoPaginasMateria = cronograma
                .filter(i => i.materiaId === m.id && i.concluido)
                .reduce((sum, i) => sum + (Number(i.paginas) || 0), 0);
                
            return Math.round((lidoPaginasMateria / totalPaginasMateria) * 100);
        });

        const labels = materias.map(m => m.nome);
        const colors = ['#253ee8', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#f59e0b', '#64748b'];

        this.chartProgresso = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, font: { size: 9, weight: 'bold' } }
                    },
                    tooltip: {
                        callbacks: { label: (context) => ` ${context.label}: ${context.raw}% concluído` }
                    }
                }
            }
        });
    },

    renderEditaisChart: function(editais) {
        if (typeof Chart === 'undefined') return;
        const canvas = document.getElementById('chart-dash-editais');
        if (!canvas) return;

        if (this.chartEditais) this.chartEditais.destroy();

        const monthlyData = {};
        const monthsNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        
        editais.forEach(e => {
            if (!e.dataProva) return;
            const date = new Date(e.dataProva);
            const key = `${monthsNames[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`;
            monthlyData[key] = (monthlyData[key] || 0) + 1;
        });

        const labels = Object.keys(monthlyData).sort((a,b) => {
            const [mA, yA] = a.split('/');
            const [mB, yB] = b.split('/');
            if (yA !== yB) return yA - yB;
            return monthsNames.indexOf(mA) - monthsNames.indexOf(mB);
        });

        const data = labels.map(l => monthlyData[l]);

        this.chartEditais = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Concursos',
                    data: data,
                    backgroundColor: '#253ee8',
                    borderRadius: 8,
                    barThickness: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10, weight: 'bold' } }, grid: { display: false } },
                    x: { ticks: { font: { size: 10, weight: 'bold' } }, grid: { display: false } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
};
