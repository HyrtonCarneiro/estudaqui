// Simple state management (Zero-build pattern)
window.store = {
    state: {
        isAuthenticated: false,
        materias: [],
        conteudos: [],
        cronograma: [], // { id, semana, materiaId, conteudoId, paginas, concluido, dataConclusao }
        editais: [],    // { id, nome, status, dataProva }
        revisoes: [],   // { id, conteudoId, dataRevisao, status }
        revisoes: [],   // { id, conteudoId, dataRevisao, status }
        simulados: [],  // { id, nome, nota, data }
        materiais: [],  // { conteudoId, links: [], notas: "" }
        estatisticas: {
            streak: 0,
            ultimaDataEstudo: null,
            totalPaginasLidas: 0,
            totalHorasEstudo: 0
        }
    },

    getState: function() {
        return this.state;
    },


    addMateria: function(nome) {
        if (!nome) throw new Error("Nome da matéria é obrigatório");
        const id = 'm' + Date.now();
        this.state.materias.push({ id, nome });
        this.save();
        return id;
    },

    addConteudo: function(materiaId, nome, paginas) {
        if (!materiaId || !nome) throw new Error("Matéria e conteúdo são obrigatórios");
        const id = 'c' + Date.now();
        this.state.conteudos.push({ id, materiaId, nome, paginas: Number(paginas) || 0 });
        this.save();
        return id;
    },

    getConteudosPorMateria: function(materiaId) {
        return this.state.conteudos.filter(c => c.materiaId === materiaId);
    },

    addCronogramaItem: function(semana, materiaId, conteudoId, paginasOverride) {
        const id = 'cri' + Date.now();
        
        // If paginas not provided, fetch from content
        let paginas = paginasOverride;
        if (!paginas) {
            const conteudo = this.state.conteudos.find(c => c.id === conteudoId);
            paginas = conteudo ? (conteudo.paginas || 0) : 0;
        }

        const item = { 
            id, 
            semana, 
            materiaId, 
            conteudoId, 
            paginas: Number(paginas),
            concluido: false,
            dataConclusao: null
        };
        this.state.cronograma.push(item);
        
        // Sort by semana ascending
        this.state.cronograma.sort((a,b) => a.semana.localeCompare(b.semana));
        this.save();
        return item;
    },
    
    removeCronogramaItem: function(id) {
        this.state.cronograma = this.state.cronograma.filter(i => i.id !== id);
        this.save();
    },

    concluirItemCronograma: function(id) {
        const item = this.state.cronograma.find(i => i.id === id);
        if (!item) throw new Error("Item não encontrado");
        
        item.concluido = true;
        item.dataConclusao = new Date().toISOString();
        
        // Update stats
        this.state.estatisticas.totalPaginasLidas += (item.paginas || 0);
        this.updateStreak();
        this.save();

        // Trigger spaced repetition logic (called from controller)
        return item;
    },

    updateStreak: function() {
        const hoje = new Date().toISOString().split('T')[0];
        const ultima = this.state.estatisticas.ultimaDataEstudo;
        
        if (ultima === hoje) return;

        const ontem = new Date();
        ontem.setDate(ontem.getDate() - 1);
        const ontemStr = ontem.toISOString().split('T')[0];

        if (ultima === ontemStr) {
            this.state.estatisticas.streak += 1;
        } else {
            this.state.estatisticas.streak = 1;
        }
        this.state.estatisticas.ultimaDataEstudo = hoje;
        this.save();
    },

    addSimulado: function(nome, nota) {
        if (!nome || isNaN(nota)) throw new Error("Nome e nota válidos são obrigatórios");
        const id = 'sim_' + Date.now();
        const simulado = { id, nome, nota: parseFloat(nota), data: new Date().toISOString() };
        this.state.simulados.push(simulado);
        this.save();
        return simulado;
    },

    updateMaterial: function(conteudoId, links, notas) {
        let material = this.state.materiais.find(m => m.conteudoId === conteudoId);
        if (material) {
            material.links = links;
            material.notas = notas;
        } else {
            material = { conteudoId, links, notas };
            this.state.materiais.push(material);
        }
        this.save();
        return material;
    },

    getMaterial: function(conteudoId) {
        return this.state.materiais.find(m => m.conteudoId === conteudoId) || { conteudoId, links: [], notas: "" };
    },

    addEdital: function(editalData) {
        if (!editalData.nome) throw new Error("Nome do concurso é obrigatório");
        const id = 'ed_' + Date.now();
        const edital = { 
            id, 
            status: 'Ativo', 
            ...editalData 
        };
        this.state.editais.push(edital);
        this.save();
        return edital;
    },

    updateEdital: function(id, data) {
        const index = this.state.editais.findIndex(e => e.id === id);
        if (index !== -1) {
            this.state.editais[index] = { ...this.state.editais[index], ...data };
            this.save();
        }
    },

    removeEdital: function(id) {
        this.state.editais = this.state.editais.filter(e => e.id !== id);
        this.save();
    },

    isCloudLoaded: false,
    lastCloudData: null,

    // --- Persistence (Firestore Cloud) ---
    save: function() {
        // ALWAYS save to local first for immediate feedback and session persistence
        try {
            localStorage.setItem('concursos_ti_state', JSON.stringify(this.state));
        } catch(e) {}

        if (!window.db) return;
        
        // Block cloud save only if we haven't confirmed the remote state yet
        // to avoid wiping out existing cloud data with a "fresh" local state.
        if (!this.isCloudLoaded && this.state.isAuthenticated) {
            console.log("Cloud save deferred until sync complete.");
            return;
        }

        window.db.collection('users').doc('hyrton').set({
            state: this.state,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(err => console.error("Erro cloud save:", err));
    },

    setAuth: function(val) {
        const wasAuthenticated = this.state.isAuthenticated;
        this.state.isAuthenticated = val;
        
        // If logging in, merge any cloud data we already received
        if (val && !wasAuthenticated && this.lastCloudData) {
            console.log("Merging pre-loaded cloud data upon login...");
            this.state = { ...this.state, ...this.lastCloudData };
        }
        
        this.save();
    },

    init: function() {
        // 1. Quick local load
        const saved = localStorage.getItem('concursos_ti_state');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.state = { ...this.state, ...parsed };
                console.log("Local state loaded:", this.state.isAuthenticated ? "Authenticated" : "Guest");
            } catch(e) {
                console.error("Local load error:", e);
            }
        }

        // 2. Real-time Cloud Sync
        if (window.db) {
            window.db.collection('users').doc('hyrton').onSnapshot((doc) => {
                const isFirstSync = !this.isCloudLoaded;
                this.isCloudLoaded = true;

                if (doc.exists) {
                    const cloudData = doc.data().state;
                    this.lastCloudData = cloudData;
                    console.log("Cloud data received.");
                    
                    if (this.state.isAuthenticated) {
                        // Merge cloud into local
                        this.state = { ...this.state, ...cloudData };
                        localStorage.setItem('concursos_ti_state', JSON.stringify(this.state));
                        this.triggerUIRefresh();
                    }
                } else {
                    console.log("Cloud is empty.");
                    // If we have local data but cloud is empty, upload it now
                    if (this.state.isAuthenticated && (this.state.materias.length > 0 || this.state.editais.length > 0)) {
                        console.log("Uploading local data to empty cloud...");
                        this.save();
                    }
                }
            }, (err) => {
                console.error("Firestore sync error:", err);
                this.isCloudLoaded = true; // Still allow local saves if cloud fails
            });
        }

        // Initial UI layout
        this.triggerUIRefresh();
    },

    triggerUIRefresh: function() {
        if (window.appControllers) {
            window.appControllers.checkAuth();
            window.appControllers.updateDashboard();
            
            // Only refresh list controllers if we are authenticated
            if (this.state.isAuthenticated) {
                if (window.editaisController) try { window.editaisController.render(); } catch(e){}
                if (window.cronogramaController) try { window.cronogramaController.renderTable(); } catch(e){}
                if (window.cadastrosController) try { window.cadastrosController.renderMateriasSelect(); } catch(e){}
                if (window.materialController) try { window.materialController.render(); } catch(e){}
            }
        }
    }
};

// Start store
window.store.init();
