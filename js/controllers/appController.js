window.appControllers = {
    currentPage: null,

    init: function() {
        this.checkAuth();
        this.bindEvents();
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
                        window.store.setAuth(true, authResult.username); // Use original casing from DB
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
        
        // Update nav buttons styling
        const navs = ['dashboard', 'editais', 'cadastros', 'cronograma', 'materiais', 'simulados', 'metas', 'admin'];
        navs.forEach(nav => {
            const btn = document.getElementById('nav-' + nav);
            if (btn) {
                if (nav === pageId) {
                    btn.classList.add('bg-primary-50', 'text-primary-600');
                    btn.classList.remove('text-gray-600');
                } else {
                    btn.classList.remove('bg-primary-50', 'text-primary-600');
                    btn.classList.add('text-gray-600');
                }
            }
        });

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
        if (pageId === 'simulados') {
            if (window.simuladosController) window.simuladosController.init();
        }
        if (pageId === 'metas') {
            if (window.gamificationController) window.gamificationController.updateUI();
        }
        if (pageId === 'admin') {
            if (window.adminController) window.adminController.render();
        }
    },

    updateDashboard: function() {
        const state = window.store.getState();
        const totalPaginas = (state.cronograma || []).filter(i => i.concluido).reduce((sum, i) => sum + (Number(i.paginas) || 0), 0);
        
        if (window.dashboardController) {
            window.dashboardController.update();
        } else {
            // Fallback to basic if not loaded
            const totalMaterias = state.materias.length;
            const totalPlan = (state.cronograma || []).length;

            const elMaterias = document.getElementById('dash-total-materias');
            const elConteudos = document.getElementById('dash-total-conteudos');
            const elPaginas = document.getElementById('dash-total-paginas');

            if (elMaterias) elMaterias.textContent = totalMaterias;
            if (elConteudos) elConteudos.textContent = totalPlan;
            if (elPaginas) elPaginas.textContent = totalPaginas;
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
    }
};
