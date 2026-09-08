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
        linksUteis: [], // { id, titulo, url }
        pomodoroSessoes: [], // { id, dataInicio, dataFim, categoria, semana, weekNum, materias, pomodorosAlvo, pomodorosConcluidos, duracaoFoco, duracaoPausa, tempoTotalFocoSeg, nota, pomodorosLog: [] }
        pomodoroCategorias: [],
        pomodoroConfig: {
            duracaoFoco: 25,
            pausaCurta: 5,
            pausaLonga: 15,
            pomodorosAtePausaLonga: 4,
            usarPausaLonga: true,
            autoStart: false,
            somAtivado: true
        },
        estatisticas: {
            streak: 0,
            ultimaDataEstudo: null,
            totalPaginasLidas: 0,
            totalHorasEstudo: 0
        },
        hasLoadedFromCloud: false
    },

    getState: function() {
        return this.state;
    },

    sortMaterias: function() {
        if (this.state.materias) {
            this.state.materias.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        }
    },

    sortConteudos: function() {
        if (this.state.conteudos) {
            this.state.conteudos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        }
    },


    addMateria: function(nome) {
        if (!nome) throw new Error("Nome da matéria é obrigatório");
        const id = 'm' + Date.now();
        this.state.materias.push({ id, nome });
        this.sortMaterias();
        this.save();
        return id;
    },

    updateMateria: function(id, nome) {
        const materia = this.state.materias.find(m => m.id === id);
        if (materia) {
            materia.nome = nome;
            this.sortMaterias();
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
        this.sortConteudos();
        this.save();
        return id;
    },

    updateConteudo: function(id, data) {
        const index = this.state.conteudos.findIndex(c => c.id === id);
        if (index !== -1) {
            this.state.conteudos[index] = { ...this.state.conteudos[index], ...data, paginas: Number(data.paginas) || 0 };
            this.sortConteudos();
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

    postponeCronograma: function(fromSemana, newDateStr) {
        if (!fromSemana || !newDateStr) throw new Error("Semana de origem e nova data são obrigatórios");

        // Calculate the new Monday for the target date
        const newMonday = window.utils.getWeekMonday(newDateStr);

        // Parse dates to calculate diff in days
        var parseLocal = function(str) {
            var parts = str.split('-').map(Number);
            return new Date(parts[0], parts[1] - 1, parts[2]);
        };

        var fromDate = parseLocal(fromSemana);
        var toDate = parseLocal(newMonday);
        var diffMs = toDate - fromDate;
        var diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) throw new Error("A nova data resulta na mesma semana. Selecione uma data diferente.");

        var count = 0;
        this.state.cronograma.forEach(function(item) {
            if (item.semana >= fromSemana) {
                var itemDate = parseLocal(item.semana);
                itemDate.setDate(itemDate.getDate() + diffDays);
                // Recalculate to Monday
                var yyyy = itemDate.getFullYear();
                var mm = String(itemDate.getMonth() + 1).padStart(2, '0');
                var dd = String(itemDate.getDate()).padStart(2, '0');
                item.semana = window.utils.getWeekMonday(yyyy + '-' + mm + '-' + dd);
                count++;
            }
        });

        // Re-sort by semana
        this.state.cronograma.sort(function(a, b) { return a.semana.localeCompare(b.semana); });
        this.save();
        return count;
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

    updateMaterial: function(materiaId, links, notas) {
        let material = this.state.materiais.find(m => m.materiaId === materiaId);
        if (material) {
            material.links = links;
            material.notas = notas;
        } else {
            material = { materiaId, links, notas };
            this.state.materiais.push(material);
        }
        this.save();
        return material;
    },

    getMaterial: function(materiaId) {
        return this.state.materiais.find(m => m.materiaId === materiaId) || { materiaId, links: [], notas: "" };
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
        return window.db.collection('shared').doc('editais').set({ data: newList })
            .then(() => {
                console.log("Shared sync successful: addEdital");
            })
            .catch(err => {
                console.error("Shared sync error (addEdital):", err);
                throw err;
            });
    },

    updateEdital: function(id, data) {
        const newList = this.state.editais.map(e => e.id === id ? { ...e, ...data } : e);
        return window.db.collection('shared').doc('editais').set({ data: newList })
            .catch(err => {
                console.error("Shared sync error (updateEdital):", err);
                throw err;
            });
    },

    removeEdital: function(id) {
        const newList = this.state.editais.filter(e => e.id !== id);
        return window.db.collection('shared').doc('editais').set({ data: newList })
            .catch(err => {
                console.error("Shared sync error (removeEdital):", err);
                throw err;
            });
    },

    // --- Useful Links Logic ---
    addLinkUteis: function(titulo, url, categoria = 'Geral') {
        if (!titulo || !url) throw new Error("Título e URL são obrigatórios");
        const id = 'link_' + Date.now();
        const cat = (categoria && categoria.trim()) ? categoria.trim() : 'Geral';
        this.state.linksUteis.push({ id, titulo: titulo.trim(), url: url.trim(), categoria: cat });
        this.save();
    },

    updateLinkUteis: function(id, data) {
        const link = this.state.linksUteis.find(l => l.id === id);
        if (link) {
            if (data.titulo) link.titulo = data.titulo.trim();
            if (data.url) link.url = data.url.trim();
            if (data.categoria !== undefined) {
                link.categoria = (data.categoria && data.categoria.trim()) ? data.categoria.trim() : 'Geral';
            }
            this.save();
        }
    },

    removeLinkUteis: function(id) {
        this.state.linksUteis = this.state.linksUteis.filter(l => l.id !== id);
        this.save();
    },

    // --- Pomodoro Logic ---
    addPomodoroSessao: function(data) {
        const id = 'pomo_' + Date.now();
        const sessao = { id, ...data };
        if (sessao.pomodorosLog && Array.isArray(sessao.pomodorosLog) && sessao.pomodorosLog.length > 0) {
            const sumLogs = sessao.pomodorosLog.reduce((acc, l) => acc + (l.duracaoSeg || ((l.duracaoMin || 0) * 60) || 0), 0);
            if (sumLogs > (sessao.tempoTotalFocoSeg || 0)) {
                sessao.tempoTotalFocoSeg = sumLogs;
            }
        }
        this.state.pomodoroSessoes.push(sessao);
        this.save();
        return sessao;
    },

    removePomodoroSessao: function(id) {
        this.state.pomodoroSessoes = this.state.pomodoroSessoes.filter(s => s.id !== id);
        this.save();
    },

    updatePomodoroSessaoNota: function(id, novaNota) {
        const sessao = this.state.pomodoroSessoes.find(s => s.id === id);
        if (sessao) {
            sessao.nota = (novaNota || '').trim();
            this.save();
        }
    },

    updatePomodoroConfig: function(config) {
        this.state.pomodoroConfig = { ...this.state.pomodoroConfig, ...config };
        if (this._pomoSaveTimeout) clearTimeout(this._pomoSaveTimeout);
        this._pomoSaveTimeout = setTimeout(() => {
            this.save(true);
        }, 1000);
    },

    addPomodoroCategoria: function(nome) {
        if (!nome || !nome.trim()) return;
        const categoria = nome.trim();
        if (!this.state.pomodoroCategorias) this.state.pomodoroCategorias = [];
        if (!this.state.pomodoroCategorias.includes(categoria)) {
            this.state.pomodoroCategorias.push(categoria);
            this.save();
        }
    },

    editPomodoroCategoria: function(antigoNome, novoNome) {
        if (!antigoNome || !novoNome || !novoNome.trim()) return;
        const limpo = novoNome.trim();
        if (!this.state.pomodoroCategorias) return;
        const idx = this.state.pomodoroCategorias.indexOf(antigoNome);
        if (idx !== -1) {
            this.state.pomodoroCategorias[idx] = limpo;
            // Also update any past sessions referencing this category
            if (this.state.pomodoroSessoes) {
                this.state.pomodoroSessoes.forEach(s => {
                    if (s.categoria === antigoNome) s.categoria = limpo;
                });
            }
            this.save();
        }
    },

    removePomodoroCategoria: function(nome) {
        if (!this.state.pomodoroCategorias) return;
        this.state.pomodoroCategorias = this.state.pomodoroCategorias.filter(c => c !== nome);
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

    save: function(silent = false) {
        if (!window.db || !this.state.isAuthenticated) return;
        if (!this.state.hasLoadedFromCloud) {
            console.warn("Store: Save blocked because cloud data hasn't loaded yet.");
            return;
        }

        // Optimistic Refresh unless silent
        if (!silent) {
            this.triggerUIRefresh();
        }

        // Clean any undefined values (Firestore fails on them)
        const dataToSave = this.cleanData(this.state);
        delete dataToSave.userList; // Don't save central user list into personal doc
        
        // Only stop saving personal editais if migration is complete
        if (this.state.migratedToShared) {
            delete dataToSave.editais;
        }

        // Standardize User ID for Firestore (Always lowercase)
        const normalizedUser = this.state.currentUser.toLowerCase();
        const settings = window.PLATFORM_SETTINGS;

        window.db.collection(settings.USERS_COLLECTION).doc(normalizedUser).set({
            state: dataToSave,
            displayName: this.state.displayName || this.state.currentUser,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(err => {
            console.error("Firestore Save Error:", err);
            window.utils.showToast("Erro ao sincronizar com a nuvem: " + err.message, "error");
        });
        
        // Save ONLY session to browser
        try { 
            localStorage.setItem('auth_session', 'true'); 
            localStorage.setItem('auth_user', this.state.currentUser);
        } catch(e) {}
    },

    setAuth: function(val, user) {
        this.state.isAuthenticated = val;
        
        if (val && user) {
            // Standardize username to lowercase for storage, but keep display name
            const username = user.username || user; // compatible with both string and object
            const normalized = username.toLowerCase();
            
            this.state.currentUser = normalized;
            this.state.displayName = user.displayName || username;
            
            localStorage.setItem('auth_session', 'true');
            localStorage.setItem('auth_user', normalized);
            localStorage.setItem('auth_display', this.state.displayName);
            
            this.initSync(); // Start syncing personal data
            this.syncSharedEditais(); // Start syncing global data
            this.syncUserList();     // Start syncing user list (for admin)
        } else {
            localStorage.removeItem('auth_session');
            localStorage.removeItem('auth_user');
            // Reset state to defaults
            this.state = {
                isAuthenticated: false,
                currentUser: null,
                displayName: null,
                userList: [],
                materias: [],
                conteudos: [],
                cronograma: [],
                editais: [],
                revisoes: [],
                simulados: [],
                materiais: [],
                linksUteis: [],
                pomodoroSessoes: [],
                pomodoroCategorias: [],
                pomodoroConfig: {
                    duracaoFoco: 25,
                    pausaCurta: 5,
                    pausaLonga: 15,
                    pomodorosAtePausaLonga: 4,
                    usarPausaLonga: true,
                    autoStart: false,
                    somAtivado: true
                },
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
        let savedUser = localStorage.getItem('auth_user');
        
        // CLEANUP: Purge corrupted session strings
        if (savedUser === 'undefined' || savedUser === 'null') {
            savedUser = null;
            localStorage.removeItem('auth_user');
            localStorage.removeItem('auth_session');
        }
        
        this.state.isAuthenticated = isAuth && savedUser !== null;
        this.state.currentUser = savedUser ? savedUser.toLowerCase() : null;
        this.state.displayName = localStorage.getItem('auth_display') || this.state.currentUser;

        if (isAuth && this.state.currentUser) {
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
        
        const settings = window.PLATFORM_SETTINGS;
        const normalizedUser = this.state.currentUser.toLowerCase();
        
        console.log(`Syncing for user: ${normalizedUser}`);
        if (this.unsubscribeFirestore) this.unsubscribeFirestore();
        
        this.unsubscribeFirestore = window.db.collection(settings.USERS_COLLECTION).doc(normalizedUser).onSnapshot((doc) => {
            if (doc.exists) {
                let cloudData = doc.data().state;
                let displayName = doc.data().displayName;

                // Self-heal duplicate IDs in cronograma
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
                this.state = { ...this.state, ...cloudData, isAuthenticated: true, hasLoadedFromCloud: true };
                
                // Purge invented default mock categories if present in existing cloud record
                const mockCats = ['Simulados', 'Revisão Geral', 'Questões', 'Leitura'];
                if (this.state.pomodoroCategorias && Array.isArray(this.state.pomodoroCategorias)) {
                    const originalLength = this.state.pomodoroCategorias.length;
                    this.state.pomodoroCategorias = this.state.pomodoroCategorias.filter(c => !mockCats.includes(c));
                    if (this.state.pomodoroCategorias.length !== originalLength) {
                        this.save(true);
                    }
                }

                // Self-heal any pomodoro session where tempoTotalFocoSeg was slightly truncated
                if (this.state.pomodoroSessoes && Array.isArray(this.state.pomodoroSessoes)) {
                    let healedPomos = false;
                    this.state.pomodoroSessoes.forEach(s => {
                        if (s.pomodorosLog && Array.isArray(s.pomodorosLog) && s.pomodorosLog.length > 0) {
                            const sumLogs = s.pomodorosLog.reduce((acc, l) => acc + (l.duracaoSeg || ((l.duracaoMin || 0) * 60) || 0), 0);
                            if (sumLogs > (s.tempoTotalFocoSeg || 0)) {
                                s.tempoTotalFocoSeg = sumLogs;
                                healedPomos = true;
                            }
                        }
                    });
                    if (healedPomos) {
                        this.save(true);
                    }
                }
                
                this.sortMaterias();
                this.sortConteudos();
                
                // Restore displayName from top-level doc field (not inside state object)
                if (displayName) this.state.displayName = displayName;
                
                console.log("Sync: Cloud data received.");
            } else {
                console.warn(`Sync: Document [${normalizedUser}] not found. Checking for legacy casing...`);
                
                // --- GENERIC RECOVERY BRIDGE ---
                // If it's the first time and we lack the lowercase doc, check the capitalized one
                const legacyUser = normalizedUser.charAt(0).toUpperCase() + normalizedUser.slice(1);
                
                window.db.collection(settings.USERS_COLLECTION).doc(legacyUser).get().then(legacyDoc => {
                    if (legacyDoc.exists && legacyDoc.data().state) {
                        console.log(`RECOVERY: Found legacy data in [${legacyUser}]! Migrating to [${normalizedUser}]...`);
                        const legacyData = legacyDoc.data().state;
                        this.state = { ...this.state, ...legacyData, isAuthenticated: true, hasLoadedFromCloud: true };
                        this.save(); // Migrate to lowercase doc
                        window.utils.showToast("Dados migrados com sucesso!", "success");
                    } else {
                        console.log("RECOVERY: No legacy data found.");
                        this.state.hasLoadedFromCloud = true;
                    }
                }).catch(err => {
                    console.error("RECOVERY Error:", err);
                    this.state.hasLoadedFromCloud = true;
                });
            }
            this.hideLoading();
            this.triggerUIRefresh();
        }, (err) => {
            console.error("Firestore Sync Error:", err);
            this.hideLoading();
            this.triggerUIRefresh();
        });
    },

    hideLoading: function() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    },

    isAdmin: function() {
        if (!this.state.currentUser) return false;
        
        // Superadmin is either defined by role or by the configured default admin username
        const settings = window.PLATFORM_SETTINGS;
        const normalizedUser = this.state.currentUser.toLowerCase();
        
        if (normalizedUser === settings.DEFAULT_ADMIN_USER) return true;
        
        // Also check if role is set in the user list
        const user = this.state.userList.find(u => u.username.toLowerCase() === normalizedUser);
        return user && (user.role === settings.ROLES.SUPERADMIN || user.role === settings.ROLES.ADMIN);
    },

    syncUserList: function() {
        if (!window.db) return;
        const settings = window.PLATFORM_SETTINGS;

        window.db.collection(settings.USERS_COLLECTION).doc(settings.SYSTEM_USER_DOC).onSnapshot((doc) => {
            if (doc.exists) {
                this.state.userList = doc.data().userList || [];
            } else {
                // Seed with Default Admin
                const initialList = [{ 
                    username: settings.DEFAULT_ADMIN_USER, 
                    password: settings.DEFAULT_ADMIN_PASSWORD,
                    displayName: settings.DEFAULT_ADMIN_DISPLAY_NAME,
                    role: settings.ROLES.SUPERADMIN 
                }];
                window.db.collection(settings.USERS_COLLECTION).doc(settings.SYSTEM_USER_DOC).set({ userList: initialList });
                this.state.userList = initialList;
            }
            this.triggerUIRefresh();
        });
    },

    createUser: function(username, password, displayName, role) {
        if (!this.isAdmin()) throw new Error("Ação permitida apenas para administradores");
        
        const settings = window.PLATFORM_SETTINGS;
        const usernameTrimmed = username.trim();
        if (this.state.userList.find(u => u.username.toLowerCase() === usernameTrimmed.toLowerCase())) {
            throw new Error("Usuário já existe");
        }
        
        const newUser = { 
            username: usernameTrimmed, 
            password, 
            displayName: displayName || usernameTrimmed,
            role: role || settings.ROLES.USER 
        };
        
        const newList = [...this.state.userList, newUser];
        return window.db.collection(settings.USERS_COLLECTION).doc(settings.SYSTEM_USER_DOC).update({
            userList: newList
        });
    },

    deleteUser: function(username) {
        if (!this.isAdmin()) throw new Error("Ação permitida apenas para administradores");
        
        const settings = window.PLATFORM_SETTINGS;
        if (username.toLowerCase() === settings.DEFAULT_ADMIN_USER) {
            throw new Error("Não é possível deletar o superadmin raiz");
        }
        
        const newList = this.state.userList.filter(u => u.username !== username);
        return window.db.collection(settings.USERS_COLLECTION).doc(settings.SYSTEM_USER_DOC).update({
            userList: newList
        });
    },

    syncSharedEditais: function() {
        if (!window.db) return;
        if (this.unsubscribeSharedEditais) this.unsubscribeSharedEditais();
        
        console.log("Store: Connecting to Shared Editais...");
        this.unsubscribeSharedEditais = window.db.collection('shared').doc('editais').onSnapshot((doc) => {
            if (doc.exists) {
                console.log("Store: Shared Editais sync received:", (doc.data().data || []).length, "items");
                this.state.editais = doc.data().data || [];
            } else {
                console.log("Store: Shared Editais doc missing. Initializing...");
                window.db.collection('shared').doc('editais').set({ data: [] })
                    .catch(e => console.error("Error creating shared doc:", e));
            }
            this.triggerUIRefresh();
        }, (err) => {
            console.error("CRITICAL: Shared Editais sync failed:", err.message);
            window.utils.showToast("Falha na sincronização global: " + err.message, "error");
        });
    },

    // --- Page Nav Trigger ---
    triggerUIRefresh: function() {
        if (window.appControllers) {
            try { window.appControllers.checkAuth(); } catch(e) { console.error("Refresh Error (Auth):", e); }
            try { window.appControllers.updateDashboard(); } catch(e) { console.error("Refresh Error (Dash):", e); }
            
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
                if (window.linksController) try { window.linksController.render(); } catch(e){}
                if (window.pomodoroController && window.pomodoroController.render) try { window.pomodoroController.render(); } catch(e){}
            }
        }
    }
};

// Start store
window.store.init();
