window.metodoLogic = {
    /**
     * Carrega as notas do método do usuário.
     * @returns {Promise<string>} O conteúdo HTML ou Delta do editor.
     */
    async loadMetodo() {
        const state = window.store.getState();
        if (!state.user) return "";

        try {
            const doc = await window.db.collection('users').doc(state.user).collection('data').doc('metodo').get();
            if (doc.exists) {
                return doc.data().content || "";
            }
            return "";
        } catch (e) {
            console.error("Erro ao carregar método:", e);
            throw e;
        }
    },

    /**
     * Salva as notas do método do usuário.
     * @param {string} content Conteúdo (HTML ou Delta) do editor.
     */
    async saveMetodo(content) {
        const state = window.store.getState();
        if (!state.user) return;

        try {
            await window.db.collection('users').doc(state.user).collection('data').doc('metodo').set({
                content: content,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.error("Erro ao salvar método:", e);
            throw e;
        }
    }
};
