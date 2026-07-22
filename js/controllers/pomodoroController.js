window.pomodoroController = {
    isOpen: false,

    init: function() {
        this.cacheDOM();
        this.bindEvents();
        if (window.pomodoroLogic) {
            this.updateUI(window.pomodoroLogic.formatTime(window.pomodoroLogic.timeLeft), 100);
        }
    },

    cacheDOM: function() {
        this.fabEl = document.getElementById('btn-pomo-fab');
        this.contentEl = document.getElementById('pomodoro-content');
        this.btnClose = document.getElementById('btn-pomo-close');
        this.labelEl = document.getElementById('pomo-label');
        this.timerEl = document.getElementById('pomo-timer');
        this.materiaEl = document.getElementById('pomo-materia');
        this.btnToggle = document.getElementById('btn-pomo-toggle');
        this.btnReset = document.getElementById('btn-pomo-reset');
    },

    bindEvents: function() {
        if (this.fabEl) this.fabEl.onclick = () => this.toggleWidget();
        if (this.btnClose) this.btnClose.onclick = () => this.closeWidget();
        if (this.btnToggle) this.btnToggle.onclick = () => this.handleToggle();
        if (this.btnReset) this.btnReset.onclick = () => this.handleReset();
    },

    toggleWidget: function() {
        if (this.isOpen) {
            this.closeWidget();
        } else {
            this.openWidget();
        }
    },

    openWidget: function() {
        if (!this.contentEl) return;
        this.isOpen = true;
        this.contentEl.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
        this.contentEl.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
    },

    closeWidget: function() {
        if (!this.contentEl) return;
        this.isOpen = false;
        this.contentEl.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
        this.contentEl.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
    },

    handleToggle: function() {
        if (window.pomodoroLogic.isActive) {
            window.pomodoroLogic.stop();
            this.updateIcon(false);
            if (this.materiaEl) this.materiaEl.textContent = "Pausado";
        } else {
            window.pomodoroLogic.start(
                (time, perc) => this.updateUI(time, perc),
                (mode) => this.handleComplete(mode)
            );
            this.updateIcon(true);
            if (this.materiaEl) {
                this.materiaEl.textContent = window.pomodoroLogic.mode === 'work' ? "Foco Total (50 min)" : "Descanso (10 min)";
            }
        }
    },

    updateUI: function(time, perc) {
        if (this.timerEl) this.timerEl.textContent = time;
    },

    updateIcon: function(active) {
        if (!this.btnToggle) return;
        this.btnToggle.textContent = active ? "Pausar" : "Iniciar";
    },

    handleReset: function() {
        const currentMode = window.pomodoroLogic ? window.pomodoroLogic.mode : 'work';
        const time = window.pomodoroLogic.reset(currentMode);
        this.updateUI(time, 100);
        this.updateIcon(false);
        if (this.labelEl) {
            this.labelEl.textContent = currentMode === 'work' ? "Modo Foco" : "Modo Descanso";
        }
        if (this.materiaEl) {
            this.materiaEl.textContent = currentMode === 'work' ? "Pronto para o Foco (50m)" : "Pronto para o Descanso (10m)";
        }
    },

    handleComplete: function(completedMode) {
        // Toca o alarme sonoro
        if (window.pomodoroLogic && window.pomodoroLogic.playAlarm) {
            window.pomodoroLogic.playAlarm(completedMode);
        }

        const nextMode = completedMode === 'work' ? 'break' : 'work';
        const msg = completedMode === 'work'
            ? "🔔 Sessão de estudo de 50 minutos concluída! Hora de descansar 10 minutos."
            : "🔔 Descanso de 10 minutos finalizado! Hora de voltar ao foco!";
            
        if (window.utils && window.utils.showToast) {
            window.utils.showToast(msg, "info");
        }
        
        window.pomodoroLogic.reset(nextMode);
        this.handleReset();
        this.openWidget();
    }
};

