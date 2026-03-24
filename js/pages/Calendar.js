export const render = async () => {
    const currentMonth = 'Julho 2024';
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    // Mock days (7x5 grid)
    const days = Array.from({ length: 35 }, (_, i) => ({
        day: (i % 31) + 1,
        isCurrentMonth: i >= 0 && i < 31,
        isToday: i === 14,
        events: i === 10 ? [{ title: 'Revisão Física', color: 'bg-red-500' }] : 
                 i === 14 ? [{ title: 'Simulado Enem', color: 'bg-primary-500' }] : [],
    }));

    const renderDays = () => {
        return days.map((d, i) => `
            <div class="min-h-[100px] p-2 border-r border-b border-secondary-50 last:border-r-0 relative group hover:bg-secondary-50/50 transition-all ${!d.isCurrentMonth ? 'bg-secondary-50/30' : ''}">
                <span class="${d.isToday ? 'bg-primary-500 text-white w-6 h-6 flex items-center justify-center rounded-lg shadow-md text-xs font-bold' : d.isCurrentMonth ? 'text-secondary-700 text-xs font-bold' : 'text-secondary-300 text-xs font-bold'}">
                    ${d.day}
                </span>

                <div class="mt-2 space-y-1">
                    ${d.events.map(event => `
                        <div class="${event.color} text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center justify-between truncate">
                            <span>${event.title}</span>
                        </div>
                    `).join('')}
                </div>

                <button class="absolute top-2 right-2 p-1 text-secondary-300 opacity-0 group-hover:opacity-100 hover:text-secondary-500 transition-all">
                    <i class="ph-bold ph-plus text-[14px]"></i>
                </button>
            </div>
        `).join('');
    };

    return `
        <div class="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <!-- Calendar Header -->
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <h1 class="text-2xl font-black text-secondary-900">${currentMonth}</h1>
                    <div class="flex items-center bg-white border border-secondary-100 rounded-xl p-1 shadow-sm">
                        <button class="p-1.5 hover:bg-secondary-50 rounded-lg text-secondary-600 transition-all">
                            <i class="ph-bold ph-caret-left text-[18px]"></i>
                        </button>
                        <button class="px-3 py-1.5 hover:bg-secondary-50 rounded-lg text-sm font-bold text-secondary-600 transition-all">
                            Hoje
                        </button>
                        <button class="p-1.5 hover:bg-secondary-50 rounded-lg text-secondary-600 transition-all">
                            <i class="ph-bold ph-caret-right text-[18px]"></i>
                        </button>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <select class="bg-white border border-secondary-100 rounded-xl px-4 py-2 text-sm font-semibold text-secondary-700 outline-none focus:ring-2 focus:ring-primary-100 shadow-sm transition-all">
                        <option>Mês</option>
                        <option>Semana</option>
                        <option>Dia</option>
                        <option>Lista</option>
                    </select>
                </div>
            </div>

            <!-- Calendar Grid -->
            <div class="flex-1 bg-white border border-secondary-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <!-- Days of week header -->
                <div class="grid grid-cols-7 border-b border-secondary-50">
                    ${weekDays.map(day => `
                        <div class="py-3 text-center text-xs font-bold text-secondary-400 uppercase tracking-widest bg-secondary-50/30">
                            ${day}
                        </div>
                    `).join('')}
                </div>

                <!-- Calendar Cells -->
                <div class="flex-1 grid grid-cols-7">
                    ${renderDays()}
                </div>
            </div>

            <!-- Floating Action Button (FAB) -->
            <button class="fixed bottom-8 right-8 w-14 h-14 bg-primary-500 text-white rounded-2xl shadow-xl shadow-primary-200 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-20 group">
                <i class="ph-bold ph-plus text-[28px] group-hover:rotate-90 transition-transform duration-300"></i>
            </button>
        </div>
    `;
};

export const init = () => {
    // Adding event listeners or interactive logic if needed
    console.log('Calendar page initialized');
};
