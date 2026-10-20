# Включает или выключает автозапуск игры при входе в Windows.
# Ярлык кладётся в общую папку автозагрузки (для всех пользователей), поэтому нужны права администратора.
param([ValidateSet('Enable', 'Disable')][string]$Action = 'Enable')
$ErrorActionPreference = 'Stop'

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
  Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", '-Action', $Action
  exit
}

try {
  $exe = Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.exe' | Where-Object { $_.Name -notlike 'Uninstall*' } | Select-Object -First 1
  if (-not $exe) { throw "Рядом со скриптом не найден .exe игры ($PSScriptRoot)" }
  $link = Join-Path ([Environment]::GetFolderPath('CommonStartup')) ($exe.BaseName + '.lnk')

  if ($Action -eq 'Enable') {
    $shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut($link)
    $shortcut.TargetPath = $exe.FullName
    $shortcut.WorkingDirectory = $PSScriptRoot
    $shortcut.Save()
    Write-Host "Автозагрузка включена: $($exe.BaseName) будет запускаться при входе в Windows." -ForegroundColor Green
    Write-Host "Ярлык: $link"
  } elseif (Test-Path -LiteralPath $link) {
    Remove-Item -LiteralPath $link -Force
    Write-Host "Автозагрузка выключена: ярлык $link удалён." -ForegroundColor Green
  } else {
    Write-Host "Автозагрузка уже выключена." -ForegroundColor Yellow
  }
} catch {
  Write-Host "Ошибка: $($_.Exception.Message)" -ForegroundColor Red
}
Read-Host 'Нажмите Enter, чтобы закрыть окно' | Out-Null
