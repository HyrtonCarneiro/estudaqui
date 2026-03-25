window.editaisController = {
    init: function() {
        this.cacheDOM();
        this.bindEvents();
        this.render();
    },

    cacheDOM: function() {
        this.container = document.getElementById('container-editais');
        this.btnNovo = document.getElementById('btn-novo-edital');
    },

    bindEvents: function() {
        if (this.btnNovo) {
            this.btnNovo.addEventListener('click', () => this.handleNovo());
        }
    },

    handleNovo: function() {
        const nome = prompt("Nome do Órgão/Concurso:");
        if (!nome) return;
        const dataStr = prompt("Data da Prova (AAAA-MM-DD):");
        if (!dataStr) return;
        
        try {
            window.store.addEdital(nome, dataStr);
            window.utils.showToast("Edital cadastrado!", "success");
            this.render();
            if (window.appControllers) window.appControllers.updateCountdowns();
        } catch (e) {
            window.utils.showToast("Erro: " + e.message, "error");
        }
    },

    render: function() {
        if (!this.container) return;
        const editais = window.store.getState().editais;
        this.container.innerHTML = "";
        
        if (editais.length === 0) {
            this.container.innerHTML = ' \
                <div class="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center"> \
                    <i class="ph ph-file-dashed text-4xl text-gray-300 mb-3"></i> \
                    <p class="text-gray-500">Nenhum edital cadastrado ainda.</p> \
                </div>';
            return;
        }

        editais.forEach(ed => {
            const card = document.createElement('div');
            card.className = 'bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group hover:border-primary-500 transition-all cursor-pointer';
            card.innerHTML = ' \
                <div class="flex gap-4"> \
                    <div class="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors"> \
                        <i class="ph ph-file-text text-3xl"></i> \
                    </div> \
                    <div> \
                        <h3 class="font-bold text-gray-800">' + ed.nome + '</h3> \
                        <p class="text-sm text-gray-500">Status: ' + ed.status + '</p> \
                        <p class="text-xs text-primary-500 font-bold mt-1">Prova em: <span class="edital-countdown" data-date="' + ed.dataProva + '">Calculando...</span></p> \
                    </div> \
                </div> \
                <div class="flex items-center gap-4"> \
                    <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase">' + ed.status + '</span> \
                    <button onclick="window.editaisController.remover(\'' + ed.id + '\')" class="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all p-2"> \
                        <i class="ph ph-trash"></i> \
                    </button> \
                </div>';
            this.container.appendChild(card);
        });
    },

    remover: function(id) {
        if (confirm("Deseja remover este edital?")) {
            window.store.removeEdital(id);
            this.render();
            window.utils.showToast("Edital removido.", "info");
        }
    }
};
