window.downloadsController = {
    render: function() {
    },

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
        window.utils.showToast("Arquivo baixado! Dê duplo clique.", "success");
    },

    downloadMonitorAnki: async function() {
        const state = window.store.getState();
        if (!state.isAuthenticated || !state.currentUser) {
            window.utils.showToast("Faça login para baixar o monitor.", "error");
            return;
        }

        let fcmToken = state.fcmToken;
        if (!fcmToken) {
            try {
                const userDoc = await window.db.collection('users').doc(state.currentUser).get();
                if (userDoc.exists) {
                    fcmToken = userDoc.data().fcmToken || (userDoc.data().state ? userDoc.data().state.fcmToken : null);
                }
            } catch(e) { console.error(e); }
        }

        if (!fcmToken) {
            window.utils.showToast("Ative as notificações no celular primeiro (Dashboard).", "error");
            return;
        }

        try {
            const batContent = this._gerarInstaladorBat(fcmToken);
            this._downloadFile('Instalar-Monitor-Anki.bat', batContent, 'application/x-bat');
            window.utils.showToast("Instalador baixado!", "success");
        } catch (err) {
            console.error(err);
            window.utils.showToast("Erro ao gerar instalador. Tente novamente.", "error");
        }
    },

    _gerarInstaladorBat: function(fcmToken) {
        // Helpers de codificação seguros para o Navegador
        const toB64 = (str) => btoa(unescape(encodeURIComponent(str)));
        
        const toUTF16LEB64 = (str) => {
            const buffer = new ArrayBuffer(str.length * 2);
            const view = new Uint16Array(buffer);
            for (let i = 0; i < str.length; i++) view[i] = str.charCodeAt(i);
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            return btoa(binary);
        };

        const ps1Script = `# anki-monitor.ps1
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$configFile = Join-Path $PSScriptRoot "config.json"
if (-not (Test-Path $configFile)) { exit }
while ($true) {
    try {
        $config = Get-Content $configFile | ConvertFrom-Json
        $hoje = Get-Date -Format "yyyy-MM-dd"
        if ($config.lastNotifiedDate -ne $hoje) {
            $qNew = @{ action = 'findCards'; version = 6; params = @{ query = 'is:new' } } | ConvertTo-Json
            $qLrn = @{ action = 'findCards'; version = 6; params = @{ query = 'is:learn' } } | ConvertTo-Json
            $qRev = @{ action = 'findCards'; version = 6; params = @{ query = 'is:review is:due' } } | ConvertTo-Json
            $rNew = Invoke-RestMethod -Uri 'http://localhost:8765' -Method Post -Body $qNew -ErrorAction Stop
            $rLrn = Invoke-RestMethod -Uri 'http://localhost:8765' -Method Post -Body $qLrn -ErrorAction Stop
            $rRev = Invoke-RestMethod -Uri 'http://localhost:8765' -Method Post -Body $qRev -ErrorAction Stop
            $total = ($rNew.result.Count) + ($rLrn.result.Count) + ($rRev.result.Count)
            if ($total -gt 0) {
                $bodyText = "Voce tem $total cards pendentes (Novos: $($rNew.result.Count) | Aprender: $($rLrn.result.Count) | Revisar: $($rRev.result.Count))"
                $bodyPush = @{ token = $config.fcmToken; title = 'Estudos Pendentes 📚'; body = $bodyText } | ConvertTo-Json
                Invoke-RestMethod -Uri "https://concursosti.vercel.app/api/notify" -Method Post -Body $bodyPush -ContentType "application/json"
                $config.lastNotifiedDate = $hoje
                $config | ConvertTo-Json | Set-Content $configFile
            }
        }
    } catch {}
    Start-Sleep -Seconds 1800
}`;

        const vbsScript = `Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & Replace(WScript.ScriptFullName, WScript.ScriptName, "") & "anki-monitor.ps1""", 0, False`;

        const testBat = `@echo off
echo Consultando Anki e enviando teste...
powershell -Command "$c=Get-Content 'config.json'|ConvertFrom-Json;$q=@{action='findCards';version=6;params=@{query=''}};$r=Invoke-RestMethod 'http://localhost:8765' -Method Post -Body ($q|ConvertTo-Json);$body=@{token=$c.fcmToken;title='Teste OK! 🔔';body='Monitor funcionando corretamente!'}|ConvertTo-Json;Invoke-RestMethod 'https://concursosti.vercel.app/api/notify' -Method Post -Body $body -ContentType 'application/json';echo Sucesso!"
pause`;

        const configJson = JSON.stringify({ fcmToken: fcmToken, lastNotifiedDate: "" });

        const masterScript = `
$installDir = "$env:USERPROFILE\\AnkiMonitor"
$startupDir = "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"
$vbsPath = "$installDir\\anki-monitor.vbs"

try {
    Write-Host "--- INSTALADOR BLINDADO ConcursosTI ---" -ForegroundColor Yellow
    
    Write-Host "1. Faxina profunda de processos e inicializacao..." -ForegroundColor Cyan
    # Sweep BROAD: Encerra QUALQUER processo PowerShell que tenha 'anki-monitor' no comando
    $procs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*anki-monitor*" }
    foreach ($p in $procs) { 
        Write-Host "Encerrando processo antigo: $($p.ProcessId)" -ForegroundColor Gray
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue 
    }
    # Backup por titulo de janela (especifico do monitor rodando oculto via VBS/WScript)
    taskkill /F /IM powershell.exe /FI "WINDOWTITLE eq *AnkiMonitor*" /T 2>$null | Out-Null
    taskkill /F /IM wscript.exe /FI "COMMANDLINE eq *anki-monitor*" /T 2>$null | Out-Null

    # Limpa QUALQUER arquivo relacionado ao anki na pasta de inicializacao para evitar duplicidade no boot
    Get-ChildItem "$startupDir" -Filter "anki*" | Remove-Item -Force -ErrorAction SilentlyContinue
    Get-ChildItem "$startupDir" -Filter "monitor*" | Remove-Item -Force -ErrorAction SilentlyContinue

    Write-Host "2. Preparando pasta de destino..." -ForegroundColor Cyan
    if (Test-Path $installDir) { Remove-Item $installDir -Recurse -Force -ErrorAction SilentlyContinue }
    mkdir $installDir -Force | Out-Null

    Write-Host "3. Instalando arquivos..." -ForegroundColor Cyan
    [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("${toB64(ps1Script)}")) | Set-Content "$installDir\\anki-monitor.ps1" -Encoding UTF8
    [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("${toB64(vbsScript)}")) | Set-Content $vbsPath -Encoding Ascii
    [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("${toB64(testBat)}")) | Set-Content "$installDir\\TESTAR-NOTIFICACAO.bat" -Encoding UTF8
    '${configJson}' | Set-Content "$installDir\\config.json" -Encoding UTF8

    Write-Host "4. Configurando inicializacao..." -ForegroundColor Cyan
    if (Test-Path "$startupDir\\anki-monitor.vbs") { Remove-Item "$startupDir\\anki-monitor.vbs" -Force }
    Copy-Item $vbsPath "$startupDir\\anki-monitor.vbs" -Force

    Write-Host "5. Iniciando monitor..." -ForegroundColor Cyan
    & wscript.exe $vbsPath

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "     INSTALACAO CONCLUIDA COM SUCESSO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} catch {
    Write-Error "Erro critico: $_"
    Read-Host "Pressione Enter para fechar"
}
`;

        const encodedCommand = toUTF16LEB64(masterScript);

        return `@echo off
chcp 65001 >nul
title Instalador Blindado
echo Iniciando instalacao segura...
powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand "${encodedCommand}"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Ocorreu um erro. Verifique se o PowerShell esta bloqueado.
    pause
)
exit /b
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
