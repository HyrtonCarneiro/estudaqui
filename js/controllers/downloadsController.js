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

        const batContent = this._gerarInstaladorBat(fcmToken);
        this._downloadFile('Instalar-Monitor-Anki.bat', batContent, 'application/x-bat');
        window.utils.showToast("Instalador baixado!", "success");
    },

    _gerarInstaladorBat: function(fcmToken) {
        // Função de escape para UTF-8 Base64
        const toB64 = (str) => btoa(unescape(encodeURIComponent(str)));

        // Definição dos scripts que serão instalados
        const ps1Script = `# anki-monitor.ps1
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$configFile = Join-Path $PSScriptRoot "config.json"
$logFile = Join-Path $PSScriptRoot "monitor.log"
function Log-Msg($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$ts] $msg"
}
if (-not (Test-Path $configFile)) { exit }
Log-Msg "Monitor Anki iniciado."
while ($true) {
    try {
        $config = Get-Content $configFile | ConvertFrom-Json
        $hoje = Get-Date -Format "yyyy-MM-dd"
        if ($config.lastNotifiedDate -ne $hoje) {
            # Busca cards e envia push
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
title Testando Notificacao...
echo [1/2] Consultando Anki e enviando push de teste...
powershell.exe -ExecutionPolicy Bypass -Command "$config = Get-Content 'config.json' | ConvertFrom-Json; $qNew = @{ action = 'findCards'; version = 6; params = @{ query = 'is:new' } } | ConvertTo-Json; $qLrn = @{ action = 'findCards'; version = 6; params = @{ query = 'is:learn' } } | ConvertTo-Json; $qRev = @{ action = 'findCards'; version = 6; params = @{ query = 'is:review is:due' } } | ConvertTo-Json; $rNew = Invoke-RestMethod -Uri 'http://localhost:8765' -Method Post -Body $qNew; $rLrn = Invoke-RestMethod -Uri 'http://localhost:8765' -Method Post -Body $qLrn; $rRev = Invoke-RestMethod -Uri 'http://localhost:8765' -Method Post -Body $qRev; $total = $rNew.result.Count + $rLrn.result.Count + $rRev.result.Count; $bodyText = 'TESTE MANUAL: Voce tem ' + $total + ' cards: N:' + $rNew.result.Count + ' A:' + $rLrn.result.Count + ' R:' + $rRev.result.Count; $bodyPush = @{ token = $config.fcmToken; title = 'Teste OK! 🔔'; body = $bodyText } | ConvertTo-Json; Invoke-RestMethod -Uri 'https://concursosti.vercel.app/api/notify' -Method Post -Body $bodyPush -ContentType 'application/json'; echo 'SUCESSO: Verifique seu celular!'"
pause`;

        const configJson = JSON.stringify({ fcmToken: fcmToken, lastNotifiedDate: "" }, null, 2);

        // Retorna o arquivo híbrido
        return `@echo off
chcp 65001 >nul
title Instalador Blindado AnkiMonitor
echo ============================================
echo   INSTALADOR MONITOR ANKI - ConcursosTI
echo ============================================
echo.
echo [!] Verificando sistema e preparando instalacao...
set "SELF_PATH=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$script = (Get-Content -LiteralPath $env:SELF_PATH) -join \\"\`n\\"; if ($script -match '# PS_START\\n([\\s\\S]*)') { Invoke-Expression $Matches[1] } else { Write-Error 'Erro: Marcador de script nao encontrado.' }"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] ERRO CRITICO DURANTE A INSTALACAO. 
    echo Verifique se o seu Antivirus bloqueou o processo.
)
echo.
echo Presione qualquer tecla para sair.
pause >nul
exit /b

# PS_START
$installDir = "$env:USERPROFILE\\AnkiMonitor"
$startupDir = "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"

try {
    Write-Host "- [1/5] Encerrando monitores antigos para evitar duplicidade..." -ForegroundColor Cyan
    # Busca processos do PowerShell que estão rodando o script do monitor
    $oldProcs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*anki-monitor.ps1*" }
    foreach ($p in $oldProcs) { 
        Write-Host "   Encerrando processo $($p.ProcessId)..."
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue 
    }
    
    Write-Host "- [2/5] Limpando rastros e arquivos antigos..." -ForegroundColor Cyan
    if (Test-Path $installDir) { Remove-Item -Path $installDir -Recurse -Force -ErrorAction SilentlyContinue }
    if (Test-Path "$startupDir\\anki-monitor.vbs") { Remove-Item -Path "$startupDir\\anki-monitor.vbs" -Force }
    
    mkdir $installDir -Force | Out-Null
    
    Write-Host "- [3/5] Decodificando scripts (Seguro)..." -ForegroundColor Cyan
    $ps1 = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("${toB64(ps1Script)}"))
    $vbs = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("${toB64(vbsScript)}"))
    $cfg = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("${toB64(configJson)}"))
    $tst = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("${toB64(testBat)}"))

    Write-Host "- [4/5] Instalando arquivos na pasta AnkiMonitor..." -ForegroundColor Cyan
    $ps1 | Set-Content -Path "$installDir\\anki-monitor.ps1" -Encoding UTF8
    $vbs | Set-Content -Path "$installDir\\anki-monitor.vbs" -Encoding UTF8
    $cfg | Set-Content -Path "$installDir\\config.json" -Encoding UTF8
    $tst | Set-Content -Path "$installDir\\TESTAR-NOTIFICACAO.bat" -Encoding UTF8

    Write-Host "- [5/5] Configurando Inicializacao do Windows..." -ForegroundColor Cyan
    Copy-Item -Path "$installDir\\anki-monitor.vbs" -Destination "$startupDir\\anki-monitor.vbs" -Force

    Write-Host ""
    Write-Host "- Iniciando novo monitor agora..." -ForegroundColor Cyan
    & wscript.exe "$installDir\\anki-monitor.vbs"

    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "   INSTALACAO CONCLUIDA COM SUCESSO!" -ForegroundColor Green
    Write-Host "   O Monitor unico ja esta rodando." -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
} catch {
    Write-Error "ERRO NA INSTALACAO: $_"
    exit 1
}
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
