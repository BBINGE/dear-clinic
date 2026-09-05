# Local-only comparison with the preview Worker's Anthropic request.
# Never put a real key in this script, command arguments, files, or output.
$ErrorActionPreference = 'Stop'
$probeSecret = $null
$probeKey = $null
$probePointer = [IntPtr]::Zero
$probeClient = $null
$probeRequest = $null
$probeResponse = $null

Write-Host 'DEAR AI - local connection check'
Write-Host 'Paste the SAME API key used in Cloudflare, then press Enter.'
Write-Host 'Input is hidden. Only a short result will be printed.'
Write-Host ''

try {
    $probeSecret = Read-Host 'API key (hidden)' -AsSecureString
    $probePointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($probeSecret)
    $probeKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($probePointer)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($probePointer)
    $probePointer = [IntPtr]::Zero

    if ([string]::IsNullOrEmpty($probeKey) -or $probeKey -match '\s' -or $probeKey -match '["'']') {
        Write-Host 'RESULT: INPUT_FORMAT_ERROR (empty, whitespace, or quotes)'
    } else {
        Add-Type -AssemblyName System.Net.Http
        $probeClient = New-Object System.Net.Http.HttpClient
        $probeClient.Timeout = [TimeSpan]::FromSeconds(30)
        $probeRequest = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post, 'https://api.anthropic.com/v1/messages')
        $probeRequest.Headers.Add('x-api-key', $probeKey)
        $probeRequest.Headers.Add('anthropic-version', '2023-06-01')
        $probeKey = $null
        $probePayload = '{"model":"claude-sonnet-4-6","max_tokens":32,"messages":[{"role":"user","content":"Hello"}]}'
        $probeRequest.Content = New-Object System.Net.Http.StringContent($probePayload, [System.Text.Encoding]::UTF8, 'application/json')
        $probeResponse = $probeClient.SendAsync($probeRequest).GetAwaiter().GetResult()
        Write-Host ('HTTP: ' + [int]$probeResponse.StatusCode)

        if ($probeResponse.IsSuccessStatusCode) {
            Write-Host 'RESULT: SUCCESS'
        } else {
            $probeType = 'unknown'
            $probeReason = 'unknown'
            try {
                $probeFailure = $probeResponse.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
                $probeKnownTypes = @('authentication_error', 'permission_error', 'not_found_error', 'invalid_request_error', 'rate_limit_error', 'overloaded_error', 'api_error', 'forbidden')
                if ($probeFailure.error.type -cin $probeKnownTypes) { $probeType = $probeFailure.error.type }
                $probeMessage = [string]$probeFailure.error.message
                if ($probeMessage -match 'Request not allowed') { $probeReason = 'request_not_allowed' }
                elseif ($probeMessage -match 'credit balance|purchase credits|insufficient.*credit') { $probeReason = 'insufficient_credit' }
                elseif ($probeMessage -match 'invalid.*api.?key|api.?key.*invalid') { $probeReason = 'invalid_api_key' }
                $probeMessage = $null
                $probeFailure = $null
            } catch {
                # Never print raw provider errors or exception objects.
            }
            Write-Host ('RESULT: FAILED / ' + $probeType + ' / ' + $probeReason)
        }
    }
} catch {
    Write-Host 'RESULT: LOCAL_NETWORK_OR_RUNTIME_ERROR'
    Write-Host 'No raw exception details are displayed, to protect the API key.'
} finally {
    $probeKey = $null
    if ($probePointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($probePointer) }
    if ($null -ne $probeRequest) { $probeRequest.Headers.Clear(); $probeRequest.Dispose() }
    if ($null -ne $probeResponse) { $probeResponse.Dispose() }
    if ($null -ne $probeClient) { $probeClient.Dispose() }
    if ($null -ne $probeSecret) { $probeSecret.Dispose() }
}

Write-Host ''
Write-Host 'Share only the HTTP and RESULT lines with Yeoleum.'
[void](Read-Host 'Press Enter to close')
