window.pomodoroController = {
    view: 'setup', // 'setup' | 'active' | 'complete'
    statsPeriod: 'mes', // 'hoje' | 'semana' | 'mes' | 'geral'
    historyFilterPeriod: 'todos', // 'todos' | 'hoje' | 'semana' | 'mes'
    historyFilterCategory: 'todas',
    historyFilterMateria: 'todas',

    init: function() {
        this.cacheDOM();
        this.bindEvents();
        if (window.pomodoroLogic) {
            window.pomodoroLogic.loadConfig();
            window.pomodoroLogic.requestNotificationPermission();

            // Restore any in-progress session across reloads / closures
            const restored = window.pomodoroLogic.restoreActiveSession();
            if (restored) {
                this.view = 'active';
                const logic = window.pomodoroLogic;
                logic.onTick = (time, perc, raw) => this._onTick(time, perc, raw);
                logic.onPhaseComplete = (mode) => this._onPhaseComplete(mode);
                logic.onSessionComplete = () => this._onSessionComplete();
                logic.onStateChange = () => this._onStateChange();
            }
        }
    },

    cacheDOM: function() {
        this.container = document.getElementById('pomodoro-main-container');
        this.historyContainer = document.getElementById('pomodoro-history-container');
        this.statsContainer = document.getElementById('pomodoro-stats-container');
    },

    bindEvents: function() {
        // Most events bound inline for zero-build simplicity
    },

    // --- RENDER ORCHESTRATOR ---
    render: function(force = false) {
        if (!this.container) this.cacheDOM();
        if (!this.container) return;

        // Check if there's an active session
        const logic = window.pomodoroLogic;
        if (logic && (logic.isActive || logic.isPaused || (logic.mode !== 'idle' && logic.pomodorosCompleted < logic.totalPomodoros && logic.currentPomodoro > 0))) {
            this.view = 'active';
        }

        switch (this.view) {
            case 'setup':
                // Never re-render setup if already mounted unless forced, preventing flicker, lag and input loss
                const isMounted = document.getElementById('cfg-input-pomos') !== null;
                if (!isMounted || force) {
                    this.renderSetup();
                }
                break;
            case 'active':
                if (!document.getElementById('pomo-active-card') || force) {
                    this.renderActive();
                }
                break;
            case 'complete':
                this.renderComplete();
                break;
        }

        this.renderHistory();
        this.renderStats();
    },

    // --- SETUP VIEW ---
    renderSetup: function() {
        if (!this.container) return;
        const config = window.pomodoroLogic ? window.pomodoroLogic.config : { duracaoFoco: 25, pausaCurta: 5, pausaLonga: 15, pomodorosAtePausaLonga: 4, usarPausaLonga: true, autoStart: false, somAtivado: true };
        const ctx = window.pomodoroLogic ? window.pomodoroLogic.context : {};
        const state = window.store ? window.store.getState() : { materias: [], cronograma: [], pomodoroCategorias: [] };
        
        // Build cronograma week options
        const cronogramaItens = state.cronograma || [];
        const uniqueSemanas = [...new Set(cronogramaItens.map(i => i.semana))].sort();
        const firstSemanaDate = uniqueSemanas.length > 0 ? new Date(uniqueSemanas[0] + 'T12:00:00') : null;
        
        const cronoWeeks = uniqueSemanas.map((sem) => {
            let weekNum = 1;
            if (firstSemanaDate) {
                const sDate = new Date(sem + 'T12:00:00');
                const diffTime = sDate - firstSemanaDate;
                weekNum = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
            }
            return {
                id: sem,
                label: `Semana ${weekNum} (${this._formatDateBR(sem)})`,
                value: `Semana ${weekNum}`,
                semana: sem,
                weekNum: weekNum
            };
        });

        // Custom Categories from store (only user-created, no mock defaults)
        const mockCats = ['Simulados', 'Revisão Geral', 'Questões', 'Leitura'];
        const customCategories = (state.pomodoroCategorias || []).filter(c => !mockCats.includes(c));
        const currentCategory = ctx.categoria || (ctx.semana ? `Semana ${ctx.weekNum || ''}`.trim() : 'Livre');

        // Materias list
        const materias = state.materias || [];
        const currentMateria = ctx.materia || (ctx.materias && ctx.materias.length === 1 ? ctx.materias[0] : '');
        const isLinkedToCronograma = !!ctx.semana;
        const usarLonga = config.usarPausaLonga !== false;

        this.container.innerHTML = `
            <div class="max-w-3xl mx-auto animate-fade-in">
                ${isLinkedToCronograma ? `
                    <div class="bg-gradient-to-r from-amber-500/10 via-primary-500/10 to-amber-500/5 border border-amber-200/80 rounded-2xl p-5 mb-8 flex items-center gap-4 shadow-sm">
                        <div class="w-12 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center text-xl shrink-0 shadow-md shadow-amber-200">
                            <i class="ph-bold ph-calendar-check"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] font-black uppercase tracking-widest bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded-md">Vínculo Automático</span>
                                <p class="text-xs font-black text-amber-800 uppercase tracking-wider">Cronograma — Semana ${ctx.weekNum || '?'}</p>
                            </div>
                            <p class="text-sm font-bold text-gray-800 truncate mt-0.5">
                                Matérias previstas: <span class="text-primary-600">${(ctx.materias || []).join(', ') || 'Todas da semana'}</span>
                            </p>
                        </div>
                        <button onclick="window.pomodoroController.clearContext()" class="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-white/80 rounded-xl transition-all" title="Desvincular do cronograma">
                            <i class="ph-bold ph-x text-sm mr-1"></i> Desvincular
                        </button>
                    </div>
                ` : ''}

                <!-- Main Configuration Card -->
                <div class="bg-white rounded-[2.5rem] border border-gray-100 shadow-premium p-8 md:p-10 mb-8">
                    <div class="flex items-center justify-between mb-8 pb-6 border-b border-gray-100 flex-wrap gap-4">
                        <div>
                            <h3 class="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                                <span class="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center text-lg">
                                    <i class="ph-bold ph-sliders"></i>
                                </span>
                                Planejar Sessão de Estudo
                            </h3>
                            <p class="text-xs text-gray-400 font-medium mt-1">Digite o tempo desejado ou use os botões para ajustar os ciclos</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button id="btn-sound-setup" onclick="window.pomodoroController.toggleSound()" class="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all active:scale-95 flex items-center gap-1.5 ${config.somAtivado !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-400 border-gray-200'}" title="Alerta sonoro">
                                <i class="ph-bold ${config.somAtivado !== false ? 'ph-speaker-high' : 'ph-speaker-slash'} text-sm"></i>
                                <span>${config.somAtivado !== false ? 'Som Ativo' : 'Mudo'}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Category & Subject Selectors -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <!-- Categoria -->
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <i class="ph-bold ph-folder-notch-open text-primary-600 mr-1"></i> Categoria / Origem
                                </label>
                                <div class="flex items-center gap-2">
                                    <button type="button" onclick="window.pomodoroController.promptNewCategory()" class="text-[10px] font-black text-primary-600 hover:text-primary-700 uppercase tracking-wider flex items-center gap-1">
                                        <i class="ph-bold ph-plus-circle"></i> Nova Categoria
                                    </button>
                                    ${customCategories.length > 0 ? `
                                        <button type="button" onclick="window.pomodoroController.openCategoryManagerModal()" class="text-[10px] font-black text-gray-400 hover:text-gray-700 uppercase tracking-wider flex items-center gap-1" title="Gerenciar categorias personalizadas">
                                            <i class="ph-bold ph-gear"></i> Gerenciar
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                            <select id="pomo-select-categoria" onchange="window.pomodoroController.onCategoryChange(this.value)" class="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all font-bold text-sm text-gray-800">
                                <option value="Livre" ${!ctx.semana && currentCategory === 'Livre' ? 'selected' : ''}>Sessão Livre (Sem categoria)</option>
                                
                                ${cronoWeeks.length > 0 ? `
                                    <optgroup label="Semanas do Cronograma">
                                        ${cronoWeeks.map(w => `
                                            <option value="${this._escapeHtml(w.value)}" data-semana="${w.semana}" data-weeknum="${w.weekNum}" ${(ctx.semana === w.semana || currentCategory === w.value) ? 'selected' : ''}>
                                                📅 ${this._escapeHtml(w.label)}
                                            </option>
                                        `).join('')}
                                    </optgroup>
                                ` : ''}

                                ${customCategories.length > 0 ? `
                                    <optgroup label="Categorias Personalizadas">
                                        ${customCategories.map(cat => `
                                            <option value="${this._escapeHtml(cat)}" ${currentCategory === cat ? 'selected' : ''}>
                                                🏷️ ${this._escapeHtml(cat)}
                                            </option>
                                        `).join('')}
                                    </optgroup>
                                ` : ''}
                            </select>

                            <div id="pomo-cat-actions">
                                ${customCategories.includes(currentCategory) ? `
                                    <div class="flex items-center gap-2 mt-1.5">
                                        <span class="text-[10px] text-gray-400 font-bold">Ações da categoria:</span>
                                        <button type="button" onclick="window.pomodoroController.promptEditCategory('${this._escapeHtml(currentCategory)}')" class="text-[10px] font-bold text-amber-600 hover:underline flex items-center gap-0.5" title="Renomear esta categoria">
                                            <i class="ph-bold ph-pencil-simple"></i> Renomear
                                        </button>
                                        <span class="text-gray-300">•</span>
                                        <button type="button" onclick="window.pomodoroController.deleteCategory('${this._escapeHtml(currentCategory)}')" class="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-0.5" title="Excluir esta categoria">
                                            <i class="ph-bold ph-trash"></i> Excluir
                                        </button>
                                    </div>
                                ` : `
                                    <p class="text-[10px] text-gray-400 mt-1.5">As semanas do cronograma e suas categorias agrupam suas estatísticas.</p>
                                `}
                            </div>
                        </div>

                        <!-- Matéria -->
                        <div>
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                <i class="ph-bold ph-book-open text-primary-600 mr-1"></i> Matéria de Foco
                            </label>
                            <div class="relative">
                                <input type="text" id="pomo-input-materia" list="pomo-datalist-materias" value="${this._escapeHtml(currentMateria)}" onchange="window.pomodoroController.onMateriaChange(this.value)" placeholder="Selecione ou digite a matéria..." class="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all font-bold text-sm text-gray-800">
                                <datalist id="pomo-datalist-materias">
                                    ${ctx.materias && ctx.materias.length > 1 ? `<option value="${ctx.materias.join(', ')}">Todas da semana (${ctx.materias.join(', ')})</option>` : ''}
                                    ${materias.map(m => `<option value="${this._escapeHtml(m.nome)}">${this._escapeHtml(m.nome)}</option>`).join('')}
                                    <option value="Geral">Estudo Geral / Diversos</option>
                                </datalist>
                            </div>
                            <p class="text-[10px] text-gray-400 mt-1.5">Vincula o tempo estudado a esta disciplina para os gráficos.</p>
                        </div>
                    </div>

                    <!-- Fluid Timers & Cycles Controls (With Direct Number Inputs) -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <!-- Total Pomodoros -->
                        <div class="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 text-center transition-all">
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pomodoros</label>
                            <div class="flex items-center justify-center gap-1.5">
                                <button type="button" onclick="window.pomodoroController.stepConfig('totalPomodoros', -1)" class="w-8 h-8 rounded-xl bg-white shadow-sm hover:bg-gray-100 text-gray-700 flex items-center justify-center font-black transition-all active:scale-90">−</button>
                                <input id="cfg-input-pomos" type="number" min="1" max="24" value="${config.pomodorosAtePausaLonga}" oninput="window.pomodoroController.onInputConfig('totalPomodoros', this.value)" class="text-xl font-black text-gray-800 w-12 text-center bg-transparent border-b-2 border-transparent focus:border-primary-500 outline-none tabular-nums" title="Digite a quantidade de pomodoros">
                                <button type="button" onclick="window.pomodoroController.stepConfig('totalPomodoros', 1)" class="w-8 h-8 rounded-xl bg-white shadow-sm hover:bg-gray-100 text-gray-700 flex items-center justify-center font-black transition-all active:scale-90">+</button>
                            </div>
                            <span class="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1 block">Ciclos de foco</span>
                        </div>

                        <!-- Foco (min) -->
                        <div class="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 text-center transition-all">
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Foco (min)</label>
                            <div class="flex items-center justify-center gap-1.5">
                                <button type="button" onclick="window.pomodoroController.stepConfig('duracaoFoco', -5)" class="w-8 h-8 rounded-xl bg-white shadow-sm hover:bg-gray-100 text-gray-700 flex items-center justify-center font-black transition-all active:scale-90">−</button>
                                <input id="cfg-input-foco" type="number" min="1" max="180" value="${config.duracaoFoco}" oninput="window.pomodoroController.onInputConfig('duracaoFoco', this.value)" class="text-xl font-black text-primary-600 w-16 text-center bg-transparent border-b-2 border-transparent focus:border-primary-500 outline-none tabular-nums" title="Digite os minutos de foco">
                                <button type="button" onclick="window.pomodoroController.stepConfig('duracaoFoco', 5)" class="w-8 h-8 rounded-xl bg-white shadow-sm hover:bg-gray-100 text-gray-700 flex items-center justify-center font-black transition-all active:scale-90">+</button>
                            </div>
                            <span class="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1 block">Tempo de foco</span>
                        </div>

                        <!-- Pausa Curta (min) -->
                        <div class="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 text-center transition-all">
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pausa Curta</label>
                            <div class="flex items-center justify-center gap-1.5">
                                <button type="button" onclick="window.pomodoroController.stepConfig('pausaCurta', -1)" class="w-8 h-8 rounded-xl bg-white shadow-sm hover:bg-gray-100 text-gray-700 flex items-center justify-center font-black transition-all active:scale-90">−</button>
                                <input id="cfg-input-curta" type="number" min="1" max="60" value="${config.pausaCurta}" oninput="window.pomodoroController.onInputConfig('pausaCurta', this.value)" class="text-xl font-black text-amber-600 w-14 text-center bg-transparent border-b-2 border-transparent focus:border-primary-500 outline-none tabular-nums" title="Digite os minutos de pausa curta">
                                <button type="button" onclick="window.pomodoroController.stepConfig('pausaCurta', 1)" class="w-8 h-8 rounded-xl bg-white shadow-sm hover:bg-gray-100 text-gray-700 flex items-center justify-center font-black transition-all active:scale-90">+</button>
                            </div>
                            <span class="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1 block">Entre cada pomo</span>
                        </div>

                        <!-- Pausa Longa (min) -->
                        <div id="cfg-card-pausa-longa" class="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 text-center transition-all ${!usarLonga ? 'opacity-50 grayscale' : ''}">
                            <div class="flex items-center justify-between mb-1 px-1">
                                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pausa Longa</label>
                                <span id="cfg-badge-longa" class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${usarLonga ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}">
                                    ${usarLonga ? 'Ativa' : 'Off'}
                                </span>
                            </div>
                            <div class="flex items-center justify-center gap-1.5">
                                <button type="button" onclick="window.pomodoroController.stepConfig('pausaLonga', -1)" class="w-8 h-8 rounded-xl bg-white shadow-sm hover:bg-gray-100 text-gray-700 flex items-center justify-center font-black transition-all active:scale-90">−</button>
                                <input id="cfg-input-longa" type="number" min="1" max="120" value="${config.pausaLonga}" oninput="window.pomodoroController.onInputConfig('pausaLonga', this.value)" class="text-xl font-black text-emerald-600 w-14 text-center bg-transparent border-b-2 border-transparent focus:border-primary-500 outline-none tabular-nums" title="Digite os minutos de pausa longa">
                                <button type="button" onclick="window.pomodoroController.stepConfig('pausaLonga', 1)" class="w-8 h-8 rounded-xl bg-white shadow-sm hover:bg-gray-100 text-gray-700 flex items-center justify-center font-black transition-all active:scale-90">+</button>
                            </div>
                            <span id="cfg-label-longa-freq" class="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1 block">A cada ${config.pomodorosAtePausaLonga} pomos</span>
                        </div>
                    </div>

                    <!-- Explanatory Box: Como Funcionam as Pausas & Toggle da Pausa Longa -->
                    <div class="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 mb-8 text-left transition-all">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-amber-200/60">
                            <span class="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                                <i class="ph-bold ph-info text-amber-600 text-base"></i> Entenda como funcionam os descansos
                            </span>
                            <button type="button" onclick="window.pomodoroController.togglePausaLonga()" id="btn-toggle-pausa-longa" class="text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border transition-all active:scale-95 flex items-center gap-1.5 self-start sm:self-auto ${usarLonga ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-300'}">
                                <i class="ph-bold ${usarLonga ? 'ph-check-circle' : 'ph-x-circle'}"></i>
                                Pausa Longa: ${usarLonga ? 'Ativada' : 'Desativada'}
                            </button>
                        </div>
                        <div id="pomo-pausa-explainer-text" class="text-xs text-amber-900 leading-relaxed font-medium space-y-1">
                            ${this._getPausaExplainerHtml(config)}
                        </div>
                    </div>

                    <!-- Presets & Toggles -->
                    <div class="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-gray-100 mb-8">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">Presets Rápidos:</span>
                            <button type="button" onclick="window.pomodoroController.applyPreset(25, 5, 15, 4)" class="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-gray-100 hover:bg-primary-50 hover:text-primary-600 text-gray-600 transition-all active:scale-95">Clássico 25/5</button>
                            <button type="button" onclick="window.pomodoroController.applyPreset(50, 10, 20, 4)" class="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-gray-100 hover:bg-primary-50 hover:text-primary-600 text-gray-600 transition-all active:scale-95">Maratona 50/10</button>
                            <button type="button" onclick="window.pomodoroController.applyPreset(15, 3, 10, 4)" class="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-gray-100 hover:bg-primary-50 hover:text-primary-600 text-gray-600 transition-all active:scale-95">Rápido 15/3</button>
                            <button type="button" onclick="window.pomodoroController.applyPreset(45, 10, 25, 3)" class="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-gray-100 hover:bg-primary-50 hover:text-primary-600 text-gray-600 transition-all active:scale-95">Imersão 45/10</button>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="window.pomodoroController.toggleAutoStart()" id="btn-auto-start" class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${config.autoStart ? 'bg-primary-600 text-white shadow-md shadow-primary-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
                                <i class="ph-bold ${config.autoStart ? 'ph-check-circle' : 'ph-circle'}"></i>
                                Auto-iniciar Ciclos: ${config.autoStart ? 'Ligado' : 'Desligado'}
                            </button>
                        </div>
                    </div>

                    <!-- Start Button -->
                    <button type="button" onclick="window.pomodoroController.startSession()" class="w-full bg-primary-600 hover:bg-primary-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-primary-200 active:scale-[0.98] uppercase tracking-widest text-sm flex items-center justify-center gap-3">
                        <i class="ph-bold ph-play-circle text-2xl"></i> INICIAR SESSÃO DE FOCO
                    </button>
                </div>
            </div>
        `;
    },

    // --- ACTIVE VIEW ---
    renderActive: function() {
        if (!this.container) return;
        const logic = window.pomodoroLogic;
        if (!logic) return;

        const isFocus = logic.mode === 'focus';
        const progress = logic.getProgress();
        const circumference = 2 * Math.PI * 54;
        const dashoffset = circumference - (progress / 100) * circumference;

        const ringColor = isFocus ? '#3b5df5' : (logic.mode === 'longBreak' ? '#10b981' : '#f59e0b');
        const ctx = logic.context || {};
        const categoria = ctx.categoria || (ctx.semana ? `Semana ${ctx.weekNum || ''}`.trim() : 'Livre');
        const materia = ctx.materia || (ctx.materias && ctx.materias.length > 0 ? ctx.materias.join(', ') : 'Geral');

        // Progress dots
        let dots = '';
        for (let i = 0; i < logic.totalPomodoros; i++) {
            if (i < logic.pomodorosCompleted) {
                dots += '<div class="w-4 h-4 rounded-full bg-primary-600 shadow-md shadow-primary-200" title="Concluído"></div>';
            } else if (i === logic.pomodorosCompleted && logic.mode === 'focus') {
                dots += '<div class="w-4 h-4 rounded-full bg-primary-400 animate-pulse ring-4 ring-primary-100" title="Em andamento"></div>';
            } else {
                dots += '<div class="w-4 h-4 rounded-full bg-gray-200"></div>';
            }
        }

        const quote = (!isFocus && logic.mode !== 'idle') ? logic.getRandomQuote() : '';

        this.container.innerHTML = `
            <div id="pomo-active-card" class="max-w-2xl mx-auto animate-fade-in bg-white rounded-[2.5rem] border border-gray-100 shadow-premium p-8 md:p-12 text-center relative overflow-hidden">
                
                <!-- Header Tags & Fullscreen Button -->
                <div class="flex items-center justify-between mb-8 flex-wrap gap-2">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="bg-primary-50 text-primary-700 text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl border border-primary-100 flex items-center gap-1.5 shadow-sm">
                            <i class="ph-bold ph-folder-notch text-sm"></i> ${this._escapeHtml(categoria)}
                        </span>
                        ${materia ? `
                            <span class="bg-amber-50 text-amber-800 text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1.5 shadow-sm">
                                <i class="ph-bold ph-book-open text-sm"></i> ${this._escapeHtml(materia)}
                            </span>
                        ` : ''}
                    </div>

                    <div class="flex items-center gap-2 ml-auto">
                        <button id="btn-sound-active" type="button" onclick="window.pomodoroController.toggleSound()" class="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-all active:scale-95" title="${logic.config.somAtivado !== false ? 'Silenciar som' : 'Ativar som'}">
                            <i class="ph-bold ${logic.config.somAtivado !== false ? 'ph-speaker-high text-emerald-600' : 'ph-speaker-slash text-gray-400'} text-lg"></i>
                        </button>
                        <button type="button" onclick="window.pomodoroController.toggleFullscreen()" class="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-all active:scale-95" title="Modo Tela Cheia">
                            <i class="ph-bold ph-corners-out text-lg"></i>
                        </button>
                    </div>
                </div>

                <!-- Phase Label -->
                <div class="mb-6">
                    <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${isFocus ? 'bg-primary-50 text-primary-600 border border-primary-100' : (logic.mode === 'longBreak' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100')}">
                        <i class="${logic.getModeIcon()} text-sm"></i>
                        ${logic.getModeLabel()} ${logic.mode === 'focus' ? `(${logic.currentPomodoro}/${logic.totalPomodoros})` : ''}
                    </span>
                    ${logic.isPaused ? '<span class="ml-2 text-xs font-black text-amber-500 uppercase tracking-widest animate-pulse">⏸ Pausado</span>' : ''}
                </div>

                <!-- Circular Timer Display -->
                <div class="relative w-64 h-64 mx-auto mb-8">
                    <svg class="w-full h-full -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="54" fill="none" stroke="#f3f4f6" stroke-width="7"/>
                        <circle id="pomo-ring-progress" cx="60" cy="60" r="54" fill="none" stroke="${ringColor}" stroke-width="7"
                            stroke-dasharray="${circumference}" stroke-dashoffset="${dashoffset}"
                            stroke-linecap="round" class="transition-all duration-1000 ease-linear"/>
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                        <span id="pomo-timer-display" class="text-5xl font-black text-gray-900 tabular-nums tracking-tight">
                            ${logic.formatTime(logic.timeLeft)}
                        </span>
                        <span class="text-xs font-bold text-gray-400 mt-2 uppercase tracking-widest">
                            Pomodoro ${logic.pomodorosCompleted + 1} de ${logic.totalPomodoros}
                        </span>
                    </div>
                </div>

                <!-- Motivational quote on break -->
                ${quote ? `
                    <div class="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-4 rounded-2xl mb-6 animate-fade-in text-sm text-emerald-800 font-bold">
                        ${quote}
                    </div>
                ` : ''}

                <!-- Pomodoro Dots indicator -->
                <div class="flex items-center justify-center gap-2.5 mb-8">
                    ${dots}
                </div>

                <!-- Action Controls -->
                <div class="flex items-center justify-center gap-3 mb-8 flex-wrap">
                    ${logic.isPaused || !logic.isActive ? `
                        <button type="button" onclick="window.pomodoroController.resumeTimer()" class="bg-primary-600 hover:bg-primary-700 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-lg shadow-primary-200 active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2">
                            <i class="ph-bold ph-play text-lg"></i> Continuar
                        </button>
                    ` : `
                        <button type="button" onclick="window.pomodoroController.pauseTimer()" class="bg-amber-500 hover:bg-amber-600 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-lg shadow-amber-200 active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2">
                            <i class="ph-bold ph-pause text-lg"></i> Pausar
                        </button>
                    `}

                    <button type="button" onclick="window.pomodoroController.skipPhase()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-black px-6 py-4 rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2" title="Pular fase atual">
                        <i class="ph-bold ph-skip-forward text-lg"></i> Pular
                    </button>

                    <button type="button" onclick="window.pomodoroController.addMore()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-black px-6 py-4 rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2" title="Adicionar mais 1 pomodoro ao ciclo">
                        <i class="ph-bold ph-plus-circle text-lg"></i> +1 Pomo
                    </button>

                    <button type="button" onclick="window.pomodoroController.cancelSession()" class="bg-red-50 hover:bg-red-100 text-red-600 font-black px-6 py-4 rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2" title="Finalizar e salvar agora">
                        <i class="ph-bold ph-stop text-lg"></i> Encerrar
                    </button>
                </div>

                <!-- Footer metrics bar -->
                <div class="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100 text-left">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 shrink-0">
                            <i class="ph-bold ph-clock text-xl"></i>
                        </div>
                        <div>
                            <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tempo de Foco Acumulado</p>
                            <p class="text-sm font-black text-gray-800">${logic.formatDuration(logic.totalFocusSeconds)}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 justify-end sm:justify-start">
                        <div class="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                            <i class="ph-bold ph-check-circle text-xl"></i>
                        </div>
                        <div>
                            <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ciclos de Foco</p>
                            <p class="text-sm font-black text-gray-800">${logic.pomodorosCompleted} de ${logic.totalPomodoros} concluídos</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // --- SESSION COMPLETE VIEW ---
    renderComplete: function() {
        if (!this.container) return;
        const logic = window.pomodoroLogic;
        if (!logic) return;

        const ctx = logic.context || {};
        const categoria = ctx.categoria || (ctx.semana ? `Semana ${ctx.weekNum || ''}`.trim() : 'Livre');
        const materia = ctx.materia || (ctx.materias && ctx.materias.length > 0 ? ctx.materias.join(', ') : 'Geral');

        this.container.innerHTML = `
            <div class="max-w-2xl mx-auto animate-fade-in text-center bg-white rounded-[2.5rem] border border-gray-100 shadow-premium p-10">
                <div class="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl shadow-md shadow-emerald-100">
                    🎉
                </div>
                <h3 class="text-3xl font-black text-gray-900 tracking-tight mb-2">Ciclo Concluído com Sucesso!</h3>
                <p class="text-gray-500 mb-6 text-sm">
                    Você completou <span class="font-black text-primary-600">${logic.pomodorosCompleted} pomodoro${logic.pomodorosCompleted !== 1 ? 's' : ''}</span> 
                    com <span class="font-black text-primary-600">${logic.formatDuration(logic.totalFocusSeconds)}</span> de foco total.
                </p>

                <div class="flex items-center justify-center gap-2 mb-8 flex-wrap">
                    <span class="bg-primary-50 text-primary-700 text-xs font-black uppercase px-3 py-1.5 rounded-xl border border-primary-100">
                        📁 Categoria: ${this._escapeHtml(categoria)}
                    </span>
                    ${materia ? `
                        <span class="bg-amber-50 text-amber-800 text-xs font-black uppercase px-3 py-1.5 rounded-xl border border-amber-200">
                            📚 Matéria: ${this._escapeHtml(materia)}
                        </span>
                    ` : ''}
                </div>

                <!-- Metrics breakdown -->
                <div class="grid grid-cols-3 gap-4 mb-8 text-center">
                    <div class="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <i class="ph-bold ph-fire text-primary-600 text-2xl mb-1"></i>
                        <p class="text-2xl font-black text-gray-800">${logic.pomodorosCompleted}</p>
                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pomodoros</p>
                    </div>
                    <div class="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <i class="ph-bold ph-clock text-emerald-600 text-2xl mb-1"></i>
                        <p class="text-2xl font-black text-gray-800">${logic.formatDuration(logic.totalFocusSeconds)}</p>
                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tempo Focado</p>
                    </div>
                    <div class="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <i class="ph-bold ph-target text-amber-600 text-2xl mb-1"></i>
                        <p class="text-2xl font-black text-gray-800">${logic.pomodorosCompleted}/${logic.totalPomodoros}</p>
                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Meta do Ciclo</p>
                    </div>
                </div>

                <!-- Quick Note -->
                <div class="bg-gray-50 rounded-2xl border border-gray-100 p-6 mb-8 text-left">
                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">📝 Anotações do Estudo (opcional)</label>
                    <textarea id="pomo-session-note" class="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none h-20 text-sm font-medium" placeholder="Ex: Fiz 30 questões de Redes e revisei o capítulo 3..."></textarea>
                </div>

                <!-- Actions -->
                <div class="flex flex-col sm:flex-row gap-3">
                    <button type="button" onclick="window.pomodoroController.saveAndReset()" class="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary-200 active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                        <i class="ph-bold ph-floppy-disk text-lg"></i> Salvar e Voltar ao Início
                    </button>
                    <button type="button" onclick="window.pomodoroController.addMoreAndContinue()" class="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                        <i class="ph-bold ph-plus-circle text-lg"></i> Continuar Estudando (+4)
                    </button>
                </div>
            </div>
        `;
    },

    // --- STATS VIEW ---
    renderStats: function() {
        if (!this.statsContainer) this.cacheDOM();
        if (!this.statsContainer) return;

        const period = this.statsPeriod;
        const logs = this._extractLogsForPeriod(period);
        const sessoes = (window.store ? window.store.getState().pomodoroSessoes : []) || [];

        // Overall calculations for the chosen period
        const totalPomos = logs.length;
        const totalFocoSeg = logs.reduce((sum, l) => sum + (l.duracaoSeg || (l.duracaoMin * 60) || 0), 0);
        const totalFocoStr = window.pomodoroLogic ? window.pomodoroLogic.formatDuration(totalFocoSeg) : Math.round(totalFocoSeg / 60) + 'min';

        // Group by Matéria
        const materiaTotals = {};
        logs.forEach(l => {
            const m = l.materia || 'Geral';
            if (!materiaTotals[m]) materiaTotals[m] = { count: 0, timeSec: 0 };
            materiaTotals[m].count++;
            materiaTotals[m].timeSec += (l.duracaoSeg || (l.duracaoMin * 60) || 0);
        });
        const sortedMaterias = Object.keys(materiaTotals).map(k => ({
            nome: k,
            ...materiaTotals[k]
        })).sort((a, b) => b.timeSec - a.timeSec);

        // Group by Categoria
        const catTotals = {};
        logs.forEach(l => {
            const c = l.categoria || 'Livre';
            if (!catTotals[c]) catTotals[c] = { count: 0, timeSec: 0 };
            catTotals[c].count++;
            catTotals[c].timeSec += (l.duracaoSeg || (l.duracaoMin * 60) || 0);
        });
        const sortedCats = Object.keys(catTotals).map(k => ({
            nome: k,
            ...catTotals[k]
        })).sort((a, b) => b.timeSec - a.timeSec);

        // Weekly 7-day Bar Chart
        const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const dayTotals = [0, 0, 0, 0, 0, 0, 0];
        const now = new Date();
        logs.forEach(l => {
            if (!l.completedAt) return;
            const d = new Date(l.completedAt);
            const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
            if (diff >= 0 && diff < 7) {
                dayTotals[d.getDay()] += (l.duracaoSeg || (l.duracaoMin * 60) || 0);
            }
        });
        const maxDay = Math.max(...dayTotals, 1);
        const todayDow = now.getDay();

        let barsHtml = '';
        for (let i = 0; i < 7; i++) {
            const pct = Math.round((dayTotals[i] / maxDay) * 100);
            const isToday = i === todayDow;
            barsHtml += `
                <div class="flex flex-col items-center gap-2 flex-1">
                    <span class="text-xs font-bold text-gray-500 min-h-[1.25rem]">${dayTotals[i] > 0 ? Math.round(dayTotals[i]/60) + 'm' : ''}</span>
                    <div class="w-full bg-gray-100 rounded-xl overflow-hidden h-32 flex flex-col justify-end p-0.5">
                        <div class="w-full ${isToday ? 'bg-primary-600' : 'bg-primary-300'} rounded-lg transition-all duration-500" style="height: ${Math.max(pct, 5)}%"></div>
                    </div>
                    <span class="text-xs font-black ${isToday ? 'text-primary-600' : 'text-gray-600'} uppercase tracking-wider">${dayLabels[i]}</span>
                </div>
            `;
        }

        const periodLabels = {
            'hoje': 'Hoje',
            'semana': 'Esta Semana',
            'mes': 'Este Mês',
            'geral': 'Todo o Período'
        };

        this.statsContainer.innerHTML = `
            <div class="bg-white rounded-[2.5rem] border border-gray-100 shadow-premium p-8 md:p-10 mb-8">
                <!-- Header with Period Selector Tabs -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-100">
                    <div>
                        <h3 class="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            <i class="ph-bold ph-chart-pie-slice text-primary-600"></i> Métricas & Análise de Estudo
                        </h3>
                        <p class="text-xs text-gray-400 font-medium mt-0.5">Acompanhe seu rendimento focado por períodos, matérias e categorias</p>
                    </div>

                    <!-- Period Buttons -->
                    <div class="flex items-center gap-1 bg-gray-100 p-1.5 rounded-2xl self-start sm:self-auto">
                        <button type="button" onclick="window.pomodoroController.setStatsPeriod('hoje')" class="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${period === 'hoje' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}">Hoje</button>
                        <button type="button" onclick="window.pomodoroController.setStatsPeriod('semana')" class="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${period === 'semana' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}">Semana</button>
                        <button type="button" onclick="window.pomodoroController.setStatsPeriod('mes')" class="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${period === 'mes' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}">Mês</button>
                        <button type="button" onclick="window.pomodoroController.setStatsPeriod('geral')" class="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${period === 'geral' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}">Geral</button>
                    </div>
                </div>

                <!-- Metric Cards -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div class="bg-gray-50/70 rounded-2xl border border-gray-100 p-5 text-center">
                        <i class="ph-bold ph-timer text-primary-600 text-2xl mb-1.5"></i>
                        <p class="text-2xl font-black text-gray-800 tabular-nums">${totalPomos}</p>
                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pomodoros (${periodLabels[period]})</p>
                    </div>
                    <div class="bg-gray-50/70 rounded-2xl border border-gray-100 p-5 text-center">
                        <i class="ph-bold ph-clock text-emerald-600 text-2xl mb-1.5"></i>
                        <p class="text-2xl font-black text-gray-800 tabular-nums">${totalFocoStr}</p>
                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tempo de Foco</p>
                    </div>
                    <div class="bg-gray-50/70 rounded-2xl border border-gray-100 p-5 text-center">
                        <i class="ph-bold ph-book-open text-amber-600 text-2xl mb-1.5"></i>
                        <p class="text-base font-black text-gray-800 truncate px-1" title="${sortedMaterias[0] ? sortedMaterias[0].nome : 'Nenhuma'}">
                            ${sortedMaterias[0] ? this._escapeHtml(sortedMaterias[0].nome) : '--'}
                        </p>
                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Matéria + Estudada</p>
                    </div>
                    <div class="bg-gray-50/70 rounded-2xl border border-gray-100 p-5 text-center">
                        <i class="ph-bold ph-fire text-purple-600 text-2xl mb-1.5"></i>
                        <p class="text-2xl font-black text-gray-800 tabular-nums">${sessoes.length}</p>
                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sessões Totais</p>
                    </div>
                </div>

                <!-- Two Column Breakdown: Materias & Categorias -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <!-- Breakdown por Matéria -->
                    <div class="bg-gray-50/50 rounded-2xl border border-gray-100 p-6">
                        <h4 class="text-xs font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center justify-between">
                            <span class="flex items-center gap-2">
                                <i class="ph-bold ph-books text-primary-600 text-base"></i> Tempo Estudado por Matéria
                            </span>
                            <span class="text-[10px] text-gray-400 font-bold">${sortedMaterias.length} matéria${sortedMaterias.length !== 1 ? 's' : ''}</span>
                        </h4>

                        ${sortedMaterias.length === 0 ? `
                            <p class="text-xs text-gray-400 italic text-center py-8">Nenhum estudo registrado neste período.</p>
                        ` : `
                            <div class="space-y-4 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                                ${sortedMaterias.map(m => {
                                    const mTimeStr = window.pomodoroLogic ? window.pomodoroLogic.formatDuration(m.timeSec) : Math.round(m.timeSec/60) + 'min';
                                    const pct = totalFocoSeg > 0 ? Math.round((m.timeSec / totalFocoSeg) * 100) : 0;
                                    return `
                                        <div>
                                            <div class="flex items-center justify-between text-xs mb-1">
                                                <span class="font-bold text-gray-800 truncate mr-2">${this._escapeHtml(m.nome)}</span>
                                                <span class="font-black text-gray-700 whitespace-nowrap">${mTimeStr} <span class="text-[10px] text-primary-600">(${pct}%)</span></span>
                                            </div>
                                            <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                <div class="bg-primary-600 h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `}
                    </div>

                    <!-- Breakdown por Categoria / Semanas -->
                    <div class="bg-gray-50/50 rounded-2xl border border-gray-100 p-6">
                        <h4 class="text-xs font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center justify-between">
                            <span class="flex items-center gap-2">
                                <i class="ph-bold ph-folder-notch text-amber-600 text-base"></i> Tempo por Categoria / Semanas
                            </span>
                            <span class="text-[10px] text-gray-400 font-bold">${sortedCats.length} categoria${sortedCats.length !== 1 ? 's' : ''}</span>
                        </h4>

                        ${sortedCats.length === 0 ? `
                            <p class="text-xs text-gray-400 italic text-center py-8">Nenhum estudo registrado neste período.</p>
                        ` : `
                            <div class="space-y-4 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                                ${sortedCats.map(c => {
                                    const cTimeStr = window.pomodoroLogic ? window.pomodoroLogic.formatDuration(c.timeSec) : Math.round(c.timeSec/60) + 'min';
                                    const pct = totalFocoSeg > 0 ? Math.round((c.timeSec / totalFocoSeg) * 100) : 0;
                                    return `
                                        <div>
                                            <div class="flex items-center justify-between text-xs mb-1">
                                                <span class="font-bold text-gray-800 truncate mr-2 flex items-center gap-1.5">
                                                    <i class="ph-bold ${c.nome.startsWith('Semana') ? 'ph-calendar' : 'ph-tag'} text-xs text-amber-600"></i>
                                                    ${this._escapeHtml(c.nome)}
                                                </span>
                                                <span class="font-black text-gray-700 whitespace-nowrap">${cTimeStr} <span class="text-[10px] text-amber-600">(${c.count} pomos)</span></span>
                                            </div>
                                            <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                <div class="bg-amber-500 h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `}
                    </div>
                </div>

                <!-- 7 Days Bar Chart -->
                <div class="bg-gray-50/50 rounded-2xl border border-gray-100 p-6">
                    <h4 class="text-xs font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <i class="ph-bold ph-chart-bar text-primary-600 text-base"></i> Atividade nos Últimos 7 Dias
                    </h4>
                    <div class="flex items-end gap-2 pt-2">${barsHtml}</div>
                </div>
            </div>
        `;
    },

    // --- HISTORY VIEW ---
    renderHistory: function() {
        if (!this.historyContainer) this.cacheDOM();
        if (!this.historyContainer) return;

        const sessoes = (window.store ? window.store.getState().pomodoroSessoes : []) || [];

        if (sessoes.length === 0) {
            this.historyContainer.innerHTML = `
                <div class="bg-white p-12 rounded-[2.5rem] border border-dashed border-gray-200 text-center shadow-sm">
                    <div class="w-16 h-16 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center text-3xl mx-auto mb-4">
                        <i class="ph-bold ph-timer"></i>
                    </div>
                    <h4 class="text-base font-black text-gray-800 mb-1">Nenhum pomodoro registrado ainda</h4>
                    <p class="text-xs text-gray-400 max-w-sm mx-auto">Complete seu primeiro ciclo de foco para acompanhar o histórico por semanas e matérias aqui.</p>
                </div>
            `;
            return;
        }

        // Collect unique categories and materias for filter dropdowns
        const allCats = new Set(['todas']);
        const allMats = new Set(['todas']);
        sessoes.forEach(s => {
            if (s.categoria) allCats.add(s.categoria);
            if (s.semana) allCats.add(`Semana ${s.weekNum || ''}`.trim());
            if (s.materia) allMats.add(s.materia);
            if (s.materias && Array.isArray(s.materias)) {
                s.materias.forEach(m => allMats.add(m));
            }
        });

        // Filter sessions
        const filterCat = this.historyFilterCategory;
        const filterMat = this.historyFilterMateria;
        const filterPeriod = this.historyFilterPeriod;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentDay = now.getDay();
        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const filtered = sessoes.filter(s => {
            // Filter Period
            if (filterPeriod === 'hoje' && !(s.dataInicio || '').startsWith(todayStr)) return false;
            if (filterPeriod === 'semana' && new Date(s.dataInicio) < monday) return false;
            if (filterPeriod === 'mes' && new Date(s.dataInicio) < startOfMonth) return false;

            // Filter Category
            if (filterCat !== 'todas') {
                const sessionCat = s.categoria || (s.semana ? `Semana ${s.weekNum || ''}`.trim() : 'Livre');
                if (sessionCat !== filterCat) return false;
            }

            // Filter Materia
            if (filterMat !== 'todas') {
                const mats = s.materias || (s.materia ? [s.materia] : []);
                if (!mats.includes(filterMat) && s.materia !== filterMat) return false;
            }

            return true;
        }).sort((a, b) => new Date(b.dataInicio) - new Date(a.dataInicio));

        // Group filtered sessions by Category
        const groups = {};
        filtered.forEach(s => {
            const key = s.categoria || (s.semana ? `Semana ${s.weekNum || '?'}` : 'Sessões Livres');
            if (!groups[key]) groups[key] = [];
            groups[key].push(s);
        });

        // Build HTML
        let html = `
            <div class="bg-white rounded-[2.5rem] border border-gray-100 shadow-premium p-6 md:p-8 mb-8">
                <!-- Filters Bar -->
                <div class="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
                    <div class="flex flex-wrap items-center gap-4 flex-1">
                        <!-- Período -->
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Período</label>
                            <select onchange="window.pomodoroController.setHistoryFilter('period', this.value)" class="bg-gray-50 border border-gray-200 text-sm font-bold rounded-xl px-3.5 py-2.5 outline-none text-gray-700 hover:border-primary-300 transition-colors">
                                <option value="todos" ${filterPeriod === 'todos' ? 'selected' : ''}>Todos os Períodos</option>
                                <option value="hoje" ${filterPeriod === 'hoje' ? 'selected' : ''}>Hoje</option>
                                <option value="semana" ${filterPeriod === 'semana' ? 'selected' : ''}>Esta Semana</option>
                                <option value="mes" ${filterPeriod === 'mes' ? 'selected' : ''}>Este Mês</option>
                            </select>
                        </div>

                        <!-- Categoria -->
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Categoria</label>
                            <select onchange="window.pomodoroController.setHistoryFilter('category', this.value)" class="bg-gray-50 border border-gray-200 text-sm font-bold rounded-xl px-3.5 py-2.5 outline-none text-gray-700 hover:border-primary-300 transition-colors">
                                ${Array.from(allCats).map(cat => `
                                    <option value="${this._escapeHtml(cat)}" ${filterCat === cat ? 'selected' : ''}>
                                        ${cat === 'todas' ? 'Todas as Categorias' : this._escapeHtml(cat)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <!-- Matéria -->
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Matéria</label>
                            <select onchange="window.pomodoroController.setHistoryFilter('materia', this.value)" class="bg-gray-50 border border-gray-200 text-sm font-bold rounded-xl px-3.5 py-2.5 outline-none text-gray-700 hover:border-primary-300 transition-colors">
                                ${Array.from(allMats).map(m => `
                                    <option value="${this._escapeHtml(m)}" ${filterMat === m ? 'selected' : ''}>
                                        ${m === 'todas' ? 'Todas as Matérias' : this._escapeHtml(m)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>

                    <span class="text-xs font-black text-gray-500 uppercase tracking-wider self-end bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        ${filtered.length} registro${filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>
        `;

        if (filtered.length === 0) {
            html += `
                <div class="p-8 text-center text-gray-500 text-sm italic">
                    Nenhum registro encontrado para os filtros selecionados.
                </div>
            `;
        } else {
            Object.keys(groups).forEach(key => {
                const items = groups[key];
                items.forEach(s => {
                    if (s.pomodorosLog && Array.isArray(s.pomodorosLog) && s.pomodorosLog.length > 0) {
                        const sumLogs = s.pomodorosLog.reduce((sum, l) => sum + (l.duracaoSeg || ((l.duracaoMin || 0) * 60) || 0), 0);
                        if (sumLogs > (s.tempoTotalFocoSeg || 0)) {
                            s.tempoTotalFocoSeg = sumLogs;
                        }
                    }
                });
                const totalFoco = items.reduce((sum, s) => sum + (s.tempoTotalFocoSeg || 0), 0);
                const totalPomos = items.reduce((sum, s) => sum + (s.pomodorosConcluidos || 0), 0);
                const isWeek = key.startsWith('Semana');

                html += `
                    <div class="mb-8 last:mb-0">
                        <div class="flex items-center justify-between mb-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                            <h4 class="text-sm font-black text-gray-900 flex items-center gap-2 uppercase tracking-wider">
                                <i class="ph-bold ${isWeek ? 'ph-calendar-check text-primary-600' : 'ph-folder-notch-open text-amber-600'} text-lg"></i>
                                ${this._escapeHtml(key)}
                            </h4>
                            <div class="flex items-center gap-3 text-xs font-black text-gray-600 uppercase tracking-wider">
                                <span class="bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-1.5">🍅 ${totalPomos} pomo${totalPomos !== 1 ? 's' : ''}</span>
                                <span class="bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-1.5">⏱️ ${window.pomodoroLogic ? window.pomodoroLogic.formatDuration(totalFoco) : ''}</span>
                            </div>
                        </div>

                        <div class="space-y-3">
                `;

                items.forEach(s => {
                    const dateStr = this._formatDateTimeBR(s.dataInicio);
                    const materiaStr = s.materia || (s.materias && s.materias.length > 0 ? s.materias.join(', ') : '');
                    const logs = s.pomodorosLog || [];

                    html += `
                        <div class="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-all group">
                            <div class="flex items-start justify-between gap-4">
                                <div class="flex items-start gap-3.5 flex-1 min-w-0">
                                    <div class="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 shrink-0 mt-0.5 shadow-sm">
                                        <i class="ph-bold ph-timer text-xl"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2.5 flex-wrap mb-1">
                                            <span class="text-base font-black text-gray-900">${s.pomodorosConcluidos}/${s.pomodorosAlvo} pomodoros</span>
                                            <span class="text-xs font-black text-primary-700 bg-primary-50 border border-primary-100 px-3 py-1 rounded-lg">
                                                ${window.pomodoroLogic ? window.pomodoroLogic.formatDuration(s.tempoTotalFocoSeg || 0) : ''}
                                            </span>
                                            ${materiaStr ? `
                                                <span class="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg truncate max-w-xs">
                                                    📚 ${this._escapeHtml(materiaStr)}
                                                </span>
                                            ` : ''}
                                        </div>

                                        <p class="text-xs text-gray-500 font-medium">${dateStr}</p>
                                        
                                        <!-- Note container with edit option -->
                                        <div class="mt-3 flex items-start gap-2 bg-gray-50/80 p-3 rounded-xl border border-gray-100 group/note">
                                            <div class="flex-1 min-w-0 text-sm text-gray-700">
                                                ${s.nota ? `📝 <span id="note-text-${s.id}">${this._escapeHtml(s.nota)}</span>` : '<span class="text-gray-400 italic">Sem anotação. Clique no lápis para adicionar...</span>'}
                                            </div>
                                            <button type="button" onclick="window.pomodoroController.editSessionNote('${s.id}')" class="text-gray-400 hover:text-primary-600 transition-colors p-1.5 rounded-lg hover:bg-white active:scale-95" title="Editar anotação">
                                                <i class="ph-bold ph-pencil-simple text-base"></i>
                                            </button>
                                        </div>

                                        <!-- Individual pomodoro pills if available -->
                                        ${logs.length > 0 ? `
                                            <div class="flex items-center gap-2 flex-wrap mt-3">
                                                ${logs.map((log, idx) => `
                                                    <span class="text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200/60 px-2.5 py-1 rounded-lg flex items-center gap-1" title="Concluído às ${this._formatDateTimeBR(log.completedAt)}">
                                                        🍅 #${idx + 1} (${log.duracaoMin}m)
                                                    </span>
                                                `).join('')}
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>

                                <div class="flex items-center gap-1">
                                    <button type="button" onclick="window.pomodoroController.editSessionNote('${s.id}')" class="w-8 h-8 rounded-xl bg-gray-50 text-gray-400 hover:bg-primary-50 hover:text-primary-600 transition-all active:scale-95 flex items-center justify-center opacity-0 group-hover:opacity-100" title="Editar anotação">
                                        <i class="ph-bold ph-pencil-simple text-sm"></i>
                                    </button>
                                    <button type="button" onclick="window.pomodoroController.removeSession('${s.id}')" class="w-8 h-8 rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 flex items-center justify-center opacity-0 group-hover:opacity-100" title="Excluir sessão">
                                        <i class="ph-bold ph-trash text-sm"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });

                html += '</div></div>';
            });
        }

        html += '</div>';
        this.historyContainer.innerHTML = html;
    },

    // --- ACTIONS & CONFIG (FLUID WITHOUT FLICKER) ---
    stepConfig: function(field, delta) {
        const config = window.pomodoroLogic.config;
        const limits = {
            totalPomodoros: [1, 24],
            duracaoFoco: [1, 180],
            pausaCurta: [1, 60],
            pausaLonga: [1, 120]
        };

        const [min, max] = limits[field] || [1, 120];
        const targetProp = field === 'totalPomodoros' ? 'pomodorosAtePausaLonga' : field;
        const inputMap = {
            totalPomodoros: 'cfg-input-pomos',
            duracaoFoco: 'cfg-input-foco',
            pausaCurta: 'cfg-input-curta',
            pausaLonga: 'cfg-input-longa'
        };
        const el = document.getElementById(inputMap[field]);
        const current = (el && !isNaN(parseInt(el.value, 10))) ? parseInt(el.value, 10) : (config[targetProp] || 25);
        const next = Math.max(min, Math.min(max, current + delta));
        config[targetProp] = next;

        window.pomodoroLogic.saveConfig();

        if (el) el.value = next;

        // Update frequency label if pomos changed
        if (field === 'totalPomodoros') {
            const freqLabel = document.getElementById('cfg-label-longa-freq');
            if (freqLabel) freqLabel.textContent = `A cada ${next} pomos`;
        }

        this._updatePausaExplainer();
    },

    onInputConfig: function(field, rawVal) {
        const val = parseInt(rawVal, 10);
        if (isNaN(val) || val <= 0) return;

        const config = window.pomodoroLogic.config;
        const targetProp = field === 'totalPomodoros' ? 'pomodorosAtePausaLonga' : field;
        config[targetProp] = val;
        window.pomodoroLogic.saveConfig();

        if (field === 'totalPomodoros') {
            const freqLabel = document.getElementById('cfg-label-longa-freq');
            if (freqLabel) freqLabel.textContent = `A cada ${val} pomos`;
        }

        this._updatePausaExplainer();
    },

    togglePausaLonga: function() {
        const config = window.pomodoroLogic.config;
        config.usarPausaLonga = config.usarPausaLonga === false ? true : false;
        window.pomodoroLogic.saveConfig();

        const usarLonga = config.usarPausaLonga !== false;

        // Fluid DOM update without full page re-render
        const cardLonga = document.getElementById('cfg-card-pausa-longa');
        if (cardLonga) {
            if (usarLonga) {
                cardLonga.classList.remove('opacity-50', 'grayscale');
            } else {
                cardLonga.classList.add('opacity-50', 'grayscale');
            }
        }

        const badgeLonga = document.getElementById('cfg-badge-longa');
        if (badgeLonga) {
            badgeLonga.className = `text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${usarLonga ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`;
            badgeLonga.textContent = usarLonga ? 'Ativa' : 'Off';
        }

        const btnToggle = document.getElementById('btn-toggle-pausa-longa');
        if (btnToggle) {
            btnToggle.className = `text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border transition-all active:scale-95 flex items-center gap-1.5 self-start sm:self-auto ${usarLonga ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-300'}`;
            btnToggle.innerHTML = `<i class="ph-bold ${usarLonga ? 'ph-check-circle' : 'ph-x-circle'}"></i> Pausa Longa: ${usarLonga ? 'Ativada' : 'Desativada'}`;
        }

        this._updatePausaExplainer();
        window.utils.showToast(usarLonga ? 'Pausa longa ativada!' : 'Pausa longa desativada (apenas pausas curtas)', 'info');
    },

    _getPausaExplainerHtml: function(config) {
        const usarLonga = config.usarPausaLonga !== false;
        if (usarLonga) {
            return `
                <p>• <b>Pausa Curta (${config.pausaCurta} min):</b> É o descanso padrão que ocorre após cada pomodoro de foco para você beber água e respirar.</p>
                <p>• <b>Pausa Longa (${config.pausaLonga} min):</b> É um descanso estendido que ocorre <b>apenas a cada ${config.pomodorosAtePausaLonga} pomodoros concluídos</b> para recarregar a energia mental.</p>
                <div class="mt-2 text-[11px] font-bold text-amber-800 bg-amber-100/60 p-2 rounded-xl flex items-center gap-1.5">
                    <span>💡 <b>Seu ciclo:</b> Foco (${config.duracaoFoco}m) ➔ Pausa Curta (${config.pausaCurta}m) ... no ${config.pomodorosAtePausaLonga}º pomodoro ➔ <b>Pausa Longa (${config.pausaLonga}m)</b>.</span>
                </div>
            `;
        } else {
            return `
                <p>• <b>Pausa Longa Desativada:</b> Todos os seus intervalos de descanso terão a duração fixa da <b>Pausa Curta (${config.pausaCurta} min)</b>, sem descanso estendido.</p>
                <div class="mt-2 text-[11px] font-bold text-gray-700 bg-gray-100 p-2 rounded-xl flex items-center gap-1.5">
                    <span>💡 <b>Seu ciclo contínuo:</b> Foco (${config.duracaoFoco}m) ➔ Pausa Curta (${config.pausaCurta}m) ➔ Foco (${config.duracaoFoco}m)...</span>
                </div>
            `;
        }
    },

    _updatePausaExplainer: function() {
        const explainer = document.getElementById('pomo-pausa-explainer-text');
        if (explainer && window.pomodoroLogic) {
            explainer.innerHTML = this._getPausaExplainerHtml(window.pomodoroLogic.config);
        }
    },

    setStatsPeriod: function(period) {
        this.statsPeriod = period;
        this.renderStats();
    },

    setHistoryFilter: function(type, val) {
        if (type === 'period') this.historyFilterPeriod = val;
        if (type === 'category') this.historyFilterCategory = val;
        if (type === 'materia') this.historyFilterMateria = val;
        this.renderHistory();
    },

    onCategoryChange: function(val) {
        const logic = window.pomodoroLogic;
        if (!logic) return;
        logic.context.categoria = val;

        // If a cronograma week was selected, attach semana data
        const select = document.getElementById('pomo-select-categoria');
        if (select) {
            const opt = select.options[select.selectedIndex];
            if (opt && opt.dataset.semana) {
                logic.context.semana = opt.dataset.semana;
                logic.context.weekNum = opt.dataset.weeknum;
            } else if (!val.startsWith('Semana')) {
                logic.context.semana = null;
                logic.context.weekNum = null;
            }
        }

        // Dynamically update quick edit/delete buttons below select
        const actionsContainer = document.getElementById('pomo-cat-actions');
        if (actionsContainer) {
            const state = window.store ? window.store.getState() : {};
            const mockCats = ['Simulados', 'Revisão Geral', 'Questões', 'Leitura'];
            const customCategories = (state.pomodoroCategorias || []).filter(c => !mockCats.includes(c));
            if (customCategories.includes(val)) {
                actionsContainer.innerHTML = `
                    <div class="flex items-center gap-2 mt-1.5">
                        <span class="text-[10px] text-gray-400 font-bold">Ações da categoria:</span>
                        <button type="button" onclick="window.pomodoroController.promptEditCategory('${this._escapeHtml(val)}')" class="text-[10px] font-bold text-amber-600 hover:underline flex items-center gap-0.5" title="Renomear esta categoria">
                            <i class="ph-bold ph-pencil-simple"></i> Renomear
                        </button>
                        <span class="text-gray-300">•</span>
                        <button type="button" onclick="window.pomodoroController.deleteCategory('${this._escapeHtml(val)}')" class="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-0.5" title="Excluir esta categoria">
                            <i class="ph-bold ph-trash"></i> Excluir
                        </button>
                    </div>
                `;
            } else {
                actionsContainer.innerHTML = `<p class="text-[10px] text-gray-400 mt-1.5">As semanas do cronograma e suas categorias agrupam suas estatísticas.</p>`;
            }
        }
    },

    onMateriaChange: function(val) {
        const logic = window.pomodoroLogic;
        if (!logic) return;
        logic.context.materia = (val || '').trim();
        if (logic.context.materia) {
            logic.context.materias = [logic.context.materia];
        }
    },

    promptNewCategory: function() {
        const nome = prompt('Digite o nome da sua nova categoria personalizada (ex: Discursivas, Jurisprudência, etc.):');
        if (!nome || !nome.trim()) return;
        const cleanName = nome.trim();
        if (window.store) {
            window.store.addPomodoroCategoria(cleanName);
            if (window.pomodoroLogic) {
                window.pomodoroLogic.context.categoria = cleanName;
            }
            this.render(true);
            window.utils.showToast(`Categoria "🏷️ ${cleanName}" criada com sucesso!`, 'success');
        }
    },

    promptEditCategory: function(oldName) {
        const novo = prompt('Editar nome da categoria:', oldName);
        if (!novo || !novo.trim() || novo.trim() === oldName) return;
        const cleanNovo = novo.trim();
        if (window.store) {
            window.store.editPomodoroCategoria(oldName, cleanNovo);
            if (window.pomodoroLogic && window.pomodoroLogic.context.categoria === oldName) {
                window.pomodoroLogic.context.categoria = cleanNovo;
            }
            this.render(true);
            window.utils.showToast(`Categoria renomeada para "🏷️ ${cleanNovo}"!`, 'success');
        }
    },

    deleteCategory: function(name) {
        if (!confirm(`Deseja realmente excluir a categoria "🏷️ ${name}"?`)) return;
        if (window.store) {
            window.store.removePomodoroCategoria(name);
            if (window.pomodoroLogic && window.pomodoroLogic.context.categoria === name) {
                window.pomodoroLogic.context.categoria = 'Livre';
            }
            this.render(true);
            window.utils.showToast(`Categoria "🏷️ ${name}" excluída!`, 'info');
        }
    },

    openCategoryManagerModal: function() {
        let modal = document.getElementById('pomo-category-manager-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'pomo-category-manager-modal';
            document.body.appendChild(modal);
        }
        this._renderCategoryManagerContent();
    },

    _renderCategoryManagerContent: function() {
        const modal = document.getElementById('pomo-category-manager-modal');
        if (!modal) return;
        const state = window.store ? window.store.getState() : {};
        const mockCats = ['Simulados', 'Revisão Geral', 'Questões', 'Leitura'];
        const categories = (state.pomodoroCategorias || []).filter(c => !mockCats.includes(c));

        modal.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
                <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 space-y-6">
                    <div class="flex items-center justify-between pb-4 border-b border-gray-100">
                        <div class="flex items-center gap-2.5">
                            <span class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
                                <i class="ph-bold ph-tag"></i>
                            </span>
                            <div>
                                <h3 class="text-base font-black text-gray-900">Gerenciar Categorias</h3>
                                <p class="text-xs text-gray-400 font-medium">Crie, edite ou remova suas categorias personalizadas</p>
                            </div>
                        </div>
                        <button onclick="window.pomodoroController.closeCategoryManagerModal()" class="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center font-bold">
                            <i class="ph-bold ph-x"></i>
                        </button>
                    </div>

                    <!-- Add new inline -->
                    <div class="flex gap-2">
                        <input id="input-new-cat-manager" type="text" placeholder="Nome da nova categoria..." class="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary-500 outline-none" onkeydown="if(event.key==='Enter') window.pomodoroController.addCategoryFromManager()">
                        <button onclick="window.pomodoroController.addCategoryFromManager()" class="px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-primary-200">
                            <i class="ph-bold ph-plus"></i> Criar
                        </button>
                    </div>

                    <!-- Categories list -->
                    <div class="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                        ${categories.length === 0 ? `
                            <p class="text-xs text-gray-400 italic text-center py-6">Nenhuma categoria personalizada criada ainda.</p>
                        ` : categories.map(cat => `
                            <div class="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100/80 rounded-2xl border border-gray-100 transition-all">
                                <span class="text-xs font-bold text-gray-800 flex items-center gap-2">
                                    <span class="text-base">🏷️</span> ${this._escapeHtml(cat)}
                                </span>
                                <div class="flex items-center gap-1">
                                    <button onclick="window.pomodoroController.promptEditCategory('${this._escapeHtml(cat)}'); window.pomodoroController._renderCategoryManagerContent();" class="w-7 h-7 rounded-lg bg-white shadow-sm hover:bg-amber-50 hover:text-amber-600 text-gray-500 flex items-center justify-center transition-all" title="Renomear">
                                        <i class="ph-bold ph-pencil-simple text-xs"></i>
                                    </button>
                                    <button onclick="window.pomodoroController.deleteCategory('${this._escapeHtml(cat)}'); window.pomodoroController._renderCategoryManagerContent();" class="w-7 h-7 rounded-lg bg-white shadow-sm hover:bg-red-50 hover:text-red-500 text-gray-500 flex items-center justify-center transition-all" title="Excluir">
                                        <i class="ph-bold ph-trash text-xs"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="pt-3 border-t border-gray-100 flex justify-end">
                        <button onclick="window.pomodoroController.closeCategoryManagerModal()" class="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    addCategoryFromManager: function() {
        const input = document.getElementById('input-new-cat-manager');
        if (!input || !input.value || !input.value.trim()) return;
        const nome = input.value.trim();
        if (window.store) {
            window.store.addPomodoroCategoria(nome);
            if (window.pomodoroLogic) {
                window.pomodoroLogic.context.categoria = nome;
            }
            this.render(true);
            this._renderCategoryManagerContent();
            window.utils.showToast(`Categoria "🏷️ ${nome}" criada!`, 'success');
        }
    },

    closeCategoryManagerModal: function() {
        const modal = document.getElementById('pomo-category-manager-modal');
        if (modal) modal.innerHTML = '';
        this.render(true);
    },

    toggleAutoStart: function() {
        window.pomodoroLogic.config.autoStart = !window.pomodoroLogic.config.autoStart;
        window.pomodoroLogic.saveConfig();
        const btn = document.getElementById('btn-auto-start');
        if (btn) {
            const on = window.pomodoroLogic.config.autoStart;
            btn.className = `px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${on ? 'bg-primary-600 text-white shadow-md shadow-primary-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`;
            btn.innerHTML = `<i class="ph-bold ${on ? 'ph-check-circle' : 'ph-circle'}"></i> Auto-iniciar Ciclos: ${on ? 'Ligado' : 'Desligado'}`;
        }
    },

    toggleSound: function() {
        if (!window.pomodoroLogic) return;
        const logic = window.pomodoroLogic;
        logic.config.somAtivado = logic.config.somAtivado === false ? true : false;
        logic.saveConfig();
        const active = logic.config.somAtivado;

        const btnSetup = document.getElementById('btn-sound-setup');
        if (btnSetup) {
            btnSetup.className = `px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all active:scale-95 flex items-center gap-1.5 ${active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`;
            btnSetup.innerHTML = `<i class="ph-bold ${active ? 'ph-speaker-high' : 'ph-speaker-slash'} text-sm"></i> <span>${active ? 'Som Ativo' : 'Mudo'}</span>`;
        }

        const btnActive = document.getElementById('btn-sound-active');
        if (btnActive) {
            btnActive.innerHTML = `<i class="ph-bold ${active ? 'ph-speaker-high text-emerald-600' : 'ph-speaker-slash text-gray-400'} text-lg"></i>`;
            btnActive.title = active ? 'Silenciar som' : 'Ativar som';
        }

        window.utils.showToast(active ? 'Alarme sonoro ativado 🔊' : 'Alarme sonoro desativado 🔇', 'info');
    },

    toggleFullscreen: function() {
        const card = document.getElementById('pomo-active-card');
        if (!card) return;

        if (!document.fullscreenElement) {
            card.requestFullscreen().catch(err => {
                console.warn('Fullscreen error:', err);
            });
        } else {
            document.exitFullscreen();
        }
    },

    applyPreset: function(foco, pausa, longa, count) {
        window.pomodoroLogic.config.duracaoFoco = foco;
        window.pomodoroLogic.config.pausaCurta = pausa;
        window.pomodoroLogic.config.pausaLonga = longa;
        window.pomodoroLogic.config.pomodorosAtePausaLonga = count;
        window.pomodoroLogic.saveConfig();

        // Update inputs directly
        const inPomos = document.getElementById('cfg-input-pomos');
        const inFoco = document.getElementById('cfg-input-foco');
        const inCurta = document.getElementById('cfg-input-curta');
        const inLonga = document.getElementById('cfg-input-longa');
        if (inPomos) inPomos.value = count;
        if (inFoco) inFoco.value = foco;
        if (inCurta) inCurta.value = pausa;
        if (inLonga) inLonga.value = longa;

        const freqLabel = document.getElementById('cfg-label-longa-freq');
        if (freqLabel) freqLabel.textContent = `A cada ${count} pomos`;

        this._updatePausaExplainer();
        window.utils.showToast(`Preset aplicado: ${foco}/${pausa} min`, 'info');
    },

    clearContext: function() {
        if (window.pomodoroLogic) {
            window.pomodoroLogic.context = { categoria: 'Livre', semana: null, weekNum: null, materia: '', materias: [], conteudos: [] };
        }
        this.renderSetup();
    },

    startSession: function() {
        const logic = window.pomodoroLogic;
        if (!logic) return;

        // Capture input values before starting
        const catSelect = document.getElementById('pomo-select-categoria');
        if (catSelect) {
            this.onCategoryChange(catSelect.value);
        }
        const matInput = document.getElementById('pomo-input-materia');
        if (matInput) {
            this.onMateriaChange(matInput.value);
        }

        // Capture any directly typed values in inputs
        const inPomos = document.getElementById('cfg-input-pomos');
        const inFoco = document.getElementById('cfg-input-foco');
        const inCurta = document.getElementById('cfg-input-curta');
        const inLonga = document.getElementById('cfg-input-longa');
        if (inPomos && parseInt(inPomos.value, 10)) logic.config.pomodorosAtePausaLonga = parseInt(inPomos.value, 10);
        if (inFoco && parseInt(inFoco.value, 10)) logic.config.duracaoFoco = parseInt(inFoco.value, 10);
        if (inCurta && parseInt(inCurta.value, 10)) logic.config.pausaCurta = parseInt(inCurta.value, 10);
        if (inLonga && parseInt(inLonga.value, 10)) logic.config.pausaLonga = parseInt(inLonga.value, 10);

        logic.initSession(
            logic.config.pomodorosAtePausaLonga,
            logic.config,
            logic.context
        );

        // Wire callbacks
        logic.onTick = (time, perc, raw) => this._onTick(time, perc, raw);
        logic.onPhaseComplete = (mode) => this._onPhaseComplete(mode);
        logic.onSessionComplete = () => this._onSessionComplete();
        logic.onStateChange = () => this._onStateChange();

        logic.startNextPhase();
        this.view = 'active';
        this.renderActive();
    },

    // Triggered from Cronograma tab week header
    startFromCronograma: function(semana, weekNum, passedMaterias) {
        const logic = window.pomodoroLogic;
        if (!logic) return;

        const state = window.store ? window.store.getState() : {};
        let materias = passedMaterias;
        if (!materias || !Array.isArray(materias) || materias.length === 0) {
            const cronoItens = (state.cronograma || []).filter(i => i.semana === semana);
            const seen = {};
            materias = [];
            cronoItens.forEach(i => {
                const m = (state.materias || []).find(x => x.id === i.materiaId);
                if (m && !seen[m.id]) {
                    seen[m.id] = true;
                    materias.push(m.nome);
                }
            });
        }

        const materiaPrincipal = (materias && materias.length > 0) ? materias[0] : '';

        logic.context = {
            categoria: `Semana ${weekNum}`,
            semana: semana,
            weekNum: weekNum,
            materia: materiaPrincipal,
            materias: materias || [],
            conteudos: []
        };

        this.view = 'setup';

        // Navigate to pomodoro tab
        if (window.appControllers) {
            window.appControllers.navigate('pomodoro');
        }

        // Force re-render setup with the selected week's context
        this.render(true);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    pauseTimer: function() {
        if (window.pomodoroLogic) {
            window.pomodoroLogic.pause();
            this.renderActive();
        }
    },

    resumeTimer: function() {
        const logic = window.pomodoroLogic;
        if (!logic) return;

        if (logic.isPaused) {
            logic.resume();
        } else {
            logic.isActive = true;
            logic.isPaused = false;
            logic._startInterval();
            logic._notifyStateChange();
        }
        this.renderActive();
    },

    skipPhase: function() {
        if (window.pomodoroLogic) {
            window.pomodoroLogic.skip();
        }
    },

    cancelSession: function() {
        const logic = window.pomodoroLogic;
        if (!logic) return;

        if (!confirm('Deseja encerrar a sessão antecipadamente? Todo o tempo já estudado até aqui será salvo no histórico.')) return;

        // If currently in focus phase, record actual elapsed focus time from this partial block
        if (logic.mode === 'focus') {
            const elapsed = Math.max(0, logic.totalTime - logic.timeLeft);
            if (elapsed >= 10) {
                logic.totalFocusSeconds = (logic.accumulatedFocusBeforePhase || 0) + elapsed;
                logic.pomodorosCompleted++;
                const logItem = {
                    id: 'pomo_item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    completedAt: new Date().toISOString(),
                    duracaoMin: Math.max(1, Math.round(elapsed / 60)),
                    duracaoSeg: elapsed,
                    categoria: logic.context.categoria || (logic.context.semana ? `Semana ${logic.context.weekNum || ''}`.trim() : 'Livre'),
                    semana: logic.context.semana || null,
                    weekNum: logic.context.weekNum || null,
                    materia: logic.context.materia || (logic.context.materias && logic.context.materias.length === 1 ? logic.context.materias[0] : (logic.context.materias && logic.context.materias.length > 1 ? logic.context.materias.join(', ') : 'Geral')),
                    materias: logic.context.materias || []
                };
                logic.currentSessionLogs.push(logItem);
            }
        }

        logic.stop();
        this._onSessionComplete();
    },

    addMore: function() {
        if (window.pomodoroLogic) {
            window.pomodoroLogic.addMorePomodoros(1);
            this.renderActive();
            window.utils.showToast('+1 pomodoro adicionado ao ciclo!', 'success');
        }
    },

    addMoreAndContinue: function() {
        const logic = window.pomodoroLogic;
        if (!logic) return;

        const nota = document.getElementById('pomo-session-note');
        logic.saveSession(nota ? nota.value : '');

        logic.totalPomodoros = logic.pomodorosCompleted + 4;
        logic.mode = 'idle';

        logic.onTick = (time, perc, raw) => this._onTick(time, perc, raw);
        logic.onPhaseComplete = (mode) => this._onPhaseComplete(mode);
        logic.onSessionComplete = () => this._onSessionComplete();
        logic.onStateChange = () => this._onStateChange();

        logic.startNextPhase();
        this.view = 'active';
        this.renderActive();
        window.utils.showToast('Nova rodada iniciada! Mais 4 pomodoros.', 'success');
    },

    saveAndReset: function() {
        const logic = window.pomodoroLogic;
        if (!logic) return;

        const nota = document.getElementById('pomo-session-note');
        logic.saveSession(nota ? nota.value : '');
        logic.reset();

        this.view = 'setup';
        this.render();
        window.utils.showToast('Sessão registrada com sucesso! 🎉', 'success');
    },

    editSessionNote: function(id) {
        const state = window.store ? window.store.getState() : {};
        const sessao = (state.pomodoroSessoes || []).find(s => s.id === id);
        if (!sessao) return;

        const novaNota = prompt('Editar anotação desta sessão de estudo:', sessao.nota || '');
        if (novaNota !== null) {
            window.store.updatePomodoroSessaoNota(id, novaNota);
            this.renderHistory();
            window.utils.showToast('Anotação atualizada!', 'success');
        }
    },

    removeSession: function(id) {
        if (!confirm('Deseja realmente excluir este registro de pomodoro do histórico?')) return;
        if (window.store) {
            window.store.removePomodoroSessao(id);
            this.renderHistory();
            this.renderStats();
            window.utils.showToast('Registro excluído com sucesso.', 'info');
        }
    },

    // --- INTERNAL HELPERS & METRICS ---
    _extractLogsForPeriod: function(period) {
        const sessoes = (window.store ? window.store.getState().pomodoroSessoes : []) || [];
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Start of week (Monday)
        const currentDay = now.getDay();
        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);

        // Start of month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const logs = [];
        sessoes.forEach(s => {
            if (s.pomodorosLog && Array.isArray(s.pomodorosLog) && s.pomodorosLog.length > 0) {
                s.pomodorosLog.forEach(log => {
                    const logDate = new Date(log.completedAt || s.dataInicio);
                    let matches = true;
                    if (period === 'hoje') {
                        matches = (log.completedAt || s.dataInicio || '').startsWith(todayStr);
                    } else if (period === 'semana') {
                        matches = logDate >= monday;
                    } else if (period === 'mes') {
                        matches = logDate >= startOfMonth;
                    }
                    if (matches) {
                        logs.push({
                            ...log,
                            sessionId: s.id,
                            categoria: log.categoria || s.categoria || (s.semana ? `Semana ${s.weekNum || ''}`.trim() : 'Livre'),
                            materia: log.materia || s.materia || (s.materias && s.materias[0]) || 'Geral'
                        });
                    }
                });
            } else {
                // Fallback for legacy sessions without individual logs
                const sessionDate = new Date(s.dataInicio);
                let matches = true;
                if (period === 'hoje') {
                    matches = (s.dataInicio || '').startsWith(todayStr);
                } else if (period === 'semana') {
                    matches = sessionDate >= monday;
                } else if (period === 'mes') {
                    matches = sessionDate >= startOfMonth;
                }
                if (matches) {
                    const count = s.pomodorosConcluidos || 1;
                    const durMin = s.duracaoFoco || 25;
                    for (let i = 0; i < count; i++) {
                        logs.push({
                            id: s.id + '_' + i,
                            completedAt: s.dataInicio,
                            duracaoMin: durMin,
                            duracaoSeg: durMin * 60,
                            sessionId: s.id,
                            categoria: s.categoria || (s.semana ? `Semana ${s.weekNum || ''}`.trim() : 'Livre'),
                            materia: s.materia || (s.materias && s.materias[0]) || 'Geral'
                        });
                    }
                }
            }
        });
        return logs;
    },

    _onTick: function(time, perc, raw) {
        const display = document.getElementById('pomo-timer-display');
        if (display) display.textContent = time;

        const ring = document.getElementById('pomo-ring-progress');
        if (ring) {
            const circumference = 2 * Math.PI * 54;
            const progress = window.pomodoroLogic.getProgress();
            const dashoffset = circumference - (progress / 100) * circumference;
            ring.setAttribute('stroke-dashoffset', dashoffset);
        }
    },

    _onPhaseComplete: function(mode) {
        const msg = mode === 'focus'
            ? `🍅 Pomodoro ${window.pomodoroLogic.pomodorosCompleted}/${window.pomodoroLogic.totalPomodoros} concluído! Hora da pausa.`
            : '☕ Pausa finalizada! Hora do foco!';
        window.utils.showToast(msg, 'info');

        setTimeout(() => this.renderActive(), 300);
    },

    _onSessionComplete: function() {
        this.view = 'complete';
        this.renderComplete();
        this.renderStats();
    },

    _onStateChange: function() {
        if (this.view === 'active') {
            this.renderActive();
        }
    },

    _formatDateBR: function(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr + 'T12:00:00');
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        } catch (e) { return dateStr; }
    },

    _formatDateTimeBR: function(isoStr) {
        if (!isoStr) return '';
        try {
            const d = new Date(isoStr);
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
                   d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } catch (e) { return isoStr; }
    },

    _escapeHtml: function(text) {
        if (!text) return '';
        return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
};
