window.linksController = {
    selectedCategoria: 'all',

    init: function() {
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM: function() {
        this.container = document.getElementById('container-links-uteis');
        this.filterContainer = document.getElementById('container-links-categorias-filtro');
        this.btnAdd = document.getElementById('btn-add-link-uteis');
        this.modal = document.getElementById('modal-link-uteis');
        this.modalContent = document.getElementById('modal-link-uteis-content');
        this.modalTitle = document.getElementById('modal-link-uteis-title');
        this.form = document.getElementById('form-link-uteis');
        this.inputId = document.getElementById('input-link-id');
        this.inputTitulo = document.getElementById('input-link-titulo');
        this.inputUrl = document.getElementById('input-link-url');
        this.inputCategoria = document.getElementById('input-link-categoria');
        this.datalistCategorias = document.getElementById('datalist-links-categorias');
        this.sugestoesContainer = document.getElementById('modal-link-categorias-sugestoes');
        this.btnSubmit = document.getElementById('btn-salvar-link-uteis');
    },

    bindEvents: function() {
        if (this.btnAdd) {
            this.btnAdd.addEventListener('click', () => this.abrirModal());
        }
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSalvar(e));
        }
    },

    selectCategoria: function(categoria) {
        this.selectedCategoria = categoria;
        this.render();
    },

    getCategoriasExistentes: function() {
        const links = window.store.getState().linksUteis || [];
        const categoriasSet = new Set();
        links.forEach(l => {
            const cat = (l.categoria && l.categoria.trim()) ? l.categoria.trim() : 'Geral';
            categoriasSet.add(cat);
        });
        if (categoriasSet.size === 0) {
            categoriasSet.add('Geral');
        }
        return Array.from(categoriasSet).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    },

    abrirModal: function(id = null, categoriaPreDefinida = null) {
        if (!this.modal) return;
        this.modal.classList.remove('hidden');
        this.modal.classList.add('flex');
        this.form.reset();

        const categorias = this.getCategoriasExistentes();

        // Populate datalist with existing categories
        if (this.datalistCategorias) {
            this.datalistCategorias.innerHTML = categorias.map(c => `<option value="${this.escapeHtml(c)}">`).join('');
        }

        // Quick suggestion chips
        if (this.sugestoesContainer) {
            this.sugestoesContainer.innerHTML = categorias.map(c => `
                <button type="button" onclick="document.getElementById('input-link-categoria').value = '${this.escapeJs(c)}'" 
                    class="text-[10px] font-bold text-gray-500 bg-gray-100 hover:bg-primary-50 hover:text-primary-600 px-2.5 py-1 rounded-lg transition-colors active:scale-95">
                    ${this.escapeHtml(c)}
                </button>
            `).join('');
        }

        if (id) {
            const links = window.store.getState().linksUteis || [];
            const link = links.find(l => l.id === id);
            if (link) {
                if (this.inputId) this.inputId.value = link.id;
                if (this.inputTitulo) this.inputTitulo.value = link.titulo || '';
                if (this.inputUrl) this.inputUrl.value = link.url || '';
                if (this.inputCategoria) this.inputCategoria.value = (link.categoria && link.categoria.trim()) ? link.categoria.trim() : 'Geral';
                if (this.modalTitle) this.modalTitle.textContent = "Editar Link";
                if (this.btnSubmit) this.btnSubmit.textContent = "ATUALIZAR LINK";
            }
        } else {
            if (this.inputId) this.inputId.value = '';
            const defaultCat = categoriaPreDefinida || (this.selectedCategoria !== 'all' ? this.selectedCategoria : 'Geral');
            if (this.inputCategoria) this.inputCategoria.value = defaultCat;
            if (this.modalTitle) this.modalTitle.textContent = "Adicionar Link";
            if (this.btnSubmit) this.btnSubmit.textContent = "SALVAR LINK";
        }

        requestAnimationFrame(() => {
            this.modalContent.classList.remove('scale-95', 'opacity-0');
            if (this.inputTitulo) this.inputTitulo.focus();
        });
    },

    fecharModal: function() {
        if (!this.modalContent) return;
        this.modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            this.modal.classList.add('hidden');
            this.modal.classList.remove('flex');
        }, 200);
    },

    handleSalvar: function(e) {
        e.preventDefault();
        try {
            const id = this.inputId ? this.inputId.value : '';
            const titulo = this.inputTitulo.value.trim();
            const url = this.inputUrl.value.trim();
            const categoria = (this.inputCategoria && this.inputCategoria.value.trim()) ? this.inputCategoria.value.trim() : 'Geral';

            if (!titulo || !url) {
                window.utils.showToast("Preencha título e URL.", "warning");
                return;
            }

            if (id) {
                window.store.updateLinkUteis(id, { titulo, url, categoria });
                window.utils.showToast("Link atualizado com sucesso!", "success");
            } else {
                window.store.addLinkUteis(titulo, url, categoria);
                window.utils.showToast("Link salvo com sucesso!", "success");
            }

            this.fecharModal();
            this.render();
        } catch (err) {
            window.utils.showToast(err.message, "error");
        }
    },

    remover: function(id) {
        if (confirm("Deseja remover este link?")) {
            window.store.removeLinkUteis(id);
            this.render();
            window.utils.showToast("Link removido.", "info");
        }
    },

    render: function() {
        if (!this.container) return;

        const rawLinks = window.store.getState().linksUteis || [];

        // Group links by category
        const groups = {};
        rawLinks.forEach(link => {
            const cat = (link.categoria && link.categoria.trim()) ? link.categoria.trim() : 'Geral';
            if (!groups[cat]) {
                groups[cat] = [];
            }
            groups[cat].push(link);
        });

        // Alphabetical sort of links inside each category
        Object.keys(groups).forEach(cat => {
            groups[cat].sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR', { sensitivity: 'base' }));
        });

        // Alphabetical sort of categories
        const categories = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

        // Validate selected category
        if (this.selectedCategoria !== 'all' && !categories.includes(this.selectedCategoria)) {
            this.selectedCategoria = 'all';
        }

        // Render filter tabs
        this.renderFilterTabs(categories, rawLinks.length, groups);

        // Render content
        this.container.innerHTML = "";

        if (rawLinks.length === 0) {
            this.container.innerHTML = `
                <div class="bg-white p-12 rounded-[2.5rem] border border-dashed border-gray-200 text-center">
                    <div class="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300">
                        <i class="ph ph-link-break text-4xl"></i>
                    </div>
                    <h3 class="text-lg font-bold text-gray-800 mb-2">Nenhum link salvo</h3>
                    <p class="text-gray-500 mb-6">Comece adicionando seus sites de estudo favoritos.</p>
                    <button onclick="window.linksController.abrirModal()" class="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-md text-xs uppercase tracking-wider active:scale-95">
                        <i class="ph-bold ph-plus-circle text-base"></i> Adicionar Primeiro Link
                    </button>
                </div>
            `;
            return;
        }

        const categoriesToRender = this.selectedCategoria === 'all' 
            ? categories 
            : [this.selectedCategoria];

        categoriesToRender.forEach(cat => {
            const linksInCat = groups[cat] || [];
            if (linksInCat.length === 0) return;

            const section = document.createElement('div');
            section.className = "category-group-section space-y-4";

            // Category Header
            const header = document.createElement('div');
            header.className = "flex items-center justify-between pb-3 border-b border-gray-100";
            header.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-black text-lg shadow-sm">
                        <i class="ph-bold ph-folder-notch-open"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2.5">
                            <h3 class="text-lg font-black text-gray-900 tracking-tight">${this.escapeHtml(cat)}</h3>
                            <span class="text-[11px] font-black text-primary-600 bg-primary-50 px-2.5 py-0.5 rounded-full">
                                ${linksInCat.length} ${linksInCat.length === 1 ? 'link' : 'links'}
                            </span>
                        </div>
                    </div>
                </div>
                <button onclick="window.linksController.abrirModal(null, '${this.escapeJs(cat)}')" class="text-xs font-bold text-gray-400 hover:text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 active:scale-95">
                    <i class="ph-bold ph-plus"></i> Novo neste grupo
                </button>
            `;
            section.appendChild(header);

            // Cards Grid
            const grid = document.createElement('div');
            grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6";

            linksInCat.forEach(link => {
                grid.appendChild(this.createCard(link));
            });

            section.appendChild(grid);
            this.container.appendChild(section);
        });
    },

    renderFilterTabs: function(categories, totalCount, groups) {
        if (!this.filterContainer) return;
        if (categories.length === 0 && totalCount === 0) {
            this.filterContainer.innerHTML = "";
            return;
        }

        let html = `
            <button onclick="window.linksController.selectCategoria('all')" 
                class="px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 whitespace-nowrap active:scale-95 ${this.selectedCategoria === 'all' ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-100 hover:bg-gray-50'}">
                <i class="ph-bold ph-squares-four text-sm"></i>
                <span>Todas</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${this.selectedCategoria === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}">${totalCount}</span>
            </button>
        `;

        categories.forEach(cat => {
            const isSelected = this.selectedCategoria === cat;
            const count = (groups[cat] || []).length;
            html += `
                <button onclick="window.linksController.selectCategoria('${this.escapeJs(cat)}')" 
                    class="px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 whitespace-nowrap active:scale-95 ${isSelected ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-100 hover:bg-gray-50'}">
                    <i class="ph-bold ph-folder text-sm"></i>
                    <span>${this.escapeHtml(cat)}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}">${count}</span>
                </button>
            `;
        });

        this.filterContainer.innerHTML = html;
    },

    createCard: function(link) {
        const card = document.createElement('div');
        card.className = "bg-white p-5 rounded-[2rem] border border-gray-100 hover:border-primary-500 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 group relative flex items-center gap-4 cursor-pointer";

        // Icon Logic based on common study sites and protocols
        let iconClass = "ph ph-link";
        let iconBg = "bg-gray-100 text-gray-500";

        const urlLower = (link.url || '').toLowerCase();
        const isLocal = /^[a-zA-Z]:[\\\/]/.test(link.url || '');

        if (isLocal) {
            iconClass = "ph-bold ph-folder-open";
            iconBg = "bg-amber-50 text-amber-600";
        } else if (urlLower.includes('notebooklm')) {
            iconClass = "ph-bold ph-brain";
            iconBg = "bg-purple-50 text-purple-600";
        } else if (urlLower.includes('google')) {
            iconClass = "ph-bold ph-google-logo";
            iconBg = "bg-blue-50 text-blue-500";
        } else if (urlLower.includes('youtube')) {
            iconClass = "ph-bold ph-youtube-logo";
            iconBg = "bg-red-50 text-red-500";
        } else if (urlLower.includes('notion')) {
            iconClass = "ph-bold ph-notebook";
            iconBg = "bg-gray-900 text-white";
        } else if (urlLower.includes('concurso') || urlLower.includes('tec') || urlLower.includes('qconcursos') || urlLower.includes('grancursos') || urlLower.includes('estrategia')) {
            iconClass = "ph-bold ph-exam";
            iconBg = "bg-emerald-50 text-emerald-600";
        } else if (urlLower.includes('github')) {
            iconClass = "ph-bold ph-github-logo";
            iconBg = "bg-gray-100 text-gray-800";
        } else if (urlLower.includes('drive') || urlLower.includes('onedrive')) {
            iconClass = "ph-bold ph-cloud";
            iconBg = "bg-blue-50 text-blue-600";
        } else if (urlLower.includes('hotmart') || urlLower.includes('kiwify')) {
            iconClass = "ph-bold ph-graduation-cap";
            iconBg = "bg-orange-50 text-orange-600";
        }

        const finalHref = isLocal ? `abrir-pasta:${link.url}` : link.url;
        const displayUrl = isLocal ? link.url : link.url.replace(/^https?:\/\//i, '').split('/')[0];
        const categoriaNome = (link.categoria && link.categoria.trim()) ? link.categoria.trim() : 'Geral';

        card.innerHTML = `
            <a href="${this.escapeHtml(finalHref)}" ${isLocal ? '' : 'target="_blank" rel="noopener noreferrer"'} class="absolute inset-0 rounded-[2rem] z-0" title="Abrir ${this.escapeHtml(link.titulo)}"></a>
            <div class="w-12 h-12 ${iconBg} rounded-2xl flex items-center justify-center text-xl shrink-0 transition-transform group-hover:scale-110 z-10 pointer-events-none">
                <i class="${iconClass}"></i>
            </div>
            <div class="flex-1 min-w-0 z-10 pointer-events-none">
                <h4 class="text-sm font-black text-gray-900 truncate mb-0.5" title="${this.escapeHtml(link.titulo)}">${this.escapeHtml(link.titulo)}</h4>
                <p class="text-[11px] font-bold text-primary-600 truncate mb-1">${this.escapeHtml(displayUrl)}</p>
                <span class="inline-flex items-center gap-1 text-[9px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                    <i class="ph ph-tag text-[10px]"></i> ${this.escapeHtml(categoriaNome)}
                </span>
            </div>
            <div class="flex items-center gap-1 z-20 relative opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" onclick="event.stopPropagation(); window.linksController.abrirModal('${link.id}')" title="Editar Link" class="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 hover:bg-primary-50 hover:text-primary-600 transition-all active:scale-95 flex items-center justify-center">
                    <i class="ph-bold ph-pencil-simple text-sm"></i>
                </button>
                <button type="button" onclick="event.stopPropagation(); window.linksController.remover('${link.id}')" title="Excluir Link" class="w-8 h-8 rounded-lg bg-gray-50 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 flex items-center justify-center">
                    <i class="ph-bold ph-trash text-sm"></i>
                </button>
            </div>
        `;

        return card;
    },

    escapeHtml: function(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    escapeJs: function(text) {
        if (!text) return '';
        return String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }
};
