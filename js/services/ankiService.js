window.ankiService = {
    /**
     * Obtém a quantidade de cards pendentes (due) para hoje.
     * Tenta primeiro a conexão local (tempo real), depois faz o fallback para a Nuvem.
     * @returns {Promise<{success: boolean, count?: number, source: 'local'|'cloud', updatedAt?: any, breakdown?: any, error?: string}>}
     */
    getDueCardsCount: async function() {
        try {
            // 1. Tentar Conexão Local (Real-time)
            // Usamos invoke diretamente via window.ankiApi que já resolve o melhor IP
            const [newRes, learnRes, reviewRes] = await Promise.all([
                window.ankiApi.invoke("findCards", 6, { query: "is:new -is:suspended -is:buried" }),
                window.ankiApi.invoke("findCards", 6, { query: "is:learn -is:suspended -is:buried" }),
                window.ankiApi.invoke("findCards", 6, { query: "is:review is:due -is:suspended -is:buried" })
            ]);

            const newCount = (newRes && Array.isArray(newRes)) ? newRes.length : 0;
            const learnCount = (learnRes && Array.isArray(learnRes)) ? learnRes.length : 0;
            const reviewCount = (reviewRes && Array.isArray(reviewRes)) ? reviewRes.length : 0;

            return { 
                success: true, 
                source: 'local',
                count: newCount + learnCount + reviewCount,
                breakdown: { new: newCount, learn: learnCount, review: reviewCount }
            };
            
        } catch (err) {
            console.warn("Anki Local Offline. Tentando dados da Nuvem...", err.message);
            
            // 2. Fallback: Tentar dados sincronizados na Nuvem (Cloud Sync)
            try {
                const state = window.store.getState();
                if (!state.currentUser) throw new Error("Usuário não logado");

                const userDoc = await window.db.collection('users').doc(state.currentUser).get();
                if (userDoc.exists && userDoc.data().ankiSyncData) {
                    const cloudData = userDoc.data().ankiSyncData;
                    return {
                        success: true,
                        source: 'cloud',
                        updatedAt: cloudData.updatedAt,
                        count: (cloudData.counts.new || 0) + (cloudData.counts.learn || 0) + (cloudData.counts.review || 0),
                        breakdown: cloudData.counts
                    };
                }
            } catch (cloudErr) {
                console.error("Falha ao buscar dados da nuvem:", cloudErr);
            }

            return { success: false, error: "Anki e Nuvem inacessíveis." };
        }
    }
};
