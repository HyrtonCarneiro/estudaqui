import { Logo } from './Logo.js';

export const Sidebar = (currentPath) => {
    const navItems = [
        { path: '/estatisticas', label: 'Estatísticas', icon: 'ph-chart-line-up' },
        { path: '/calendario', label: 'Calendário', icon: 'ph-calendar-blank' },
        { path: '/trilha', label: 'Trilha Semanal', icon: 'ph-signpost' },
        { path: '/ciclo', label: 'Ciclo de Estudos', icon: 'ph-circle-notch' },
        { path: '/revisoes', label: 'Revisões', icon: 'ph-arrow-clockwise' },
        { path: '/historico', label: 'Histórico de Ações', icon: 'ph-clock-counter-clockwise' },
        { path: '/conquistas', label: 'Conquistas', icon: 'ph-trophy' },
    ];

    const renderNavItems = () => {
        return navItems.map(item => `
            <a href="#${item.path}" class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentPath === item.path ? 'bg-primary-50 text-primary-600 font-semibold shadow-sm' : 'text-secondary-500 hover:bg-secondary-50 hover:text-primary-500'}">
                <i class="ph-duotone ${item.icon} text-xl"></i>
                <span class="text-sm">${item.label}</span>
            </a>
        `).join('');
    };

    return `
        <aside class="w-64 h-full bg-white border-r border-secondary-100 flex flex-col shadow-sm">
            <div class="p-6">
                ${Logo()}
            </div>
            
            <nav class="flex-1 px-4 space-y-1 overflow-y-auto">
                ${renderNavItems()}
            </nav>
            
            <div class="p-4 border-t border-secondary-100 mt-auto">
                <a href="#/config" class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentPath === '/config' ? 'bg-primary-50 text-primary-600 font-semibold shadow-sm' : 'text-secondary-500 hover:bg-secondary-50 hover:text-primary-500'}">
                    <i class="ph-duotone ph-gear-six text-xl"></i>
                    <span class="text-sm">Configurações</span>
                </a>
            </div>
        </aside>
    `;
};
