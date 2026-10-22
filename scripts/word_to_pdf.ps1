param(
    [Parameter(Mandatory=$true)]
    [string]$InputPath,
    [Parameter(Mandatory=$true)]
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = [Microsoft.Office.Interop.Word.WdAlertLevel]::wdAlertsNone

    # Resolve full absolute paths
    $fullInput = (Resolve-Path $InputPath).Path
    $fullOutput = [System.IO.Path]::GetFullPath($OutputPath)

    # 17 corresponds to wdFormatPDF
    $wdFormatPDF = 17

    $doc = $word.Documents.Open($fullInput, $false, $true) # ReadOnly = true
    $doc.SaveAs([ref]$fullOutput, [ref]$wdFormatPDF)
    $doc.Close([ref]0) # wdDoNotSaveChanges = 0
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()

    Write-Host "CONVERSION_SUCCESS: $fullOutput"
    exit 0
} catch {
    Write-Error $_.Exception.Message
    if ($word) {
        try { $word.Quit() } catch {}
    }
    exit 1
}
