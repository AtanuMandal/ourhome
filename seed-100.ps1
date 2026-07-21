[CmdletBinding()]
param(
    [string]$Url = "http://localhost:7071/api/seed",
    [string]$SeedKey = "dev-seed-2024",
    [int]$Total = 100,
    [int]$Concurrency = 20,
    [int]$TimeoutSec = 15
)

# Throttled parallelism via a RunspacePool - multiple runspaces INSIDE this one
# process (no child processes spawned at all). This is PowerShell's own
# purpose-built mechanism for bounded concurrent work; unlike Start-Job (which
# spins up a separate process per job and proved unreliable under constrained/
# sandboxed environments) or raw .NET Task.Run (whose worker threads have no
# PowerShell runspace, so they can't run script code), a RunspacePool caps
# concurrency internally while still safely running real PowerShell commands.

$pool = [runspacefactory]::CreateRunspacePool(1, $Concurrency)
$pool.Open()

$scriptBlock = {
    param($N, $Url, $SeedKey, $TimeoutSec)
    try {
        $resp = Invoke-WebRequest -Uri $Url -Method Post -Headers @{ 'x-seed-key' = $SeedKey } -UseBasicParsing -TimeoutSec $TimeoutSec
        [pscustomobject]@{ N = $N; Status = [int]$resp.StatusCode }
    }
    catch {
        $status = 'ERROR'
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        [pscustomobject]@{ N = $N; Status = $status }
    }
}

Write-Host "Sending $Total requests to $Url, $Concurrency at a time..."
Write-Host ""

$handles = @()
for ($n = 1; $n -le $Total; $n++) {
    $ps = [powershell]::Create()
    $ps.RunspacePool = $pool
    [void]$ps.AddScript($scriptBlock).AddArgument($n).AddArgument($Url).AddArgument($SeedKey).AddArgument($TimeoutSec)
    $handles += [pscustomobject]@{ Instance = $ps; Async = $ps.BeginInvoke() }
}

$results = foreach ($h in $handles) {
    $h.Instance.EndInvoke($h.Async)
    $h.Instance.Dispose()
}

$pool.Close()
$pool.Dispose()

$results = $results | Sort-Object N
foreach ($r in $results) {
    Write-Host ("Request {0}: {1}" -f $r.N, $r.Status)
}

$ok = @($results | Where-Object { $_.Status -is [int] -and $_.Status -ge 200 -and $_.Status -lt 300 }).Count
$fail = $Total - $ok

Write-Host ""
Write-Host ("Done: {0} succeeded, {1} failed out of {2}" -f $ok, $fail, $Total)

exit 0
