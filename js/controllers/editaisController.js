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
        this.checkIgnorado = document.getElementById('check-edital-ignorado');
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
        if (this.inputSalario) {
            this.inputSalario.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, "");
                if (value === "") {
                    e.target.value = "";
                    return;
                }
                value = (parseInt(value, 10) / 100).toFixed(2) + '';
                value = value.replace(".", ",");
                value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
                e.target.value = value;
            });
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
            this.checkIgnorado.checked = !!edital.ignorado;
            
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
            this.checkIgnorado.checked = false;
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

    handleSalvar: async function(e) {
        e.preventDefault();
        
        const data = {
            nome: this.inputNome.value,
            banca: this.inputBanca.value,
            status: this.selectStatus.value,
            ignorado: this.checkIgnorado.checked,
            dataProva: this.checkDataIndefinida.checked ? null : this.inputData.value,
            dataInscricao: this.checkInscIndefinida.checked ? null : this.inputInscricao.value,
            salario: this.inputSalario.value,
            vagas: this.inputVagas.value,
            link: this.inputLink.value
        };

        try {
            if (this.inputId.value) {
                await window.store.updateEdital(this.inputId.value, data);
                window.utils.showToast("Edital atualizado!", "success");
            } else {
                await window.store.addEdital(data);
                window.utils.showToast("Edital cadastrado!", "success");
            }
            this.fecharModal();
            this.render();
            if (window.appControllers) window.appControllers.updateCountdowns();
        } catch (err) {
            window.utils.showToast("Erro ao salvar: " + err.message, "error");
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

        // Sorting Logic: Nearest upcoming date (exam or registration)
        const now = new Date().setHours(0, 0, 0, 0);
        editais.sort((a, b) => {
            const getNextEventDate = (ed) => {
                const dates = [];
                const parseDate = (dateStr) => {
                    const [y, m, d] = dateStr.split('-').map(Number);
                    return new Date(y, m - 1, d).getTime();
                };
                
                if (ed.dataProva) dates.push(parseDate(ed.dataProva));
                if (ed.dataInscricao) dates.push(parseDate(ed.dataInscricao));
                
                const upcoming = dates.filter(d => d >= now);
                if (upcoming.length > 0) return Math.min(...upcoming);
                
                // If no upcoming dates but has past dates, put them after upcoming 
                if (dates.length > 0) return Math.max(...dates) + 8640000000000000 / 2; // Offset for past
                return 8640000000000000; // Infinity for no dates
            };
            return getNextEventDate(a) - getNextEventDate(b);
        });
        
        if (editais.length === 0) {
            if (search) {
                this.container.innerHTML = `
                    <div class="col-span-full bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
                        <div class="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <i class="ph ph-magnifying-glass text-4xl"></i>
                        </div>
                        <h3 class="text-lg font-bold text-gray-800 mb-2">Nenhum resultado encontrado</h3>
                        <p class="text-gray-500 mb-6">Não encontramos nenhum edital para "${search}".</p>
                    </div>`;
            } else {
                this.container.innerHTML = `
                    <div class="col-span-full bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
                        <div class="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <i class="ph ph-file-dashed text-4xl"></i>
                        </div>
                        <h3 class="text-lg font-bold text-gray-800 mb-2">Nenhum edital cadastrado</h3>
                        <p class="text-gray-500 mb-6">Comece adicionando os concursos que você pretende prestar.</p>
                    </div>`;
            }
            return;
        }

        editais.forEach(ed => {
            const card = document.createElement('div');
            // Miniaturized card: p-5 instead of p-7, smaller rounding
            card.className = 'bg-white p-5 rounded-[1.5rem] border border-gray-100 hover:border-primary-500 transition-all shadow-sm hover:shadow-lg hover:-translate-y-1 group relative overflow-hidden flex flex-col';
            
            const provaTxt = ed.dataProva ? window.utils.formatDateBR(ed.dataProva) : 'A definir';
            const countdownProva = ed.dataProva ? window.utils.calculateCountdown(ed.dataProva, "Prova Realizada") : null;
            const inscTxt = ed.dataInscricao ? window.utils.formatDateBR(ed.dataInscricao) : 'A definir';
            const countdownInsc = ed.dataInscricao ? window.utils.calculateCountdown(ed.dataInscricao, "Encerrada") : null;
            
            let statusClass = 'bg-gray-100 text-gray-500';
            let statusLabel = ed.status;
            if (ed.status === 'Ativo') { statusClass = 'bg-green-500 text-white'; statusLabel = 'Inscrições'; }
            if (ed.status === 'Previsto') { statusClass = 'bg-blue-500 text-white'; statusLabel = 'Previsto'; }
            if (ed.status === 'Encerrado') { statusClass = 'bg-orange-500 text-white'; statusLabel = 'Encerradas'; }
            if (ed.status === 'Finalizado') { statusClass = 'bg-gray-400 text-white'; statusLabel = 'Realizada'; }

            if (ed.ignorado) {
                statusClass = 'bg-gray-200 text-gray-500 line-through';
                statusLabel = 'Ignorado';
                card.className = 'bg-gray-50 p-5 rounded-[1.5rem] border border-gray-200 opacity-70 group relative overflow-hidden flex flex-col transition-all';
            }

            card.innerHTML = `
                <div class="flex-1 flex flex-col">
                    <!-- Smaller Header -->
                    <div class="mb-4">
                        <div class="flex flex-wrap items-center gap-1.5 mb-2">
                            <span class="bg-primary-50 text-white mix-blend-multiply bg-primary-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-primary-100">${ed.banca || "BANCA"}</span>
                            <span class="${statusClass} text-[8px] font-black uppercase px-2 py-0.5 rounded-md">${statusLabel}</span>
                        </div>
                        <h3 class="text-sm font-black text-gray-900 leading-tight line-clamp-2" title="${ed.nome}">${ed.nome}</h3>
                    </div>

                    <!-- Compact Details Grid -->
                    <div class="grid grid-cols-2 gap-2 mb-4">
                        <div class="bg-gray-50/80 p-2 rounded-xl border border-gray-50">
                            <p class="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Salário</p>
                            <p class="text-[10px] font-black text-primary-600 truncate">R$ ${ed.salario || "--"}</p>
                        </div>
                        <div class="bg-gray-50/80 p-2 rounded-xl border border-gray-50">
                            <p class="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Vagas</p>
                            <p class="text-[10px] font-black text-gray-800">${ed.vagas || "--"}</p>
                        </div>
                        <div class="bg-gray-50/80 p-2 rounded-xl border border-gray-50">
                            <p class="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Inscrição</p>
                            <p class="text-[9px] font-bold text-gray-600">${inscTxt}</p>
                            ${countdownInsc ? `<p class="text-[8px] font-black ${countdownInsc === 'Encerrada' ? 'text-red-500' : 'text-primary-500'} mt-0.5 uppercase tracking-tighter edital-countdown" data-date="${ed.dataInscricao}">${countdownInsc}</p>` : ''}
                        </div>
                        <div class="bg-gray-50/80 p-2 rounded-xl border border-gray-50">
                            <p class="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Prova</p>
                            <p class="text-[9px] font-bold text-gray-800">${provaTxt}</p>
                            ${countdownProva ? `<p class="text-[8px] font-black ${countdownProva === 'Prova Realizada' ? 'text-gray-500' : 'text-orange-500'} mt-0.5 uppercase tracking-tighter edital-countdown" data-date="${ed.dataProva}">${countdownProva}</p>` : ''}
                        </div>
                    </div>

                    <!-- Nuclear Actions (Subtle) -->
                    <div class="flex items-center gap-1.5 mt-auto pt-3 border-t border-gray-50">
                        ${ed.link ? `
                            <a href="${ed.link}" target="_blank" class="p-2 bg-gray-50 text-gray-400 rounded-lg hover:text-primary-600 hover:bg-primary-50 transition-all active:scale-95" title="Link">
                                <i class="ph-bold ph-link-simple"></i>
                            </a>
                        ` : ''}
                        
                        <button onclick="window.editaisController.editar('${ed.id}')" class="flex-1 py-2 bg-primary-600 text-white rounded-lg font-black text-[8px] uppercase tracking-widest shadow-sm hover:bg-primary-700 transition-all active:scale-95">
                            EDITAR
                        </button>
                        
                        <button onclick="window.editaisController.remover('${ed.id}')" class="p-2 bg-red-50 text-red-300 rounded-lg hover:text-red-600 hover:bg-red-50 transition-all active:scale-95" title="Excluir">
                            <i class="ph ph-trash-simple"></i>
                        </button>
                    </div>
                </div>
            `;
            this.container.appendChild(card);
        });
    },

    editar: function(id) {
        const edital = window.store.getState().editais.find(e => e.id === id);
        if (edital) this.abrirModal(edital);
    },

    remover: async function(id) {
        if (confirm("Deseja remover este edital?")) {
            try {
                await window.store.removeEdital(id);
                this.render();
                window.utils.showToast("Edital removido.", "info");
            } catch (err) {
                window.utils.showToast("Erro ao remover: " + err.message, "error");
            }
        }
    }
};
