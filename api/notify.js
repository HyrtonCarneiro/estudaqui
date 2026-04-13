const admin = require('firebase-admin');

function initFirebase() {
    if (!admin.apps.length) {
        const required = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
        const missing = required.filter(key => !process.env[key]);
        if (missing.length > 0) {
            throw new Error(`Missing environment variables: ${missing.join(', ')}`);
        }
        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                })
            });
        } catch (e) {
            throw new Error(`Firebase initialization failed: ${e.message}`);
        }
    }
}

module.exports = async (req, res) => {
    // Configura os headers de CORS para permitir que o app de qualquer lugar (ex: file://) chame a API
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Responde ao preflight da requisição OPTIONS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'GET') {
        try {
            const envCheck = {
                projectId: !!process.env.FIREBASE_PROJECT_ID,
                clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
                privateKeyLength: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 0
            };
            return res.status(200).json({ 
                version: "1.0.2", 
                status: "Operational", 
                envCheck 
            });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        initFirebase();
        const { token, title, body } = req.body;
        const host = req.headers.origin || 'https://concursosti.vercel.app';

        if (!token) {
            return res.status(400).json({ error: 'FCM Token ausente' });
        }

        const message = {
            data: {
                title: title || 'Estudaqui TI',
                body: body || 'Nova mensagem de sistema',
                click_action: host
            },
            token: token
        };

        const response = await admin.messaging().send(message);
        console.log('Mensagem enviada com sucesso:', response);
        
        return res.status(200).json({ success: true, messageId: response });
    } catch (error) {
        console.error('Erro ao enviar mensagem FCM:', error);
        // Retornamos 200 com success: false para que o cliente (PowerShell) consiga ler o JSON do erro sem travar
        return res.status(200).json({ 
            success: false, 
            error: error.message,
            code: error.code || 'unknown'
        });
    }
};
