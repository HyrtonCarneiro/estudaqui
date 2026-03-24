export const render = async () => {
    return `
        <div class="flex flex-col gap-6 h-full animate-in fade-in duration-500">
            <!-- Header & Tabs -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex flex-col gap-1">
                    <h1 class="text-2xl font-black text-secondary-900 flex items-center gap-3">
                        <i class="ph ph-arrow-clockwise text-primary-500 text-[28px]"></i>
                        Minhas Revisões
                    </h1>
                    <p class="text-secondary-500 text-sm">Gerencie seus ciclos de revisão espaçada.</p>
                </div>

                <!-- Tab Filters -->
                <div class="bg-secondary-50 p-1 rounded-xl flex items-center gap-1 shadow-inner border border-secondary-100">
                    <button class="filter-btn px-4 py-2 rounded-lg text-xs font-bold transition-all bg-white text-primary-600 shadow-sm" data-filter="Hoje">Hoje</button>
                    <button class="filter-btn px-4 py-2 rounded-lg text-xs font-bold transition-all text-secondary-400 hover:text-secondary-600" data-filter="Atrasadas">Atrasadas</button>
                    <button class="filter-btn px-4 py-2 rounded-lg text-xs font-bold transition-all text-secondary-400 hover:text-secondary-600" data-filter="Próximas">Próximas</button>
                </div>
            </div>

            <!-- Stats Summary Small -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="bg-primary-50 p-4 rounded-xl border border-primary-100 flex items-center gap-4">
                    <div class="p-2 bg-white rounded-lg text-primary-500 shadow-sm">
                        <i class="ph ph-list-checks text-[20px]"></i>
                    </div>
                    <div>
                        <span class="text-[10px] font-black text-primary-400 uppercase tracking-widest leading-none">Para Hoje</span>
                        <div class="text-xl font-black text-primary-700">12 revisões</div>
                    </div>
                </div>
                <div class="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-4">
                    <div class="p-2 bg-white rounded-lg text-red-500 shadow-sm">
                        <i class="ph ph-warning-octagon text-[20px]"></i>
                    </div>
                    <div>
                        <span class="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none">Atrasadas</span>
                        <div class="text-xl font-black text-red-700">3 pendentes</div>
                    </div>
                </div>
                <div class="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-4">
                    <div class="p-2 bg-white rounded-lg text-green-500 shadow-sm">
                        <i class="ph ph-calendar-check text-[20px]"></i>
                    </div>
                    <div>
                        <span class="text-[10px] font-black text-green-400 uppercase tracking-widest leading-none">Concluídas</span>
                        <div class="text-xl font-black text-green-700">85 totais</div>
                    </div>
                </div>
            </div>

            <!-- Reviews Table -->
            <div class="flex-1 bg-white border border-secondary-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-secondary-50/50 border-b border-secondary-50">
                            <tr>
                                <th class="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Status</th>
                                <th class="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Matéria</th>
                                <th class="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Tópico</th>
                                <th class="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Tipo</th>
                                <th class="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="reviews-tbody" class="divide-y divide-secondary-50">
                            <!-- Rendered in init -->
                        </tbody>
                    </table>
                    <div id="empty-state" class="hidden p-20 flex flex-col items-center justify-center gap-4 text-center">
                        <div class="p-4 bg-secondary-50 rounded-full text-secondary-200">
                            <i class="ph-duotone ph-list-checks text-[48px]"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-black text-secondary-800">Tudo em dia!</h3>
                            <p class="text-sm text-secondary-400 font-medium">Você não possui revisões pendentes para este filtro.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

export const init = () => {
    const reviews = [
        { id: 1, status: 'Pendente', subject: 'Matemática', topic: 'Logaritmos', type: '24h', date: '24/03/2026', color: 'text-primary-500' },
        { id: 2, status: 'Atrasada', subject: 'Biologia', topic: 'Genética', type: '7d', date: '21/03/2026', color: 'text-red-500' },
        { id: 3, status: 'Pendente', subject: 'Português', topic: 'Concordância Nominal', type: '30d', date: '24/03/2026', color: 'text-green-500' },
        { id: 4, status: 'Pendente', subject: 'Física', topic: 'Eletrostática', type: '24h', date: '25/03/2026', color: 'text-amber-500' },
    ];

    const renderTable = (filter = 'Hoje') => {
        const tbody = document.getElementById('reviews-tbody');
        const emptyState = document.getElementById('empty-state');
        
        const filtered = filter === 'Hoje' 
            ? reviews.filter(r => r.date === '24/03/2026') 
            : filter === 'Atrasadas' 
            ? reviews.filter(r => r.status === 'Atrasada')
            : reviews;

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            tbody.innerHTML = filtered.map(review => `
                <tr class="hover:bg-secondary-50/50 transition-all group">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full ${review.status === 'Atrasada' ? 'bg-red-500 animate-pulse' : 'bg-primary-500'}"></div>
                            <span class="text-xs font-bold ${review.status === 'Atrasada' ? 'text-red-600' : 'text-primary-600'}">${review.status}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-sm font-black text-secondary-800">${review.subject}</span>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-sm font-medium text-secondary-600">${review.topic}</span>
                    </td>
                    <td class="px-6 py-4">
                        <span class="inline-block px-2 py-1 rounded-lg bg-secondary-50 text-secondary-500 text-[10px] font-black uppercase tracking-widest border border-secondary-100">
                            ${review.type}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <button class="p-2 bg-primary-100 text-primary-600 rounded-xl hover:bg-primary-500 hover:text-white shadow-sm transition-all">
                            <i class="ph-bold ph-check text-[18px]"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    };

    // Tab filtering logic
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.classList.remove('bg-white', 'text-primary-600', 'shadow-sm');
                b.classList.add('text-secondary-400', 'hover:text-secondary-600');
            });
            btn.classList.add('bg-white', 'text-primary-600', 'shadow-sm');
            btn.classList.remove('text-secondary-400', 'hover:text-secondary-600');
            renderTable(btn.dataset.filter);
        });
    });

    renderTable(); // Initial render
};
