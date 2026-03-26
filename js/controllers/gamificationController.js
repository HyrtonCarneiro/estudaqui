window.gamificationController = {
    updateUI: function() {
        const state = window.store.getState();
        const stats = state.estatisticas || { streak: 0, totalHorasEstudo: 0 };
        const simulados = state.simulados || [];
        
        const elStreak = document.getElementById('stat-streak');
        const elMedia = document.getElementById('stat-media-acertos');
        const elHoras = document.getElementById('stat-total-horas');
        const containerBadges = document.getElementById('container-badges');
        
        // Sync with Dashboard counterparts too if they exist
        const dashStreak = document.getElementById('dash-streak');
        const dashMedia = document.getElementById('dash-media-simulados');
        const dashHoras = document.getElementById('dash-total-horas');

        // Update Streak
        const streakText = stats.streak + ' dias';
        if (elStreak) elStreak.textContent = streakText;
        if (dashStreak) dashStreak.textContent = streakText;
        
        // Update Media
        let mediaText = '--%';
        if (simulados.length > 0) {
            const sum = simulados.reduce((acc, curr) => acc + (curr.percentual || curr.nota || 0), 0);
            mediaText = Math.round(sum / simulados.length) + '%';
        }
        if (elMedia) elMedia.textContent = mediaText;
        if (dashMedia) dashMedia.textContent = mediaText;
        
        // Update Horas
        const hoursText = stats.totalHorasEstudo + 'h';
        if (elHoras) elHoras.textContent = hoursText;
        if (dashHoras) dashHoras.textContent = hoursText;

        this.renderBadges(containerBadges);
    },

    renderBadges: function(container) {
        if (!container) return;
        const state = window.store.getState();
        const stats = state.estatisticas || {};
        const simulados = state.simulados || [];
        const cronograma = state.cronograma || [];

        container.innerHTML = "";
        
        const badgesConfig = [
            { id: 'streak-3', name: 'Aprendiz Fiel', desc: '3 dias seguidos', icon: 'ph-fill ph-sketch-logo', color: 'from-orange-400 to-red-500', requirement: stats.streak >= 3 },
            { id: 'streak-7', name: 'Hábito de Ferro', desc: '7 dias seguidos', icon: 'ph-fill ph-fire', color: 'from-red-500 to-pink-600', requirement: stats.streak >= 7 },
            { id: 'hours-10', name: 'Focado', desc: '10 horas de estudo', icon: 'ph-fill ph-lightning', color: 'from-yellow-400 to-orange-500', requirement: stats.totalHorasEstudo >= 10 },
            { id: 'hours-50', name: 'Maratonista', desc: '50 horas de estudo', icon: 'ph-fill ph-trophy', color: 'from-blue-400 to-indigo-600', requirement: stats.totalHorasEstudo >= 50 },
            { id: 'sim-80', name: 'Sniper', desc: 'Nota > 80% em simulado', icon: 'ph-fill ph-target', color: 'from-green-400 to-emerald-600', requirement: simulados.some(s => (s.percentual || s.nota) >= 80) },
            { id: 'done-20', name: 'Conquistador', desc: '20 conteúdos vistos', icon: 'ph-fill ph-crown', color: 'from-purple-500 to-indigo-800', requirement: cronograma.filter(i => i.concluido).length >= 20 }
        ];

        badgesConfig.forEach(b => {
            const div = document.createElement('div');
            const grayscale = b.requirement ? "" : "grayscale opacity-20 cursor-not-allowed";
            const lockedIcon = b.requirement ? "" : '<i class="ph-bold ph-lock absolute top-2 right-2 text-gray-400/50"></i>';
            
            div.className = `relative group bg-white p-6 rounded-[2rem] shadow-premium border border-gray-50 flex flex-col items-center text-center transition-all ${b.requirement ? 'hover:-translate-y-2 hover:shadow-xl hover:border-primary-100' : ''}`;
            div.innerHTML = `
                ${lockedIcon}
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br ${b.color} flex items-center justify-center text-white mb-4 shadow-lg ${grayscale}">
                    <i class="${b.icon} text-3xl"></i>
                </div>
                <h4 class="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1 ${grayscale}">${b.name}</h4>
                <p class="text-[8px] font-bold text-gray-400 uppercase tracking-tighter ${grayscale}">${b.desc}</p>
                ${b.requirement ? '<div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-primary-500 rounded-full mb-2"></div>' : ""}
            `;
            container.appendChild(div);
        });
    }
};
