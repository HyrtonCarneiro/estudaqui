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
            console.error("Error getting heatmap data", e);
            return [];
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

            cardsInfo.forEach(card => {
                if (card.lapses > 0 && card.tags && card.tags.length > 0) {
                    // Filter system tags (like marked, leech, etc)
                    const ignoreTags = ['leech', 'marked'];
                    card.tags.forEach(tag => {
                        if (ignoreTags.includes(tag.toLowerCase())) return;
                        
                        // Capitalize and format tag nicely
                        const cleanTag = tag.replace(/_/g, ' ').replace(/-/g, ' ');
                        const finalTag = cleanTag.charAt(0).toUpperCase() + cleanTag.slice(1);
                        
                        tagErrors[finalTag] = (tagErrors[finalTag] || 0) + card.lapses;
                    });
                }
            });

            return tagErrors;
        } catch (e) {
            console.error("Error getting tag lapses", e);
            return {};
        }
    },

    async getWorkloadForecast(days = 30) {
        try {
            const forecast = [];
            const labels = [];
            const todayObj = new Date();

            for (let i = 0; i < days; i++) {
                const query = (i === 0) ? '(is:new or is:learn or is:due) -is:suspended -is:buried' : `prop:due=${i}`;
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
            console.error("Error getting workload forecast", e);
            return [];
        }
    },
    
    async getTodayStats() {
        try {
            // Fast counts
            const dueRes = await this.invoke('findCards', 6, { query: 'is:due is:review -is:suspended -is:buried' });
            const learnRes = await this.invoke('findCards', 6, { query: 'is:learn -is:suspended -is:buried' });
            const newRes = await this.invoke('findCards', 6, { query: 'is:new -is:suspended -is:buried' });
            
            // For time, we only get reviews of cards rated today
            const ratedToday = await this.invoke('findCards', 6, { query: 'rated:1' });
            
            let studiedToday = ratedToday.length;
            let timeTodayMs = 0;

            // Only fetch review logs if there are reasonable number of reviews to avoid lag
            // If > 1000 reviews, we might want to skip detailed time or batch it
            if (studiedToday > 0 && studiedToday < 2000) {
                const reviewsToday = await this.invokeBatch('getReviewsOfCards', 6, ratedToday);
                const todayStart = new Date().setHours(0,0,0,0);

                Object.values(reviewsToday).forEach(cardReviews => {
                    if (!Array.isArray(cardReviews)) return;
                    cardReviews.forEach(rev => {
                        if (rev.id >= todayStart) {
                            timeTodayMs += rev.time;
                        }
                    });
                });
            }

            return {
                due: dueRes.length,
                learn: learnRes.length,
                newCards: newRes.length,
                studied: studiedToday,
                timeMs: timeTodayMs,
                avgMs: studiedToday > 0 ? timeTodayMs / studiedToday : 0
            };
        } catch (e) {
            console.warn("Could not get today's stats fully: ", e);
            return { due: 0, learn: 0, newCards: 0, studied: 0, timeMs: 0, avgMs: 0 };
        }
    },

    async getSyllabusData() {
        try {
            const materias = await this.invoke('findCards', 6, { query: 'tag:*' });
            if (materias.length === 0) return {};

            // Fetch info in batches to prevent payload errors
            const cardsInfo = await this.invokeBatch('cardsInfo', 6, materias);
            
            const syllabus = {};
            const ignoreTags = ['leech', 'marked', 'import'];

            cardsInfo.forEach(card => {
                if (!card.tags) return;
                card.tags.forEach(tag => {
                    if (ignoreTags.some(t => tag.toLowerCase().includes(t))) return;

                    const cleanTag = tag.replace(/_/g, ' ').replace(/-/g, ' ');
                    const finalTag = cleanTag.charAt(0).toUpperCase() + cleanTag.slice(1);

                    if (!syllabus[finalTag]) {
                        syllabus[finalTag] = { new: 0, young: 0, mature: 0, total: 0, lapses: 0 };
                    }

                    syllabus[finalTag].total++;
                    syllabus[finalTag].lapses += (card.lapses || 0);

                    // Determine status
                    if (card.queue < 0) return; // suspended/buried
                    if (card.type === 0) syllabus[finalTag].new++;
                    else if (card.ivl >= 21) syllabus[finalTag].mature++;
                    else syllabus[finalTag].young++;
                });
            });

            return syllabus;
        } catch (e) {
            console.error("Error getting syllabus data", e);
            return {};
        }
    },

};

