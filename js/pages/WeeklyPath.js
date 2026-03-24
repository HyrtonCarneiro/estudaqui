export const render = async () => {
    const weekDays = [
        { day: 'Segunda', date: '15 Jul', tasks: [
            { id: 1, subject: 'Matemática', title: 'Logaritmos e Exponenciais', color: 'bg-primary-500', text: 'text-primary-500' },
            { id: 2, subject: 'Biologia', title: 'Citologia e Membrana', color: 'bg-green-500', text: 'text-green-500' }
        ]},
        { day: 'Terça', date: '16 Jul', tasks: [
            { id: 3, subject: 'História', title: 'Revolução Francesa', color: 'bg-violet-500', text: 'text-violet-500' }
        ]},
        { day: 'Quarta', date: '17 Jul', tasks: [
            { id: 4, subject: 'Física', title: 'Cinemática Vetorial', color: 'bg-red-500', text: 'text-red-500' },
            { id: 5, subject: 'Português', title: 'Sintaxe da Oração', color: 'bg-emerald-500', text: 'text-emerald-500' }
        ]},
        { day: 'Quinta', date: '18 Jul', tasks: [] },
        { day: 'Sexta', date: '19 Jul', tasks: [] },
        { day: 'Sábado', date: '20 Jul', tasks: [] },
        { day: 'Domingo', date: '21 Jul', tasks: [] },
    ];

    const renderTasks = (tasks) => {
        if (tasks.length === 0) {
            return `
                <div class="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-secondary-100 rounded-xl p-6 text-center">
                    <span class="text-xs text-secondary-300 font-medium">Nenhuma atividade</span>
                </div>
            `;
        }

        return tasks.map(task => `
            <div class="bg-white p-4 rounded-xl shadow-sm border border-secondary-100 flex flex-col gap-2 group hover:border-primary-200 hover:shadow-md transition-all relative overflow-hidden">
                <div class="absolute left-0 top-0 bottom-0 w-1.5 ${task.color}"></div>
                
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-opacity-10 ${task.text} bg-current">
                        ${task.subject}
                    </span>
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="p-1 hover:bg-green-50 text-green-500 rounded-lg">
                            <i class="ph-bold ph-check text-[14px]"></i>
                        </button>
                        <button class="p-1 hover:bg-secondary-50 text-secondary-300 rounded-lg">
                            <i class="ph-bold ph-pencil-simple text-[14px]"></i>
                        </button>
                    </div>
                </div>
                
                <h4 class="text-sm font-bold text-secondary-800 leading-tight">
                    ${task.title}
                </h4>
            </div>
        `).join('');
    };

    const renderColumns = () => {
        return weekDays.map(column => `
            <div class="w-80 flex flex-col gap-3 bg-secondary-50/50 p-3 rounded-2xl border border-secondary-50 h-full">
                <div class="flex items-center justify-between px-2 py-1">
                    <div class="flex flex-col">
                        <span class="text-sm font-black text-secondary-800 uppercase tracking-tight">${column.day}</span>
                        <span class="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">${column.date}</span>
                    </div>
                    <button class="p-1 hover:bg-white rounded-lg text-secondary-300 hover:text-secondary-500 transition-all">
                        <i class="ph-bold ph-plus text-[16px]"></i>
                    </button>
                </div>

                <div class="flex flex-col gap-3 flex-1 overflow-y-auto">
                    ${renderTasks(column.tasks)}
                </div>
            </div>
        `).join('');
    };

    return `
        <div class="flex flex-col gap-6 h-full animate-in fade-in slide-in-from-right-4 duration-500">
            <!-- Header Section -->
            <div class="flex items-center justify-between">
                <div class="flex flex-col gap-1">
                    <h1 class="text-2xl font-black text-secondary-900">Minha Trilha</h1>
                    <div class="flex items-center gap-2 text-secondary-400 text-sm font-semibold">
                        <i class="ph-bold ph-caret-left text-[14px]"></i>
                        <span>15 de Jul - 21 de Jul</span>
                        <i class="ph-bold ph-caret-right text-[14px]"></i>
                    </div>
                </div>
                
                <button class="flex items-center gap-2 bg-primary-500 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-primary-100 hover:scale-105 active:scale-95 transition-all text-sm">
                    <i class="ph-bold ph-plus text-[18px]"></i>
                    Nova Atividade
                </button>
            </div>

            <!-- Kanban Board -->
            <div class="flex-1 overflow-x-auto pb-4 custom-scrollbar">
                <div class="flex gap-4 h-full min-w-max">
                    ${renderColumns()}
                </div>
            </div>
        </div>
    `;
};

export const init = () => {
    console.log('WeeklyPath page initialized');
};
