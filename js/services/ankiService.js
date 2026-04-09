window.ankiService = {
    /**
     * Obtém a quantidade de cards pendentes (due) para hoje via AnkiConnect API.
     * @returns {Promise<{success: boolean, count?: number, error?: string}>}
     */
    getDueCardsCount: async function() {
        try {
            // Buscas em paralelo para otimizar velocidade
            const [newRes, learnRes, reviewRes] = await Promise.all([
                this._fetchAnki("is:new"),
                this._fetchAnki("is:learn"),
                this._fetchAnki("is:review is:due")
            ]);

            const newCount = newRes.result ? newRes.result.length : 0;
            const learnCount = learnRes.result ? learnRes.result.length : 0;
            const reviewCount = reviewRes.result ? reviewRes.result.length : 0;

            const total = newCount + learnCount + reviewCount;

            return { 
                success: true, 
                count: total,
                breakdown: {
                    new: newCount,
                    learn: learnCount,
                    review: reviewCount
                }
            };
            
        } catch (err) {
            // Pode ser um TypeError (fetch failed devido a CORS ou Anki fechado) ou os erros manuais acima.
            return { success: false, error: "Anki Offline ou CORS bloqueador. Error: " + err.message };
        }
    },

    /**
     * Helper interno para fazer a requisição do AnkiConnect
     */
    _fetchAnki: async function(queryStr) {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "action": "findCards",
                "version": 6,
                "params": { "query": queryStr }
            })
        });
        
        if (!response.ok) throw new Error('Servidor retornou erro ou não está rodando.');
        
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        
        return result;
    }
};
