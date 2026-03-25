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
        return { id, nome };
    },

    addConteudo: function(materiaId, nome) {
        if (!materiaId || !nome) throw new Error("Matéria e nome do conteúdo são obrigatórios");
        const id = 'c' + Date.now();
        this.state.conteudos.push({ id, materiaId, nome });
        return { id, materiaId, nome };
    },

    getConteudosPorMateria: function(materiaId) {
        return this.state.conteudos.filter(c => c.materiaId === materiaId);
    },

    addCronogramaItem: function(semana, materiaId, conteudoId, paginas) {
        if (!semana || !materiaId || !conteudoId || !paginas) throw new Error("Todos os campos do cronograma são obrigatórios");
        const id = 'cron_' + Date.now() + Math.random().toString(16).slice(2);
        const item = { 
            id, 
            semana, 
            materiaId, 
            conteudoId, 
            paginas: parseInt(paginas, 10),
            concluido: false,
            dataConclusao: null
        };
        this.state.cronograma.push(item);
        
        // Sort by semana ascending
        this.state.cronograma.sort((a,b) => a.semana.localeCompare(b.semana));
        return item;
    },
    
    removeCronogramaItem: function(id) {
        this.state.cronograma = this.state.cronograma.filter(i => i.id !== id);
    },

    concluirItemCronograma: function(id) {
        const item = this.state.cronograma.find(i => i.id === id);
        if (!item) throw new Error("Item não encontrado");
        
        item.concluido = true;
        item.dataConclusao = new Date().toISOString();
        
        // Update stats
        this.state.estatisticas.totalPaginasLidas += item.paginas;
        this.updateStreak();

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
    },

    addSimulado: function(nome, nota) {
        const id = 'sim_' + Date.now();
        const simulado = { id, nome, nota: parseFloat(nota), data: new Date().toISOString() };
        this.state.simulados.push(simulado);
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
        return material;
    },

    getMaterial: function(conteudoId) {
        return this.state.materiais.find(m => m.conteudoId === conteudoId) || { conteudoId, links: [], notas: "" };
    },

    addEdital: function(nome, dataProva) {
        if (!nome || !dataProva) throw new Error("Nome e data da prova são obrigatórios");
        const id = 'ed_' + Date.now();
        const edital = { id, nome, status: 'Ativo', dataProva };
        this.state.editais.push(edital);
        return edital;
    },

    removeEdital: function(id) {
        this.state.editais = this.state.editais.filter(e => e.id !== id);
    }
};
