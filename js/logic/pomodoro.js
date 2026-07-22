window.pomodoroLogic = {
    timer: null,
    totalTime: 50 * 60,
    timeLeft: 50 * 60,
    isActive: false,
    mode: 'work', // 'work' or 'break'
    
    start: function(onTick, onComplete) {
        if (this.isActive) return;
        this.isActive = true;
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            if (onTick) {
                const perc = (this.timeLeft / this.totalTime) * 100;
                onTick(this.formatTime(this.timeLeft), perc);
            }
            
            if (this.timeLeft <= 0) {
                this.stop();
                if (onComplete) onComplete(this.mode);
            }
        }, 1000);
    },
    
    stop: function() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isActive = false;
    },
    
    reset: function(mode = 'work') {
        this.stop();
        this.mode = mode;
        this.totalTime = mode === 'work' ? 50 * 60 : 10 * 60;
        this.timeLeft = this.totalTime;
        return this.formatTime(this.timeLeft);
    },
    
    formatTime: function(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    },

    playAlarm: function(completedMode = 'work') {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            const now = ctx.currentTime;
            
            // Frequências das notas do alarme (sons agradáveis de notificação)
            const notes = completedMode === 'work'
                ? [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6 (Tom festivo ao finalizar 50m)
                : [880.00, 659.25, 523.25, 440.00];  // A5, E5, C5, A4 (Tom de retorno ao foco)

            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.18);
                gain.gain.setValueAtTime(0.3, now + idx * 0.18);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.3);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.18);
                osc.stop(now + idx * 0.18 + 0.3);
            });
        } catch (e) {
            console.warn('Alarme sonoro do Pomodoro indisponível:', e);
        }
    }
};

