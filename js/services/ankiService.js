window.ankiService = {
    /**
     * Obtém a quantidade de cards pendentes (due) para hoje via AnkiConnect API.
     * @returns {Promise<{success: boolean, count?: number, error?: string}>}
     */
    getDueCardsCount: async function() {
        try {
            const response = await fetch('http://localhost:8765', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "action": "findCards",
                    "version": 6,
                    "params": {
                        "query": "is:due"
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error('Servidor retornou erro ou não está rodando.');
            }
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            // O findCards retorna um array com os IDs dos cards.
            const count = result.result ? result.result.length : 0;
            return { success: true, count: count };
            
        } catch (err) {
            // Pode ser um TypeError (fetch failed devido a CORS ou Anki fechado) ou os erros manuais acima.
            return { success: false, error: "Anki Offline ou CORS bloqueador. Error: " + err.message };
        }
    }
};
