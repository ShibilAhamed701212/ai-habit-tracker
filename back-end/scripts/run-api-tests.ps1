# Full API smoke test — runs all GET/POST/PUT/DELETE endpoints in order.
# Usage: .\scripts\run-api-tests.ps1
# Requires: backend running on http://localhost:8000 with MongoDB connected

$Base = "http://localhost:8000"
$Email = "bruno-test-$(Get-Random)@example.com"
$Password = "password123"
$Token = $null
$HabitId = $null
$Passed = 0
$Failed = 0
$Results = @()

function Test-Api {
  param(
    [string]$Name,
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [int[]]$ExpectStatus = @(200),
    [switch]$NoAuth
  )

  $headers = @{ "Content-Type" = "application/json" }
  if (-not $NoAuth -and $Token) {
    $headers["Authorization"] = "Bearer $Token"
  }

  $uri = "$Base$Path"
  try {
    $params = @{
      Uri         = $uri
      Method      = $Method
      Headers     = $headers
      ErrorAction = "Stop"
    }
    if ($Body -ne $null) {
      $params["Body"] = ($Body | ConvertTo-Json -Depth 5)
    }

    $resp = Invoke-WebRequest @params -UseBasicParsing
    $status = [int]$resp.StatusCode
    $content = $resp.Content
  } catch {
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode.value__
      $stream = $_.Exception.Response.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      $content = $reader.ReadToEnd()
    } else {
      $status = 0
      $content = $_.Exception.Message
    }
  }

  $ok = $ExpectStatus -contains $status
  if ($ok) { $script:Passed++ } else { $script:Failed++ }

  $script:Results += [PSCustomObject]@{
    Test   = $Name
    Method = $Method
    Path   = $Path
    Status = $status
    OK     = $ok
  }

  $icon = if ($ok) { "PASS" } else { "FAIL" }
  Write-Host "[$icon] $Method $Path -> $status ($Name)"

  try { return ($content | ConvertFrom-Json) } catch { return $content }
}

Write-Host "`n=== AI Habit Tracker API Tests ===`n"

# Health
$h = Test-Api -Name "Health" -Method GET -Path "/api/health" -NoAuth
if (-not $h) { Write-Host "Server not reachable. Start backend first."; exit 1 }

# Auth — register
$reg = Test-Api -Name "Register" -Method POST -Path "/api/auth/register" -NoAuth -ExpectStatus @(201) -Body @{
  name     = "Bruno Test"
  email    = $Email
  password = $Password
}
$Token = $reg.token

# Auth — login
$login = Test-Api -Name "Login" -Method POST -Path "/api/auth/login" -NoAuth -Body @{
  email    = $Email
  password = $Password
}
if ($login.token) { $Token = $login.token }

# Auth — me
Test-Api -Name "Me" -Method GET -Path "/api/auth/me" | Out-Null

# Auth — update profile
Test-Api -Name "Update Profile" -Method PUT -Path "/api/auth/profile" -Body @{
  name              = "Bruno Test Updated"
  morningMotivation = $true
} | Out-Null

# Habits — create
$habit = Test-Api -Name "Create Habit" -Method POST -Path "/api/habits" -ExpectStatus @(201) -Body @{
  name        = "Morning run"
  description = "5km daily"
  category    = "Fitness"
  frequency   = "daily"
  targetDays  = 7
  color       = "#0ea5e9"
  icon        = "🏃"
}
$HabitId = $habit._id

# Habits — list
Test-Api -Name "List Habits" -Method GET -Path "/api/habits" | Out-Null

if ($HabitId) {
  # Habits — update
  Test-Api -Name "Update Habit" -Method PUT -Path "/api/habits/$HabitId" -Body @{
    name = "Morning run (updated)"
  } | Out-Null

  # Habits — reorder
  Test-Api -Name "Reorder Habits" -Method PUT -Path "/api/habits/reorder" -Body @{
    order = @($HabitId)
  } | Out-Null

  # Logs — mark complete
  Test-Api -Name "Mark Complete" -Method POST -Path "/api/logs" -ExpectStatus @(201) -Body @{
    habitId = $HabitId
  } | Out-Null

  # Logs — today
  Test-Api -Name "Logs Today" -Method GET -Path "/api/logs/today" | Out-Null

  # Logs — range
  Test-Api -Name "Logs Range" -Method GET -Path "/api/logs/range?start=2026-01-01&end=2026-12-31" | Out-Null

  # Logs — heatmap
  Test-Api -Name "Logs Heatmap" -Method GET -Path "/api/logs/heatmap" | Out-Null

  # Logs — all stats
  Test-Api -Name "All Stats" -Method GET -Path "/api/logs/stats" | Out-Null

  # Logs — habit stats
  Test-Api -Name "Habit Stats" -Method GET -Path "/api/logs/stats/$HabitId" | Out-Null

  # AI — morning
  Test-Api -Name "AI Morning" -Method GET -Path "/api/ai/morning" | Out-Null

  # AI — weekly report
  Test-Api -Name "AI Weekly Report" -Method POST -Path "/api/ai/weekly-report" | Out-Null

  # AI — suggest habits
  Test-Api -Name "AI Suggest Habits" -Method POST -Path "/api/ai/suggest-habits" -Body @{
    goals          = "Get fitter, read more, and reduce phone time"
    productiveTime = "Early morning"
    struggles      = "I keep losing momentum in the evening"
  } | Out-Null

  # AI — recovery plan
  Test-Api -Name "AI Recovery Plan" -Method POST -Path "/api/ai/recovery-plan" -Body @{
    habitId = $HabitId
  } | Out-Null

  # AI — chat
  Test-Api -Name "AI Chat" -Method POST -Path "/api/ai/chat" -Body @{
    question = "Which day of the week am I most consistent?"
  } | Out-Null

  # Logs — unmark
  Test-Api -Name "Unmark Complete" -Method DELETE -Path "/api/logs" -Body @{
    habitId = $HabitId
  } | Out-Null

  # Habits — archive
  Test-Api -Name "Archive Habit" -Method PUT -Path "/api/habits/$HabitId/archive" | Out-Null

  # Habits — delete
  Test-Api -Name "Delete Habit" -Method DELETE -Path "/api/habits/$HabitId" | Out-Null
} else {
  Write-Host "[SKIP] Habit-dependent tests skipped (no habitId)"
}

Write-Host "`n=== Summary: $Passed passed, $Failed failed ===`n"
$Results | Format-Table -AutoSize

if ($Failed -gt 0) { exit 1 }
