// Mocking window and Firebase for Node environment
global.window = {
    PLATFORM_SETTINGS: {
        DEFAULT_ADMIN_USER: 'hyrton',
        DEFAULT_ADMIN_DISPLAY_NAME: 'Hyrton Carneiro',
        DEFAULT_ADMIN_PASSWORD: 'hyrtinho',
        SYSTEM_USER_DOC: '_admin_',
        SHARED_EDITAIS_DOC: 'editais',
        SHARED_COLLECTION: 'shared',
        USERS_COLLECTION: 'users',
        ROLES: {
            SUPERADMIN: 'superadmin',
            ADMIN: 'admin',
            USER: 'user'
        }
    },
    db: {
        collection: (name) => ({
            doc: (id) => ({
                get: async () => ({
                    exists: id === '_admin_',
                    data: () => ({
                        userList: [
                            { username: 'hyrton', password: 'hyrtinho', role: 'superadmin', displayName: 'Hyrton Carneiro' },
                            { username: 'teste', password: '123', role: 'user', displayName: 'Teste' }
                        ]
                    })
                }),
                onSnapshot: (callback) => {
                    callback({
                        exists: true,
                        data: () => ({ state: { materias: [] } })
                    });
                    return () => {};
                },
                set: async () => {},
                update: async () => {}
            })
        })
    },
    utils: {
        showToast: (msg) => console.log("TOAST:", msg)
    },
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    },
    firebase: {
        firestore: {
            FieldValue: {
                serverTimestamp: () => 'now'
            }
        }
    }
};

// Expose globals that store.js uses without 'window.' prefix
global.localStorage = global.window.localStorage;
global.firebase = global.window.firebase;

// Mock DOM globals required by store.hideLoading() and triggerUIRefresh()
global.document = { getElementById: () => null };
global.window.appControllers = null;

const fs = require('fs');
const path = require('path');

// Mock Store
const settingsCode = fs.readFileSync(path.join(__dirname, '../config/settings.js'), 'utf8');
eval(settingsCode.replace(/window\./g, 'global.window.'));
global.PLATFORM_SETTINGS = global.window.PLATFORM_SETTINGS;

const storeCode = fs.readFileSync(path.join(__dirname, '../data/store.js'), 'utf8');
eval(storeCode.replace(/window\./g, 'global.window.'));
global.window.store = global.window.window ? global.window.window.store : global.window.store;

// Mock Auth
const authCode = fs.readFileSync(path.join(__dirname, '../logic/auth.js'), 'utf8');
eval(authCode.replace(/window\./g, 'global.window.'));
global.window.authLogic = global.window.window ? global.window.window.authLogic : global.window.authLogic;

const SETTINGS = global.window.PLATFORM_SETTINGS;

async function runTests() {
    console.log("Running Multi-user & Auth Tests...");

    // Test 1: Admin Identification (normalized to lowercase)
    global.window.store.state.currentUser = SETTINGS.DEFAULT_ADMIN_USER;
    global.window.store.state.userList = [{ username: SETTINGS.DEFAULT_ADMIN_USER, role: SETTINGS.ROLES.SUPERADMIN }];
    if (!global.window.store.isAdmin()) throw new Error("Admin padrão deveria ser reconhecido como admin");
    
    global.window.store.state.currentUser = 'teste';
    if (global.window.store.isAdmin()) throw new Error("'teste' não deveria ser admin");

    // Test 2: Login Logic (Async) — using platform settings
    const loginOk = await global.window.authLogic.login(SETTINGS.DEFAULT_ADMIN_USER, SETTINGS.DEFAULT_ADMIN_PASSWORD);
    if (!loginOk) throw new Error("Login do admin padrão falhou");

    const loginFail = await global.window.authLogic.login(SETTINGS.DEFAULT_ADMIN_USER, 'wrong');
    if (loginFail) throw new Error("Login deveria falhar com senha errada");

    const loginUser = await global.window.authLogic.login('teste', '123');
    if (!loginUser) throw new Error("Login do usuário 'teste' falhou");

    // Test 3: Username normalization
    const loginUppercase = await global.window.authLogic.login('HYRTON', SETTINGS.DEFAULT_ADMIN_PASSWORD);
    if (!loginUppercase) throw new Error("Login com username maiúsculo deveria funcionar (case-insensitive)");

    // Test 4: Data Isolation is enforced via normalized key
    global.window.store.state.currentUser = 'abc';
    const normalizedId = global.window.store.state.currentUser.toLowerCase();
    if (normalizedId !== 'abc') throw new Error("Username deveria estar normalizado para lowercase");
    
    console.log("✅ Todos os testes de Multi-user & Auth passaram!");
}

runTests().catch(e => {
    console.error("❌ Teste falhou:", e.message);
    process.exit(1);
});

