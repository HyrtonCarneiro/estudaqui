window.cronogramaController = {
    init: function() {
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM: function() {
        this.modal = document.getElementById('modal-cronograma');
        this.modalContent = document.getElementById('modal-cronograma-content');
        this.btnAdicionarEstudo = document.getElementById('btn-novo-cronograma');
        this.btnFecharModal = document.getElementById('btn-fechar-modal');
        this.btnCancelarModal = document.getElementById('btn-cancelar-modal');
        this.formItem = document.getElementById('form-item-cronograma');
        this.tbody = document.getElementById('tbody-cronograma');
        this.selectMateriaModal = document.getElementById('select-cronograma-materia');
        this.containerCheckboxes = document.getElementById('container-conteudos-checkboxes');
        this.inputSemana = document.getElementById('input-cronograma-semana');

        // Edit Mode specific elements
        this.inputId = document.getElementById('input-cronograma-id');
        this.editInfoArea = document.getElementById('edit-cronograma-info');
        this.editLabel = document.getElementById('edit-cronograma-label');
        this.editPagesArea = document.getElementById('edit-cronograma-pages-area');
        this.editInputPaginas = document.getElementById('input-cronograma-edit-paginas');
        this.addSelectionArea = document.getElementById('add-cronograma-selection-area');
        this.modalTitle = document.querySelector('#modal-cronograma h3');
    },

    bindEvents: function() {
        if (this.btnAdicionarEstudo) {
            this.btnAdicionarEstudo.addEventListener('click', () => this.openModal());
        }

        if (this.btnFecharModal) {
            this.btnFecharModal.addEventListener('click', () => this.closeModal());
        }

        if (this.btnCancelarModal) {
            this.btnCancelarModal.addEventListener('click', () => this.closeModal());
        }
        
        // Mudar matéria no modal
        if (this.selectMateriaModal) {
            this.selectMateriaModal.addEventListener('change', (e) => {
                this.renderConteudosCheckboxes(e.target.value);
            });
        }

        // Submit form
        if (this.formItem) {
            this.formItem.addEventListener('submit', (e) => {
                this.handleSalvarItem(e);
            });
        }
    },

    openModal: function(item = null) {
        this.modal.classList.remove('hidden');
        this.modal.classList.add('flex');
        
        if (item) {
            // EDIT MODE
            this.modalTitle.innerHTML = '<i class="ph ph-pencil-simple text-primary-600"></i> Editar Estudo';
            this.inputId.value = item.id;
            this.inputSemana.value = item.semana;
            this.editInputPaginas.value = item.paginas;
            
            const materia = window.store.getState().materias.find(m => m.id === item.materiaId);
            const conteudo = window.store.getState().conteudos.find(c => c.id === item.conteudoId);
            this.editLabel.textContent = `${materia ? materia.nome : '?'}: ${conteudo ? conteudo.nome : '?'}`;
            
            this.editInfoArea.classList.remove('hidden');
            this.editPagesArea.classList.remove('hidden');
            this.addSelectionArea.classList.add('hidden');
        } else {
            // ADD MODE
            this.modalTitle.innerHTML = '<i class="ph ph-calendar-plus text-primary-600"></i> Adicionar ao Cronograma';
            this.inputId.value = "";
            this.formItem.reset();
            
            this.editInfoArea.classList.add('hidden');
            this.editPagesArea.classList.add('hidden');
            this.addSelectionArea.classList.remove('hidden');

            // Populate Materias
            this.selectMateriaModal.innerHTML = '<option value="" disabled selected>Selecione uma matéria</option>';
            window.store.getState().materias.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = m.nome;
                this.selectMateriaModal.appendChild(opt);
            });
        }

        requestAnimationFrame(() => {
            this.modalContent.classList.remove('scale-95', 'opacity-0');
        });
    },

    closeModal: function() {
        this.modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            this.modal.classList.add('hidden');
            this.modal.classList.remove('flex');
            this.formItem.reset();
            this.containerCheckboxes.innerHTML = '<span class="text-sm text-gray-400 italic">Selecione a matéria primeiro...</span>';
        }, 200);
    },

    renderConteudosCheckboxes: function(materiaId) {
        const conteudos = window.store.getConteudosPorMateria(materiaId);
        this.containerCheckboxes.innerHTML = '';
        
        if (conteudos.length === 0) {
            this.containerCheckboxes.innerHTML = '<span class="text-sm text-gray-500">Nenhum conteúdo cadastrado para esta matéria.</span>';
            return;
        }

        conteudos.forEach(c => {
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between gap-4 bg-white p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group';
            div.innerHTML = `
                <label class="flex items-center gap-3 cursor-pointer flex-1">
                    <input type="checkbox" name="conteudoCheckbox" value="${c.id}" data-total="${c.paginas}" class="rounded text-primary-600 focus:ring-primary-500 w-5 h-5">
                    <div class="flex flex-col">
                        <span class="text-sm text-gray-800 font-bold">${c.nome}</span>
                        <span class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total: ${c.paginas || 0} pág.</span>
                    </div>
                </label>
                <div class="flex items-center gap-2">
                    <input type="number" name="paginasOverride_${c.id}" placeholder="${c.paginas}" class="w-16 px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-700 focus:ring-1 focus:ring-primary-500 outline-none" title="Páginas para esta semana">
                    <span class="text-[10px] font-black text-gray-300">PÁG.</span>
                </div>
            `;
            this.containerCheckboxes.appendChild(div);
        });
    },

    handleSalvarItem: function(e) {
        if (e) e.preventDefault();
        
        const dateInput = this.inputSemana.value;
        const id = this.inputId.value;

        if (!dateInput) {
            window.utils.showToast("Selecione a semana", "error");
            return;
        }

        try {
            const semana = window.utils.getWeekMonday(dateInput);

            if (id) {
                // UPDATE ITEM
                const paginas = Number(this.editInputPaginas.value) || 0;
                window.store.updateCronogramaItem(id, { semana, paginas });
                window.utils.showToast("Estudo atualizado", "success");
            } else {
                // CREATE NEW ITEM(S)
                const materiaId = this.selectMateriaModal.value;
                const checkboxes = this.containerCheckboxes.querySelectorAll('input[name="conteudoCheckbox"]:checked');
                const conteudosList = Array.from(checkboxes).map(cb => cb.value);

                if (!materiaId || conteudosList.length === 0) {
                    window.utils.showToast("Selecione a matéria e os conteúdos", "error");
                    return;
                }

                window.cronogramaLogic.validateItem(semana, materiaId, conteudosList);
                
                checkboxes.forEach(cb => {
                    const conteudoId = cb.value;
                    const overrideInput = this.containerCheckboxes.querySelector(`input[name="paginasOverride_${conteudoId}"]`);
                    const paginasOverride = overrideInput && overrideInput.value ? Number(overrideInput.value) : null;
                    
                    window.store.addCronogramaItem(semana, materiaId, conteudoId, paginasOverride);
                });
                window.utils.showToast("Estudo(s) adicionado(s)", "success");
            }
            
            this.closeModal();
            this.renderTable();
        } catch(e) {
            window.utils.showToast("Erro ao salvar: " + e.message, "error");
        }
    },

    renderTable: function() {
        if (!this.tbody) return;
        this.tbody.innerHTML = '';
        
        const itens = window.store.getState().cronograma;
        if (itens.length === 0) {
            this.tbody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-gray-500">Nenhum estudo no cronograma.</td></tr>`;
            return;
        }

        // 1. Find the earliest week to calculate "Semana X"
        const sortedSemanas = [...new Set(itens.map(i => i.semana))].sort();
        const firstSemanaDate = new Date(sortedSemanas[0] + 'T12:00:00');

        let lastRenderedSemana = null;

        itens.forEach(item => {
            // 2. Detect Week Change and Render Divider
            if (item.semana !== lastRenderedSemana) {
                const currentSemanaDate = new Date(item.semana + 'T12:00:00');
                const diffTime = currentSemanaDate - firstSemanaDate;
                const weekNum = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
                
                const divider = document.createElement('tr');
                divider.className = 'bg-gray-50 border-y border-gray-100';
                divider.innerHTML = `
                    <td colspan="5" class="p-4 py-3">
                        <div class="flex items-center gap-3">
                            <span class="bg-primary-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md">Semana ${weekNum}</span>
                            <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Início: ${window.utils.formatDateBR(item.semana)}</span>
                        </div>
                    </td>
                `;
                this.tbody.appendChild(divider);
                lastRenderedSemana = item.semana;
            }

            const state = window.store.getState();
            const materia = state.materias.find(m => m.id === item.materiaId) || { nome: 'Matéria' };
            const conteudo = state.conteudos.find(c => c.id === item.conteudoId) || { nome: 'Conteúdo' };

            const tr = document.createElement('tr');
            tr.className = 'group hover:bg-primary-50/50 transition-colors';
            
            const statusIcon = item.concluido ? 'ph-fill ph-check-circle text-green-500' : 'ph ph-circle text-gray-300 group-hover:text-primary-300';
            const textClass = item.concluido ? 'line-through text-gray-400 font-medium' : 'text-gray-700 font-bold';
            const dateStr = item.data ? window.utils.formatDateBR(item.data) : '--/--';
            const diaSemana = item.data ? new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase() : '';

            tr.innerHTML = `
                <td class="px-8 py-5">
                    <div class="flex flex-col">
                        <span class="text-xs font-black text-gray-900 tracking-tighter">${diaSemana}</span>
                        <span class="text-[10px] text-gray-300 font-bold">${dateStr}</span>
                    </div>
                </td>
                <td class="px-8 py-5">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-black text-primary-500 uppercase tracking-widest mb-1">${materia.nome}</span>
                        <span class="${textClass} tracking-tight line-clamp-1">${conteudo.nome}</span>
                    </div>
                </td>
                <td class="px-8 py-5">
                    <button onclick="window.cronogramaController.toggleConcluido('${item.id}')" class="flex items-center gap-2 group/btn">
                        <i class="${statusIcon} text-2xl transition-transform group-hover/btn:scale-110"></i>
                        <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest ${item.concluido ? 'text-green-600' : ''}">${item.concluido ? 'Concluído' : 'Pendente'}</span>
                    </button>
                </td>
                <td class="px-8 py-5 text-center">
                    <span class="px-3 py-1.5 bg-gray-50 text-[10px] font-black text-gray-500 rounded-xl uppercase tracking-widest">${item.paginas || '--'} Pág.</span>
                </td>
                <td class="px-8 py-5 text-right">
                    <div class="flex justify-end gap-2 relative z-10">
                        <button onclick="window.cronogramaController.editar('${item.id}')" class="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all shadow-md active:scale-95" title="Editar Estudo">
                            <i class="ph ph-pencil-simple font-bold"></i> <span class="text-[9px] font-black uppercase">Editar</span>
                        </button>
                        <button onclick="window.cronogramaController.removerItem('${item.id}')" class="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-md active:scale-95" title="Remover">
                            <i class="ph ph-trash font-bold"></i> <span class="text-[9px] font-black uppercase">Excluir</span>
                        </button>
                    </div>
                </td>
            `;
            this.tbody.appendChild(tr);
        });
    },

    toggleConcluido: function(id) {
        try {
            const item = window.store.getState().cronograma.find(i => i.id === id);
            if (item.concluido) {
                window.store.desmarcarItemCronograma(id);
                window.utils.showToast("Item desmarcado.", "info");
            } else {
                window.store.concluirItemCronograma(id);
                window.spacedRepetition.gerarRevisoesParaConteudo(item.conteudoId, item.dataConclusao);
                window.utils.showToast("Estudo concluído! Revisões agendadas.", "success");
            }
            this.renderTable();
        } catch (e) {
            window.utils.showToast("Erro: " + e.message, "error");
        }
    },

    editar: function(id) {
        const item = window.store.getState().cronograma.find(i => i.id === id);
        if (item) {
            this.openModal(item);
        }
    },

    goMaterial: function(conteudoId) {
        window.appControllers.navigate('materiais');
        if (window.materialController) {
            window.materialController.focusOn(conteudoId);
        }
    },

    removerItem: function(id) {
        if (confirm("Tem certeza que deseja remover este item?")) {
            window.store.removeCronogramaItem(id);
            window.utils.showToast("Item removido", "info");
            this.renderTable();
        }
    }
};
