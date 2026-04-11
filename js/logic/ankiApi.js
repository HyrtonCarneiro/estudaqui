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

    async getWorkloadForecast(days = 7) {
        try {
            const forecast = [];
            
            // Today's reviews
            const todayReviews = await this.invoke('findCards', 6, { query: 'is:due -is:new' });
            forecast.push({ day: 'Hoje', count: todayReviews.length });

            const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            let todayObj = new Date();

            // Next days
            for (let i = 1; i < days; i++) {
                const nextDate = new Date(todayObj);
                nextDate.setDate(todayObj.getDate() + i);
                const dayName = diasSemana[nextDate.getDay()];
                
                // Query for cards due exactly in `i` days
                const cards = await this.invoke('findCards', 6, { query: `prop:due=${i}` });
                forecast.push({ day: dayName, count: cards.length });
            }

            return forecast;
        } catch (e) {
            console.error("Error getting workload forecast", e);
            return [];
        }
    },
    
    async getTodayStats() {
        try {
            const dueToday = await this.invoke('findCards', 6, { query: 'is:due' });
            const newToday = await this.invoke('findCards', 6, { query: 'is:new' });
            
            // To find how many studied today, we can get today from Heatmap
            const heatmap = await this.getHeatmapData();
            // Get today date formatted as YYYY-MM-DD
            const todayObj = new Date();
            const yyyy = todayObj.getFullYear();
            const mm = String(todayObj.getMonth() + 1).padStart(2, '0');
            const dd = String(todayObj.getDate()).padStart(2, '0');
            const todayStr = `${yyyy}-${mm}-${dd}`;
            
            let studiedToday = 0;
            const todayEntry = heatmap.find(entry => entry[0] === todayStr);
            if (todayEntry) {
                studiedToday = todayEntry[1];
            }

            return {
                due: dueToday.length,
                newCards: newToday.length, // total new cards available in the deck
                studied: studiedToday
            };
        } catch (e) {
            console.warn("Could not get today's stats fully: ", e);
            return { due: 0, newCards: 0, studied: 0 };
        }
    }
};
