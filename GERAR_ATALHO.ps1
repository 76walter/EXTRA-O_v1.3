$DesktopPath = [System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'Extração Inteligente.lnk')
$TargetPath = Join-Path $PSScriptRoot "lancar.vbs"
$WorkingDir = $PSScriptRoot
$IconPath = Join-Path $PSScriptRoot "icone\logo.ico"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($DesktopPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = $WorkingDir
$Shortcut.IconLocation = $IconPath
$Shortcut.Save()

Write-Host "`n✅ Atalho atualizado com sucesso na sua Área de Trabalho!" -ForegroundColor Green
Write-Host "🚀 Agora você pode clicar duas vezes no ícone da logo para iniciar o sistema.`n" -ForegroundColor Cyan
pause
