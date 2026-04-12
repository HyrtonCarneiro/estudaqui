window.ankiController = {
    initialized: false,
    chartWorkload: null,
    chartLapses: null,

    init: async function() {
        if (!this.initialized) {
            this.bindEvents();
            this.initialized = true;
        }
        await this.render();
    },

    bindEvents: function() {
        const btnRetry = document.getElementById('btn-anki-retry');
        if (btnRetry) {
            btnRetry.addEventListener('click', () => {
                this.render();
            });
        }
    },

    render: async function() {
        const containerApp = document.getElementById('anki-app-container');
        const containerError = document.getElementById('anki-error-container');
        
        // Exibir loading ou ocultar error preventivamente
        containerApp.classList.add('hidden');
        containerError.classList.add('hidden');
        
        const isConnected = await window.ankiApi.checkConnection();
        
        if (!isConnected) {
            containerError.classList.remove('hidden');
            return;
        }

        containerApp.classList.remove('hidden');
        
        await this.updateStats();
        await this.renderHeatmap();
        await this.renderSyllabus();
        await this.renderTagPerformance();
        await this.renderWorkloadForecast();
    },

    renderSyllabus: async function() {
        const container = document.getElementById('anki-syllabus-list');
        if (!container) return;

        container.innerHTML = '<div class="flex items-center justify-center p-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>';

        const data = await window.ankiApi.getSyllabusData();
        container.innerHTML = '';

        const materias = Object.keys(data).sort((a,b) => data[b].total - data[a].total);

        if (materias.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 text-sm py-10">Nenhuma matéria com cards encontrada.</p>';
            return;
        }

        materias.forEach(subject => {
            const stats = data[subject];
            const matCard = document.createElement('div');
            matCard.className = 'bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:border-primary-200 transition-all group';
            
            const youngPerc = Math.round((stats.young / stats.total) * 100);
            const maturePerc = Math.round((stats.mature / stats.total) * 100);
            const newPerc = 100 - youngPerc - maturePerc;

            matCard.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <h4 class="text-xs font-black text-gray-800 uppercase tracking-tight">${subject}</h4>
                    <span class="text-[9px] font-bold text-gray-400">${stats.total} cards</span>
                </div>
                <div class="flex h-1.5 w-full rounded-full overflow-hidden bg-gray-200 mb-2">
                    <div class="bg-green-500 h-full" style="width: ${maturePerc}%"></div>
                    <div class="bg-blue-400 h-full" style="width: ${youngPerc}%"></div>
                    <div class="bg-gray-300 h-full" style="width: ${newPerc}%"></div>
                </div>
                <div class="flex justify-between text-[9px] font-bold">
                    <div class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> Maduros ${maturePerc}%</div>
                    <div class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Jovens ${youngPerc}%</div>
                    <div class="flex items-center gap-1 text-red-500"><i class="ph-bold ph-warning"></i> ${stats.lapses} falhas</div>
                </div>
            `;
            container.appendChild(matCard);
        });
    },

    updateStats: async function() {
        const stats = await window.ankiApi.getTodayStats();
        
        const elDue = document.getElementById('anki-stat-due');
        const elLearn = document.getElementById('anki-stat-learn');
        const elNew = document.getElementById('anki-stat-new');
        const elTime = document.getElementById('anki-stat-time');
        const elAvg = document.getElementById('anki-stat-avg');

        if (elDue) elDue.textContent = stats.due;
        if (elLearn) elLearn.textContent = stats.learn;
        if (elNew) elNew.textContent = stats.newCards;
        
        if (elTime) {
            const mins = Math.round(stats.timeMs / 60000);
            elTime.textContent = mins + 'm';
        }
        
        if (elAvg) {
            const secs = Math.round(stats.avgMs / 1000);
            elAvg.textContent = secs + 's';
        }
    },

    renderHeatmap: async function() {
        const heatmapData = await window.ankiApi.getHeatmapData();
        const container = document.getElementById('anki-heatmap-grid');
        const elStreak = document.getElementById('anki-heatmap-streak');
        const elTotal = document.getElementById('anki-heatmap-total');
        if (!container) return;
        
        container.innerHTML = '';
        
        let totalReviews = 0;
        let streak = 0;
        let currentStreakCount = 0;
        
        // Transform array to a map for easy lookup
        const records = {};
        let maxReviews = 1;
        heatmapData.forEach(entry => {
            records[entry[0]] = entry[1];
            totalReviews += entry[1];
            if (entry[1] > maxReviews) maxReviews = entry[1];
        });

        // Calculate current streak
        const today = new Date();
        const checkDate = new Date(today);
        while (records[`${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`] > 0) {
            currentStreakCount++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
        
        if (elStreak) elStreak.textContent = currentStreakCount;
        if (elTotal) elTotal.textContent = totalReviews >= 1000 ? (totalReviews/1000).toFixed(1) + 'k' : totalReviews;

        const daysToRender = 180;
        for (let i = daysToRender; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            
            const formatStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const displayStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            
            const count = records[formatStr] || 0;
            const box = document.createElement('div');
            box.className = 'w-3 h-3 rounded-sm transition-all hover:scale-125 hover:z-10 cursor-pointer relative group';
            
            if (count === 0) {
                box.classList.add('bg-gray-100');
            } else {
                const ratio = count / maxReviews;
                if (ratio < 0.25) box.classList.add('bg-green-200');
                else if (ratio < 0.5) box.classList.add('bg-green-400');
                else if (ratio < 0.75) box.classList.add('bg-green-600');
                else box.classList.add('bg-green-800');
            }

            const tooltip = document.createElement('div');
            tooltip.className = 'absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-[9px] whitespace-nowrap rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20';
            tooltip.textContent = `${count} revs em ${displayStr}`;
            box.appendChild(tooltip);
            container.appendChild(box);
        }
    },

    renderTagPerformance: async function() {
        const ctx = document.getElementById('chart-anki-lapses');
        if (!ctx) return;

        const lapsesData = await window.ankiApi.getTagLapses();
        const labels = Object.keys(lapsesData);
        
        const emptyMsgId = 'anki-lapses-empty-msg';
        let emptyMsg = document.getElementById(emptyMsgId);

        if (labels.length === 0) {
            ctx.style.display = 'none';
            if (!emptyMsg) {
                emptyMsg = document.createElement('div');
                emptyMsg.id = emptyMsgId;
                emptyMsg.className = 'flex flex-col items-center justify-center text-gray-400 w-full h-full';
                emptyMsg.innerHTML = '<i class="ph-fill ph-check-circle text-4xl mb-2 text-green-500"></i><p class="text-sm font-bold text-center">Nenhum erro crítico detectado!</p><p class="text-xs text-center mt-1 leading-relaxed">Você ainda não errou cartões repetidas vezes nas revisões<br>ou seus cartões no Anki não possuem <b>Tags</b>.</p>';
                ctx.parentElement.appendChild(emptyMsg);
            } else {
                emptyMsg.style.display = 'flex';
            }
            if (this.chartLapses) {
                this.chartLapses.destroy();
            }
            return;
        } else {
            ctx.style.display = 'block';
            if (emptyMsg) emptyMsg.style.display = 'none';
        }

        // Sort by most errors
        labels.sort((a, b) => lapsesData[b] - lapsesData[a]);
        
        // Top 10 to not overcrowd the pie chart
        const topLabels = labels.slice(0, 10);
        const topValues = topLabels.map(l => lapsesData[l]);

        if (this.chartLapses) {
            this.chartLapses.destroy();
        }

        const colors = [
            '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', 
            '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7'
        ];

        this.chartLapses = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: topLabels,
                datasets: [{
                    data: topValues,
                    backgroundColor: colors,
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 10, font: { family: 'Outfit' } } },
                    tooltip: { callbacks: { label: function(context) { return ' ' + context.label + ': ' + context.raw + ' erros'; } } },
                    datalabels: { display: false } // hide external plugin text if used globally
                },
                cutout: '70%'
            }
        });
    },

    renderWorkloadForecast: async function() {
        const ctx = document.getElementById('chart-anki-workload');
        if (!ctx) return;

        const forecastData = await window.ankiApi.getWorkloadForecast(28); // 28 days forecast
        
        const labels = forecastData.map(d => d.day);
        const data = forecastData.map(d => d.count);

        if (this.chartWorkload) {
            this.chartWorkload.destroy();
        }

        this.chartWorkload = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revisões Devidas',
                    data: data,
                    backgroundColor: forecastData.map((d, i) => i === 0 ? '#3b82f6' : '#e5e7eb'),
                    hoverBackgroundColor: '#3b82f6',
                    borderRadius: 4,
                    barPercentage: 0.8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: '#f9fafb' }, 
                        ticks: { font: { size: 9, family: 'Outfit' } } 
                    },
                    x: { 
                        grid: { display: false }, 
                        ticks: { 
                            font: { size: 9, family: 'Outfit' },
                            maxRotation: 0,
                            callback: function(val, index) {
                                // Show only every 3rd label for better readability if many days
                                return index % 3 === 0 ? this.getLabelForValue(val) : '';
                            }
                        } 
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#111827',
                        padding: 12,
                        titleFont: { size: 10, family: 'Outfit', weight: '900' },
                        bodyFont: { size: 12, family: 'Outfit' },
                        displayColors: false,
                        callbacks: { 
                            title: function(items) { return items[0].label; },
                            label: function(context) { return ' ' + context.raw + ' cartões devidos'; } 
                        }
                    },
                    datalabels: { display: false }
                }
            }
        });
    }
};
