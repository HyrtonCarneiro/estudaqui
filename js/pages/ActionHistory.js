export const render = async () => {
    const history = [
        { id: 1, type: 'complete', user: 'Hyrton Carneiro', action: 'concluiu a tarefa', target: 'Logaritmos e Exponenciais', time: '14:20', date: 'Hoje', iconClass: 'ph-check-circle', colorClass: 'text-green-500' },
        { id: 2, type: 'add', user: 'Hyrton Carneiro', action: 'adicionou a matéria', target: 'Química Orgânica', time: '11:05', date: 'Hoje', iconClass: 'ph-plus-circle', colorClass: 'text-primary-500' },
        { id: 3, type: 'edit', user: 'Hyrton Carneiro', action: 'editou o peso do ciclo', target: 'Ciclo Enem 2024', time: '17:45', date: 'Ontem', iconClass: 'ph-pencil-circle', colorClass: 'text-amber-500' },
        { id: 4, type: 'delete', user: 'Hyrton Carneiro', action: 'removeu o evento', target: 'Monitoria de Redação', time: '10:15', date: '19 Mar', iconClass: 'ph-trash', colorClass: 'text-red-500' },
    ];

    const renderHistoryItems = () => {
        return history.map(item => `
            <div class="relative flex gap-6 group">
                <!-- Icon Container -->
                <div class="relative z-10 w-10 h-10 bg-white rounded-full border-4 border-white shadow-sm flex items-center justify-center transition-all group-hover:scale-110">
                    <i class="ph-fill ${item.iconClass} ${item.colorClass} text-xl"></i>
                </div>

                <!-- Content Card -->
                <div class="flex-1 bg-secondary-50/30 p-4 rounded-2xl border border-secondary-50 hover:bg-white hover:border-secondary-100 transition-all">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-[10px] font-black text-secondary-400 uppercase tracking-widest leading-none">${item.date} • ${item.time}</span>
                        <button class="p-1 text-secondary-200 hover:text-secondary-400 opacity-0 group-hover:opacity-100 transition-all">
                            <i class="ph-bold ph-trash text-[14px]"></i>
                        </button>
                    </div>
                    
                    <p class="text-sm font-medium text-secondary-700 leading-relaxed">
                        <span class="font-black text-secondary-900">${item.user}</span>
                        ${item.action} 
                        <span class="font-black text-primary-600">"${item.target}"</span>
                    </p>
                </div>
            </div>
        `).join('');
    };

    return `
        <div class="flex flex-col gap-6 h-full animate-in fade-in duration-500">
            <!-- Header & Filters -->
            <div class="flex flex-col gap-4">
                <h1 class="text-2xl font-black text-secondary-900">Histórico de Ações</h1>
                
                <div class="flex flex-col md:flex-row items-center gap-3">
                    <div class="flex-1 w-full relative">
                        <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 text-[18px]"></i>
                        <input 
                            type="text" 
                            placeholder="Buscar ação ou usuário..." 
                            class="w-full bg-white border border-secondary-100 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-100 shadow-sm transition-all"
                        />
                    </div>
                    
                    <div class="flex items-center gap-2 w-full md:w-auto">
                        <button class="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-secondary-100 px-4 py-2.5 rounded-xl font-bold text-secondary-600 text-xs shadow-sm hover:bg-secondary-50 transition-all">
                            <i class="ph-duotone ph-calendar text-[18px]"></i>
                            Período
                        </button>
                        <button class="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-secondary-100 px-4 py-2.5 rounded-xl font-bold text-secondary-600 text-xs shadow-sm hover:bg-secondary-50 transition-all">
                            <i class="ph-duotone ph-funnel text-[18px]"></i>
                            Categorias
                        </button>
                    </div>
                </div>
            </div>

            <!-- Timeline Section -->
            <div class="flex-1 bg-white border border-secondary-100 rounded-2xl shadow-sm p-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
                <div class="relative space-y-8">
                    <!-- Vertical line connecting entries -->
                    <div class="absolute left-[19px] top-2 bottom-2 w-0.5 bg-secondary-50"></div>

                    ${renderHistoryItems()}

                    <!-- End indicator -->
                    <div class="flex items-center justify-center pt-8">
                        <button class="text-xs font-black text-primary-500 uppercase tracking-widest hover:underline cursor-pointer">
                            Carregar mais ações
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
};

export const init = () => {
    console.log('ActionHistory page initialized');
};
