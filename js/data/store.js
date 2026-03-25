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

    setAuth: function(val) {
        this.state.isAuthenticated = val;
        this.save();
    },

    // --- Persistence (Firestore Cloud) ---
    save: function() {
        // Always save to both local and cloud for resilience
        try {
            localStorage.setItem('concursos_ti_state', JSON.stringify(this.state));
        } catch(e) {}

        if (!window.db) return; // Firebase not initialized

        window.db.collection('users').doc('hyrton').set({
            state: this.state,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(err => console.error("Erro cloud save:", err));
    },

    load: async function() {
        // 1. Try local first for speed
        const saved = localStorage.getItem('concursos_ti_state');
        if (saved) {
            this.state = { ...this.state, ...JSON.parse(saved) };
        }

        // 2. Sync with cloud
        if (window.db) {
            try {
                const doc = await window.db.collection('users').doc('hyrton').get();
                if (doc.exists) {
                    const cloudData = doc.data().state;
                    this.state = { ...this.state, ...cloudData };
                    localStorage.setItem('concursos_ti_state', JSON.stringify(this.state));
                }
            } catch (err) {
                console.error("Erro cloud load:", err);
            }
        }
    },

    init: function() {
        // Initial load
        this.load().then(() => {
            if (window.appControllers) {
                window.appControllers.checkAuth();
                window.appControllers.updateDashboard();
            }
        });
    }
};

// Start store
window.store.init();
