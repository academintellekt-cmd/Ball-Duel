# Включает или выключает автозапуск игры при входе в Windows.
# Ярлык кладётся в общую папку автозагрузки (для всех пользователей), поэтому нужны права администратора.
param([ValidateSet('Enable', 'Disable')][string]$Action = 'Enable')
$ErrorActionPreference = 'Stop'
$ExeName = 'Ball Duel.exe'

# The shortcut runs for every user and this script runs elevated, so both must come from a folder
# only admins can write to: refuse anywhere outside Program Files.
$protected = @($env:ProgramFiles, ${env:ProgramFiles(x86)}) | Where-Object { $_ } | ForEach-Object { $_.TrimEnd('\') + '\' }
if (-not ($protected | Where-Object { ($PSScriptRoot + '\').StartsWith($_, [StringComparison]::OrdinalIgnoreCase) })) {
  Write-Host "Ошибка: игра должна быть установлена в Program Files, а скрипт запущен из $PSScriptRoot" -ForegroundColor Red
  Read-Host 'Нажмите Enter, чтобы закрыть окно' | Out-Null
  exit 1
}

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
  Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", '-Action', $Action
  exit
}

try {
  $exe = Join-Path $PSScriptRoot $ExeName
  $link = Join-Path ([Environment]::GetFolderPath('CommonStartup')) ([IO.Path]::GetFileNameWithoutExtension($ExeName) + '.lnk')

  if ($Action -eq 'Enable') {
    if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) { throw "Не найден $exe" }
    $shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut($link)
    $shortcut.TargetPath = $exe
    $shortcut.WorkingDirectory = $PSScriptRoot
    $shortcut.Save()
    Write-Host "Автозагрузка включена: $ExeName будет запускаться при входе в Windows." -ForegroundColor Green
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
