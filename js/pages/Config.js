export const render = async () => {
    return `
        <div class="flex flex-col gap-6 h-full animate-in fade-in duration-500">
            <h1 class="text-2xl font-black text-secondary-900">Configurações</h1>
            <div class="bg-white p-8 rounded-2xl border border-secondary-100 shadow-sm">
                <p class="text-secondary-500">Página de configurações em desenvolvimento nesta nova arquitetura CDN-only.</p>
                <div class="mt-8 flex flex-col gap-4 max-w-md">
                    <div class="flex items-center justify-between p-4 bg-secondary-50 rounded-xl">
                        <span class="font-bold text-secondary-700">Modo Escuro</span>
                        <div class="w-12 h-6 bg-secondary-200 rounded-full relative">
                            <div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all"></div>
                        </div>
                    </div>
                    <div class="flex items-center justify-between p-4 bg-secondary-50 rounded-xl">
                        <span class="font-bold text-secondary-700">Notificações</span>
                        <div class="w-12 h-6 bg-primary-500 rounded-full relative">
                            <div class="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

export const init = () => {
    console.log('Config page initialized');
};
