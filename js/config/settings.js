/**
 * PLATFORM_SETTINGS - Central configuration to avoid hardcoding strings.
 * All user IDs in Firestore will be normalized to lowercase.
 */
window.PLATFORM_SETTINGS = {
    DEFAULT_ADMIN_USER: 'hyrton', // Lowercase ID
    DEFAULT_ADMIN_DISPLAY_NAME: 'Hyrton Carneiro',
    DEFAULT_ADMIN_PASSWORD: 'hyrtinho',
    SYSTEM_USER_DOC: '_admin_',
    SHARED_EDITAIS_DOC: 'editais',
    SHARED_COLLECTION: 'shared',
    USERS_COLLECTION: 'users',
    
    // Roles definition
    ROLES: {
        SUPERADMIN: 'superadmin',
        ADMIN: 'admin',
        USER: 'user'
    }
};
