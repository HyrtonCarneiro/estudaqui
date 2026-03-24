import { KPICard } from '../components/KPICard.js';
import { registerCharts } from '../logic/chartConfig.js';

export const render = async () => {
    return `
        <div class="space-y-8 animate-in fade-in duration-500">
            <!-- Header Section -->
            <div class="flex flex-col gap-1">
                <h1 class="text-2xl font-black text-secondary-900">Estatísticas de Desempenho</h1>
                <p class="text-secondary-500 text-sm">Acompanhe sua evolução e métricas de estudo em tempo real.</p>
            </div>

            <!-- KPI Cards Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                ${KPICard({ 
                    title: "Total de Horas", 
                    value: "124h", 
                    iconClass: "ph-clock", 
                    trend: { value: '12%', isPositive: true } 
                })}
                ${KPICard({ 
                    title: "Média Diária", 
                    value: "5.4h", 
                    iconClass: "ph-trend-up", 
                    trend: { value: '0.5h', isPositive: true } 
                })}
                ${KPICard({ 
                    title: "Questões Feitas", 
                    value: "842", 
                    iconClass: "ph-target" 
                })}
                ${KPICard({ 
                    title: "Taxa de Acerto", 
                    value: "78%", 
                    iconClass: "ph-check-circle", 
                    trend: { value: '3%', isPositive: true } 
                })}
            </div>

            <!-- Main Charts Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Study Evolution (Large) -->
                <div class="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-secondary-100 flex flex-col gap-4">
                    <h2 class="text-lg font-bold text-secondary-800">Evolução de Estudos</h2>
                    <div class="h-64">
                        <canvas id="evolutionChart"></canvas>
                    </div>
                </div>

                <!-- Distribution by Subject -->
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-secondary-100 flex flex-col gap-4">
                    <h2 class="text-lg font-bold text-secondary-800">Distribuição por Matéria</h2>
                    <div class="h-64 flex items-center justify-center">
                        <canvas id="distributionChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
};

export const init = () => {
    registerCharts();

    const ctxEvolution = document.getElementById('evolutionChart');
    if (ctxEvolution) {
        new Chart(ctxEvolution, {
            type: 'line',
            data: {
                labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'],
                datasets: [{
                    label: 'Horas Estudadas',
                    data: [4, 6, 5, 8, 4, 3, 2],
                    borderColor: '#0e90e9',
                    backgroundColor: 'rgba(14, 144, 233, 0.1)',
                    fill: true,
                    tension: 0.4,
                }]
            },
            options: {
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { display: false } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    const ctxDistribution = document.getElementById('distributionChart');
    if (ctxDistribution) {
        new Chart(ctxDistribution, {
            type: 'doughnut',
            data: {
                labels: ['Matemática', 'Português', 'Biologia', 'História', 'Física'],
                datasets: [{
                    data: [35, 25, 15, 15, 10],
                    backgroundColor: ['#0e90e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'],
                    borderWidth: 0,
                }]
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, boxWidth: 8 }
                    }
                },
                cutout: '70%',
            }
        });
    }
};
