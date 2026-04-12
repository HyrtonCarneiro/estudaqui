window.ankiApi = {
    url: 'http://127.0.0.1:8765',

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

    async checkConnection() {
        try {
            await this.invoke('version', 6);
            return true;
        } catch (e) {
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

            // Get cards info
            const cardsInfo = await this.invoke('cardsInfo', 6, { cards: lapseCards });
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
                const query = (i === 0) ? 'is:due -is:new' : `prop:due=${i}`;
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
            const dueToday = await this.invoke('findCards', 6, { query: 'is:due is:review' });
            const learnToday = await this.invoke('findCards', 6, { query: 'is:learn' });
            const newToday = await this.invoke('findCards', 6, { query: 'is:new' });
            
            // Get today's reviews to calculate time
            const reviewsToday = await this.invoke('getReviewsOfCards', 6, { 
                cards: await this.invoke('findCards', 6, { query: 'rated:1' }) 
            });

            let studiedToday = 0;
            let timeTodayMs = 0;
            const todayStart = new Date().setHours(0,0,0,0);

            Object.values(reviewsToday).forEach(cardReviews => {
                cardReviews.forEach(rev => {
                    if (rev.id >= todayStart) {
                        studiedToday++;
                        timeTodayMs += rev.time;
                    }
                });
            });

            return {
                due: dueToday.length,
                learn: learnToday.length,
                newCards: newToday.length,
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
            const cardsInfo = await this.invoke('cardsInfo', 6, { cards: materias });
            
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

    async getNextDueCard() {
        try {
            // is:due returns combined review and learning cards that are due
            const cards = await this.invoke('findCards', 6, { query: 'is:due -is:suspended' });
            if (!cards || cards.length === 0) return null;
            
            // Get detailed info for the first card in the queue
            const info = await this.invoke('cardsInfo', 6, { cards: [cards[0]] });
            return info[0];
        } catch (e) {
            console.error("Next due card fetch failed", e);
            return null;
        }
    },

    async answerCard(cardId, ease) {
        try {
            return await this.invoke('answerCard', 6, { card: cardId, ease: ease });
        } catch (e) {
            console.error("Failed to answer card", e);
            throw e;
        }
    },

    async updateCardFields(noteId, fields) {
        try {
            return await this.invoke('updateNoteFields', 6, { 
                note: { id: noteId, fields: fields } 
            });
        } catch (e) {
            console.error("Failed to update note fields", e);
            throw e;
        }
    }
};
