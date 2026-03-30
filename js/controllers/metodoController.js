window.metodoController = {
    quill: null,
    saveTimeout: null,

    /**
     * Inicializa o editor Quill se ainda não foi feito.
     */
    async init() {
        if (!this.quill) {
            this.initQuill();
            await this.load();
        }
    },

    initQuill() {
        const container = document.getElementById('editor-metodo');
        if (!container) return;

        this.quill = new Quill('#editor-metodo', {
            theme: 'snow',
            placeholder: 'Digite aqui seu método de estudos passo a passo...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'color': [] }, { 'background': [] }],
                    ['link', 'clean']
                ]
            }
        });

        // Escutar mudanças para auto-save
        this.quill.on('text-change', () => {
            this.handleAutoSave();
        });
    },

    async load() {
        try {
            const content = await window.metodoLogic.loadMetodo();
            if (content) {
                // Se o conteúdo for JSON (Delta), carregamos como tal, senão como HTML
                try {
                    const delta = JSON.parse(content);
                    this.quill.setContents(delta);
                } catch (e) {
                    this.quill.root.innerHTML = content;
                }
            }
        } catch (e) {
            window.utils.showToast("Erro ao carregar seu método: " + e.message, "error");
        }
    },

    handleAutoSave() {
        // Reset timeout
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        
        const statusEl = document.getElementById('metodo-status');
        if (statusEl) statusEl.style.opacity = '0.3'; // Indicando que está pendente

        this.saveTimeout = setTimeout(async () => {
            try {
                // Salvamos como string JSON do Delta para manter formatação perfeita
                const content = JSON.stringify(this.quill.getContents());
                await window.metodoLogic.saveMetodo(content);
                
                if (statusEl) {
                    statusEl.style.opacity = '1';
                    setTimeout(() => statusEl.style.opacity = '0', 2000); // Esconde após confirmar
                }
            } catch (e) {
                window.utils.showToast("Erro ao salvar automaticamente: " + e.message, "error");
            }
        }, 1500); // Salva após 1.5s de inatividade
    }
};
