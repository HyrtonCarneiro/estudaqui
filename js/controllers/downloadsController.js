window.downloadsController = {
    render: function() {
    },

    toggleAnkiInstructions: function() {
        const el = document.getElementById('anki-instructions-area');
        if (!el) return;
        
        if (el.classList.contains('hidden')) {
            el.classList.remove('hidden');
            el.classList.add('animate-fade-in');
        } else {
            el.classList.add('hidden');
        }
    },

    copyAnkiConfig: function() {
        const config = {
            "webBindAddress": "0.0.0.0",
            "webBindPort": 8765,
            "webCorsOriginList": ["*"],
            "webExternalOrigins": ["*"]
        };
        const text = JSON.stringify(config, null, 4);
        navigator.clipboard.writeText(text).then(() => {
            window.utils.showToast("Configuração copiada!", "success");
        }).catch(err => {
            console.error('Erro ao copiar: ', err);
            window.utils.showToast("Erro ao copiar. Selecione o texto manualmente.", "error");
        });
    },

    downloadProtocoloPastas: function() {
        const regContent = 
`Windows Registry Editor Version 5.00\r\n` +
`\r\n` +
`[HKEY_CURRENT_USER\\Software\\Classes\\abrir-pasta]\r\n` +
`@="URL:Abrir Pasta Protocol"\r\n` +
`\"URL Protocol\"=\"\"\r\n` +
`\r\n` +
`[HKEY_CURRENT_USER\\Software\\Classes\\abrir-pasta\\shell]\r\n` +
`\r\n` +
`[HKEY_CURRENT_USER\\Software\\Classes\\abrir-pasta\\shell\\open]\r\n` +
`\r\n` +
`[HKEY_CURRENT_USER\\Software\\Classes\\abrir-pasta\\shell\\open\\command]\r\n` +
`@=\"powershell.exe -WindowStyle Hidden -Command \\\"Start-Process -FilePath ([System.Uri]::UnescapeDataString('%1') -replace '^abrir-pasta:', '')\\\"\"\r\n`;

        this._downloadFile('ativar-pastas.reg', regContent, 'text/plain');
        window.utils.showToast("Arquivo baixado! Dê duplo clique.", "success");
    },

    /**
     * Gera o script Python customizado para o Anki do usuário
     */
    downloadAnkiAddon: async function() {
        const state = window.store.getState();
        if (!state.isAuthenticated || !state.currentUser) {
            window.utils.showToast("Faça login para baixar o Add-on.", "error");
            return;
        }

        let userData = {};
        try {
            const userDoc = await window.db.collection('users').doc(state.currentUser).get();
            if (userDoc.exists) userData = userDoc.data();
        } catch(e) {}

        let monitorKey = userData.ankiMonitorKey;
        if (!monitorKey) {
            monitorKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            await window.db.collection('users').doc(state.currentUser).update({ ankiMonitorKey: monitorKey });
        }

        const pyScript = `import json
import urllib.request
import threading
import datetime
from aqt import mw, gui_hooks

# === CONFIGURAÇÃO AUTOMÁTICA ===
ENDPOINT = "https://concursosti.vercel.app/api/anki-sync/"
USERNAME = "${state.currentUser}"
MONITOR_KEY = "${monitorKey}"
# ===============================

_UNIT_SEP = chr(31)  # \\x1f - separador de tags do Anki

def get_anki_data():
    """Coleta todos os dados do Anki. DEVE rodar na main thread (Qt)."""
    try:
        col = mw.col
        if not col:
            return None

        # 1. Contagens básicas
        new_cnt = len(col.find_cards("is:new"))
        learn_cnt = len(col.find_cards("is:learn"))
        review_cnt = len(col.find_cards("is:review is:due"))
        
        # 2. Heatmap (últimos 365 dias)
        heatmap = col.db.all("""
            select date(id/1000, 'unixepoch', 'localtime') as day, count() 
            from revlog 
            where id > (strftime('%s','now','-365 days') * 1000)
            group by day 
            order by day desc
        """)
        
        # 3. Forecast (próximos 30 dias)
        forecast = []
        for i in range(30):
            query = "prop:due=0" if i == 0 else f"prop:due={i}"
            cnt = len(col.find_cards(query))
            
            d = datetime.date.today() + datetime.timedelta(days=i)
            if i == 0: label = "Hoje"
            elif i == 1: label = "Amanhã"
            else: label = f"{d.day}/{d.month}"
            
            forecast.append({"day": label, "count": cnt})

        # 4. Syllabus e Tag Lapses (Stats por Tag)
        syllabus = {}
        tag_lapses = {}
        cards = col.db.all("SELECT c.did, n.tags as ntags, c.lapses, c.ivl, c.queue, c.type FROM cards c JOIN notes n ON c.nid = n.id")
        system_tags = {'leech', 'marked'}
        
        for did, ntags, lapses, ivl, queue, ctype in cards:
            if not ntags: ntags = ""
            tag_list = ntags.replace(_UNIT_SEP, ' ').strip().split()
            tags = [t.replace('_', ' ').replace('-', ' ').capitalize() for t in tag_list if t.lower() not in system_tags]
            subjects = tags if tags else []
            if not subjects:
                dname = col.decks.name(did)
                if dname and dname != 'Default':
                    subjects.append(dname.split('::')[0])
            
            for clean in subjects:
                if clean not in syllabus:
                    syllabus[clean] = {"new": 0, "young": 0, "mature": 0, "total": 0, "lapses": 0}
                s = syllabus[clean]
                s["total"] += 1
                s["lapses"] += (lapses or 0)
                if queue >= 0:
                    if ctype == 0: s["new"] += 1
                    elif ivl >= 21: s["mature"] += 1
                    else: s["young"] += 1
                if lapses and lapses > 0:
                    tag_lapses[clean] = tag_lapses.get(clean, 0) + lapses

        return {
            "counts": {"new": new_cnt, "learn": learn_cnt, "review": review_cnt},
            "heatmap": heatmap,
            "forecast": forecast,
            "syllabus": syllabus,
            "tag_lapses": tag_lapses
        }
    except Exception as e:
        print(f"Erro ao coletar dados Anki: {e}")
        return None

def _send_http(all_data):
    """Envia dados para a nuvem. Roda em background thread."""
    try:
        data = {
            "username": USERNAME, 
            "key": MONITOR_KEY, 
            "newCount": all_data["counts"]["new"], 
            "learnCount": all_data["counts"]["learn"], 
            "reviewCount": all_data["counts"]["review"],
            "heatmapData": all_data["heatmap"],
            "forecastData": all_data["forecast"],
            "syllabusData": all_data["syllabus"],
            "tagLapses": all_data["tag_lapses"]
        }
        
        req = urllib.request.Request(ENDPOINT)
        req.add_header('Content-Type', 'application/json; charset=utf-8')
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AnkiSync/1.0')
        jsondata = json.dumps(data).encode('utf-8')
        
        with urllib.request.urlopen(req, jsondata, timeout=10) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            if res_data.get('success'):
                print("Cloud Sync: Sucesso")
            else:
                print(f"Erro Cloud: {res_data.get('error')}")
    except Exception as e:
        print(f"Erro ao sincronizar nuvem: {e}")

def _collect_and_send():
    """Coleta dados na main thread e envia HTTP em background thread."""
    all_data = get_anki_data()
    if all_data:
        threading.Thread(target=_send_http, args=(all_data,), daemon=True).start()

def sync_to_cloud():
    """Agenda a coleta na main thread do Qt (thread-safe)."""
    if mw.col:
        mw.taskman.run_on_main(_collect_and_send)

_debounce_timer = None

def on_card_answered(reviewer, card, ease):
    global _debounce_timer
    if _debounce_timer is not None:
        _debounce_timer.cancel()
    _debounce_timer = threading.Timer(2.0, sync_to_cloud)
    _debounce_timer.start()

def on_state_changed(next_state, prev_state):
    if prev_state == "review":
        sync_to_cloud()

# Ganchos do Anki:
# 1. Ao responder cada card (debounced 2s)
gui_hooks.reviewer_did_answer_card.append(on_card_answered)
# 2. Ao concluir ou sair da sessao de estudo
gui_hooks.state_did_change.append(on_state_changed)
# 3. Ao sincronizar com AnkiWeb
gui_hooks.sync_did_finish.append(sync_to_cloud)
# 4. Ao abrir o Anki
gui_hooks.main_window_did_init.append(sync_to_cloud)
`;

        if (typeof JSZip !== 'undefined') {
            try {
                const zip = new JSZip();
                zip.file('__init__.py', pyScript);
                zip.file('manifest.json', JSON.stringify({
                    name: "Concursos Hyrtinho Sync",
                    package: "concursos_hyrtinho"
                }, null, 4));

                const blob = await zip.generateAsync({ type: "blob" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'concursos_hyrtinho.ankiaddon';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                window.utils.showToast("Pacote .ankiaddon baixado com sucesso!", "success");
                return;
            } catch(err) {
                console.error("Erro ao gerar zip:", err);
            }
        }

        this._downloadFile('__init__.py', pyScript, 'text/x-python');
        window.utils.showToast("Add-on baixado (__init__.py)!", "success");
    },

    /**
     * Ferramenta de limpeza para remover o monitor antigo do PC
     */
    downloadCleanupTool: function() {
        const batContent = `@echo off
chcp 65001 >nul
title Faxina Anki Monitor
echo ========================================================
echo        FERRAMENTA DE LIMPEZA - Concursos Hyrtinho
echo ========================================================
echo:
echo 1. Encerrando processos antigos...
powershell -Command "$procs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*anki-monitor*' }; foreach ($p in $procs) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }"
taskkill /F /IM powershell.exe /FI "WINDOWTITLE eq *AnkiMonitor*" /T 2>nul
taskkill /F /IM wscript.exe /FI "COMMANDLINE eq *anki-monitor*" /T 2>nul

echo 2. Removendo arquivos de inicialização...
set "startupDir=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"
if exist "%startupDir%\\anki-monitor.vbs" del /F /Q "%startupDir%\\anki-monitor.vbs"

echo 3. Removendo pasta do monitor...
set "installDir=%USERPROFILE%\\AnkiMonitor"
if exist "%installDir%" (
    rd /S /Q "%installDir%"
)

echo:
echo ========================================================
echo       LIMPEZA CONCLUIDA! O entulho foi removido.
echo ========================================================
pause`;
        
        this._downloadFile('Limpar-Monitor-Antigo.bat', batContent, 'application/x-bat');
        window.utils.showToast("Ferramenta de limpeza baixada!", "success");
    },

    _downloadFile: function(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
};
