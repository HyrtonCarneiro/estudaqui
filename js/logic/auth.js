window.authLogic = {
    login: async function(username, password) {
        if (!username || !password) return false;
        
        const settings = window.PLATFORM_SETTINGS;
        const userLower = username.toLowerCase();
        
        try {
            // Initial Fallback for Default Admin if Firestore is not yet seeded or offline
            if (userLower === settings.DEFAULT_ADMIN_USER && password === settings.DEFAULT_ADMIN_PASSWORD) {
                return { 
                    username: userLower, 
                    displayName: settings.DEFAULT_ADMIN_DISPLAY_NAME,
                    role: settings.ROLES.SUPERADMIN 
                };
            }

            // Fetch central user list from Firestore
            const doc = await window.db.collection(settings.USERS_COLLECTION).doc(settings.SYSTEM_USER_DOC).get();
            if (doc.exists) {
                const userList = doc.data().userList || [];
                const user = userList.find(u => u.username.toLowerCase() === userLower && u.password === password);
                return user || false;
            }
            
            return false;
        } catch (err) {
            console.error("Login Error:", err);
            // If offline or first time, still allow Default Admin
            if (userLower === settings.DEFAULT_ADMIN_USER && password === settings.DEFAULT_ADMIN_PASSWORD) {
                return { 
                    username: userLower, 
                    displayName: settings.DEFAULT_ADMIN_DISPLAY_NAME,
                    role: settings.ROLES.SUPERADMIN 
                };
            }
            return false;
        }
    },
    
    logout: async function() {
        if (window.store) window.store.setAuth(false);
        return true;
    }
};
