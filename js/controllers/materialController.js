window.materialController = {
    selectedMateriaId: 'all',

    init: function() {
        this.cacheDOM();
        this.bindEvents();
        this.render();
    },

    cacheDOM: function() {
        this.container = document.getElementById('container-materiais');
        this.sidebarList = document.getElementById('sidebar-materiais-list');
        this.currentMateriaTitle = document.getElementById('materiais-current-materia-title');
        this.searchInput = document.getElementById('input-search-materiais');
        
        // Modal elements
        this.modal = document.getElementById('modal-material-details');
        this.modalContent = document.getElementById('modal-material-details-content');
        this.modalTitle = document.getElementById('material-detail-title');
        this.modalSubtitle = document.getElementById('material-detail-materia');
        this.inputId = document.getElementById('input-material-conteudo-id');
        this.linksList = document.getElementById('material-links-list');
        this.inputNewLink = document.getElementById('input-new-material-link');
        this.textareaNotes = document.getElementById('textarea-material-notes');
    },

    bindEvents: function() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.render());
        }
    },

    selectMateria: function(id) {
        this.selectedMateriaId = id;
        this.render();
    },

    render: function() {
        this.renderSidebar();
        this.renderGrid();
    },

    renderSidebar: function() {
        if (!this.sidebarList) return;
        const materias = window.store.getState().materias;
        
        let html = `
            <button onclick="window.materialController.selectMateria('all')" 
                class="w-full text-left px-4 py-3 rounded-xl font-bold text-xs transition-all ${this.selectedMateriaId === 'all' ? 'bg-primary-600 text-white shadow-lg shadow-primary-100' : 'text-gray-500 hover:bg-gray-50'}">
                <i class="ph ph-squares-four font-bold mr-2"></i> Todas
            </button>
        `;

        materias.forEach(m => {
            const isSelected = this.selectedMateriaId === m.id;
            html += `
                <button onclick="window.materialController.selectMateria('${m.id}')" 
                    class="w-full text-left px-4 py-3 rounded-xl font-bold text-xs transition-all ${isSelected ? 'bg-primary-600 text-white shadow-lg shadow-primary-100' : 'text-gray-500 hover:bg-gray-50'}">
                    <i class="ph ph-folder font-bold mr-2"></i> ${m.nome}
                </button>
            `;
        });

        this.sidebarList.innerHTML = html;

        // Update Title
        if (this.selectedMateriaId === 'all') {
            this.currentMateriaTitle.textContent = "Todos os Conteúdos";
        } else {
            const m = materias.find(x => x.id === this.selectedMateriaId);
            this.currentMateriaTitle.textContent = m ? m.nome : "Conteúdos";
        }
    },

    renderGrid: function() {
        if (!this.container) return;
        const state = window.store.getState();
        const search = this.searchInput ? this.searchInput.value.toLowerCase() : "";
        
        let filtered = state.conteudos;

        // Filter by Sidebar
        if (this.selectedMateriaId !== 'all') {
            filtered = filtered.filter(c => c.materiaId === this.selectedMateriaId);
        }

        // Filter by Search
        if (search) {
            filtered = filtered.filter(c => c.nome.toLowerCase().includes(search));
        }

        this.container.innerHTML = "";
        
        if (filtered.length === 0) {
            this.container.innerHTML = `
                <div class="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-gray-200">
                    <i class="ph ph-book-open-text text-gray-100 text-7xl mb-4"></i>
                    <p class="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum assunto disponível nesta categoria</p>
                </div>
            `;
            return;
        }

        filtered.forEach(c => {
            const material = window.store.getMaterial(c.id);
            const materia = state.materias.find(m => m.id === c.materiaId);
            const card = document.createElement('div');
            card.className = 'group bg-white p-7 rounded-[2.5rem] shadow-premium border border-gray-50 hover:border-primary-200 transition-all hover:shadow-xl relative overflow-hidden flex flex-col h-fit animate-fade-in';
            
            // Icon logic based on URL
            const getIcon = (url) => {
                if (url.includes('youtube.com') || url.includes('youtu.be')) return 'ph-youtube-logo text-red-500';
                if (url.includes('drive.google.com')) return 'ph-google-drive-logo text-green-600';
                if (url.includes('.pdf')) return 'ph-file-pdf text-orange-600';
                return 'ph-link-simple text-blue-500';
            };

            const linksIcons = material.links.slice(0, 4).map(l => `<i class="ph ${getIcon(l)} text-lg"></i>`).join('');
            const hasNotes = material.notas && material.notas.trim().length > 0;

            card.innerHTML = `
                <div class="relative flex flex-col h-full">
                    <div class="flex justify-between items-start mb-4">
                        <span class="bg-gray-50 text-gray-400 text-[9px] font-black uppercase px-2 py-1 rounded-lg border border-gray-100">${materia ? materia.nome : 'Matéria'}</span>
                        <div class="flex gap-1.5">${linksIcons}</div>
                    </div>
                    
                    <h4 class="font-black text-gray-900 mb-4 text-base leading-tight">${c.nome}</h4>
                    
                    <div class="flex items-center gap-4 mb-6">
                        <div class="flex items-center gap-1.5">
                            <i class="ph ph-article text-gray-300"></i>
                            <span class="text-[10px] font-bold text-gray-500">${material.links.length} Links</span>
                        </div>
                        ${hasNotes ? `
                            <div class="flex items-center gap-1.5">
                                <i class="ph ph-note-pencil text-primary-400"></i>
                                <span class="text-[10px] font-bold text-primary-500">Com Notas</span>
                            </div>
                        ` : ''}
                    </div>

                    <button onclick="window.materialController.abrirModal('${c.id}')" class="w-full py-3.5 bg-primary-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-700 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-primary-100">
                        <i class="ph ph-pencil-simple-line font-bold"></i> Gerenciar Material
                    </button>
                </div>
            `;
            this.container.appendChild(card);
        });
    },

    abrirModal: function(conteudoId) {
        const state = window.store.getState();
        const conteudo = state.conteudos.find(c => c.id === conteudoId);
        const materia = state.materias.find(m => m.id === (conteudo ? conteudo.materiaId : ''));
        const material = window.store.getMaterial(conteudoId);

        this.inputId.value = conteudoId;
        this.modalTitle.textContent = conteudo ? conteudo.nome : "Gestão de Material";
        this.modalSubtitle.textContent = materia ? materia.nome : "Disciplina";
        this.textareaNotes.value = material.notas || "";
        this.inputNewLink.value = "";

        this.renderModalLinks(material.links);

        this.modal.classList.remove('hidden');
        this.modal.classList.add('flex');
        requestAnimationFrame(() => {
            this.modalContent.classList.remove('scale-95', 'opacity-0');
        });
    },

    renderModalLinks: function(links) {
        if (!this.linksList) return;
        
        if (links.length === 0) {
            this.linksList.innerHTML = `
                <div class="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p class="text-xs text-gray-400 font-bold italic">Nenhum link adicionado ainda.</p>
                </div>
            `;
            return;
        }

        this.linksList.innerHTML = links.map((l, idx) => `
            <div class="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-primary-300 transition-all group">
                <a href="${l}" target="_blank" class="text-xs font-bold text-gray-700 hover:text-primary-600 truncate flex-1 flex items-center gap-3 pr-4">
                    <i class="ph ph-link-bold text-primary-400"></i> ${l}
                </a>
                <button onclick="window.materialController.removeLink(${idx})" class="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95">
                    <i class="ph ph-trash font-bold"></i>
                </button>
            </div>
        `).join('');
    },

    handleAddLink: function() {
        const url = this.inputNewLink.value.trim();
        const conteudoId = this.inputId.value;
        if (!url) return;

        const material = window.store.getMaterial(conteudoId);
        material.links.push(url);
        window.store.updateMaterial(conteudoId, material.links, material.notas);
        
        this.inputNewLink.value = "";
        this.renderModalLinks(material.links);
        this.renderGrid();
        window.utils.showToast("Link adicionado!", "success");
    },

    removeLink: function(index) {
        const conteudoId = this.inputId.value;
        const material = window.store.getMaterial(conteudoId);
        material.links.splice(index, 1);
        window.store.updateMaterial(conteudoId, material.links, material.notas);
        
        this.renderModalLinks(material.links);
        this.renderGrid();
        window.utils.showToast("Link removido", "info");
    },

    fecharModal: function() {
        // Save notes before closing
        const conteudoId = this.inputId.value;
        const material = window.store.getMaterial(conteudoId);
        const notes = this.textareaNotes.value;
        
        window.store.updateMaterial(conteudoId, material.links, notes);
        
        this.modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            this.modal.classList.add('hidden');
            this.modal.classList.remove('flex');
            this.renderGrid();
        }, 200);
    }
};
