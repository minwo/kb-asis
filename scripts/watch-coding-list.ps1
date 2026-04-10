param(
    [string]$Root = "."
)

$rootPath = (Resolve-Path $Root).Path
$syncScriptPath = Join-Path $rootPath "scripts\sync-coding-list.ps1"

& powershell -ExecutionPolicy Bypass -File $syncScriptPath -Root $rootPath

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $rootPath
$watcher.Filter = "*.html"
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents = $true

$action = {
    powershell -ExecutionPolicy Bypass -File $using:syncScriptPath -Root $using:rootPath
}

$created = Register-ObjectEvent $watcher Created -Action $action
$changed = Register-ObjectEvent $watcher Changed -Action $action
$renamed = Register-ObjectEvent $watcher Renamed -Action $action
$deleted = Register-ObjectEvent $watcher Deleted -Action $action

Write-Host "coding-list watcher started: $rootPath"
Write-Host "Press Ctrl+C to stop."

try {
    while ($true) {
        Start-Sleep -Seconds 2
    }
}
finally {
    Unregister-Event -SourceIdentifier $created.Name
    Unregister-Event -SourceIdentifier $changed.Name
    Unregister-Event -SourceIdentifier $renamed.Name
    Unregister-Event -SourceIdentifier $deleted.Name
    $watcher.Dispose()
}
