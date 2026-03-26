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

    openModal: function() {
        this.modal.classList.remove('hidden');
        this.modal.classList.add('flex');
        
        // Populate Materias
        this.selectMateriaModal.innerHTML = '<option value="" disabled selected>Selecione uma matéria</option>';
        window.store.getState().materias.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.nome;
            this.selectMateriaModal.appendChild(opt);
        });

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
            const label = document.createElement('label');
            label.className = 'flex items-center gap-2 cursor-pointer bg-white p-2 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors';
            label.innerHTML = `
                <input type="checkbox" name="conteudoCheckbox" value="${c.id}" class="rounded text-primary-600 focus:ring-primary-500 w-4 h-4">
                <span class="text-sm text-gray-700 font-medium">${c.nome} <span class="text-xs text-gray-400 font-normal">(${c.paginas || 0} pág.)</span></span>
            `;
            this.containerCheckboxes.appendChild(label);
        });
    },

    handleSalvarItem: function(e) {
        if (e) e.preventDefault();
        
        const dateInput = this.inputSemana.value;
        const materiaId = this.selectMateriaModal.value;
        const checkboxes = this.containerCheckboxes.querySelectorAll('input[name="conteudoCheckbox"]:checked');
        const conteudosList = Array.from(checkboxes).map(cb => cb.value);

        if (!dateInput || !materiaId || conteudosList.length === 0) {
            window.utils.showToast("Preencha todos os campos obrigatórios", "error");
            return;
        }

        try {
            const semana = window.utils.getWeekMonday(dateInput);
            window.cronogramaLogic.validateItem(semana, materiaId, conteudosList);
            
            // Salvar para cada conteudo selecionado
            conteudosList.forEach(conteudoId => {
                window.store.addCronogramaItem(semana, materiaId, conteudoId);
            });
            
            window.utils.showToast("Estudo(s) adicionado(s) com sucesso", "success");
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
                    <div class="flex justify-end gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
                        <button onclick="window.cronogramaController.startFocus('${item.id}')" class="p-2 text-gray-300 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-all" title="Iniciar Pomodoro">
                            <i class="ph ph-timer text-lg"></i>
                        </button>
                        <button onclick="window.cronogramaController.goMaterial('${item.conteudoId}')" class="p-2 text-gray-300 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-all" title="Ver Notas/Links">
                            <i class="ph ph-notebook text-lg"></i>
                        </button>
                        <button onclick="window.cronogramaController.removerItem('${item.id}')" class="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Remover">
                            <i class="ph ph-trash text-lg"></i>
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

    startFocus: function(id) {
        const item = window.store.getState().cronograma.find(i => i.id === id);
        const materia = window.store.getState().materias.find(m => m.id === item.materiaId);
        const conteudo = window.store.getState().conteudos.find(c => c.id === item.conteudoId);
        
        if (window.pomodoroController) {
            window.pomodoroController.openWithContext(materia.nome + ": " + conteudo.nome);
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
