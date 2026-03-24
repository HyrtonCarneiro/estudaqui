export const render = async () => {
    const achievements = [
        { id: 1, title: 'Guerreiro da Semana', description: 'Estudou mais de 40 horas em uma única semana.', iconClass: 'ph-barbell', progress: 100, isLocked: false, color: 'text-primary-500' },
        { id: 2, title: 'Mestre das Revisões', description: 'Completou todas as revisões agendadas por 30 dias.', iconClass: 'ph-calendar-check', progress: 45, isLocked: false, color: 'text-green-500' },
        { id: 3, title: 'Foco Total', description: 'Completou 10 ciclos de estudos seguidos sem interrupção.', iconClass: 'ph-target', progress: 80, isLocked: false, color: 'text-amber-500' },
        { id: 4, title: 'Explorador de Matérias', description: 'Cadastrou e estudou todas as matérias do cronograma.', iconClass: 'ph-books', progress: 10, isLocked: true, color: 'text-secondary-300' },
        { id: 5, title: 'Sábio do Histórico', description: 'Consultou seu histórico de ações mais de 50 vezes.', iconClass: 'ph-detective', progress: 0, isLocked: true, color: 'text-secondary-300' },
        { id: 6, title: 'Primeiros Passos', description: 'Concluiu sua primeira tarefa na trilha semanal.', iconClass: 'ph-lightning', progress: 100, isLocked: false, color: 'text-emerald-400' },
    ];

    const renderBadges = () => {
        return achievements.map(badge => `
            <div class="bg-white p-6 rounded-2xl border ${badge.isLocked ? 'border-secondary-50 opacity-60 grayscale' : 'border-secondary-100 hover:shadow-lg hover:-translate-y-1'} shadow-sm transition-all flex flex-col gap-4 relative overflow-hidden group">
                ${!badge.isLocked ? `
                    <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-current to-transparent opacity-5 -translate-y-1/2 translate-x-1/2 rounded-full ${badge.color}"></div>
                ` : ''}

                <div class="flex items-center gap-4 relative z-10">
                    <div class="p-4 rounded-xl bg-secondary-50 ${badge.color} transition-all group-hover:scale-110">
                        <i class="ph-duotone ${badge.iconClass} text-[32px]"></i>
                    </div>
                    <div class="flex flex-col">
                        <h4 class="text-sm font-black text-secondary-900 leading-tight">${badge.title}</h4>
                        <p class="text-[11px] font-medium text-secondary-500 leading-snug mt-1">${badge.description}</p>
                    </div>
                </div>

                <div class="mt-auto relative z-10">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-black text-secondary-400 uppercase tracking-widest">${badge.progress}% Progresso</span>
                        ${badge.isLocked ? '<i class="ph ph-trophy text-[14px] text-secondary-300"></i>' : ''}
                    </div>
                    <div class="w-full h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                        <div 
                            class="h-full ${badge.isLocked ? 'bg-secondary-200' : 'bg-current'} rounded-full transition-all duration-1000 ${badge.color}"
                            style="width: ${badge.progress}%"
                        ></div>
                    </div>
                </div>
            </div>
        `).join('');
    };

    return `
        <div class="flex flex-col gap-8 h-full animate-in zoom-in-95 duration-500">
            <!-- Header & Stats Summary -->
            <div class="bg-primary-500 p-8 rounded-2xl shadow-xl shadow-primary-100 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
                <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-700"></div>
                <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-700"></div>

                <div class="flex items-center gap-6 relative z-10 text-white">
                    <div class="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
                        <i class="ph-fill ph-medal text-[48px]"></i>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-primary-100 text-xs font-black uppercase tracking-widest leading-tight">Nível Atual</span>
                        <h2 class="text-3xl font-black text-white">Lendário Nível 12</h2>
                        <div class="mt-3 flex items-center gap-3">
                            <div class="w-64 h-2.5 bg-white/20 rounded-full overflow-hidden shadow-inner border border-white/10">
                                <div class="h-full bg-white rounded-full w-[75%] shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                            </div>
                            <span class="text-xs font-bold text-white/90">7.500 / 10.000 XP</span>
                        </div>
                    </div>
                </div>

                <div class="flex gap-4 relative z-10">
                    <div class="bg-white/10 backdrop-blur-sm p-4 rounded-xl text-center min-w-[100px] border border-white/5">
                        <span class="block text-[10px] font-black uppercase text-primary-100 mb-1">Total Badges</span>
                        <span class="text-2xl font-black text-white">12</span>
                    </div>
                    <div class="bg-white/10 backdrop-blur-sm p-4 rounded-xl text-center min-w-[100px] border border-white/5">
                        <span class="block text-[10px] font-black uppercase text-primary-100 mb-1">Rank Global</span>
                        <span class="text-2xl font-black text-white">#42</span>
                    </div>
                </div>
            </div>

            <!-- Badges Grid -->
            <div class="flex flex-col gap-4">
                <h3 class="text-lg font-black text-secondary-800 flex items-center gap-2">
                    <i class="ph-fill ph-star text-[24px] text-amber-400"></i>
                    Suas Conquistas
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
                    ${renderBadges()}
                </div>
            </div>
        </div>
    `;
};

export const init = () => {
    console.log('Achievements page initialized');
};
