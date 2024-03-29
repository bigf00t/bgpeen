param ($function="automaticGamesUpdate", $maxgames=0, $maxpages=100, $id="", $name="", [switch] $prod=$false)

if ($prod) {
    $confirmation = Read-Host "Are you sure you want to update production? [y/n]"
    if ($confirmation -ne 'y') {
        exit
    }
}

$logfile = "./logs/local-update-$((get-date).ToString("MMddyyyyhhmmss")).log"

$cmdName = $MyInvocation.InvocationName
$paramList = (Get-Command -Name $cmdName).Parameters
$paramArray = @()
foreach ( $key in $paramList.Keys ) {
    $value = (Get-Variable $key -ErrorAction SilentlyContinue).Value
    $paramArray += "$key=$value"
}

$paramString = $paramArray -join ", "

"Running local_update.js with params: $paramString" | Out-File $logfile

Invoke-Expression "./node_modules/.bin/env-cmd -f .env.dev node local_update.js --function $function --maxGames $maxgames --maxPages $maxpages $(If ($id) {'--id ' + $id} Else {''}) $(If ($name) {'--name "' + $name + '"'} Else {''}) $(If ($prod) {'--prod'} Else {''}) 2>&1 | Tee-Object -a $logfile"
