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

        // 2. Proximo Edital (stat card)
        const now = new Date();
        const upcomingEditais = editais
            .filter(e => !e.ignorado && e.dataProva && new Date(e.dataProva) >= now)
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

        // 4. Next Event Hero Card
        this.renderNextEvent(editais);

        // 5. Anki Stats (Async)
        this.updateAnkiStats();

        // 6. Charts
        this.renderProgressoChart(materias, cronograma);
        this.renderEditaisChart(editais);
    },

    safeSetText: function(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    },

    renderNextEvent: function(editais) {
        const card = document.getElementById('dash-next-event-card');
        if (!card) return;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Build list of all upcoming events (inscricao + prova) across all editais
        const events = [];
        editais.forEach(e => {
            if (e.ignorado) return;
            if (e.dataInscricao) {
                const d = new Date(e.dataInscricao + 'T00:00:00');
                if (d >= now) events.push({ date: d, tipo: 'Inscrição', edital: e.nome || 'Edital' });
            }
            if (e.dataProva) {
                const d = new Date(e.dataProva + 'T00:00:00');
                if (d >= now) events.push({ date: d, tipo: 'Prova', edital: e.nome || 'Edital' });
            }
        });

        if (events.length === 0) {
            card.classList.add('hidden');
            return;
        }

        // Sort to find the nearest
        events.sort((a, b) => a.date - b.date);
        const next = events[0];
        const diffMs = next.date - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        // Format date in pt-BR
        const dateFormatted = next.date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

        // Choose icon and color based on type
        const isProva = next.tipo === 'Prova';
        const iconHtml = isProva
            ? '<i class="ph-bold ph-exam text-yellow-400"></i>'
            : '<i class="ph-bold ph-pen-nib text-primary-400"></i>';
        const tipoBadgeColor = isProva ? 'text-yellow-400' : 'text-primary-400';

        // Update DOM
        const iconEl = document.getElementById('dash-next-event-icon');
        if (iconEl) iconEl.innerHTML = iconHtml;

        const typeEl = document.getElementById('dash-next-event-type');
        if (typeEl) {
            typeEl.textContent = `${next.tipo} · ${next.edital}`;
            typeEl.className = `text-[10px] font-black uppercase tracking-widest mb-1 ${tipoBadgeColor}`;
        }

        this.safeSetText('dash-next-event-name', next.edital);
        this.safeSetText('dash-next-event-date', dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1));

        const daysEl = document.getElementById('dash-next-event-days');
        if (daysEl) {
            daysEl.textContent = diffDays === 0 ? 'Hoje' : diffDays;
            daysEl.className = `text-4xl font-black leading-none ${diffDays <= 7 ? 'text-red-400' : diffDays <= 30 ? 'text-yellow-400' : 'text-white'}`;
        }

        // Show urgency badge if ≤ 7 days
        const badge = document.getElementById('dash-next-event-badge');
        if (badge) {
            if (diffDays <= 7) badge.classList.remove('hidden');
            else badge.classList.add('hidden');
        }

        card.classList.remove('hidden');
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
            if (e.ignorado) return;
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
    },

    updateAnkiStats: async function() {
        const ankiEl = document.getElementById('dash-stat-anki');
        const statusDot = document.getElementById('anki-status-dot');
        if (!ankiEl) return;

        if (window.ankiService) {
            const ankiResult = await window.ankiService.getDueCardsCount();
            
            if (ankiResult.success) {
                const count = ankiResult.count;
                ankiEl.textContent = count > 0 ? `${count} cards` : 'Zerado!';
                if (statusDot) {
                    statusDot.classList.remove('bg-gray-300', 'bg-red-500', 'animate-pulse');
                    statusDot.classList.add('bg-green-500');
                }
            } else {
                ankiEl.textContent = 'Offline';
                if (statusDot) {
                    statusDot.classList.remove('bg-gray-300', 'bg-green-500');
                    statusDot.classList.add('bg-red-500', 'animate-pulse');
                }
                
                // Exibe no console, para evitar span de toast toda vez que iniciar offline.
                // Usando window.utils.showToast daria aviso apenas na tela de dev ou num reload real.
                console.warn("Anki stats result: ", ankiResult.error);
            }
        }
    }
};
