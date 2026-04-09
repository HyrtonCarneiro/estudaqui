window.downloadsController = {
    render: function() {
        // Controller is render-ready; the HTML is statically defined in index.html
        // This function is called when navigating to the Downloads page
    },

    /**
     * Gera e baixa o arquivo .reg para ativar o protocolo abrir-pasta
     */
    downloadProtocoloPastas: function() {
        const regContent = 
`Windows Registry Editor Version 5.00\r\n` +
`\r\n` +
`[HKEY_CURRENT_USER\\Software\\Classes\\abrir-pasta]\r\n` +
`@="URL:Abrir Pasta Protocol"\r\n` +
`"URL Protocol"=""\r\n` +
`\r\n` +
`[HKEY_CURRENT_USER\\Software\\Classes\\abrir-pasta\\shell]\r\n` +
`\r\n` +
`[HKEY_CURRENT_USER\\Software\\Classes\\abrir-pasta\\shell\\open]\r\n` +
`\r\n` +
`[HKEY_CURRENT_USER\\Software\\Classes\\abrir-pasta\\shell\\open\\command]\r\n` +
`@="powershell.exe -WindowStyle Hidden -Command \\"Start-Process -FilePath ([System.Uri]::UnescapeDataString('%1') -replace '^abrir-pasta:', '')\\""\r\n`;

        this._downloadFile('ativar-pastas.reg', regContent, 'text/plain');
        window.utils.showToast("Arquivo baixado! Dê duplo clique e confirme 'Sim'.", "success");
    },

    /**
     * Gera e baixa o Monitor Anki (pacote .bat auto-instalador)
     * O .bat cria os arquivos necessários e configura a inicialização com o Windows
     */
    downloadMonitorAnki: async function() {
        // 1. Buscar o token FCM do Firestore para embuti-lo no instalador
        const state = window.store.getState();
        if (!state.isAuthenticated || !state.currentUser) {
            window.utils.showToast("Faça login para baixar o monitor.", "error");
            return;
        }

        let fcmToken = null;
        try {
            const userDoc = await window.db.collection('users').doc(state.currentUser).get();
            if (userDoc.exists && userDoc.data().fcmToken) {
                fcmToken = userDoc.data().fcmToken;
            }
        } catch(e) {
            console.error("Erro ao buscar token:", e);
        }

        if (!fcmToken) {
            window.utils.showToast("Ative as notificações no celular primeiro (Dashboard).", "error");
            return;
        }

        // 2. Gerar o conteúdo do .bat instalador
        // O Batch cria a pasta, os arquivos PS1 e VBS, o config JSON, e o atalho na Startup
        const batContent = this._gerarInstaladorBat(fcmToken);
        
        this._downloadFile('Instalar-Monitor-Anki.bat', batContent, 'application/x-bat');
        window.utils.showToast("Instalador baixado! Clique com direito > Executar como Administrador NÃO é necessário. Basta dar duplo clique.", "success");
    },

    _gerarInstaladorBat: function(fcmToken) {
        // O Batch instala tudo automaticamente:
        // - Cria pasta %USERPROFILE%\AnkiMonitor
        // - Cria o script PowerShell
        // - Cria o config.json com o token
        // - Cria um .vbs wrapper para executar sem janela
        // - Cria atalho na pasta Startup do Windows
        return `@echo off
chcp 65001 >nul
title Instalando Monitor Anki...
echo.
echo ============================================
echo   INSTALADOR DO MONITOR ANKI - ConcursosTI
echo ============================================
echo.

set "INSTALL_DIR=%USERPROFILE%\\AnkiMonitor"

echo [1/5] Criando pasta de instalacao...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo [2/5] Criando script do monitor...
(
echo $PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
echo $configFile = Join-Path $PSScriptRoot "config.json"
echo $logFile = Join-Path $PSScriptRoot "monitor.log"
echo.
echo function Log-Msg($msg^) {
echo     $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
echo     Add-Content -Path $logFile -Value "[$ts] $msg"
echo }
echo.
echo if (-not (Test-Path $configFile^)^) {
echo     Log-Msg "ERRO: config.json nao encontrado."
echo     exit
echo }
echo.
echo Log-Msg "Monitor Anki iniciado."
echo.
echo while ($true^) {
echo     try {
echo         $config = Get-Content $configFile ^| ConvertFrom-Json
echo         $hoje = Get-Date -Format "yyyy-MM-dd"
echo.
echo         if ($config.lastNotifiedDate -ne $hoje^) {
echo             $bodyAnki = @{ action = 'findCards'; version = 6; params = @{ query = 'is:due' } } ^| ConvertTo-Json
echo             $resp = Invoke-RestMethod -Uri 'http://localhost:8765' -Method Post -Body $bodyAnki -ErrorAction Stop
echo             $count = $resp.result.Count
echo.
echo             if ($count -gt 0^) {
echo                 Log-Msg "Detectados $count cards. Enviando push..."
echo                 $bodyPush = @{ token = $config.fcmToken; title = 'Estudos Pendentes'; body = "Voce tem $count cards pendentes no Anki!" } ^| ConvertTo-Json
echo                 Invoke-RestMethod -Uri "https://concursosti.vercel.app/api/notify" -Method Post -Body $bodyPush -ContentType "application/json" -ErrorAction Stop
echo                 Log-Msg "Push enviado com sucesso!"
echo                 $config.lastNotifiedDate = $hoje
echo                 $config ^| ConvertTo-Json ^| Set-Content $configFile
echo             } else {
echo                 Log-Msg "Nenhum card pendente."
echo             }
echo         }
echo     } catch {
echo         # Anki fechado ou sem internet. Tentara novamente no proximo ciclo.
echo     }
echo     Start-Sleep -Seconds 1800
echo }
) > "%INSTALL_DIR%\\anki-monitor.ps1"

echo [3/5] Criando arquivo de configuracao...
(
echo {
echo   "fcmToken": "${fcmToken}",
echo   "lastNotifiedDate": ""
echo }
) > "%INSTALL_DIR%\\config.json"

echo [4/5] Criando inicializador silencioso...
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ ^& Replace(WScript.ScriptFullName, WScript.ScriptName, ""^) ^& "anki-monitor.ps1""", 0, False
) > "%INSTALL_DIR%\\anki-monitor.vbs"

echo [5/5] Adicionando a inicializacao do Windows...
copy "%INSTALL_DIR%\\anki-monitor.vbs" "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\anki-monitor.vbs" >nul 2>&1

echo.
echo ============================================
echo   INSTALACAO CONCLUIDA COM SUCESSO!
echo ============================================
echo.
echo   Pasta: %INSTALL_DIR%
echo   O monitor sera iniciado automaticamente
echo   quando voce ligar o computador.
echo.
echo   Para testar agora, abra o Anki e
echo   execute o arquivo anki-monitor.vbs
echo.
pause
`;
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
