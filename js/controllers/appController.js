window.appControllers = {
    currentPage: null,

    init: function() {
        try {
            this.bindEvents();
            this.checkAuth();
        } catch (e) {
            console.error("AppController: Init failed", e);
        }
    },

    checkAuth: function() {
        if (window.store.getState().isAuthenticated) {
            document.getElementById('view-login').style.display = 'none';
            document.getElementById('view-app').style.display = 'block';
            
            // Navigate to dashboard ONLY if we are starting fresh (no current page)
            if (!this.currentPage) {
                this.navigate('dashboard');
            } else {
                // Just refresh the current page to reflect new cloud data
                this.navigate(this.currentPage);
            }
        } else {
            document.getElementById('view-login').style.display = 'flex';
            document.getElementById('view-app').style.display = 'none';
            this.currentPage = null;
        }

        // Toggle Admin Nav
        const navAdmin = document.getElementById('nav-admin');
        if (navAdmin) {
            navAdmin.style.display = window.store.isAdmin() ? 'flex' : 'none';
        }
    },

    bindEvents: function() {
        const formLogin = document.getElementById('form-login');
        if (formLogin) {
            formLogin.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = document.getElementById('input-username').value;
                const pass = document.getElementById('input-password').value;
                
                try {
                    const authResult = await window.authLogic.login(user, pass);
                    if (authResult) {
                        window.store.setAuth(true, authResult); // Pass full object: username, displayName, role
                        window.utils.showToast("Login iniciado!", "success");
                    } else {
                        window.utils.showToast("Usuário ou senha incorretos.", "error");
                    }
                } catch (err) {
                    window.utils.showToast("Erro no login: " + err.message, "error");
                }
            });
        }

        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', async () => {
                try {
                    await window.authLogic.logout();
                    window.utils.showToast("Saindo...", "info");
                    setTimeout(() => window.location.reload(), 500); // Force clean state
                } catch (err) {
                    window.utils.showToast("Erro ao sair: " + err.message, "error");
                }
            });
        }
    },

    navigate: function(pageId) {
        this.currentPage = pageId;
        // Hide all pages with direct style to ensure they don't take space
        document.querySelectorAll('.page-section').forEach(el => {
            el.style.display = 'none';
            el.classList.add('hidden');
        });
        
        // Show target page
        const target = document.getElementById('page-' + pageId);
        if (target) {
            target.style.display = 'block';
            target.classList.remove('hidden');
        }
        
        // Update nav buttons styling (Desktop and Mobile)
        const navs = ['dashboard', 'editais', 'cadastros', 'cronograma', 'materiais', 'metodo', 'admin', 'links', 'downloads', 'anki'];
        navs.forEach(nav => {
            const btnDesktop = document.getElementById('nav-' + nav);
            const btnMobile = document.getElementById('mobile-nav-' + nav);
            
            if (btnDesktop) {
                if (nav === pageId) {
                    btnDesktop.classList.add('bg-primary-50', 'text-primary-600');
                    btnDesktop.classList.remove('text-gray-500');
                } else {
                    btnDesktop.classList.remove('bg-primary-50', 'text-primary-600');
                    btnDesktop.classList.add('text-gray-500');
                }
            }

            if (btnMobile) {
                const icon = btnMobile.querySelector('i');
                const text = btnMobile.querySelector('span');
                if (nav === pageId) {
                    icon?.classList.add('text-primary-600', 'ph-fill');
                    icon?.classList.remove('text-gray-400', 'ph');
                    text?.classList.add('text-primary-600');
                    text?.classList.remove('text-gray-400');
                } else {
                    icon?.classList.remove('text-primary-600', 'ph-fill');
                    icon?.classList.add('text-gray-400', 'ph');
                    text?.classList.remove('text-primary-600');
                    text?.classList.add('text-gray-400');
                }
            }
        });

        // Close mobile more menu if open
        const mobileMenu = document.getElementById('mobile-more-menu');
        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
            this.toggleMobileMoreMenu();
        }

        // Trigger page-specific initializations
        if (pageId === 'dashboard') {
            this.updateDashboard();
        }
        if (pageId === 'editais') {
            if (window.editaisController) window.editaisController.render();
        }
        if (pageId === 'cadastros') {
            if (window.cadastrosController) window.cadastrosController.renderMateriasSelect();
        }
        if (pageId === 'cronograma') {
            if (window.cronogramaController) window.cronogramaController.renderTable();
        }
        if (pageId === 'materiais') {
            if (window.materialController) window.materialController.render();
        }
        if (pageId === 'metodo') {
            if (window.metodoController) window.metodoController.init();
        }
        if (pageId === 'admin') {
            if (window.adminController) window.adminController.render();
        }
        if (pageId === 'links') {
            if (window.linksController) window.linksController.render();
        }
        if (pageId === 'downloads') {
            if (window.downloadsController) window.downloadsController.render();
        }
        if (pageId === 'anki') {
            if (window.ankiController) window.ankiController.init();
        }
    },

    updateDashboard: function() {
        const state = window.store.getState();
        
        if (window.dashboardController) {
            try {
                window.dashboardController.update();
            } catch (e) {
                console.error("DashboardController Error:", e);
            }
        } else {
            // Fallback to basic if not loaded
            const totalMaterias = state.materias.length;
            const totalPlan = (state.cronograma || []).length;
            const totalPaginasLidas = (state.cronograma || []).filter(i => i.concluido).reduce((sum, i) => sum + (Number(i.paginas) || 0), 0);

            const elMaterias = document.getElementById('dash-total-materias');
            const elConteudos = document.getElementById('dash-total-conteudos');
            const elPaginas = document.getElementById('dash-total-paginas');

            if (elMaterias) elMaterias.textContent = totalMaterias;
            if (elConteudos) elConteudos.textContent = totalPlan;
            if (elPaginas) elPaginas.textContent = totalPaginasLidas;
        }
    },

    startCountdownTimer: function() {
        this.updateCountdowns();
        setInterval(() => this.updateCountdowns(), 60000); // every minute
    },

    updateCountdowns: function() {
        const els = document.querySelectorAll('.edital-countdown');
        els.forEach(el => {
            const target = el.getAttribute('data-date');
            if (target) {
                el.textContent = window.utils.calculateCountdown(target);
            }
        });
    },

    toggleMobileMoreMenu: function() {
        const menu = document.getElementById('mobile-more-menu');
        if (!menu) return;
        const inner = menu.querySelector('div');
        if (menu.classList.contains('hidden')) {
            menu.classList.remove('hidden');
            setTimeout(() => inner.classList.remove('translate-y-full'), 10);
        } else {
            inner.classList.add('translate-y-full');
            setTimeout(() => menu.classList.add('hidden'), 300);
        }
    }
};
