const admin = require('firebase-admin');

function initFirebase() {
    if (!admin.apps.length) {
        if (!process.env.FIREBASE_PRIVATE_KEY) {
            throw new Error("FIREBASE_PRIVATE_KEY is missing in environment variables");
        }
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            })
        });
    }
    return admin.firestore();
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const db = initFirebase();
        const { user, key } = req.query;

        if (!user || !key) {
            return res.status(400).json({ error: 'Parâmetros ausentes' });
        }

        const userDoc = await db.collection('users').doc(user).get();
        
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const userData = userDoc.data();
        
        // Verifica se a chave do monitor bate (segurança básica)
        if (!userData.ankiMonitorKey || userData.ankiMonitorKey !== key) {
            return res.status(403).json({ error: 'Chave de monitor inválida' });
        }

        // Tenta buscar o token do campo fcmToken ou do sub-campo state.fcmToken
        const token = userData.fcmToken || (userData.state ? userData.state.fcmToken : null);

        if (!token) {
            return res.status(404).json({ error: 'Token não registrado' });
        }

        return res.status(200).json({ token: token });
    } catch (error) {
        console.error('Erro ao buscar token:', error);
        return res.status(500).json({ error: "Erro interno: " + error.message });
    }
};
