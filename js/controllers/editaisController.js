window.editaisController = {
    init: function() {
        this.cacheDOM();
        this.bindEvents();
        this.render();
    },

    cacheDOM: function() {
        this.container = document.getElementById('container-editais');
        this.btnNovo = document.getElementById('btn-novo-edital');
        this.modal = document.getElementById('modal-edital');
        this.modalContent = document.getElementById('modal-edital-content');
        this.form = document.getElementById('form-edital');
        
        // Modal Inputs
        this.inputId = document.getElementById('input-edital-id');
        this.inputNome = document.getElementById('input-edital-nome');
        this.inputBanca = document.getElementById('input-edital-banca');
        this.selectStatus = document.getElementById('select-edital-status');
        this.inputData = document.getElementById('input-edital-data');
        this.checkDataIndefinida = document.getElementById('check-edital-data-indefinida');
        this.inputInscricao = document.getElementById('input-edital-inscricao');
        this.checkInscIndefinida = document.getElementById('check-edital-insc-indefinida');
        this.inputSalario = document.getElementById('input-edital-salario');
        this.inputVagas = document.getElementById('input-edital-vagas');
        this.inputLink = document.getElementById('input-edital-link');
        this.inputSearch = document.getElementById('input-search-editais');
        this.modalTitle = document.getElementById('edital-modal-title');
    },

    bindEvents: function() {
        if (this.btnNovo) {
            this.btnNovo.addEventListener('click', () => this.abrirModal());
        }
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSalvar(e));
        }
        if (this.inputSearch) {
            this.inputSearch.addEventListener('input', () => this.render());
        }
    },

    abrirModal: function(edital = null) {
        this.modal.classList.remove('hidden');
        this.modal.classList.add('flex');
        
        if (edital) {
            this.modalTitle.textContent = "Editar Edital";
            this.inputId.value = edital.id;
            this.inputNome.value = edital.nome;
            this.inputBanca.value = edital.banca || "";
            this.selectStatus.value = edital.status;
            
            if (edital.dataProva) {
                this.inputData.value = edital.dataProva;
                this.inputData.disabled = false;
                this.checkDataIndefinida.checked = false;
            } else {
                this.inputData.value = "";
                this.inputData.disabled = true;
                this.checkDataIndefinida.checked = true;
            }

            if (edital.dataInscricao) {
                this.inputInscricao.value = edital.dataInscricao;
                this.inputInscricao.disabled = false;
                this.checkInscIndefinida.checked = false;
            } else {
                this.inputInscricao.value = "";
                this.inputInscricao.disabled = true;
                this.checkInscIndefinida.checked = true;
            }

            this.inputSalario.value = edital.salario || "";
            this.inputVagas.value = edital.vagas || "";
            this.inputLink.value = edital.link || "";
        } else {
            this.modalTitle.textContent = "Novo Edital";
            this.form.reset();
            this.inputId.value = "";
            this.inputData.disabled = false;
            this.inputInscricao.disabled = false;
        }

        requestAnimationFrame(() => {
            this.modalContent.classList.remove('scale-95', 'opacity-0');
        });
    },

    fecharModal: function() {
        this.modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            this.modal.classList.add('hidden');
            this.modal.classList.remove('flex');
        }, 200);
    },

    handleSalvar: function(e) {
        e.preventDefault();
        
        const data = {
            nome: this.inputNome.value,
            banca: this.inputBanca.value,
            status: this.selectStatus.value,
            dataProva: this.checkDataIndefinida.checked ? null : this.inputData.value,
            dataInscricao: this.checkInscIndefinida.checked ? null : this.inputInscricao.value,
            salario: this.inputSalario.value,
            vagas: this.inputVagas.value,
            link: this.inputLink.value
        };

        try {
            if (this.inputId.value) {
                window.store.updateEdital(this.inputId.value, data);
                window.utils.showToast("Edital atualizado!", "success");
            } else {
                window.store.addEdital(data);
                window.utils.showToast("Edital cadastrado!", "success");
            }
            this.fecharModal();
            this.render();
            if (window.appControllers) window.appControllers.updateCountdowns();
        } catch (err) {
            window.utils.showToast("Erro: " + err.message, "error");
        }
    },

    render: function() {
        if (!this.container) return;
        let editais = window.store.getState().editais;
        const search = this.inputSearch ? this.inputSearch.value.toLowerCase() : "";
        
        this.container.innerHTML = "";

        if (search) {
            editais = editais.filter(ed => 
                ed.nome.toLowerCase().includes(search) || 
                (ed.banca && ed.banca.toLowerCase().includes(search))
            );
        }
        
        if (editais.length === 0 && !search) {
            this.container.innerHTML = ' \
                <div class="col-span-full bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center"> \
                    <div class="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300"> \
                        <i class="ph ph-file-dashed text-4xl"></i> \
                    </div> \
                    <h3 class="text-lg font-bold text-gray-800 mb-2">Nenhum edital cadastrado</h3> \
                    <p class="text-gray-500 mb-6">Comece adicionando os concursos que você pretende prestar.</p> \
                </div>';
            return;
        }

        editais.forEach(ed => {
            const card = document.createElement('div');
            card.className = 'bg-white p-6 rounded-3xl border border-gray-100 hover:border-primary-500 transition-all shadow-sm group relative';
            
            const provaTxt = ed.dataProva ? '<span class="edital-countdown" data-date="' + ed.dataProva + '">...</span>' : 'Data a definir';
            const inscTxt = ed.dataInscricao ? window.utils.formatDateBR(ed.dataInscricao) : 'A definir';
            
            // Status Badge Logic
            let statusClass = 'bg-gray-100 text-gray-600';
            let statusLabel = ed.status;
            if (ed.status === 'Ativo') { statusClass = 'bg-green-100 text-green-700'; statusLabel = 'Inscrições Abertas'; }
            if (ed.status === 'Previsto') { statusClass = 'bg-blue-100 text-blue-700'; statusLabel = 'Previsto'; }
            if (ed.status === 'Encerrado') { statusClass = 'bg-red-100 text-red-700'; statusLabel = 'Inscrições Encerradas'; }
            if (ed.status === 'Finalizado') { statusClass = 'bg-gray-200 text-gray-700'; statusLabel = 'Prova Realizada'; }

            card.innerHTML = ' \
                <div class="flex flex-col h-full"> \
                    <div class="flex justify-between items-start mb-4"> \
                        <div class="flex-1"> \
                            <div class="flex items-center gap-2 mb-1"> \
                                <span class="bg-primary-50 text-primary-600 text-[10px] font-black uppercase px-2 py-0.5 rounded-lg">' + (ed.banca || "Banca a definir") + '</span> \
                                <span class="' + statusClass + ' text-[10px] font-bold px-2 py-0.5 rounded-lg">' + statusLabel + '</span> \
                            </div> \
                            <h3 class="text-xl font-black text-gray-800 leading-tight">' + ed.nome + '</h3> \
                        </div> \
                    </div> \
                    <div class="grid grid-cols-2 gap-4 mb-6"> \
                        <div class="bg-gray-50 p-3 rounded-2xl"> \
                            <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Prova</p> \
                            <p class="text-xs font-black text-gray-700">' + (ed.dataProva ? window.utils.formatDateBR(ed.dataProva) : 'A definir') + '</p> \
                            <p class="text-[10px] text-primary-500 font-bold">' + provaTxt + '</p> \
                        </div> \
                        <div class="bg-gray-50 p-3 rounded-2xl"> \
                            <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Inscrições até</p> \
                            <p class="text-sm font-black text-gray-700">' + inscTxt + '</p> \
                        </div> \
                    </div> \
                    <div class="flex items-center justify-between mt-auto pt-4 border-t border-gray-50"> \
                        <div class="flex gap-4"> \
                            <div> \
                                <p class="text-[9px] font-bold text-gray-400 uppercase">Salário</p> \
                                <p class="text-xs font-black text-green-600">R$ ' + (ed.salario || "--") + '</p> \
                            </div> \
                            <div> \
                                <p class="text-[9px] font-bold text-gray-400 uppercase">Vagas</p> \
                                <p class="text-xs font-black text-gray-700">' + (ed.vagas || "--") + '</p> \
                            </div> \
                        </div> \
                        <div class="flex gap-1"> \
                            ' + (ed.link ? '<a href="' + ed.link + '" target="_blank" class="w-8 h-8 rounded-xl bg-gray-50 text-gray-400 hover:bg-primary-50 hover:text-primary-600 flex items-center justify-center transition-all"><i class="ph ph-link"></i></a>' : '') + ' \
                            <button onclick="window.editaisController.editar(\'' + ed.id + '\')" class="w-8 h-8 rounded-xl bg-gray-50 text-gray-400 hover:bg-primary-50 hover:text-primary-600 flex items-center justify-center transition-all"> \
                                <i class="ph ph-pencil-simple"></i> \
                            </button> \
                            <button onclick="window.editaisController.remover(\'' + ed.id + '\')" class="w-8 h-8 rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all"> \
                                <i class="ph ph-trash"></i> \
                            </button> \
                        </div> \
                    </div> \
                </div>';
            this.container.appendChild(card);
        });
    },

    editar: function(id) {
        const edital = window.store.getState().editais.find(e => e.id === id);
        if (edital) this.abrirModal(edital);
    },

    remover: function(id) {
        if (confirm("Deseja remover este edital?")) {
            window.store.removeEdital(id);
            this.render();
            window.utils.showToast("Edital removido.", "info");
        }
    }
};
