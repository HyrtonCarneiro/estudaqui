// js/main.js
import { app, analytics } from './services/firebase.js';
import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';

console.log('App Rotinize initialized via CDN-only architecture');

// Simple Router implementation
const routes = {
    '/estatisticas': { title: 'Estatísticas', component: 'Statistics' },
    '/calendario': { title: 'Calendário', component: 'Calendar' },
    '/trilha': { title: 'Trilha Semanal', component: 'WeeklyPath' },
    '/ciclo': { title: 'Ciclo de Estudos', component: 'StudyCycle' },
    '/revisoes': { title: 'Revisões', component: 'Reviews' },
    '/historico': { title: 'Histórico de Ações', component: 'ActionHistory' },
    '/conquistas': { title: 'Conquistas', component: 'Achievements' },
    '/config': { title: 'Configurações', component: 'Config' },
};

async function handleRoute() {
    const path = window.location.hash.slice(1) || '/estatisticas';
    const route = routes[path] || routes['/estatisticas'];
    
    document.title = `${route.title} | Rotinize`;
    
    // Initial Render of the App Shell
    renderAppShell(path);

    // Dynamic Loading of Page Content
    try {
        const pageModule = await import(`./pages/${route.component}.js`);
        const contentArea = document.getElementById('content');
        if (contentArea) {
            contentArea.innerHTML = await pageModule.render();
            if (pageModule.init) pageModule.init();
        }
    } catch (err) {
        console.warn(`Could not load page component: ${route.component}`, err);
        document.getElementById('content').innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-secondary-400">
                <i class="ph ph-warning-circle text-6xl mb-4"></i>
                <h2 class="text-xl font-bold">Página em migração</h2>
                <p>O conteúdo para "${route.title}" ainda está sendo refatorado para Vanilla JS.</p>
            </div>
        `;
    }
}

function renderAppShell(currentPath) {
    const root = document.getElementById('root');
    const projectTitle = "Enem 2024";
    const userName = "Hyrton Carneiro";

    root.innerHTML = `
        ${Sidebar(currentPath)}
        <div class="flex flex-col flex-1 overflow-hidden">
            ${Header({ projectTitle, userName })}
            <main id="content" class="flex-1 overflow-y-auto bg-background p-4 md:p-6">
                <!-- Dynamic Content Area -->
                <div class="flex items-center justify-center h-full">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
            </main>
        </div>
    `;
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', handleRoute);

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', handleRoute);
