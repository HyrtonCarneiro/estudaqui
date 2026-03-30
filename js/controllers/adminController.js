window.adminController = {
    init: function() {
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM: function() {
        this.form = document.getElementById('form-admin-user');
        this.inputUsername = document.getElementById('admin-input-username');
        this.inputPassword = document.getElementById('admin-input-password');
        this.userListContainer = document.getElementById('admin-user-list');
    },

    bindEvents: function() {
        if (this.form) {
            this.form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = this.inputUsername.value.trim();
                const pass = this.inputPassword.value.trim();

                if (!user || !pass) {
                    window.utils.showToast("Preencha todos os campos", "error");
                    return;
                }

                try {
                    await window.store.createUser(user, pass);
                    window.utils.showToast("Usuário criado com sucesso!", "success");
                    this.inputUsername.value = "";
                    this.inputPassword.value = "";
                } catch (err) {
                    window.utils.showToast("Erro ao criar usuário: " + err.message, "error");
                }
            });
        }
    },

    render: function() {
        if (!this.userListContainer) return;
        
        const settings = window.PLATFORM_SETTINGS;
        const users = window.store.getState().userList || [];
        
        if (users.length === 0) {
            this.userListContainer.innerHTML = `
                <tr>
                    <td colspan="3" class="py-8 text-center text-gray-400 italic text-xs">Nenhum usuário cadastrado além do admin.</td>
                </tr>
            `;
            return;
        }

        this.userListContainer.innerHTML = users.map(u => {
            const isRoot = u.username.toLowerCase() === settings.DEFAULT_ADMIN_USER;
            const roleLabel = u.role === settings.ROLES.SUPERADMIN ? 'Superadmin' : 
                             (u.role === settings.ROLES.ADMIN ? 'Admin' : 'Estudante');
            
            return `
            <tr class="hover:bg-gray-50/50 transition-colors">
                <td class="py-4 text-sm font-bold text-gray-700">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 text-[10px] font-black">
                            ${u.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div class="flex flex-col">
                            <span>${u.displayName || u.username}</span>
                            <span class="text-[9px] text-gray-400 font-medium">@${u.username}</span>
                        </div>
                        <span class="text-[8px] ${isRoot ? 'bg-primary-600 text-white' : 'bg-primary-100 text-primary-700'} px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">${roleLabel}</span>
                    </div>
                </td>
                <td class="py-4 text-xs font-mono text-gray-400">••••••••</td>
                <td class="py-4 text-right">
                    ${!isRoot ? `
                        <button onclick="window.adminController.deleteUser('${u.username}')" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-[0.95] flex items-center justify-center ml-auto">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    ` : '<i class="ph ph-lock text-gray-200"></i>'}
                </td>
            </tr>
            `;
        }).join('');
    },

    deleteUser: async function(username) {
        if (!confirm(`Tem certeza que deseja excluir o usuário "${username}"? Todos os dados dele serão mantidos no banco de dados, mas o acesso será removido.`)) return;
        
        try {
            await window.store.deleteUser(username);
            window.utils.showToast("Usuário removido da lista de acesso.", "info");
        } catch (err) {
            window.utils.showToast("Erro ao remover usuário: " + err.message, "error");
        }
    }
};

// Auto-init if DOM is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.adminController.init();
} else {
    document.addEventListener('DOMContentLoaded', () => window.adminController.init());
}
