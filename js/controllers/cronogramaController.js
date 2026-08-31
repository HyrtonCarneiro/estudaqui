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
        this.sidebarResumo = document.getElementById('sidebar-cronograma-resumo');

        // Postpone modal elements
        this.modalAdiar = document.getElementById('modal-adiar-cronograma');
        this.modalAdiarContent = document.getElementById('modal-adiar-content');
        this.btnAdiar = document.getElementById('btn-adiar-cronograma');
        this.btnFecharAdiar = document.getElementById('btn-fechar-adiar');
        this.btnCancelarAdiar = document.getElementById('btn-cancelar-adiar');
        this.btnConfirmarAdiar = document.getElementById('btn-confirmar-adiar');
        this.selectAdiarSemana = document.getElementById('select-adiar-semana');
        this.inputAdiarNovaData = document.getElementById('input-adiar-nova-data');
        this.adiarPreview = document.getElementById('adiar-preview');
        this.adiarPreviewContent = document.getElementById('adiar-preview-content');
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

        // Postpone modal events
        if (this.btnAdiar) {
            this.btnAdiar.addEventListener('click', () => this.openPostponeModal());
        }
        if (this.btnFecharAdiar) {
            this.btnFecharAdiar.addEventListener('click', () => this.closePostponeModal());
        }
        if (this.btnCancelarAdiar) {
            this.btnCancelarAdiar.addEventListener('click', () => this.closePostponeModal());
        }
        if (this.btnConfirmarAdiar) {
            this.btnConfirmarAdiar.addEventListener('click', () => this.handlePostpone());
        }
        if (this.selectAdiarSemana) {
            this.selectAdiarSemana.addEventListener('change', () => this.updatePostponePreview());
        }
        if (this.inputAdiarNovaData) {
            this.inputAdiarNovaData.addEventListener('change', () => this.updatePostponePreview());
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
            
            if (id) {
                this.closeModal();
            } else {
                // Keep modal open and increment date for next week
                const currentSemana = window.utils.getWeekMonday(this.inputSemana.value);
                const nextWeekDate = new Date(currentSemana + 'T12:00:00');
                nextWeekDate.setDate(nextWeekDate.getDate() + 7);
                
                const yyyy = nextWeekDate.getFullYear();
                const mm = String(nextWeekDate.getMonth() + 1).padStart(2, '0');
                const dd = String(nextWeekDate.getDate()).padStart(2, '0');
                this.inputSemana.value = `${yyyy}-${mm}-${dd}`;

                // Reset checkboxes but keep matter
                this.renderConteudosCheckboxes(this.selectMateriaModal.value);
            }
            
            this.renderTable();
        } catch(e) {
            window.utils.showToast("Erro ao salvar: " + e.message, "error");
        }
    },

    renderTable: function() {
        if (!this.tbody) return;
        this.tbody.innerHTML = '';
        if (this.sidebarResumo) this.sidebarResumo.innerHTML = '';
        
        const itens = window.store.getState().cronograma;
        if (itens.length === 0) {
            this.tbody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-gray-500">Nenhum estudo no cronograma.</td></tr>`;
            if (this.sidebarResumo) {
                this.sidebarResumo.innerHTML = '<p class="text-xs text-gray-400 italic">Cronograma vazio.</p>';
            }
            return;
        }

        // 1. Group status and pages by week
        const sortedSemanas = [...new Set(itens.map(i => i.semana))].sort();
        const firstSemanaDate = new Date(sortedSemanas[0] + 'T12:00:00');

        const semanaStatus = {};
        itens.forEach(item => {
            if (!semanaStatus[item.semana]) {
                semanaStatus[item.semana] = { total: 0, concluidos: 0, totalPaginas: 0 };
            }
            semanaStatus[item.semana].total += 1;
            if (item.concluido) {
                semanaStatus[item.semana].concluidos += 1;
            }
            semanaStatus[item.semana].totalPaginas += (item.paginas || 0);
        });

        // Render Sidebar Summary
        if (this.sidebarResumo) {
            sortedSemanas.forEach((semana) => {
                const info = semanaStatus[semana] || { total: 0, concluidos: 0, totalPaginas: 0 };
                const totalPaginas = info.totalPaginas;
                const isWeekCompleted = info.total > 0 && info.concluidos === info.total;

                const diferenca = ((totalPaginas / 86) - 1) * 100;
                const diffRounded = Math.round(diferenca);
                let diferencaText = '';
                let diferencaColor = 'text-gray-400';
                
                if (totalPaginas === 0) {
                    diferencaText = '0%';
                } else if (diffRounded > 0) {
                    diferencaText = `+${diffRounded}%`;
                    diferencaColor = 'text-red-500';
                } else if (diffRounded < 0) {
                    diferencaText = `${diffRounded}%`;
                    diferencaColor = 'text-primary-500';
                } else {
                    diferencaText = `Na média`;
                    diferencaColor = 'text-green-500';
                }

                // Calcular o número da semana para exibir no resumo
                const semanaDate = new Date(semana + 'T12:00:00');
                const diffTime = semanaDate - firstSemanaDate;
                const weekNum = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;

                const div = document.createElement('div');
                div.className = `flex items-center justify-between p-3 ${isWeekCompleted ? 'bg-green-50/70 border-green-200' : 'bg-gray-50 border-gray-100'} rounded-xl border transition-colors`;
                div.innerHTML = `
                    <div class="flex flex-col">
                        <div class="flex items-center gap-1.5">
                            <span class="text-xs font-bold ${isWeekCompleted ? 'text-green-800' : 'text-gray-800'}">Semana ${weekNum}</span>
                            ${isWeekCompleted ? '<i class="ph-fill ph-check-circle text-green-500 text-sm" title="Semana Concluída"></i>' : ''}
                        </div>
                        <span class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">${totalPaginas} Pág.</span>
                    </div>
                    <span class="text-[10px] font-black uppercase tracking-widest ${diferencaColor}">${diferencaText}</span>
                `;
                this.sidebarResumo.appendChild(div);
            });
        }

        let lastRenderedSemana = null;

        itens.forEach(item => {
            // 2. Detect Week Change and Render Divider
            if (item.semana !== lastRenderedSemana) {
                const info = semanaStatus[item.semana] || { total: 0, concluidos: 0 };
                const isWeekCompleted = info.total > 0 && info.concluidos === info.total;

                const currentSemanaDate = new Date(item.semana + 'T12:00:00');
                const diffTime = currentSemanaDate - firstSemanaDate;
                const weekNum = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
                
                const divider = document.createElement('tr');
                divider.className = 'bg-gray-50 border-y border-gray-100';
                divider.innerHTML = `
                    <td colspan="5" class="p-4 py-3">
                        <div class="flex items-center gap-3">
                            <span class="${isWeekCompleted ? 'bg-green-600' : 'bg-primary-600'} text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                                ${isWeekCompleted ? '<i class="ph-bold ph-check text-xs"></i>' : ''}
                                Semana ${weekNum}
                            </span>
                            <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Início: ${window.utils.formatDateBR(item.semana)}</span>
                            ${isWeekCompleted ? `
                                <span class="bg-green-100 text-green-700 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-green-200">
                                    <i class="ph-fill ph-check-circle text-xs"></i> Semana Concluída
                                </span>
                            ` : ''}
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
                            <i class="ph-bold ph-pencil-simple"></i> <span class="text-[9px] font-black uppercase">Editar</span>
                        </button>
                        <button onclick="window.cronogramaController.removerItem('${item.id}')" class="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-md active:scale-95" title="Remover">
                            <i class="ph-bold ph-trash"></i> <span class="text-[9px] font-black uppercase">Excluir</span>
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
    },

    // --- Postpone (Adiar) Functionality ---

    openPostponeModal: function() {
        var itens = window.store.getState().cronograma;
        if (itens.length === 0) {
            window.utils.showToast("Cronograma vazio. Nada para adiar.", "error");
            return;
        }

        // Get unique sorted weeks
        var semanas = [];
        var seen = {};
        itens.forEach(function(i) {
            if (!seen[i.semana]) {
                seen[i.semana] = true;
                semanas.push(i.semana);
            }
        });
        semanas.sort();
        var firstSemanaDate = new Date(semanas[0] + 'T12:00:00');

        // Populate select
        this.selectAdiarSemana.innerHTML = '<option value="" disabled selected>Selecione a semana...</option>';
        semanas.forEach(function(semana, idx) {
            var semanaDate = new Date(semana + 'T12:00:00');
            var diffTime = semanaDate - firstSemanaDate;
            var weekNum = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
            var opt = document.createElement('option');
            opt.value = semana;
            opt.textContent = 'Semana ' + weekNum + ' \u2014 ' + window.utils.formatDateBR(semana);
            this.selectAdiarSemana.appendChild(opt);
        }.bind(this));

        // Reset
        this.inputAdiarNovaData.value = '';
        this.adiarPreview.classList.add('hidden');
        this.adiarPreviewContent.innerHTML = '';

        // Show modal
        this.modalAdiar.classList.remove('hidden');
        this.modalAdiar.classList.add('flex');
        requestAnimationFrame(function() {
            this.modalAdiarContent.classList.remove('scale-95', 'opacity-0');
        }.bind(this));
    },

    closePostponeModal: function() {
        this.modalAdiarContent.classList.add('scale-95', 'opacity-0');
        setTimeout(function() {
            this.modalAdiar.classList.add('hidden');
            this.modalAdiar.classList.remove('flex');
        }.bind(this), 200);
    },

    updatePostponePreview: function() {
        var selectedSemana = this.selectAdiarSemana.value;
        var newDateVal = this.inputAdiarNovaData.value;

        if (!selectedSemana || !newDateVal) {
            this.adiarPreview.classList.add('hidden');
            return;
        }

        var newMonday = window.utils.getWeekMonday(newDateVal);

        // Calculate diff
        var parseLocal = function(str) {
            var parts = str.split('-').map(Number);
            return new Date(parts[0], parts[1] - 1, parts[2]);
        };
        var fromDate = parseLocal(selectedSemana);
        var toDate = parseLocal(newMonday);
        var diffMs = toDate - fromDate;
        var diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            this.adiarPreview.classList.remove('hidden');
            this.adiarPreviewContent.innerHTML = '<p class="text-amber-600 font-medium">A nova data resulta na mesma semana. Nenhuma alteração será feita.</p>';
            return;
        }

        // Build preview
        var itens = window.store.getState().cronograma;
        var semanas = [];
        var seenSemanas = {};
        itens.forEach(function(i) {
            if (!seenSemanas[i.semana]) {
                seenSemanas[i.semana] = true;
                semanas.push(i.semana);
            }
        });
        semanas.sort();

        var firstSemanaDate = new Date(semanas[0] + 'T12:00:00');
        var direction = diffDays > 0 ? 'adiada' : 'antecipada';
        var absDays = Math.abs(diffDays);
        var html = '<p class="text-xs text-gray-500 mb-2 font-bold"><i class="ph ph-arrow-right"></i> ' + absDays + ' dia(s) — semanas serão <strong>' + direction + 's</strong>:</p>';
        html += '<div class="space-y-1.5">';

        semanas.forEach(function(semana) {
            var semanaDate = new Date(semana + 'T12:00:00');
            var weekDiffTime = semanaDate - firstSemanaDate;
            var weekNum = Math.round(weekDiffTime / (1000 * 60 * 60 * 24 * 7)) + 1;

            if (semana >= selectedSemana) {
                var newDate = parseLocal(semana);
                newDate.setDate(newDate.getDate() + diffDays);
                var yyyy = newDate.getFullYear();
                var mm = String(newDate.getMonth() + 1).padStart(2, '0');
                var dd = String(newDate.getDate()).padStart(2, '0');
                var newWeek = window.utils.getWeekMonday(yyyy + '-' + mm + '-' + dd);
                html += '<div class="flex items-center gap-2 text-xs">';
                html += '<span class="font-bold text-gray-700">Sem. ' + weekNum + ':</span>';
                html += '<span class="text-red-400 line-through">' + window.utils.formatDateBR(semana) + '</span>';
                html += '<i class="ph ph-arrow-right text-amber-500"></i>';
                html += '<span class="text-green-600 font-bold">' + window.utils.formatDateBR(newWeek) + '</span>';
                html += '</div>';
            } else {
                html += '<div class="flex items-center gap-2 text-xs text-gray-400">';
                html += '<span class="font-bold">Sem. ' + weekNum + ':</span>';
                html += '<span>' + window.utils.formatDateBR(semana) + '</span>';
                html += '<span class="text-[10px] italic">(sem alteração)</span>';
                html += '</div>';
            }
        });

        html += '</div>';
        this.adiarPreviewContent.innerHTML = html;
        this.adiarPreview.classList.remove('hidden');
    },

    handlePostpone: function() {
        var selectedSemana = this.selectAdiarSemana.value;
        var newDateVal = this.inputAdiarNovaData.value;

        if (!selectedSemana) {
            window.utils.showToast("Selecione a semana de referência", "error");
            return;
        }
        if (!newDateVal) {
            window.utils.showToast("Selecione a nova data", "error");
            return;
        }

        try {
            var count = window.store.postponeCronograma(selectedSemana, newDateVal);
            window.utils.showToast(count + " item(ns) adiado(s) com sucesso!", "success");
            this.closePostponeModal();
            this.renderTable();
        } catch(e) {
            window.utils.showToast("Erro ao adiar: " + e.message, "error");
        }
    }
};
