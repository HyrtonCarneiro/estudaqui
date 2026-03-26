window.authLogic = {
    login: function(username, password) {
        if (!username || !password) {
            return Promise.reject(new Error("Usuário e senha são obrigatórios."));
        }
        
        // Map simple username to a firebase-compatible email
        let email = username;
        if (!username.includes('@')) {
            email = `${username.toLowerCase()}@concursosti.com`;
        }
        
        // Firebase Auth automatically persists the session in its own internal storage
        return firebase.auth().signInWithEmailAndPassword(email, password);
    },
    
    logout: function() {
        return firebase.auth().signOut();
    }
};
