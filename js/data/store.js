// Simple state management (Zero-build pattern)
window.store = {
    state: {
        isAuthenticated: false,
        materias: [],
        conteudos: [],
        cronograma: [], // { id, semana, materiaId, conteudoId, paginas, concluido, dataConclusao }
        editais: [],    // { id, nome, status, dataProva }
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

    updateMateria: function(id, nome) {
        const materia = this.state.materias.find(m => m.id === id);
        if (materia) {
            materia.nome = nome;
            this.save();
        }
    },

    removeMateria: function(id) {
        // Warning: Also should remove associated contents
        this.state.materias = this.state.materias.filter(m => m.id !== id);
        this.state.conteudos = this.state.conteudos.filter(c => c.materiaId !== id);
        this.save();
    },

    addConteudo: function(materiaId, nome, paginas) {
        if (!materiaId || !nome) throw new Error("Matéria e conteúdo são obrigatórios");
        const id = 'c' + Date.now();
        this.state.conteudos.push({ id, materiaId, nome, paginas: Number(paginas) || 0 });
        this.save();
        return id;
    },

    updateConteudo: function(id, data) {
        const index = this.state.conteudos.findIndex(c => c.id === id);
        if (index !== -1) {
            this.state.conteudos[index] = { ...this.state.conteudos[index], ...data, paginas: Number(data.paginas) || 0 };
            this.save();
        }
    },

    removeConteudo: function(id) {
        this.state.conteudos = this.state.conteudos.filter(c => c.id !== id);
        this.save();
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

    updateSimulado: function(id, data) {
        const simulado = this.state.simulados.find(s => s.id === id);
        if (simulado) {
            if (data.nome) simulado.nome = data.nome;
            if (data.nota !== undefined) simulado.nota = parseFloat(data.nota);
            this.save();
        }
    },

    removeSimulado: function(id) {
        this.state.simulados = this.state.simulados.filter(s => s.id !== id);
        this.save();
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

    // --- Persistence (Pure Firestore) ---
    cleanData: function(obj) {
        if (Array.isArray(obj)) return obj.map(v => this.cleanData(v));
        if (obj !== null && typeof obj === 'object') {
            const clean = {};
            Object.keys(obj).forEach(k => {
                if (obj[k] !== undefined && k !== 'isAuthenticated') {
                    clean[k] = this.cleanData(obj[k]);
                }
            });
            return clean;
        }
        return obj;
    },

    save: function() {
        if (!window.db || !this.state.isAuthenticated) return;

        // Clean any undefined values (Firestore fails on them)
        const dataToSave = this.cleanData(this.state);

        window.db.collection('users').doc('hyrton').set({
            state: dataToSave,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(err => {
            console.error("Firestore Save Error:", err);
            window.utils.showToast("Erro ao sincronizar com a nuvem: " + err.message, "error");
        });
        
        // Save ONLY session to browser
        try { localStorage.setItem('auth_session', 'true'); } catch(e) {}
    },

    setAuth: function(val) {
        this.state.isAuthenticated = val;
        if (val) {
            localStorage.setItem('auth_session', 'true');
            this.initSync(); // Start syncing once logged in
        } else {
            localStorage.removeItem('auth_session');
            this.state = JSON.parse(JSON.stringify(window.store.state)); // Reset to defaults
            this.triggerUIRefresh();
        }
    },

    init: function() {
        console.log("Store: Initializing direct Firebase sync...");
        
        // Restore session from browser (to avoid re-typing password)
        const isAuth = localStorage.getItem('auth_session') === 'true';
        this.state.isAuthenticated = isAuth;

        if (isAuth) {
            this.initSync();
        } else {
            this.hideLoading();
            this.triggerUIRefresh();
        }
    },

    initSync: function() {
        if (!window.db) return;
        
        if (this.unsubscribeFirestore) this.unsubscribeFirestore();
        
        this.unsubscribeFirestore = window.db.collection('users').doc('hyrton').onSnapshot((doc) => {
            if (doc.exists) {
                const cloudData = doc.data().state;
                // Merge cloud data into state
                this.state = { ...this.state, ...cloudData, isAuthenticated: true };
                console.log("Sync: Cloud data received.");
            } else {
                console.log("Sync: No remote data. Ready for updates.");
            }
            this.hideLoading();
            this.triggerUIRefresh();
        }, (err) => {
            console.error("Firestore Sync Error:", err);
            this.hideLoading();
        });
    },

    hideLoading: function() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    },

    triggerUIRefresh: function() {
        if (window.appControllers) {
            window.appControllers.checkAuth();
            window.appControllers.updateDashboard();
            
            if (this.state.isAuthenticated) {
                if (window.editaisController) try { window.editaisController.render(); } catch(e){}
                if (window.cronogramaController) try { window.cronogramaController.renderTable(); } catch(e){}
                if (window.cadastrosController) try { 
                    window.cadastrosController.renderMateriasSelect(); 
                    window.cadastrosController.renderLists();
                } catch(e){}
                if (window.materialController) try { window.materialController.render(); } catch(e){}
                if (window.simuladosController) try { window.simuladosController.render(); } catch(e){}
                if (window.gamificationController) try { window.gamificationController.render(); } catch(e){}
            }
        }
    }
};

// Start store
window.store.init();
