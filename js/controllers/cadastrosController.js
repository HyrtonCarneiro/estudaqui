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
        this.materiasListEl = document.getElementById('list-materias');
        this.conteudosListEl = document.getElementById('list-conteudos');

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
        if (!this.materiasListEl || !this.conteudosListEl) return;
        const state = window.store.getState();
        
        this.renderMaterias(state.materias);
        this.renderConteudos(state.materias, state.conteudos);
    },

    renderMaterias: function(materias) {
        this.materiasListEl.innerHTML = "";
        materias.forEach(m => {
            const div = document.createElement('div');
            div.className = 'group flex items-center justify-between p-5 bg-white border border-gray-50 rounded-[1.5rem] shadow-premium hover:border-primary-100 transition-all hover:-translate-y-1';
            div.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-1.5 h-8 bg-primary-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span class="font-bold text-gray-800 tracking-tight">${m.nome}</span>
                </div>
                <div class="flex gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
                    <button onclick="window.cadastrosController.abrirModalEditarMateria('${m.id}', '${m.nome}')" class="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"><i class="ph ph-pencil-simple text-lg"></i></button>
                    <button onclick="window.cadastrosController.removerMateria('${m.id}')" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><i class="ph ph-trash text-lg"></i></button>
                </div>
            `;
            this.materiasListEl.appendChild(div);
        });
    },

    renderConteudos: function(materias, conteudos) {
        this.conteudosListEl.innerHTML = "";
        if (materias.length === 0) {
            this.conteudosListEl.innerHTML = `<div class="col-span-full py-20 text-center bg-gray-50/50 rounded-[2.5rem] border border-dashed border-gray-200">
                <i class="ph ph-mask-happy text-gray-300 text-5xl mb-4"></i>
                <p class="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhuma matéria cadastrada ainda</p>
            </div>`;
            return;
        }

        materias.forEach(m => {
            const mConteudos = conteudos.filter(c => c.materiaId === m.id);
            if (mConteudos.length === 0) return;

            mConteudos.forEach(c => {
                const div = document.createElement('div');
                div.className = 'group bg-white p-6 rounded-[2rem] shadow-premium border border-gray-50 hover:border-primary-100 transition-all hover:shadow-xl-primary relative overflow-hidden';
                div.innerHTML = `
                    <div class="absolute top-0 right-0 w-24 h-24 bg-primary-50/50 rounded-full -mr-12 -mt-12 group-hover:bg-primary-100/50 transition-colors"></div>
                    <div class="relative">
                        <div class="flex items-start justify-between mb-4">
                            <div>
                                <p class="text-[9px] font-black text-primary-500 uppercase tracking-[0.2em] mb-1">${m.nome}</p>
                                <h4 class="font-bold text-gray-800 leading-tight pr-8">${c.nome}</h4>
                            </div>
                        </div>
                        <div class="flex items-center justify-between mt-6">
                            <span class="px-3 py-1.5 bg-gray-50 text-[10px] font-black text-gray-500 rounded-xl uppercase tracking-widest">${c.paginas} Pág.</span>
                            <div class="flex gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
                                <button onclick="window.cadastrosController.abrirModalEditarConteudo('${c.id}', '${c.nome}', ${c.paginas})" class="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"><i class="ph ph-pencil-simple-line text-lg"></i></button>
                                <button onclick="window.cadastrosController.removerConteudo('${c.id}')" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><i class="ph ph-trash-line text-lg"></i></button>
                            </div>
                        </div>
                    </div>
                `;
                this.conteudosListEl.appendChild(div);
            });
        });
    },

    abrirModalEditarMateria: function(id, nome) {
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

    abrirModalEditarConteudo: function(id) {
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
