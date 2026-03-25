window.authLogic = {
    login: function(username, password) {
        if (!username || !password) {
            throw new Error("Usuário e senha são obrigatórios.");
        }
        if (username.toLowerCase() === 'hyrton' && password === 'hyrtinho') {
            return true;
        }
        throw new Error("Credenciais inválidas. Tente novamente.");
    },
    
    logout: function() {
        return Promise.resolve();
    }
};
