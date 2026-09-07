// Pomodoro Engine — Multi-session timer logic with configurable cycles
window.pomodoroLogic = {
    // Timer state
    timer: null,
    totalTime: 25 * 60,
    timeLeft: 25 * 60,
    isActive: false,
    isPaused: false,

    // Session state
    mode: 'idle',           // 'idle' | 'focus' | 'shortBreak' | 'longBreak'
    currentPomodoro: 0,     // Which pomodoro we're on (1-indexed when running)
    totalPomodoros: 4,
    pomodorosCompleted: 0,
    totalFocusSeconds: 0,   // Accumulated focus time in this session
    sessionStartTime: null,
    currentSessionLogs: [], // Individual log for each completed focus pomodoro: { id, completedAt, duracaoMin, duracaoSeg, categoria, semana, weekNum, materia, materias }

    // Config (loaded from store)
    config: {
        duracaoFoco: 25,
        pausaCurta: 5,
        pausaLonga: 15,
        pomodorosAtePausaLonga: 4,
        autoStart: false,
        metaDiaria: 8,
        somAtivado: true
    },

    // Context (set when starting from cronograma or customized manually)
    context: {
        categoria: 'Livre',
        semana: null,
        weekNum: null,
        materia: '',
        materias: [],
        conteudos: []
    },

    // Callbacks
    onTick: null,
    onPhaseComplete: null,
    onSessionComplete: null,
    onStateChange: null,

    // Motivational quotes for breaks
    quotes: [
        "O descanso é parte do estudo. Respire fundo! 🌿",
        "Você está construindo sua aprovação, um pomodoro de cada vez. 💪",
        "Mente descansada aprende melhor. Relaxe! ☕",
        "Cada minuto de foco te aproxima do seu objetivo. 🎯",
        "Disciplina é o atalho para a aprovação! 🏆",
        "Quem estuda com método, estuda menos e aprende mais. 📚",
        "Pausa estratégica: recarregando o cérebro... 🧠",
        "Lembre-se: consistência vence intensidade. 🔥",
        "Você já está à frente de quem nem começou! 🚀",
        "A aprovação é inevitável para quem não desiste. ⭐"
    ],

    loadConfig: function() {
        if (window.store) {
            const saved = window.store.getState().pomodoroConfig;
            if (saved) {
                this.config = { ...this.config, ...saved };
            }
        }
    },

    saveConfig: function() {
        if (window.store) {
            window.store.updatePomodoroConfig(this.config);
        }
    },

    getRandomQuote: function() {
        return this.quotes[Math.floor(Math.random() * this.quotes.length)];
    },

    // Initialize a new session
    initSession: function(totalPomodoros, config, context) {
        this.stop();
        this.config = { ...this.config, ...config };
        this.totalPomodoros = totalPomodoros || this.config.pomodorosAtePausaLonga;
        this.currentPomodoro = 0;
        this.pomodorosCompleted = 0;
        this.totalFocusSeconds = 0;
        this.currentSessionLogs = [];
        this.sessionStartTime = new Date().toISOString();
        this.context = {
            categoria: 'Livre',
            semana: null,
            weekNum: null,
            materia: '',
            materias: [],
            conteudos: [],
            ...context
        };
        this.mode = 'idle';
        this.isPaused = false;
        this.saveConfig();
    },

    // Start the next phase (focus or break)
    startNextPhase: function() {
        if (this.mode === 'idle' || this.mode === 'shortBreak' || this.mode === 'longBreak') {
            // Start a focus phase
            this.currentPomodoro++;
            this.mode = 'focus';
            this.totalTime = this.config.duracaoFoco * 60;
            this.timeLeft = this.totalTime;
        } else if (this.mode === 'focus') {
            // Focus just ended, decide on break type
            this.pomodorosCompleted++;
            
            if (this.pomodorosCompleted >= this.totalPomodoros) {
                // Session complete
                this.mode = 'idle';
                if (this.onSessionComplete) this.onSessionComplete();
                return;
            }

            // Determine break type
            if (this.pomodorosCompleted % this.config.pomodorosAtePausaLonga === 0) {
                this.mode = 'longBreak';
                this.totalTime = this.config.pausaLonga * 60;
            } else {
                this.mode = 'shortBreak';
                this.totalTime = this.config.pausaCurta * 60;
            }
            this.timeLeft = this.totalTime;
        }

        this.isPaused = false;
        this.isActive = true;
        this._notifyStateChange();
        this._startInterval();
    },

    _startInterval: function() {
        if (this.timer) clearInterval(this.timer);

        this.timer = setInterval(() => {
            this.timeLeft--;
            
            // Track focus seconds
            if (this.mode === 'focus') {
                this.totalFocusSeconds++;
            }

            // Update browser title
            this._updateTitle();

            if (this.onTick) {
                const perc = (this.timeLeft / this.totalTime) * 100;
                this.onTick(this.formatTime(this.timeLeft), perc, this.timeLeft);
            }

            if (this.timeLeft <= 0) {
                this._phaseComplete();
            }
        }, 1000);
    },

    _phaseComplete: function() {
        clearInterval(this.timer);
        this.timer = null;
        this.isActive = false;

        const completedMode = this.mode;

        // Play sound
        this.playAlarm(completedMode);

        // Send browser notification
        this._sendNotification(completedMode);

        if (this.onPhaseComplete) {
            this.onPhaseComplete(completedMode);
        }

        // Auto-advance
        if (completedMode === 'focus') {
            this.pomodorosCompleted++;

            // Record individual pomodoro log with exact completion date/time
            const logItem = {
                id: 'pomo_item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                completedAt: new Date().toISOString(),
                duracaoMin: this.config.duracaoFoco,
                duracaoSeg: this.config.duracaoFoco * 60,
                categoria: this.context.categoria || (this.context.semana ? `Semana ${this.context.weekNum || ''}`.trim() : 'Livre'),
                semana: this.context.semana || null,
                weekNum: this.context.weekNum || null,
                materia: this.context.materia || (this.context.materias && this.context.materias.length === 1 ? this.context.materias[0] : (this.context.materias && this.context.materias.length > 1 ? this.context.materias.join(', ') : 'Geral')),
                materias: this.context.materias || []
            };
            this.currentSessionLogs.push(logItem);

            if (this.pomodorosCompleted >= this.totalPomodoros) {
                this.mode = 'idle';
                this._updateTitle();
                this._notifyStateChange();
                if (this.onSessionComplete) this.onSessionComplete();
                return;
            }

            // Determine break type
            if (this.pomodorosCompleted % this.config.pomodorosAtePausaLonga === 0) {
                this.mode = 'longBreak';
                this.totalTime = this.config.pausaLonga * 60;
            } else {
                this.mode = 'shortBreak';
                this.totalTime = this.config.pausaCurta * 60;
            }
            this.timeLeft = this.totalTime;

            if (this.config.autoStart) {
                this.isPaused = false;
                this.isActive = true;
                this._startInterval();
            }
        } else {
            // Break ended, start next focus
            this.currentPomodoro++;
            this.mode = 'focus';
            this.totalTime = this.config.duracaoFoco * 60;
            this.timeLeft = this.totalTime;

            if (this.config.autoStart) {
                this.isPaused = false;
                this.isActive = true;
                this._startInterval();
            }
        }

        this._updateTitle();
        this._notifyStateChange();
    },

    pause: function() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isActive = false;
        this.isPaused = true;
        this._updateTitle();
        this._notifyStateChange();
    },

    resume: function() {
        if (!this.isPaused) return;
        this.isPaused = false;
        this.isActive = true;
        this._startInterval();
        this._notifyStateChange();
    },

    stop: function() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isActive = false;
        this.isPaused = false;
        this._restoreTitle();
    },

    skip: function() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isActive = false;
        this.isPaused = false;

        // If skipping focus, still count it
        if (this.mode === 'focus') {
            this._phaseComplete();
        } else {
            // Skipping break -> go to next focus
            this.currentPomodoro++;
            this.mode = 'focus';
            this.totalTime = this.config.duracaoFoco * 60;
            this.timeLeft = this.totalTime;
            this._notifyStateChange();
        }
    },

    addMorePomodoros: function(count) {
        this.totalPomodoros += count;
        this._notifyStateChange();
    },

    reset: function() {
        this.stop();
        this.mode = 'idle';
        this.currentPomodoro = 0;
        this.pomodorosCompleted = 0;
        this.totalFocusSeconds = 0;
        this.currentSessionLogs = [];
        this.sessionStartTime = null;
        this.context = { categoria: 'Livre', semana: null, weekNum: null, materia: '', materias: [], conteudos: [] };
        this._restoreTitle();
        this._notifyStateChange();
    },

    // Save completed session to store
    saveSession: function(nota) {
        if (!window.store || this.pomodorosCompleted === 0) return null;

        const defaultMateria = this.context.materia || (this.context.materias && this.context.materias.length === 1 ? this.context.materias[0] : (this.context.materias && this.context.materias.length > 1 ? this.context.materias.join(', ') : 'Geral'));

        const sessao = window.store.addPomodoroSessao({
            dataInicio: this.sessionStartTime || new Date().toISOString(),
            dataFim: new Date().toISOString(),
            categoria: this.context.categoria || (this.context.semana ? `Semana ${this.context.weekNum || ''}`.trim() : 'Livre'),
            semana: this.context.semana || null,
            weekNum: this.context.weekNum || null,
            materia: defaultMateria,
            materias: this.context.materias || (this.context.materia ? [this.context.materia] : []),
            pomodorosAlvo: this.totalPomodoros,
            pomodorosConcluidos: this.pomodorosCompleted,
            duracaoFoco: this.config.duracaoFoco,
            duracaoPausa: this.config.pausaCurta,
            tempoTotalFocoSeg: this.totalFocusSeconds,
            nota: nota || '',
            pomodorosLog: this.currentSessionLogs || []
        });

        // Also update total study hours in stats
        const hours = this.totalFocusSeconds / 3600;
        if (window.store.getState().estatisticas) {
            window.store.getState().estatisticas.totalHorasEstudo = 
                (window.store.getState().estatisticas.totalHorasEstudo || 0) + hours;
            window.store.save();
        }

        return sessao;
    },

    formatTime: function(seconds) {
        const m = Math.floor(Math.abs(seconds) / 60);
        const s = Math.abs(seconds) % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    },

    formatDuration: function(totalSeconds) {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}min`;
        return `${m}min`;
    },

    getProgress: function() {
        if (this.totalTime === 0) return 0;
        return ((this.totalTime - this.timeLeft) / this.totalTime) * 100;
    },

    getModeLabel: function() {
        switch (this.mode) {
            case 'focus': return 'Foco';
            case 'shortBreak': return 'Pausa Curta';
            case 'longBreak': return 'Pausa Longa';
            default: return 'Pronto';
        }
    },

    getModeIcon: function() {
        switch (this.mode) {
            case 'focus': return 'ph-bold ph-brain';
            case 'shortBreak': return 'ph-bold ph-coffee';
            case 'longBreak': return 'ph-bold ph-park';
            default: return 'ph-bold ph-timer';
        }
    },

    _notifyStateChange: function() {
        if (this.onStateChange) this.onStateChange();
    },

    _updateTitle: function() {
        const emoji = this.mode === 'focus' ? '🍅' : '☕';
        const time = this.formatTime(this.timeLeft);
        const label = this.getModeLabel();
        document.title = `${emoji} ${time} — ${label} | Concursos Hyrtinho`;
    },

    _restoreTitle: function() {
        document.title = 'Concursos Hyrtinho | Sua Aprovação Começa Aqui';
    },

    // Request notification permission
    requestNotificationPermission: function() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    },

    _sendNotification: function(completedMode) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        try {
            const title = completedMode === 'focus'
                ? `🍅 Pomodoro ${this.pomodorosCompleted + 1} concluído!`
                : '☕ Pausa finalizada!';
            const body = completedMode === 'focus'
                ? `Hora de descansar! ${this.pomodorosCompleted + 1}/${this.totalPomodoros} concluídos.`
                : 'Hora de voltar ao foco!';

            new Notification(title, {
                body,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🍅</text></svg>',
                tag: 'pomodoro-concursos'
            });
        } catch (e) {
            console.warn('Notification failed:', e);
        }
    },

    playAlarm: function(completedMode) {
        if (this.config.somAtivado === false) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            const now = ctx.currentTime;

            const notes = completedMode === 'focus'
                ? [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6 — celebration
                : [880.00, 659.25, 523.25, 440.00];  // A5, E5, C5, A4 — back to focus

            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.18);
                gain.gain.setValueAtTime(0.25, now + idx * 0.18);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.35);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.18);
                osc.stop(now + idx * 0.18 + 0.35);
            });
        } catch (e) {
            console.warn('Pomodoro alarm unavailable:', e);
        }
    }
};
