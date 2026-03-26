window.materialController = {
    init: function() {
        this.container = document.getElementById('container-materiais');
        this.searchInput = document.getElementById('input-search-materiais');
        
        if (this.searchInput) {
            this.searchInput.oninput = () => this.render();
        }
        this.render();
    },

    render: function() {
        if (!this.container) return;
        const state = window.store.getState();
        const search = this.searchInput ? this.searchInput.value.toLowerCase() : "";
        
        const filtered = state.conteudos.filter(c => {
            const matchSearch = c.nome.toLowerCase().includes(search);
            const material = window.store.getMaterial(c.id);
            return matchSearch && (material && material.links && material.links.length > 0);
        });

        this.container.innerHTML = "";
        
        if (filtered.length === 0) {
            this.container.innerHTML = `
                <div class="col-span-full py-20 text-center bg-white rounded-[2.5rem] shadow-premium border border-gray-50">
                    <i class="ph ph-magnifying-glass text-gray-200 text-6xl mb-4"></i>
                    <p class="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum material encontrado com links</p>
                </div>
            `;
            return;
        }

        filtered.forEach(c => {
            const material = window.store.getMaterial(c.id);
            const card = document.createElement('div');
            card.className = 'group bg-white p-8 rounded-[2.5rem] shadow-premium border border-gray-50 hover:border-primary-100 transition-all hover:shadow-xl-primary relative overflow-hidden h-full flex flex-col';
            
            let linksHtml = material.links.map((link, idx) => `
                <div class="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl group/link hover:bg-primary-50 transition-all">
                    <a href="${link}" target="_blank" class="text-xs font-bold text-gray-600 hover:text-primary-600 truncate flex-1 flex items-center gap-2">
                        <i class="ph ph-link-bold text-primary-400"></i> Local ${idx + 1}
                    </a>
                    <button onclick="window.materialController.removeLink('${c.id}', ${idx})" class="p-1.5 text-gray-300 hover:text-red-500 opacity-30 group-hover/link:opacity-100 transition-opacity">
                        <i class="ph ph-x text-sm"></i>
                    </button>
                </div>
            `).join('');

            card.innerHTML = `
                <div class="absolute top-0 right-0 w-24 h-24 bg-primary-50/30 rounded-full -mr-12 -mt-12 group-hover:bg-primary-50 transition-colors"></div>
                <div class="relative flex flex-col h-full">
                    <h4 class="font-black text-gray-900 mb-6 flex items-center gap-3 leading-tight pr-6">
                        <i class="ph-fill ph-notebook text-primary-500 text-xl"></i> ${c.nome}
                    </h4>
                    <div class="space-y-3 mb-8 flex-1">
                        ${linksHtml}
                    </div>
                    <div>
                        <button onclick="window.materialController.abrirModal('${c.id}')" class="w-full py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg">
                            <i class="ph ph-plus-circle"></i> Gerenciar Materiais
                        </button>
                    </div>
                </div>
            `;
            this.container.appendChild(card);
        });
    },

    abrirModal: function(conteudoId) {
        const url = prompt("Insira a URL do material (PDF, Vídeo, Site):");
        if (url) {
            const material = window.store.getMaterial(conteudoId);
            material.links.push(url);
            window.store.updateMaterial(conteudoId, material.links, material.notas || "");
            this.render();
            window.utils.showToast("Link adicionado!", "success");
        }
    },

    removeLink: function(conteudoId, index) {
        if (!confirm("Remover este link?")) return;
        const material = window.store.getMaterial(conteudoId);
        material.links.splice(index, 1);
        window.store.updateMaterial(conteudoId, material.links, material.notas || "");
        this.render();
        window.utils.showToast("Link removido.", "info");
    },

    saveNotes: function(conteudoId, value) {
        const material = window.store.getMaterial(conteudoId);
        window.store.updateMaterial(conteudoId, material.links, value);
        window.utils.showToast("Anotações salvas.", "success");
    }
};
