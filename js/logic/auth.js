window.authLogic = {
    login: async function(username, password) {
        if (!username || !password) return false;
        
        const userLower = username.toLowerCase();
        
        try {
            // Initial Fallback for Hyrton if Firestore is not yet seeded or offline
            if (userLower === 'hyrton' && password === 'hyrtinho') {
                return { username: 'Hyrton' };
            }

            // Fetch central user list from Firestore
            const doc = await window.db.collection('users').doc('_admin_').get();
            if (doc.exists) {
                const userList = doc.data().userList || [];
                const user = userList.find(u => u.username.toLowerCase() === userLower && u.password === password);
                return user || false;
            }
            
            return false;
        } catch (err) {
            console.error("Login Error:", err);
            // If offline or first time, still allow Hyrton
            if (userLower === 'hyrton' && password === 'hyrtinho') {
                return { username: 'Hyrton' };
            }
            return false;
        }
    },
    
    logout: async function() {
        if (window.store) window.store.setAuth(false);
        return true;
    }
};
