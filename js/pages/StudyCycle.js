export const render = async () => {
    const subjects = [
        { name: 'Matemática', weight: '1:30h', color: 'bg-primary-500', progress: 65, text: 'text-primary-500' },
        { name: 'Português', weight: '1:00h', color: 'bg-green-500', progress: 40, text: 'text-green-500' },
        { name: 'Biologia', weight: '0:45h', color: 'bg-amber-500', progress: 0, text: 'text-amber-500' },
        { name: 'História', weight: '0:45h', color: 'bg-violet-500', progress: 0, text: 'text-violet-500' },
        { name: 'Física', weight: '0:30h', color: 'bg-red-500', progress: 0, text: 'text-red-500' },
        { name: 'Química', weight: '0:30h', color: 'bg-pink-500', progress: 0, text: 'text-pink-500' },
    ];

    const renderSubjects = () => {
        return subjects.map(subject => `
            <div class="flex items-center justify-between p-3 rounded-xl hover:bg-secondary-50 transition-all border border-transparent hover:border-secondary-100 group">
                <div class="flex items-center gap-4">
                    <div class="w-3 h-10 rounded-full ${subject.color}"></div>
                    <div class="flex flex-col">
                        <span class="text-sm font-black text-secondary-800 tracking-tight">${subject.name}</span>
                        <span class="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">${subject.weight} alocados</span>
                    </div>
                </div>
                
                <div class="flex flex-col items-end gap-1">
                    <span class="text-[10px] font-black text-secondary-500 uppercase tracking-widest">${subject.progress}% completado</span>
                    <div class="w-24 h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                        <div 
                            class="h-full ${subject.color} rounded-full transition-all duration-1000" 
                            style="width: ${subject.progress}%"
                        ></div>
                    </div>
                </div>
            </div>
        `).join('');
    };

    return `
        <div class="flex flex-col gap-8 h-full animate-in zoom-in-95 duration-500">
            <!-- Header Section -->
            <div class="flex items-center justify-between">
                <div class="flex flex-col gap-1">
                    <h1 class="text-2xl font-black text-secondary-900">Ciclo de Estudos</h1>
                    <p class="text-secondary-500 text-sm italic">Método de estudo contínuo e equilibrado.</p>
                </div>
                
                <div class="flex items-center gap-3">
                    <button class="flex items-center gap-2 bg-secondary-50 text-secondary-700 px-4 py-2.5 rounded-xl font-bold shadow-sm hover:bg-secondary-100 transition-all text-sm">
                        <i class="ph-bold ph-arrows-counter-clockwise text-[18px]"></i>
                        Reiniciar Ciclo
                    </button>
                    <button class="flex items-center gap-2 bg-primary-500 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-primary-100 hover:scale-105 active:scale-95 transition-all text-sm">
                        <i class="ph-bold ph-plus text-[18px]"></i>
                        Novo Ciclo
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-full">
                <!-- Visual Cycle - Doughnut Chart -->
                <div class="flex flex-col items-center justify-center bg-white p-8 rounded-2xl border border-secondary-100 shadow-sm relative overflow-hidden group">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-primary-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 group-hover:opacity-40 transition-opacity"></div>
                    
                    <div class="w-full h-80 relative flex items-center justify-center">
                        <canvas id="cycleChart"></canvas>
                        <div class="absolute flex flex-col items-center justify-center pointer-events-none">
                            <span class="text-xs font-black text-secondary-400 uppercase tracking-widest">Estudando</span>
                            <span class="text-2xl font-black text-secondary-900">Matemática</span>
                            <span class="text-lg font-bold text-primary-500">45:00</span>
                        </div>
                    </div>
                    
                    <div class="mt-8 flex gap-4 w-full justify-center">
                        <button class="px-8 py-3 bg-primary-500 text-white rounded-xl font-black shadow-lg shadow-primary-100 hover:scale-110 active:scale-95 transition-all flex items-center gap-3">
                            <i class="ph-fill ph-play text-[20px]"></i>
                            INICIAR CRONÔMETRO
                        </button>
                    </div>
                </div>

                <!-- Subjects Table -->
                <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-4">
                    <div class="flex items-center justify-between border-b border-secondary-50 pb-4">
                        <h2 class="text-lg font-bold text-secondary-800">Matérias do Ciclo</h2>
                        <button class="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-all">
                            <i class="ph-bold ph-pencil-simple text-[18px]"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                        ${renderSubjects()}
                    </div>
                </div>
            </div>
        </div>
    `;
};

export const init = () => {
    const ctx = document.getElementById('cycleChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Matemática', 'Português', 'Biologia', 'História', 'Física', 'Química'],
                datasets: [{
                    data: [90, 60, 45, 45, 30, 30],
                    backgroundColor: ['#0e90e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'],
                    borderWidth: 0,
                    hoverOffset: 12,
                }]
            },
            options: {
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { legend: { display: false } },
            }
        });
    }
};
