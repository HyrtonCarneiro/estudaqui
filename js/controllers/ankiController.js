window.ankiController = {
    initialized: false,
    chartWorkload: null,
    chartLapses: null,

    init: async function() {
        if (!this.initialized) {
            this.bindEvents();
            this.bindStudyEvents();
            this.initialized = true;
        }
        await this.render();
    },

    bindEvents: function() {
        const btnRetry = document.getElementById('btn-anki-retry');
        if (btnRetry) {
            btnRetry.addEventListener('click', () => {
                this.render();
            });
        }
    },

    bindStudyEvents: function() {
        document.getElementById('btn-anki-show-answer')?.addEventListener('click', () => this.revealAnswer());
        
        document.querySelectorAll('#anki-answer-buttons button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ease = parseInt(e.currentTarget.dataset.ease);
                this.submitAnswer(ease);
            });
        });
        
        document.getElementById('btn-anki-edit-card')?.addEventListener('click', () => this.openEditModal());
        
        document.getElementById('form-anki-edit-card')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCardEdit();
        });

        window.removeEventListener('keydown', this._handleKeydown);
        this._handleKeydown = (e) => {
            if (!this.initialized || document.getElementById('page-anki').classList.contains('hidden')) return;
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

            if (e.code === 'Space') {
                e.preventDefault();
                this.revealAnswer();
            } else if (['1', '2', '3', '4'].includes(e.key)) {
                const ease = parseInt(e.key);
                this.submitAnswer(ease);
            }
        };
        window.addEventListener('keydown', this._handleKeydown);
    },

    render: async function() {
        const containerApp = document.getElementById('anki-app-container');
        const containerError = document.getElementById('anki-error-container');
        
        // Exibir loading ou ocultar error preventivamente
        containerApp.classList.add('hidden');
        containerError.classList.add('hidden');
        
        const isConnected = await window.ankiApi.checkConnection();
        
        if (!isConnected) {
            containerError.classList.remove('hidden');
            return;
        }

        containerApp.classList.remove('hidden');
        
        // 1. Prioridade Máxima: Motor de Estudos (para não travar o usuário)
        try {
            await this.startStudySession();
        } catch (e) {
            console.error("Erro ao iniciar sessão de estudo:", e);
        }

        // 2. Carga em paralelo das estatísticas (não-bloqueante)
        const loadStats = async (label, fn) => {
            try {
                await fn();
            } catch (err) {
                console.error(`Falha ao carregar ${label}:`, err);
            }
        };

        loadStats("Stats Gerais", () => this.updateStats());
        loadStats("Heatmap", () => this.renderHeatmap());
        loadStats("Syllabus", () => this.renderSyllabus());
        loadStats("Lapses", () => this.renderTagPerformance());
        loadStats("Forecast", () => this.renderWorkloadForecast());
    },

    startStudySession: async function() {
        try {
            const sessionContainer = document.getElementById('anki-study-session');
            const box = document.getElementById('anki-card-box');
            const empty = document.getElementById('anki-card-empty');
            const qEl = document.getElementById('anki-card-question');
            const aContainer = document.getElementById('anki-card-answer-container');
            const btnShow = document.getElementById('btn-anki-show-answer');
            const btnAnswers = document.getElementById('anki-answer-buttons');
            const progressEl = document.getElementById('anki-study-progress');

            sessionContainer.classList.remove('hidden');
            
            this.currentCard = await window.ankiApi.getNextDueCard();
            
            if (!this.currentCard) {
                qEl.classList.add('hidden');
                aContainer.classList.add('hidden');
                btnShow.classList.add('hidden');
                btnAnswers.classList.add('hidden');
                empty.classList.remove('hidden');
                progressEl.textContent = "FILA ZERADA! 🎉";
                
                // Celebration
                Swal.fire({
                    title: 'Parabéns!',
                    text: 'Você concluiu todas as revisões agendadas.',
                    icon: 'success',
                    confirmButtonText: 'Sensacional!',
                    confirmButtonColor: '#3b82f6',
                    backdrop: `rgba(0,0,123,0.4) url("https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ3R3Yng0Z2t3Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z3B6Z/3o7TKSjP3gZ4XF8f6u/giphy.gif") left top no-repeat`
                });
                return;
            }

            // Setup card UI
            empty.classList.add('hidden');
            qEl.classList.remove('hidden');
            const frontContent = this.getCardField(this.currentCard, 'q');
            qEl.innerHTML = this.formatContent(frontContent, true);
            aContainer.classList.add('hidden');
            btnShow.classList.remove('hidden');
            btnAnswers.classList.add('hidden');
            
            progressEl.textContent = `DECK: ${this.currentCard.deckName} | ID: ${this.currentCard.cardId}`;
        } catch (e) {
            console.error("Erro na sessão de estudo:", e);
            document.getElementById('anki-card-question').innerHTML = `<p class="text-sm text-red-400 font-bold">Erro ao processar card.<br><span class="text-[10px] opacity-70">Verifique se o card possui campos de texto válidos.</span></p>`;
        }
    },

    formatContent: function(text, isFront) {
        if (!text) return '';
        // Cloze deletion parsing: {{c1::text::hint}}
        if (isFront) {
            return text.replace(/\{\{c\d+::(.*?)(::.*?)?\}\}/g, (match, p1, p2) => {
                const hint = p2 ? p2.substring(2) : '...';
                return `<span class="bg-primary-600/30 text-white px-2 py-0.5 rounded border border-primary-500/20 font-bold mx-1">[${hint}]</span>`;
            });
        } else {
            return text.replace(/\{\{c\d+::(.*?)(::.*?)?\}\}/g, (match, p1, p2) => {
                return `<span class="text-primary-300 font-black border-b-2 border-primary-500/40 px-1 hover:bg-primary-500/10 transition-colors cursor-help">${p1}</span>`;
            });
        }
    },

    // Helper to find field content regardless of name (Front/Frente/Text/etc)
    getCardField: function(card, type) {
        if (!card || !card.fields) return '';
        
        const fields = card.fields;
        const qNames = ['Front', 'Frente', 'Text', 'Pergunta', 'Question', 'Question (Front)'];
        const aNames = ['Back', 'Verso', 'Extra', 'Resposta', 'Answer', 'Answer (Back)'];
        
        const targets = type === 'q' ? qNames : aNames;
        
        // Try known matches first
        for (const name of targets) {
            if (fields[name]) return fields[name].value;
        }
        
        // Fallback: use first field for Q, second for A
        const allKeys = Object.keys(fields);
        if (type === 'q') return fields[allKeys[0]] ? fields[allKeys[0]].value : '';
        return fields[allKeys[1]] ? fields[allKeys[1]].value : (fields[allKeys[0]] ? fields[allKeys[0]].value : '');
    },

    revealAnswer: async function() {
        if (!this.currentCard) return;
        const aContainer = document.getElementById('anki-card-answer-container');
        const aEl = document.getElementById('anki-card-answer');
        const btnShow = document.getElementById('btn-anki-show-answer');
        const btnAnswers = document.getElementById('anki-answer-buttons');

        if (!aContainer.classList.contains('hidden')) return;

        // Try to get exact intervals from API first
        let intervals = await window.ankiApi.getNextIntervals(this.currentCard.cardId);
        
        // Fallback to manual calculation if API fails or returns null
        if (!intervals) {
            const config = await window.ankiApi.getDeckConfig(this.currentCard.deckName);
            intervals = this.calculateNextIntervals(this.currentCard, config);
        }

        if (intervals && intervals.length === 4) {
            const labels = document.querySelectorAll('#anki-answer-buttons button .interval-label');
            labels.forEach((el, idx) => {
                el.textContent = intervals[idx];
            });
        }

        // In cloze cards, we usually show the front formatted for answer + the back field
        const frontRaw = this.getCardField(this.currentCard, 'q');
        const backRaw = this.getCardField(this.currentCard, 'a');
        
        const frontFormatted = this.formatContent(frontRaw, false);
        
        aEl.innerHTML = `${frontFormatted}<div class="mt-6 pt-6 border-t border-white/5 opacity-80">${backRaw}</div>`;
        aContainer.classList.remove('hidden');
        btnShow.classList.add('hidden');
        btnAnswers.classList.remove('hidden');
    },

    formatTime: function(seconds) {
        if (seconds < 60) return `< 1min`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
        if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
        const days = Math.round(seconds / 86400);
        if (days < 30) return `${days}dia(s)`;
        if (days < 365) return `${Math.round(days / 30)}mês(es)`;
        return `${Math.round(days / 365)}ano(s)`;
    },

    calculateNextIntervals: function(card, config) {
        if (!config) return ["---", "---", "---", "---"];
        
        // Use basic SM-2 algorithm approximation
        const type = card.type; // 0=new, 1=learn, 2=review, 3=relearn
        const ivl = card.ivl || 1;
        const ease = card.factor || 2500;
        const easeFactor = ease / 1000;
        
        if (type === 2) { // Review card
            const hardBonus = 1.2;
            const ease4Bonus = config.rev ? config.rev.ease4 || 1.3 : 1.3;
            
            return [
                "10min",
                this.formatTime(ivl * hardBonus * 86400),
                this.formatTime(ivl * easeFactor * 86400),
                this.formatTime(ivl * easeFactor * ease4Bonus * 86400)
            ];
        } else {
            // New or Learning
            const delays = (config.new && config.new.delays) ? config.new.delays : [1, 10];
            const graduatingIvl = (config.new && config.new.ints) ? config.new.ints[0] : 1;
            const easyIvl = (config.new && config.new.ints) ? config.new.ints[1] : 4;
            
            return [
                this.formatTime(delays[0] * 60),
                this.formatTime(((delays[0] + (delays[1] || delays[0])) / 2) * 60),
                this.formatTime((delays[1] || delays[0]) * 60),
                this.formatTime(easyIvl * 86400)
            ];
        }
    },

    submitAnswer: async function(ease) {
        if (!this.currentCard || document.getElementById('anki-answer-buttons').classList.contains('hidden')) return;

        try {
            await window.ankiApi.answerCard(this.currentCard.cardId, ease);
            
            // Animation for next card
            const box = document.getElementById('anki-card-box');
            box.classList.add('opacity-0', '-translate-y-4');
            
            setTimeout(async () => {
                await this.startStudySession();
                await this.updateStats();
                box.classList.remove('opacity-0', '-translate-y-4');
            }, 200);

        } catch (e) {
            console.error("Error answering card", e);
        }
    },

    openEditModal: function() {
        if (!this.currentCard) return;
        
        const front = this.getCardField(this.currentCard, 'q');
        const back = this.getCardField(this.currentCard, 'a');

        document.getElementById('anki-edit-note-id').value = this.currentCard.note;
        document.getElementById('anki-edit-front').value = front;
        document.getElementById('anki-edit-back').value = back;
        
        document.getElementById('modal-anki-edit-card').classList.remove('hidden');
    },

    saveCardEdit: async function() {
        const noteId = document.getElementById('anki-edit-note-id').value;
        const frontContent = document.getElementById('anki-edit-front').value;
        const backContent = document.getElementById('anki-edit-back').value;

        try {
            // We need to know which field names to update. 
            // In AnkiConnect updateNoteFields, we MUST specify the actual names.
            const fieldsToUpdate = {};
            const fields = this.currentCard.fields;
            const allKeys = Object.keys(fields);
            
            // Try to map back intelligently
            const qNames = ['Front', 'Frente', 'Text', 'Pergunta'];
            const aNames = ['Back', 'Verso', 'Extra', 'Resposta'];
            
            let qField = allKeys.find(k => qNames.includes(k)) || allKeys[0];
            let aField = allKeys.find(k => aNames.includes(k)) || (allKeys[1] || allKeys[0]);

            fieldsToUpdate[qField] = frontContent;
            if (qField !== aField) fieldsToUpdate[aField] = backContent;

            await window.ankiApi.updateCardFields(noteId, fieldsToUpdate);
            
            document.getElementById('modal-anki-edit-card').classList.add('hidden');
            
            // Update local state and UI
            fields[qField].value = frontContent;
            if (fields[aField]) fields[aField].value = backContent;
            
            document.getElementById('anki-card-question').innerHTML = this.formatContent(frontContent, true);
            if (!document.getElementById('anki-card-answer-container').classList.contains('hidden')) {
                document.getElementById('anki-card-answer').innerHTML = backContent;
            }
            
            Swal.fire({
                icon: 'success',
                title: 'Card Atualizado!',
                text: 'As alterações foram salvas no Anki Desktop.',
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        } catch (e) {
            Swal.fire('Erro', 'Não foi possível salvar as alterações.', 'error');
        }
    },

    renderSyllabus: async function() {
        const container = document.getElementById('anki-syllabus-list');
        if (!container) return;

        container.innerHTML = '<div class="flex items-center justify-center p-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>';

        const data = await window.ankiApi.getSyllabusData();
        container.innerHTML = '';

        const materias = Object.keys(data).sort((a,b) => data[b].total - data[a].total);

        if (materias.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 text-sm py-10">Nenhuma matéria com cards encontrada.</p>';
            return;
        }

        materias.forEach(subject => {
            const stats = data[subject];
            const matCard = document.createElement('div');
            matCard.className = 'bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:border-primary-200 transition-all group';
            
            const youngPerc = Math.round((stats.young / stats.total) * 100);
            const maturePerc = Math.round((stats.mature / stats.total) * 100);
            const newPerc = 100 - youngPerc - maturePerc;

            matCard.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <h4 class="text-xs font-black text-gray-800 uppercase tracking-tight">${subject}</h4>
                    <span class="text-[9px] font-bold text-gray-400">${stats.total} cards</span>
                </div>
                <div class="flex h-1.5 w-full rounded-full overflow-hidden bg-gray-200 mb-2">
                    <div class="bg-green-500 h-full" style="width: ${maturePerc}%"></div>
                    <div class="bg-blue-400 h-full" style="width: ${youngPerc}%"></div>
                    <div class="bg-gray-300 h-full" style="width: ${newPerc}%"></div>
                </div>
                <div class="flex justify-between text-[9px] font-bold">
                    <div class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> Maduros ${maturePerc}%</div>
                    <div class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Jovens ${youngPerc}%</div>
                    <div class="flex items-center gap-1 text-red-500"><i class="ph-bold ph-warning"></i> ${stats.lapses} falhas</div>
                </div>
            `;
            container.appendChild(matCard);
        });
    },

    updateStats: async function() {
        const stats = await window.ankiApi.getTodayStats();
        
        const elDue = document.getElementById('anki-stat-due');
        const elLearn = document.getElementById('anki-stat-learn');
        const elNew = document.getElementById('anki-stat-new');
        const elTime = document.getElementById('anki-stat-time');
        const elAvg = document.getElementById('anki-stat-avg');

        if (elDue) elDue.textContent = stats.due;
        if (elLearn) elLearn.textContent = stats.learn;
        if (elNew) elNew.textContent = stats.newCards;
        
        if (elTime) {
            const mins = Math.round(stats.timeMs / 60000);
            elTime.textContent = mins + 'm';
        }
        
        if (elAvg) {
            const secs = Math.round(stats.avgMs / 1000);
            elAvg.textContent = secs + 's';
        }
    },

    renderHeatmap: async function() {
        const heatmapData = await window.ankiApi.getHeatmapData();
        const container = document.getElementById('anki-heatmap-grid');
        const elStreak = document.getElementById('anki-heatmap-streak');
        const elTotal = document.getElementById('anki-heatmap-total');
        if (!container) return;
        
        container.innerHTML = '';
        
        let totalReviews = 0;
        let streak = 0;
        let currentStreakCount = 0;
        
        // Transform array to a map for easy lookup
        const records = {};
        let maxReviews = 1;
        heatmapData.forEach(entry => {
            records[entry[0]] = entry[1];
            totalReviews += entry[1];
            if (entry[1] > maxReviews) maxReviews = entry[1];
        });

        // Calculate current streak
        const today = new Date();
        const checkDate = new Date(today);
        while (records[`${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`] > 0) {
            currentStreakCount++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
        
        if (elStreak) elStreak.textContent = currentStreakCount;
        if (elTotal) elTotal.textContent = totalReviews >= 1000 ? (totalReviews/1000).toFixed(1) + 'k' : totalReviews;

        const daysToRender = 180;
        for (let i = daysToRender; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            
            const formatStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const displayStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            
            const count = records[formatStr] || 0;
            const box = document.createElement('div');
            box.className = 'w-3 h-3 rounded-sm transition-all hover:scale-125 hover:z-10 cursor-pointer relative group';
            
            if (count === 0) {
                box.classList.add('bg-gray-100');
            } else {
                const ratio = count / maxReviews;
                if (ratio < 0.25) box.classList.add('bg-green-200');
                else if (ratio < 0.5) box.classList.add('bg-green-400');
                else if (ratio < 0.75) box.classList.add('bg-green-600');
                else box.classList.add('bg-green-800');
            }

            const tooltip = document.createElement('div');
            tooltip.className = 'absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-[9px] whitespace-nowrap rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20';
            tooltip.textContent = `${count} revs em ${displayStr}`;
            box.appendChild(tooltip);
            container.appendChild(box);
        }
    },

    renderTagPerformance: async function() {
        const ctx = document.getElementById('chart-anki-lapses');
        if (!ctx) return;

        const lapsesData = await window.ankiApi.getTagLapses();
        const labels = Object.keys(lapsesData);
        
        const emptyMsgId = 'anki-lapses-empty-msg';
        let emptyMsg = document.getElementById(emptyMsgId);

        if (labels.length === 0) {
            ctx.style.display = 'none';
            if (!emptyMsg) {
                emptyMsg = document.createElement('div');
                emptyMsg.id = emptyMsgId;
                emptyMsg.className = 'flex flex-col items-center justify-center text-gray-400 w-full h-full';
                emptyMsg.innerHTML = '<i class="ph-fill ph-check-circle text-4xl mb-2 text-green-500"></i><p class="text-sm font-bold text-center">Nenhum erro crítico detectado!</p><p class="text-xs text-center mt-1 leading-relaxed">Você ainda não errou cartões repetidas vezes nas revisões<br>ou seus cartões no Anki não possuem <b>Tags</b>.</p>';
                ctx.parentElement.appendChild(emptyMsg);
            } else {
                emptyMsg.style.display = 'flex';
            }
            if (this.chartLapses) {
                this.chartLapses.destroy();
            }
            return;
        } else {
            ctx.style.display = 'block';
            if (emptyMsg) emptyMsg.style.display = 'none';
        }

        // Sort by most errors
        labels.sort((a, b) => lapsesData[b] - lapsesData[a]);
        
        // Top 10 to not overcrowd the pie chart
        const topLabels = labels.slice(0, 10);
        const topValues = topLabels.map(l => lapsesData[l]);

        if (this.chartLapses) {
            this.chartLapses.destroy();
        }

        const colors = [
            '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', 
            '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7'
        ];

        this.chartLapses = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: topLabels,
                datasets: [{
                    data: topValues,
                    backgroundColor: colors,
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 10, font: { family: 'Outfit' } } },
                    tooltip: { callbacks: { label: function(context) { return ' ' + context.label + ': ' + context.raw + ' erros'; } } },
                    datalabels: { display: false } // hide external plugin text if used globally
                },
                cutout: '70%'
            }
        });
    },

    renderWorkloadForecast: async function() {
        const ctx = document.getElementById('chart-anki-workload');
        if (!ctx) return;

        const forecastData = await window.ankiApi.getWorkloadForecast(28); // 28 days forecast
        
        const labels = forecastData.map(d => d.day);
        const data = forecastData.map(d => d.count);

        if (this.chartWorkload) {
            this.chartWorkload.destroy();
        }

        this.chartWorkload = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revisões Devidas',
                    data: data,
                    backgroundColor: forecastData.map((d, i) => i === 0 ? '#3b82f6' : '#e5e7eb'),
                    hoverBackgroundColor: '#3b82f6',
                    borderRadius: 4,
                    barPercentage: 0.8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: '#f9fafb' }, 
                        ticks: { font: { size: 9, family: 'Outfit' } } 
                    },
                    x: { 
                        grid: { display: false }, 
                        ticks: { 
                            font: { size: 9, family: 'Outfit' },
                            maxRotation: 0,
                            callback: function(val, index) {
                                // Show only every 3rd label for better readability if many days
                                return index % 3 === 0 ? this.getLabelForValue(val) : '';
                            }
                        } 
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#111827',
                        padding: 12,
                        titleFont: { size: 10, family: 'Outfit', weight: '900' },
                        bodyFont: { size: 12, family: 'Outfit' },
                        displayColors: false,
                        callbacks: { 
                            title: function(items) { return items[0].label; },
                            label: function(context) { return ' ' + context.raw + ' cartões devidos'; } 
                        }
                    },
                    datalabels: { display: false }
                }
            }
        });
    }
};
