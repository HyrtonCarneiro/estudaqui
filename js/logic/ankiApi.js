window.ankiApi = {
    _activeUrl: null,

    /** Retorna todos os endereços salvos */
    getUrls: function() {
        try {
            var stored = localStorage.getItem('anki_connect_urls');
            if (stored) {
                var parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch(e) {}
        // Migração: converte formato antigo (URL única) para o novo (lista)
        var legacy = localStorage.getItem('anki_connect_url');
        if (legacy) {
            var urls = ['http://localhost:8765'];
            if (legacy !== 'http://localhost:8765') urls.push(legacy);
            localStorage.setItem('anki_connect_urls', JSON.stringify(urls));
            localStorage.removeItem('anki_connect_url');
            return urls;
        }
        return ['http://localhost:8765'];
    },

    /** Getter retrocompatível — retorna a URL ativa ou a melhor candidata */
    get url() {
        if (this._activeUrl) return this._activeUrl;
        var last = localStorage.getItem('anki_connect_last_working');
        if (last) return last;
        return this.getUrls()[0] || 'http://localhost:8765';
    },

    _saveUrls: function(urls) {
        localStorage.setItem('anki_connect_urls', JSON.stringify(urls));
    },

    /** Adiciona um endereço à lista */
    addUrl: function(newUrl) {
        if (!newUrl) return;
        newUrl = newUrl.trim();
        if (!newUrl.startsWith('http')) newUrl = 'http://' + newUrl;
        if (!/:\d+$/.test(newUrl)) newUrl += ':8765';
        var urls = this.getUrls();
        if (urls.indexOf(newUrl) === -1) {
            urls.push(newUrl);
            this._saveUrls(urls);
        }
    },

    /** Remove um endereço da lista */
    removeUrl: function(urlToRemove) {
        var urls = this.getUrls().filter(function(u) { return u !== urlToRemove; });
        if (urls.length === 0) urls = ['http://localhost:8765'];
        this._saveUrls(urls);
        if (this._activeUrl === urlToRemove) this._activeUrl = null;
        if (localStorage.getItem('anki_connect_last_working') === urlToRemove) {
            localStorage.removeItem('anki_connect_last_working');
        }
    },

    /** Setter retrocompatível */
    setUrl: function(newUrl) {
        this.addUrl(newUrl);
    },

    /** Tenta conectar a uma URL específica com timeout */
    _tryConnect: function(testUrl, timeoutMs) {
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            var timer = setTimeout(function() { xhr.abort(); reject(new Error('Timeout')); }, timeoutMs || 3000);
            xhr.addEventListener('error', function() { clearTimeout(timer); reject(new Error('Conexão recusada')); });
            xhr.addEventListener('load', function() {
                clearTimeout(timer);
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.error) reject(new Error(response.error));
                    else resolve({ url: testUrl, result: response.result });
                } catch(e) { reject(e); }
            });
            xhr.open('POST', testUrl);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify({ action: 'version', version: 6 }));
        });
    },

    async invoke(action, version, params = {}) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener('error', () => reject(new Error('Failed to issue request to AnkiConnect. Make sure Anki is open and AnkiConnect is installed.')));
            xhr.addEventListener('load', () => {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (Object.getOwnPropertyNames(response).length !== 2) {
                        throw new Error('Response has an unexpected number of fields');
                    }
                    if (!response.hasOwnProperty('error')) {
                        throw new Error('Response is missing required error field');
                    }
                    if (!response.hasOwnProperty('result')) {
                        throw new Error('Response is missing required result field');
                    }
                    if (response.error) {
                        throw new Error(response.error);
                    }
                    resolve(response.result);
                } catch (e) {
                    reject(e);
                }
            });

            xhr.open('POST', this.url);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify({ action, version, params }));
        });
    },

    // Process lists of IDs in batches to avoid payload limits and timeouts
    async invokeBatch(action, version, ids, keyName = 'cards', batchSize = 500) {
        const results = [];
        for (let i = 0; i < ids.length; i += batchSize) {
            const batch = ids.slice(i, i + batchSize);
            const params = {};
            params[keyName] = batch;
            const res = await this.invoke(action, version, params);
            if (Array.isArray(res)) results.push(...res);
            else if (typeof res === 'object') Object.assign(results, res); // for map returns
        }
        return results;
    },

    async checkConnection() {
        var urls = this.getUrls();
        var self = this;

        // 1. Prioridade: tenta o último endereço que funcionou
        var lastWorking = localStorage.getItem('anki_connect_last_working');
        if (lastWorking && urls.indexOf(lastWorking) !== -1) {
            try {
                await this._tryConnect(lastWorking, 2000);
                this._activeUrl = lastWorking;
                return true;
            } catch(e) { /* silencioso, tenta os outros */ }
        }

        // 2. Tenta TODOS os endereços em paralelo — o primeiro a responder vence
        var attempts = urls.map(function(u) {
            return self._tryConnect(u, 4000).then(function(res) {
                self._activeUrl = res.url;
                localStorage.setItem('anki_connect_last_working', res.url);
                return true;
            });
        });

        try {
            return await Promise.any(attempts);
        } catch(e) {
            this._activeUrl = null;
            return false;
        }
    },

    async getHeatmapData() {
        try {
            // Returns [[date_string, count], ...]
            const data = await this.invoke('getNumCardsReviewedByDay', 6);
            return data || [];
        } catch (e) {
            console.warn("Local Heatmap failed, trying cloud...");
            return await window.ankiService.getCloudHeatmapData();
        }
    },

    async getTagLapses() {
        try {
            // Find cards with lapses > 0 to get the most problematic cards
            const lapseCards = await this.invoke('findCards', 6, { query: 'prop:lapses>0' });
            if (!lapseCards || lapseCards.length === 0) return {};

            // Get cards info in batches
            const cardsInfo = await this.invokeBatch('cardsInfo', 6, lapseCards);
            const tagErrors = {};

            // Extract Note IDs to fetch real tags
            const noteIds = [...new Set(cardsInfo.map(c => c.note))].filter(id => id);
            const notesInfo = await this.invokeBatch('notesInfo', 6, noteIds, 'notes');
            
            const noteTagsMap = {};
            notesInfo.forEach(n => {
                if (n && n.noteId) {
                    noteTagsMap[n.noteId] = n.tags || [];
                }
            });

            const ignoreTags = ['leech', 'marked', 'import'];

            cardsInfo.forEach(card => {
                if (card.lapses > 0) {
                    let subjects = [];
                    
                    let rawTags = noteTagsMap[card.note] || card.tags || [];
                    if (typeof rawTags === 'string') rawTags = rawTags.trim().split(/\s+/);

                    if (Array.isArray(rawTags) && rawTags.length > 0) {
                        rawTags.forEach(tag => {
                            if (ignoreTags.some(t => tag.toLowerCase().includes(t))) return;
                            const cleanTag = tag.replace(/_/g, ' ').replace(/-/g, ' ');
                            subjects.push(cleanTag.charAt(0).toUpperCase() + cleanTag.slice(1));
                        });
                    }

                    // Fallback para o deck associado se não houver tags
                    if (subjects.length === 0 && card.deckName) {
                        const mainDeck = card.deckName.split('::')[0];
                        if (mainDeck !== 'Default') {
                            subjects.push(mainDeck);
                        }
                    }

                    subjects.forEach(subjectName => {
                        tagErrors[subjectName] = (tagErrors[subjectName] || 0) + card.lapses;
                    });
                }
            });

            return tagErrors;
        } catch (e) {
            console.warn("Local Tag Lapses failed, trying cloud...");
            return await window.ankiService.getCloudTagLapses();
        }
    },

    async getWorkloadForecast(days = 30) {
        try {
            const forecast = [];
            const labels = [];
            const todayObj = new Date();

            for (let i = 0; i < days; i++) {
                const query = (i === 0) ? '(is:due OR is:learn OR is:new) -is:suspended' : `prop:due=${i}`;
                const cards = await this.invoke('findCards', 6, { query });
                
                const nextDate = new Date(todayObj);
                nextDate.setDate(todayObj.getDate() + i);
                
                let dayLabel;
                if (i === 0) dayLabel = 'Hoje';
                else if (i === 1) dayLabel = 'Amanhã';
                else {
                    dayLabel = `${nextDate.getDate()}/${nextDate.getMonth() + 1}`;
                }

                forecast.push({ day: dayLabel, count: cards.length });
            }

            return forecast;
        } catch (e) {
            console.warn("Local Forecast failed, trying cloud...");
            return await window.ankiService.getCloudForecastData();
        }
    },
    
    async getSevenDayStats() {
        try {
            // 1. Current Queue (what is pending NOW)
            const [newRes, learnRes, reviewRes] = await Promise.all([
                this.invoke('findCards', 6, { query: 'is:new -is:suspended' }),
                this.invoke('findCards', 6, { query: 'is:learn' }),
                this.invoke('findCards', 6, { query: 'is:review is:due' })
            ]);
            const currentPendente = newRes.length + learnRes.length + reviewRes.length;
            
            // Novos adicionados nos ultimos 7 dias
            const addedRes = await this.invoke('findCards', 6, { query: 'added:7' });
            const added7dCount = addedRes.length;

            // 2. Performance (History of last 7 days)
            const ratedLast7Days = await this.invoke('findCards', 6, { query: 'rated:7' });
            
            let totalStudied = 0;
            let timeTotalMs = 0;
            let correctCount = 0;
            let wrongCount = 0;
            let reviewsCount = 0;
            
            let timeTodayMs = 0;
            let actionsTodayCount = 0;
            const startOfToday = new Date().setHours(0, 0, 0, 0);

            if (ratedLast7Days.length > 0) {
                const reviewsMap = await this.invokeBatch('getReviewsOfCards', 6, ratedLast7Days);
                const sevenDaysAgo = new Date().getTime() - (7 * 24 * 60 * 60 * 1000);

                Object.values(reviewsMap).forEach(cardReviews => {
                    if (!Array.isArray(cardReviews)) return;

                    cardReviews.forEach(rev => {
                        if (rev.id >= sevenDaysAgo) {
                            totalStudied++;
                            timeTotalMs += rev.time;
                            
                            if (rev.ease === 1) wrongCount++;
                            else correctCount++;

                            // Tipos de revisão do Anki no BD oficial (revlog.type):
                            // 0: Aprender (Learn)
                            // 1: Revisão normal (Review)
                            // 2: Re-aprender após falha (Relearn)
                            // 3: Estudo personalizado/Cram (Cram)
                            if (rev.type === 1 || rev.type === 2) reviewsCount++;
                        }
                        
                        if (rev.id >= startOfToday) {
                            timeTodayMs += rev.time;
                            actionsTodayCount++;
                        }
                    });
                });
            }

            const totalActions = correctCount + wrongCount;
            return {
                pendente: currentPendente,
                studied7d: totalStudied,
                new7d: added7dCount,
                rev7d: reviewsCount,
                timeMs: timeTotalMs,
                avgMs: totalActions > 0 ? timeTotalMs / totalActions : 0,
                timeTodayMs: timeTodayMs,
                avgTodayMs: actionsTodayCount > 0 ? timeTodayMs / actionsTodayCount : 0,
                correct: correctCount,
                wrong: wrongCount,
                accuracy: totalActions > 0 ? (correctCount / totalActions) * 100 : 0
            };
        } catch (e) {
            console.warn("Could not get 7-day stats fully: ", e);
            return { pendente: 0, studied7d: 0, new7d: 0, rev7d: 0, timeMs: 0, avgMs: 0, timeTodayMs: 0, avgTodayMs: 0, correct: 0, wrong: 0, accuracy: 0 };
        }
    },

    async getSyllabusData() {
        try {
            // 1. Busca todos os cards ativos
            const allCards = await this.invoke('findCards', 6, { query: '-is:suspended -is:buried' });
            if (allCards.length === 0) return {};

            // 2. Busca informações dos cartões (para pegar note IDs e deckNames)
            const cardsInfo = await this.invokeBatch('cardsInfo', 6, allCards);
            
            // 3. Extrai Note IDs únicos para buscar as etiquetas reais
            const noteIds = [...new Set(cardsInfo.map(c => c.note))].filter(id => id);
            const notesInfo = await this.invokeBatch('notesInfo', 6, noteIds, 'notes');
            
            // 4. Cria mapa de NoteId -> Tags
            const noteTagsMap = {};
            notesInfo.forEach(n => {
                if (n && n.noteId) {
                    noteTagsMap[n.noteId] = n.tags || [];
                }
            });

            const syllabus = {};
            const systemTags = ['leech', 'marked'];

            cardsInfo.forEach(card => {
                let subjects = [];

                // 5. Tentar Tags vindas da Nota (caminho mais seguro)
                let rawTags = noteTagsMap[card.note] || card.tags || [];
                
                // Garantir formato de array
                if (typeof rawTags === 'string') {
                    rawTags = rawTags.trim().split(/\s+/);
                }

                if (Array.isArray(rawTags) && rawTags.length > 0) {
                    rawTags.forEach(tag => {
                        if (systemTags.includes(tag.toLowerCase())) return;
                        const cleanTag = tag.replace(/_/g, ' ').replace(/-/g, ' ');
                        subjects.push(cleanTag.charAt(0).toUpperCase() + cleanTag.slice(1));
                    });
                }

                // 6. Se não houver tags legítimas, usar o Deck como fallback
                if (subjects.length === 0 && card.deckName) {
                    const mainDeck = card.deckName.split('::')[0];
                    if (mainDeck !== 'Default') {
                        subjects.push(mainDeck);
                    }
                }

                subjects.forEach(subjectName => {
                    if (!syllabus[subjectName]) {
                        syllabus[subjectName] = { new: 0, young: 0, mature: 0, total: 0, lapses: 0 };
                    }

                    syllabus[subjectName].total++;
                    syllabus[subjectName].lapses += (card.lapses || 0);

                    if (card.queue < 0) return;
                    if (card.type === 0) syllabus[subjectName].new++;
                    else if (card.ivl >= 21) syllabus[subjectName].mature++;
                    else syllabus[subjectName].young++;
                });
            });

            return syllabus;
        } catch (e) {
            console.warn("Local Syllabus failed, trying cloud...", e);
            return await window.ankiService.getCloudSyllabusData();
        }
    },

};

