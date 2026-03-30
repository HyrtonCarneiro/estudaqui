window.metodoLogic = {
    /**
     * Carrega as notas do método do usuário.
     * @returns {Promise<string>} O conteúdo HTML ou Delta do editor.
     */
    async loadMetodo() {
        const state = window.store.getState();
        if (!state.currentUser) return {};

        try {
            const doc = await window.db.collection('users').doc(state.currentUser).collection('data').doc('metodo').get();
            if (doc.exists) {
                const data = doc.data().content;
                
                // MIGRATION: Se for uma string (formato antigo), movemos para 'segunda'
                if (typeof data === 'string') {
                    return { segunda: data };
                }
                
                return data || {};
            }
            return {};
        } catch (e) {
            console.error("Erro ao carregar método:", e);
            throw e;
        }
    },

    /**
     * Salva as notas do método do usuário.
     * @param {Object} content Objeto com os conteúdos mapeados por dia {segunda: "...", terca: "..."}
     */
    async saveMetodo(content) {
        const state = window.store.getState();
        if (!state.currentUser) return;

        try {
            await window.db.collection('users').doc(state.currentUser).collection('data').doc('metodo').set({
                content: content, // Agora é um objeto
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.error("Erro ao salvar método:", e);
            throw e;
        }
    }
};
