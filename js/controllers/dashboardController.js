window.dashboardController = {
    chartProgresso: null,
    chartEditais: null,

    init: function() {
        // Register datalabels plugin globally
        if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
            Chart.register(ChartDataLabels);
        }
    },

    update: function() {
        const state = window.store.getState();
        const materias = state.materias || [];
        const cronograma = state.cronograma || [];
        const editais = state.editais || [];

        // 1. Basic Stats
        const totalMaterias = materias.length;
        const conteudosSet = state.conteudos || [];
        const totalPaginas = conteudosSet.reduce((sum, c) => sum + (Number(c.paginas) || 0), 0);
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

        // 4. Chart Refactoring
        this.renderProgressoChart(materias, cronograma);
        this.renderEditaisChart(editais);
    },

    safeSetText: function(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    },

    renderProgressoChart: function(materias, cronograma) {
        if (typeof Chart === 'undefined') return;
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

        // ORDER: As they appear in the cronograma
        const orderedMateriaIds = [];
        cronograma.forEach(item => {
            if (!orderedMateriaIds.includes(item.materiaId)) {
                orderedMateriaIds.push(item.materiaId);
            }
        });
        
        // Add remaining materias that are NOT in cronograma yet
        materias.forEach(m => {
            if (!orderedMateriaIds.includes(m.id)) {
                orderedMateriaIds.push(m.id);
            }
        });

        const sortedMaterias = orderedMateriaIds
            .map(id => materias.find(m => m.id === id))
            .filter(m => !!m);

        // DATA: % of completion per subject
        const data = sortedMaterias.map(m => {
            const totalPaginasMateria = conteudosSet
                .filter(c => c.materiaId === m.id)
                .reduce((sum, c) => sum + (Number(c.paginas) || 0), 0);
            
            if (totalPaginasMateria === 0) return 0;
            
            const lidoPaginasMateria = cronograma
                .filter(i => i.materiaId === m.id && i.concluido)
                .reduce((sum, i) => sum + (Number(i.paginas) || 0), 0);
                
            return Math.round((lidoPaginasMateria / totalPaginasMateria) * 100);
        });

        const labels = sortedMaterias.map(m => m.nome);

        this.chartProgresso = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '% Concluído',
                    data: data,
                    backgroundColor: '#3b5df5',
                    borderRadius: 6,
                    barThickness: 24
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // User said "cada materia tendo sua barra", horizontal is best for labels
                scales: {
                    x: { 
                        beginAtZero: true, 
                        max: 100, 
                        grid: { display: true, color: '#f1f5f9' },
                        ticks: { callback: value => value + '%', font: { size: 10 } }
                    },
                    y: { 
                        grid: { display: false },
                        ticks: { font: { size: 10, weight: 'bold' } }
                    }
                },
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'right',
                        formatter: (val) => val + '%',
                        font: { weight: 'bold', size: 10 },
                        color: '#64748b'
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

        if (editais.length === 0) return;

        const monthsNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const monthlyInsc = {};
        const monthlyProva = {};
        
        // Collect all months involved
        const allMonths = new Set();

        editais.forEach(e => {
            if (e.dataInscricao) {
                const d = new Date(e.dataInscricao);
                const key = `${monthsNames[d.getMonth()]}/${d.getFullYear().toString().slice(-2)}`;
                monthlyInsc[key] = (monthlyInsc[key] || 0) + 1;
                allMonths.add(key);
            }
            if (e.dataProva) {
                const d = new Date(e.dataProva);
                const key = `${monthsNames[d.getMonth()]}/${d.getFullYear().toString().slice(-2)}`;
                monthlyProva[key] = (monthlyProva[key] || 0) + 1;
                allMonths.add(key);
            }
        });

        const sortedLabels = Array.from(allMonths).sort((a,b) => {
            const [mA, yA] = a.split('/');
            const [mB, yB] = b.split('/');
            if (yA !== yB) return yA - yB;
            return monthsNames.indexOf(mA) - monthsNames.indexOf(mB);
        });

        const dataInsc = sortedLabels.map(l => monthlyInsc[l] || 0);
        const dataProva = sortedLabels.map(l => monthlyProva[l] || 0);

        this.chartEditais = new Chart(canvas, {
            type: 'line',
            data: {
                labels: sortedLabels,
                datasets: [
                    {
                        label: 'Inscrições',
                        data: dataInsc,
                        borderColor: '#3b5df5', // Blue
                        backgroundColor: '#3b5df544',
                        tension: 0.3,
                        fill: false,
                        pointRadius: 4,
                        pointBackgroundColor: '#3b5df5'
                    },
                    {
                        label: 'Provas',
                        data: dataProva,
                        borderColor: '#ef4444', // Red
                        backgroundColor: '#ef444444',
                        tension: 0.3,
                        fill: false,
                        pointRadius: 4,
                        pointBackgroundColor: '#ef4444'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true, 
                        ticks: { stepSize: 1, font: { size: 10 } },
                        grid: { display: true, color: '#f1f5f9' }
                    },
                    x: { 
                        grid: { display: true, color: '#f1f5f9' },
                        ticks: { font: { size: 10, weight: 'bold' } }
                    }
                },
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, font: { weight: 'bold', size: 10 } } },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: (val) => val > 0 ? val : '',
                        font: { weight: 'bold', size: 10 },
                        color: context => context.dataset.borderColor
                    }
                }
            }
        });
    }
};
