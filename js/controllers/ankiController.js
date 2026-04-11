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
        await this.renderTagPerformance();
        await this.renderWorkloadForecast();
    },

    updateStats: async function() {
        const stats = await window.ankiApi.getTodayStats();
        
        const elDue = document.getElementById('anki-stat-due');
        const elStudied = document.getElementById('anki-stat-studied');
        const elNew = document.getElementById('anki-stat-new');

        if (elDue) elDue.textContent = stats.due;
        if (elStudied) elStudied.textContent = stats.studied;
        if (elNew) elNew.textContent = stats.newCards;
    },

    renderHeatmap: async function() {
        const heatmapData = await window.ankiApi.getHeatmapData();
        const container = document.getElementById('anki-heatmap-grid');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Transform array to a map for easy lookup
        const records = {};
        let maxReviews = 1;
        heatmapData.forEach(entry => {
            records[entry[0]] = entry[1];
            if (entry[1] > maxReviews) maxReviews = entry[1];
        });

        // Let's generate last 180 days
        const today = new Date();
        const daysToRender = 180;
        
        // CSS Grid structure: columns are weeks (approx 180/7 = 26 cols), rows are days (7)
        // Heatmap should render columns from left (past) to right (today)
        
        for (let i = daysToRender; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            
            const formatStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const count = records[formatStr] || 0;
            
            const box = document.createElement('div');
            box.className = 'w-3 h-3 rounded-sm transition-all hover:scale-125 hover:z-10 cursor-pointer relative group';
            
            // Determine color intensity
            if (count === 0) {
                box.classList.add('bg-gray-100');
            } else {
                const ratio = count / maxReviews;
                if (ratio < 0.25) box.classList.add('bg-green-200');
                else if (ratio < 0.5) box.classList.add('bg-green-400');
                else if (ratio < 0.75) box.classList.add('bg-green-600');
                else box.classList.add('bg-green-800');
            }

            // Tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-[9px] whitespace-nowrap rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20';
            tooltip.textContent = `${count} revs em ${formatStr}`;
            box.appendChild(tooltip);

            container.appendChild(box);
        }
    },

    renderTagPerformance: async function() {
        const ctx = document.getElementById('chart-anki-lapses');
        if (!ctx) return;

        const lapsesData = await window.ankiApi.getTagLapses();
        const labels = Object.keys(lapsesData);
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

        const forecastData = await window.ankiApi.getWorkloadForecast(14); // 14 days forecast
        
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
                    backgroundColor: '#3b5df5',
                    borderRadius: 6,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f3f4f6' }, border: { dash: [4, 4] } },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) { return context.raw + ' cartões'; }
                        }
                    },
                    datalabels: { display: false }
                }
            }
        });
    }
};
