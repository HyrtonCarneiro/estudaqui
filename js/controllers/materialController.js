window.materialController = {
    init: function() {
        this.container = document.getElementById('container-materiais');
        this.emptyState = document.getElementById('materiais-empty-state');
        this.searchInput = document.getElementById('input-search-materiais');
        
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.render());
        }
    },

    render: function() {
        if (!this.container) return;
        const state = window.store.getState();
        const search = this.searchInput ? this.searchInput.value.toLowerCase() : "";
        
        this.container.innerHTML = "";
        
        const contents = state.conteudos.filter(c => !search || c.nome.toLowerCase().includes(search));
        
        if (state.conteudos.length === 0) {
            this.emptyState.classList.remove('hidden');
            this.container.classList.add('hidden');
            return;
        } else {
            this.emptyState.classList.add('hidden');
            this.container.classList.remove('hidden');
        }

        contents.forEach(c => {
            const materia = state.materias.find(m => m.id === c.materiaId);
            const material = window.store.getMaterial(c.id);
            
            const card = document.createElement('div');
            card.className = 'bg-white p-6 rounded-3xl border border-gray-100 hover:border-primary-500 transition-all shadow-sm';
            card.id = 'mat-card-' + c.id;
            
            card.innerHTML = ' \
                <div class="flex flex-col h-full"> \
                    <div class="mb-4"> \
                        <span class="text-[10px] font-bold uppercase tracking-widest text-primary-500 bg-primary-50 px-2 py-1 rounded-lg mb-2 inline-block">' + (materia ? materia.nome : 'Matéria') + '</span> \
                        <h3 class="font-black text-gray-800 text-lg leading-tight">' + c.nome + '</h3> \
                    </div> \
                    <div class="flex-1 space-y-4"> \
                        <div> \
                            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Links de Estudo</label> \
                            <div class="flex flex-wrap gap-2 mb-2" id="links-' + c.id + '"> \
                                ' + this.renderLinks(c.id, material.links) + ' \
                                <button onclick="window.materialController.addLink(\'' + c.id + '\')" class="w-8 h-8 rounded-xl bg-gray-50 text-gray-400 hover:bg-primary-600 hover:text-white flex items-center justify-center transition-all"> \
                                    <i class="ph ph-plus-bold"></i> \
                                </button> \
                            </div> \
                        </div> \
                        <div> \
                            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Minhas Anotações</label> \
                            <textarea class="w-full text-sm text-gray-600 bg-gray-50 p-4 rounded-2xl border-none focus:ring-2 focus:ring-primary-500 min-h-[140px] resize-none" \
                                      placeholder="Escreva seus resumos, fórmulas e pontos importantes..." \
                                      onblur="window.materialController.saveNotes(\'' + c.id + '\', this.value)">' + material.notas + '</textarea> \
                        </div> \
                    </div> \
                </div>';
            
            this.container.appendChild(card);
        });
    },

    renderLinks: function(conteudoId, links) {
        if (!links || links.length === 0) return "";
        return links.map((link, index) => `
            <div class="flex items-center gap-1 bg-primary-50 pl-3 pr-1 py-1 rounded-full group/link">
                <a href="${link}" target="_blank" class="text-primary-600 text-xs font-medium hover:underline flex items-center gap-1">
                    <i class="ph ph-link"></i> Link
                </a>
                <button onclick="window.materialController.removeLink('${conteudoId}', ${index})" class="w-6 h-6 flex items-center justify-center text-primary-300 hover:text-red-500 transition-colors opacity-0 group-hover/link:opacity-100">
                    <i class="ph ph-x-circle text-sm"></i>
                </button>
            </div>
        `).join("");
    },

    removeLink: function(conteudoId, index) {
        const material = window.store.getMaterial(conteudoId);
        material.links.splice(index, 1);
        window.store.updateMaterial(conteudoId, material.links, material.notas);
        this.render();
        window.utils.showToast("Link removido.", "info");
    },

    addLink: function(conteudoId) {
        const url = prompt("Insira a URL do material (PDF, Vídeo, etc):");
        if (url) {
            const material = window.store.getMaterial(conteudoId);
            material.links.push(url);
            window.store.updateMaterial(conteudoId, material.links, material.notas);
            this.render();
            window.utils.showToast("Link adicionado!", "success");
        }
    },

    saveNotes: function(conteudoId, value) {
        const material = window.store.getMaterial(conteudoId);
        if (material.notas === value) return;
        window.store.updateMaterial(conteudoId, material.links, value);
        window.utils.showToast("Anotações salvas.", "info");
    },

    focusOn: function(conteudoId) {
        setTimeout(() => {
            const el = document.getElementById('mat-card-' + conteudoId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-primary-500');
                setTimeout(() => el.classList.remove('ring-2', 'ring-primary-500'), 3000);
            }
        }, 100);
    }
};
