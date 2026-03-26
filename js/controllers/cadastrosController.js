window.cadastrosController = {
    init: function() {
        this.cacheDOM();
        this.bindEvents();
        this.renderMateriasSelect();
        this.renderLists();
    },

    cacheDOM: function() {
        this.formMateria = document.getElementById('form-materia');
        this.formConteudo = document.getElementById('form-conteudo');
        this.inputMateriaNome = document.getElementById('input-materia-nome');
        this.inputConteudoNome = document.getElementById('input-conteudo-nome');
        this.inputConteudoPaginas = document.getElementById('input-conteudo-paginas');
        this.selectMateria = document.getElementById('select-materia');

        // Management Lists
        this.listMaterias = document.getElementById('list-materias');
        this.listConteudos = document.getElementById('list-conteudos');

        // Edit Materia Modal
        this.modalEditMateria = document.getElementById('modal-edit-materia');
        this.formEditMateria = document.getElementById('form-edit-materia');
        this.inputEditMateriaId = document.getElementById('edit-materia-id');
        this.inputEditMateriaNome = document.getElementById('edit-materia-nome');

        // Edit Conteudo Modal
        this.modalEditConteudo = document.getElementById('modal-edit-conteudo');
        this.formEditConteudo = document.getElementById('form-edit-conteudo');
        this.inputEditConteudoId = document.getElementById('edit-conteudo-id');
        this.inputEditConteudoNome = document.getElementById('edit-conteudo-nome');
        this.inputEditConteudoPaginas = document.getElementById('edit-conteudo-paginas');
    },

    bindEvents: function() {
        if (this.formMateria) {
            this.formMateria.addEventListener('submit', (e) => {
                e.preventDefault();
                try {
                    window.store.addMateria(this.inputMateriaNome.value.trim());
                    window.utils.showToast("Matéria salva!", "success");
                    this.inputMateriaNome.value = '';
                    this.renderMateriasSelect();
                    this.renderLists();
                } catch(e) { window.utils.showToast(e.message, "error"); }
            });
        }

        if (this.formConteudo) {
            this.formConteudo.addEventListener('submit', (e) => {
                e.preventDefault();
                try {
                    const nome = this.inputConteudoNome.value.trim();
                    const paginas = this.inputConteudoPaginas.value;
                    window.store.addConteudo(this.selectMateria.value, nome, paginas);
                    window.utils.showToast("Conteúdo salvo!", "success");
                    this.inputConteudoNome.value = '';
                    this.inputConteudoPaginas.value = '';
                    this.renderLists();
                } catch(e) { window.utils.showToast(e.message, "error"); }
            });
        }

        if (this.formEditMateria) {
            this.formEditMateria.addEventListener('submit', (e) => {
                e.preventDefault();
                window.store.updateMateria(this.inputEditMateriaId.value, this.inputEditMateriaNome.value);
                this.modalEditMateria.classList.add('hidden');
                window.utils.showToast("Matéria atualizada!", "success");
                this.renderMateriasSelect();
                this.renderLists();
            });
        }

        if (this.formEditConteudo) {
            this.formEditConteudo.addEventListener('submit', (e) => {
                e.preventDefault();
                window.store.updateConteudo(this.inputEditConteudoId.value, {
                    nome: this.inputEditConteudoNome.value,
                    paginas: this.inputEditConteudoPaginas.value
                });
                this.modalEditConteudo.classList.add('hidden');
                window.utils.showToast("Conteúdo atualizado!", "success");
                this.renderLists();
            });
        }
    },

    renderMateriasSelect: function() {
        if (!this.selectMateria) return;
        const materias = window.store.getState().materias;
        let html = '<option value="" disabled selected>Selecione uma matéria</option>';
        materias.forEach(m => { html += `<option value="${m.id}">${m.nome}</option>`; });
        this.selectMateria.innerHTML = html;
        
        const selectCronograma = document.getElementById('select-cronograma-materia');
        if (selectCronograma) {
            let htmlCron = '<option value="" disabled selected>Selecione uma matéria</option>';
            materias.forEach(m => { htmlCron += `<option value="${m.id}">${m.nome}</option>`; });
            selectCronograma.innerHTML = htmlCron;
        }
    },

    renderLists: function() {
        if (!this.listMaterias || !this.listConteudos) return;
        const state = window.store.getState();
        
        // Render Materias
        this.listMaterias.innerHTML = '';
        state.materias.forEach(m => {
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-primary-200 transition-all';
            div.innerHTML = `
                <span class="font-bold text-gray-700">${m.nome}</span>
                <div class="flex gap-2">
                    <button onclick="window.cadastrosController.abrirEditMateria('${m.id}')" class="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"><i class="ph ph-pencil-simple"></i></button>
                    <button onclick="window.cadastrosController.removerMateria('${m.id}')" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><i class="ph ph-trash"></i></button>
                </div>
            `;
            this.listMaterias.appendChild(div);
        });

        // Render Conteudos by Materia
        this.listConteudos.innerHTML = '';
        state.materias.forEach(m => {
            const conteudos = state.conteudos.filter(c => c.materiaId === m.id);
            if (conteudos.length > 0) {
                const group = document.createElement('div');
                group.className = 'bg-gray-50/50 p-4 rounded-3xl border border-gray-100';
                group.innerHTML = `<h5 class="text-[10px] font-black text-primary-600 uppercase mb-3 px-1">${m.nome}</h5>`;
                
                const table = document.createElement('table');
                table.className = 'w-full text-sm text-left';
                table.innerHTML = `
                    <tbody class="divide-y divide-gray-100">
                        ${conteudos.map(c => `
                            <tr>
                                <td class="py-2 pr-4 font-medium text-gray-700">${c.nome}</td>
                                <td class="py-2 pr-4 text-gray-400">${c.paginas} pág.</td>
                                <td class="py-2 text-right">
                                    <div class="flex justify-end gap-1">
                                        <button onclick="window.cadastrosController.abrirEditConteudo('${c.id}')" class="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg"><i class="ph ph-pencil-simple"></i></button>
                                        <button onclick="window.cadastrosController.removerConteudo('${c.id}')" class="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"><i class="ph ph-trash"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                `;
                group.appendChild(table);
                this.listConteudos.appendChild(group);
            }
        });
    },

    abrirEditMateria: function(id) {
        const materia = window.store.getState().materias.find(m => m.id === id);
        if (materia) {
            this.inputEditMateriaId.value = materia.id;
            this.inputEditMateriaNome.value = materia.nome;
            this.modalEditMateria.classList.remove('hidden');
        }
    },

    removerMateria: function(id) {
        if (confirm("Tem certeza? Isso removerá todos os conteúdos vinculados a esta matéria!")) {
            window.store.removeMateria(id);
            window.utils.showToast("Matéria removida.", "info");
            this.renderMateriasSelect();
            this.renderLists();
        }
    },

    abrirEditConteudo: function(id) {
        const conteudo = window.store.getState().conteudos.find(c => c.id === id);
        if (conteudo) {
            this.inputEditConteudoId.value = conteudo.id;
            this.inputEditConteudoNome.value = conteudo.nome;
            this.inputEditConteudoPaginas.value = conteudo.paginas;
            this.modalEditConteudo.classList.remove('hidden');
        }
    },

    removerConteudo: function(id) {
        if (confirm("Deseja remover este conteúdo?")) {
            window.store.removeConteudo(id);
            window.utils.showToast("Conteúdo removido.", "info");
            this.renderLists();
        }
    }
};
