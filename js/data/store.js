// Simple state management (Zero-build pattern)
window.store = {
    state: {
        isAuthenticated: false,
        currentUser: null,
        userList: [], // Only populated for admin
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
        const id = 'cri' + Date.now() + Math.random().toString(36).substr(2, 5);
        
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

    updateCronogramaItem: function(id, data) {
        const index = this.state.cronograma.findIndex(i => i.id === id);
        if (index !== -1) {
            this.state.cronograma[index] = { ...this.state.cronograma[index], ...data };
            if (data.semana) {
                this.state.cronograma.sort((a,b) => a.semana.localeCompare(b.semana));
            }
            this.save();
        }
    },

    concluirItemCronograma: function(id) {
        const item = this.state.cronograma.find(i => i.id === id);
        if (!item) throw new Error("Item não encontrado");
        
        item.concluido = true;
        item.dataConclusao = new Date().toISOString();
        
        // Update stats (controllers will re-calculate totalPaginasLidas)
        this.updateStreak();
        this.save();

        // Trigger spaced repetition logic (called from controller)
        return item;
    },

    desmarcarItemCronograma: function(id) {
        const item = this.state.cronograma.find(i => i.id === id);
        if (item) {
            item.concluido = false;
            item.dataConclusao = null;
            this.save();
        }
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

    // --- Shared Editais Logic ---
    addEdital: function(editalData) {
        if (!editalData.nome) throw new Error("Nome do concurso é obrigatório");
        const id = 'ed_' + Date.now();
        const edital = { 
            id, 
            status: 'Ativo', 
            ...editalData 
        };
        
        // Write directly to shared collection
        const newList = [...this.state.editais, edital];
        window.db.collection('shared').doc('editais').set({ data: newList });
        return edital;
    },

    updateEdital: function(id, data) {
        const newList = this.state.editais.map(e => e.id === id ? { ...e, ...data } : e);
        window.db.collection('shared').doc('editais').set({ data: newList });
    },

    removeEdital: function(id) {
        const newList = this.state.editais.filter(e => e.id !== id);
        window.db.collection('shared').doc('editais').set({ data: newList });
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

        // Optimistic Refresh
        this.triggerUIRefresh();

        // Clean any undefined values (Firestore fails on them)
        const dataToSave = this.cleanData(this.state);
        delete dataToSave.userList; // Don't save central user list into personal doc
        // delete dataToSave.editais;  // TEMP: Stop deleting to see if data recurs

        window.db.collection('users').doc(this.state.currentUser).set({
            state: dataToSave,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(err => {
            console.error("Firestore Save Error:", err);
            window.utils.showToast("Erro ao sincronizar com a nuvem: " + err.message, "error");
        });
        
        // Save ONLY session to browser
        try { 
            localStorage.setItem('auth_session', 'true'); 
            localStorage.setItem('auth_user', this.state.currentUser);
        } catch(e) {}
    },

    setAuth: function(val, username) {
        this.state.isAuthenticated = val;
        this.state.currentUser = username || null;
        if (val) {
            localStorage.setItem('auth_session', 'true');
            localStorage.setItem('auth_user', username);
            this.initSync(); // Start syncing once logged in
        } else {
            localStorage.removeItem('auth_session');
            localStorage.removeItem('auth_user');
            // Reset state to defaults
            this.state = {
                isAuthenticated: false,
                currentUser: null,
                userList: [],
                materias: [],
                conteudos: [],
                cronograma: [],
                editais: [],
                revisoes: [],
                simulados: [],
                materiais: [],
                estatisticas: {
                    streak: 0,
                    ultimaDataEstudo: null,
                    totalPaginasLidas: 0,
                    totalHorasEstudo: 0
                }
            };
            this.triggerUIRefresh();
        }
    },

    init: function() {
        console.log("Store: Initializing direct Firebase sync...");
        
        // Restore session from browser
        const isAuth = localStorage.getItem('auth_session') === 'true';
        const savedUser = localStorage.getItem('auth_user');
        
        this.state.isAuthenticated = isAuth;
        this.state.currentUser = savedUser;

        if (isAuth && savedUser) {
            this.initSync();
            this.syncSharedEditais(); // Start shared editais sync
        } else {
            this.hideLoading();
            this.triggerUIRefresh();
        }
        
        // Always try to load userList if we are admin
        if (this.isAdmin()) {
            this.syncUserList();
        }
    },

    initSync: function() {
        if (!window.db || !this.state.currentUser) return;
        
        console.log(`Syncing for user: ${this.state.currentUser}`);
        if (this.unsubscribeFirestore) this.unsubscribeFirestore();
        
        this.unsubscribeFirestore = window.db.collection('users').doc(this.state.currentUser).onSnapshot((doc) => {
            if (doc.exists) {
                let cloudData = doc.data().state;
                
                // if (cloudData.editais && cloudData.editais.length > 0 && this.state.editais.length === 0) {
                //     console.log("Migration: Moving personal editais to shared...");
                //     window.db.collection('shared').doc('editais').set({ data: cloudData.editais });
                // }

                // delete cloudData.editais; // TEMP: Stop deleting to help recovery

                // Self-heal duplicate IDs in cronograma (common bug with Date.now() IDs)
                if (cloudData && cloudData.cronograma) {
                    const seenIds = new Set();
                    cloudData.cronograma.forEach(item => {
                        if (!item.id || seenIds.has(item.id)) {
                            item.id = 'cri' + Date.now() + Math.random().toString(36).substr(2, 5);
                        }
                        seenIds.add(item.id);
                    });
                }

                // Merge cloud data into state
                this.state = { ...this.state, ...cloudData, isAuthenticated: true };
                console.log("Sync: Cloud data received and sanitized.");
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

    isAdmin: function() {
        return this.state.currentUser && this.state.currentUser.toLowerCase() === 'hyrton';
    },

    syncUserList: function() {
        if (!window.db) return;
        window.db.collection('users').doc('_admin_').onSnapshot((doc) => {
            if (doc.exists) {
                let list = doc.data().userList || [];
                // Auto-fix: Ensure 'Hyrton' is capitalized if it was seeded as 'hyrton'
                list = list.map(u => {
                    if (u.username.toLowerCase() === 'hyrton' && u.username === 'hyrton') {
                        return { ...u, username: 'Hyrton' };
                    }
                    return u;
                });
                this.state.userList = list;
            } else {
                // Seed with Hyrton if list is empty
                const initialList = [{ username: 'Hyrton', password: 'hyrtinho' }];
                window.db.collection('users').doc('_admin_').set({ userList: initialList });
                this.state.userList = initialList;
            }
            this.triggerUIRefresh();
        });
    },

    createUser: function(username, password) {
        if (!this.isAdmin()) throw new Error("Ação permitida apenas para administradores");
        
        const usernameTrimmed = username.trim();
        if (this.state.userList.find(u => u.username.toLowerCase() === usernameTrimmed.toLowerCase())) {
            throw new Error("Usuário já existe");
        }
        
        const newList = [...this.state.userList, { username: usernameTrimmed, password }];
        return window.db.collection('users').doc('_admin_').update({
            userList: newList
        });
    },

    deleteUser: function(username) {
        if (!this.isAdmin()) throw new Error("Ação permitida apenas para administradores");
        if (username === 'hyrton') throw new Error("Não é possível deletar o superadmin");
        
        const newList = this.state.userList.filter(u => u.username !== username);
        return window.db.collection('users').doc('_admin_').update({
            userList: newList
        });
    },

    syncSharedEditais: function() {
        if (!window.db) return;
        if (this.unsubscribeSharedEditais) this.unsubscribeSharedEditais();
        
        this.unsubscribeSharedEditais = window.db.collection('shared').doc('editais').onSnapshot((doc) => {
            if (doc.exists) {
                this.state.editais = doc.data().data || [];
            } else {
                // Initial creation of shared editais doc
                window.db.collection('shared').doc('editais').set({ data: [] });
            }
            this.triggerUIRefresh();
        });
    },

    // --- Page Nav Trigger ---
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
                if (window.adminController && this.isAdmin()) try { window.adminController.render(); } catch(e){}
            }
        }
    }
};

// Start store
window.store.init();
