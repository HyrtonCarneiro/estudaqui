window.metodoController = {
    instances: {}, // {segunda: quillInstance, ...}
    saveTimeout: null,
    days: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'fds'],

    /**
     * Inicializa os 6 editores Quill.
     */
    async init() {
        if (Object.keys(this.instances).length === 0) {
            this.initEditors();
            await this.load();
        }
    },

    initEditors() {
        this.days.forEach(day => {
            const containerId = `editor-${day}`;
            const container = document.getElementById(containerId);
            if (!container) return;

            this.instances[day] = new Quill(`#${containerId}`, {
                theme: 'snow',
                placeholder: 'O que estudar hoje?',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline', 'link'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['clean']
                    ]
                }
            });

            // Tornar links clicáveis (abrir em nova aba)
            this.instances[day].root.addEventListener('click', (ev) => {
                const link = ev.target.closest('a');
                if (link && link.href) {
                    ev.preventDefault();
                    window.open(link.href, '_blank');
                }
            });

            // Escutar mudanças em cada editor
            this.instances[day].on('text-change', () => {
                this.handleAutoSave();
            });
        });
    },

    async load() {
        try {
            const data = await window.metodoLogic.loadMetodo();
            
            this.days.forEach(day => {
                const content = data[day];
                if (content && this.instances[day]) {
                    try {
                        const delta = JSON.parse(content);
                        this.instances[day].setContents(delta);
                    } catch (e) {
                        this.instances[day].root.innerHTML = content;
                    }
                }
            });
        } catch (e) {
            window.utils.showToast("Erro ao carregar seu método: " + e.message, "error");
        }
    },

    handleAutoSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        
        const statusEl = document.getElementById('metodo-status');
        if (statusEl) {
            statusEl.classList.remove('opacity-0');
            statusEl.style.opacity = '0.3';
        }

        this.saveTimeout = setTimeout(async () => {
            try {
                // Coletar conteúdo de todos os editores
                const fullContent = {};
                this.days.forEach(day => {
                    if (this.instances[day]) {
                        fullContent[day] = JSON.stringify(this.instances[day].getContents());
                    }
                });

                await window.metodoLogic.saveMetodo(fullContent);
                
                if (statusEl) {
                    statusEl.style.opacity = '1';
                    setTimeout(() => statusEl.style.opacity = '0', 2000);
                }
            } catch (e) {
                window.utils.showToast("Erro ao salvar: " + e.message, "error");
            }
        }, 2000); // 2 segundos de buffer para 6 editores
    }
};
