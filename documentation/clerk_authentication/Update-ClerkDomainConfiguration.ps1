# ==============================================================================
# Update-ClerkDomainConfiguration.ps1
# ==============================================================================
# Description: Migrate Clerk domain configuration from old to new domain pair
# Author: System Administrator
# Created: 2025-01-25
# ==============================================================================

<#
.SYNOPSIS
    Updates all Clerk domain references in code files from old to new domain pair.

.DESCRIPTION
    This script updates domain references in both primary and satellite projects:
    - Old: adwiise.com (primary), mosc-temp.com (satellite)
    - New: kluvo.ai (primary), mcefee-temp.com (satellite)

.PARAMETER PrimaryProjectPath
    Path to the primary domain project (event-site-manager).

.PARAMETER SatelliteProjectPath
    Path to the satellite domain project (mcefee-temp).

.PARAMETER DryRun
    Show what would be changed without making changes.

.EXAMPLE
    .\Update-ClerkDomainConfiguration.ps1 `
      -PrimaryProjectPath "E:\project_workspace\event-site-manager" `
      -SatelliteProjectPath "E:\project_workspace\mcefee-temp"

    Updates all domain references in both projects.

.EXAMPLE
    .\Update-ClerkDomainConfiguration.ps1 -DryRun

    Shows what would be changed without modifying files.
#>

[CmdletBinding(SupportsShouldProcess=$true)]
param(
    [Parameter(Mandatory=$false)]
    [string]$PrimaryProjectPath = "E:\project_workspace\event-site-manager",

    [Parameter(Mandatory=$false)]
    [string]$SatelliteProjectPath = "E:\project_workspace\mcefee-temp",

    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

# ==============================================================================
# Domain Mappings
# ==============================================================================

$oldPrimaryDomain = "adwiise.com"
$oldPrimaryDomainWithWww = "www.adwiise.com"
$oldPrimaryDomainFull = "https://www.adwiise.com"
$oldPrimaryClerkDomain = "clerk.adwiise.com"
$oldPrimaryClerkDomainFull = "https://clerk.adwiise.com"

$oldSatelliteDomain = "mosc-temp.com"
$oldSatelliteDomainWithWww = "www.mosc-temp.com"
$oldSatelliteDomainFull = "https://www.mosc-temp.com"

$newPrimaryDomain = "kluvo.ai"
$newPrimaryDomainWithWww = "www.kluvo.ai"
$newPrimaryDomainFull = "https://www.kluvo.ai"
$newPrimaryClerkDomain = "clerk.kluvo.ai"
$newPrimaryClerkDomainFull = "https://clerk.kluvo.ai"

$newSatelliteDomain = "mcefee-temp.com"
$newSatelliteDomainWithWww = "www.mcefee-temp.com"
$newSatelliteDomainFull = "https://www.mcefee-temp.com"

# ==============================================================================
# Helper Functions
# ==============================================================================

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Update-FileContent {
    param(
        [string]$FilePath,
        [hashtable]$Replacements,
        [bool]$IsDryRun
    )

    if (-not (Test-Path $FilePath)) {
        Write-Warning "File not found: $FilePath"
        return $false
    }

    $content = Get-Content $FilePath -Raw -Encoding UTF8
    $originalContent = $content
    $changed = $false

    foreach ($replacement in $Replacements.GetEnumerator()) {
        $oldValue = $replacement.Key
        $newValue = $replacement.Value

        if ($content -match [regex]::Escape($oldValue)) {
            $changed = $true
            if ($IsDryRun) {
                Write-Host "  Would replace: '$oldValue' → '$newValue'" -ForegroundColor Yellow
            } else {
                $content = $content -replace [regex]::Escape($oldValue), $newValue
                Write-Host "  Replaced: '$oldValue' → '$newValue'" -ForegroundColor Green
            }
        }
    }

    if ($changed) {
        if (-not $IsDryRun) {
            # Write UTF-8 without BOM
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            [System.IO.File]::WriteAllText($FilePath, $content, $utf8NoBom)
            Write-Success "Updated: $FilePath"
            return $true
        } else {
            Write-Info "Would update: $FilePath"
            return $true
        }
    }

    return $false
}

# ==============================================================================
# File Update Definitions
# ==============================================================================

function Update-PrimaryProject {
    param(
        [string]$ProjectPath,
        [bool]$IsDryRun
    )

    Write-Header "Updating Primary Project: event-site-manager"

    $filesUpdated = 0

    # 1. src/app/layout.tsx
    $layoutFile = Join-Path $ProjectPath "src\app\layout.tsx"
    $replacements = @{
        "allowedRedirectOrigins: ['https://www.mosc-temp.com']" = "allowedRedirectOrigins: ['https://www.mcefee-temp.com']"
        "allowedRedirectOrigins: [`"https://www.mosc-temp.com`"]" = "allowedRedirectOrigins: [`"https://www.mcefee-temp.com`"]"
        "'https://www.mosc-temp.com'" = "'https://www.mcefee-temp.com'"
        "`"https://www.mosc-temp.com`"" = "`"https://www.mcefee-temp.com`""
    }
    if (Update-FileContent -FilePath $layoutFile -Replacements $replacements -IsDryRun $IsDryRun) {
        $filesUpdated++
    }

    # 2. src/middleware.ts
    $middlewareFile = Join-Path $ProjectPath "src\middleware.ts"
    $replacements = @{
        "Access-Control-Allow-Origin', 'https://www.mosc-temp.com'" = "Access-Control-Allow-Origin', 'https://www.mcefee-temp.com'"
        "Access-Control-Allow-Origin`, `"https://www.mosc-temp.com`"" = "Access-Control-Allow-Origin`, `"https://www.mcefee-temp.com`""
    }
    if (Update-FileContent -FilePath $middlewareFile -Replacements $replacements -IsDryRun $IsDryRun) {
        $filesUpdated++
    }

    return $filesUpdated
}

function Update-SatelliteProject {
    param(
        [string]$ProjectPath,
        [bool]$IsDryRun
    )

    Write-Header "Updating Satellite Project: mcefee-temp"

    $filesUpdated = 0

    # 1. src/app/layout.tsx
    $layoutFile = Join-Path $ProjectPath "src\app\layout.tsx"
    $replacements = @{
        "# Primary domain: www.adwiise.com" = "# Primary domain: www.kluvo.ai"
        "# Satellite domains: www.mosc-temp.com" = "# Satellite domains: www.mcefee-temp.com"
        "hostname.includes('mosc-temp.com')" = "hostname.includes('mcefee-temp.com')"
        "domain: 'mosc-temp.com'" = "domain: 'mcefee-temp.com'"
        "signInUrl: 'https://www.adwiise.com/sign-in'" = "signInUrl: 'https://www.kluvo.ai/sign-in'"
        "signUpUrl: 'https://www.adwiise.com/sign-up'" = "signUpUrl: 'https://www.kluvo.ai/sign-up'"
        "allowedRedirectOrigins: isProd ? ['https://www.mosc-temp.com']" = "allowedRedirectOrigins: isProd ? ['https://www.mcefee-temp.com']"
        "'https://www.mosc-temp.com'" = "'https://www.mcefee-temp.com'"
    }
    if (Update-FileContent -FilePath $layoutFile -Replacements $replacements -IsDryRun $IsDryRun) {
        $filesUpdated++
    }

    # 2. src/middleware.ts
    $middlewareFile = Join-Path $ProjectPath "src\middleware.ts"
    $replacements = @{
        "includes('mosc-temp.com')" = "includes('mcefee-temp.com')"
        "'mosc-temp.com'" = "'mcefee-temp.com'"
        "'https://www.adwiise.com/sign-in'" = "'https://www.kluvo.ai/sign-in'"
        "signInUrl: process.env.NEXT_PUBLIC_APP_URL?.includes('amplifyapp.com') || process.env.NEXT_PUBLIC_APP_URL?.includes('mosc-temp.com')`n    ? 'https://www.adwiise.com/sign-in'" = "signInUrl: process.env.NEXT_PUBLIC_APP_URL?.includes('amplifyapp.com') || process.env.NEXT_PUBLIC_APP_URL?.includes('mcefee-temp.com')`n    ? 'https://www.kluvo.ai/sign-in'"
    }
    if (Update-FileContent -FilePath $middlewareFile -Replacements $replacements -IsDryRun $IsDryRun) {
        $filesUpdated++
    }

    # 3. src/app/(auth)/sign-in/[[...sign-in]]/page.tsx
    $signInFile = Join-Path $ProjectPath "src\app\(auth)\sign-in\[[...sign-in]]\page.tsx"
    if (Test-Path -LiteralPath $signInFile) {
        $replacements = @{
            "hostname.includes('mosc-temp.com')" = "hostname.includes('mcefee-temp.com')"
            "https://www.adwiise.com/sign-in" = "https://www.kluvo.ai/sign-in"
        }
        if (Update-FileContent -FilePath $signInFile -Replacements $replacements -IsDryRun $IsDryRun) {
            $filesUpdated++
        }
    } else {
        Write-Warning "File not found: $signInFile"
    }

    # 4. src/app/(auth)/sign-up/[[...sign-up]]/page.tsx
    $signUpFile = Join-Path $ProjectPath "src\app\(auth)\sign-up\[[...sign-up]]\page.tsx"
    if (Test-Path -LiteralPath $signUpFile) {
        $replacements = @{
            "hostname.includes('mosc-temp.com')" = "hostname.includes('mcefee-temp.com')"
            "https://www.adwiise.com/sign-up" = "https://www.kluvo.ai/sign-up"
        }
        if (Update-FileContent -FilePath $signUpFile -Replacements $replacements -IsDryRun $IsDryRun) {
            $filesUpdated++
        }
    } else {
        Write-Warning "File not found: $signUpFile"
    }

    # 5. src/app/__clerk/[...path]/route.ts (if exists)
    $clerkProxyFile = Join-Path $ProjectPath "src\app\__clerk\[...path]\route.ts"
    if (Test-Path -LiteralPath $clerkProxyFile) {
        $replacements = @{
            "clerk.adwiise.com" = "clerk.kluvo.ai"
            "https://clerk.adwiise.com" = "https://clerk.kluvo.ai"
        }
        if (Update-FileContent -FilePath $clerkProxyFile -Replacements $replacements -IsDryRun $IsDryRun) {
            $filesUpdated++
        }
    } else {
        Write-Info "File not found (optional): $clerkProxyFile (skipping - only needed for proxy mode)"
    }

    return $filesUpdated
}

# ==============================================================================
# Main Script Logic
# ==============================================================================

Write-Header "Clerk Domain Configuration Migration Script"

if ($DryRun) {
    Write-Warning "DRY RUN MODE - No files will be modified"
    Write-Host ""
}

Write-Info "Migration Summary:"
Write-Host "  Old Primary:     $oldPrimaryDomainWithWww"
Write-Host "  New Primary:     $newPrimaryDomainWithWww"
Write-Host "  Old Satellite:   $oldSatelliteDomainWithWww"
Write-Host "  New Satellite: $newSatelliteDomainWithWww"
Write-Host ""

# Verify project paths
if (-not (Test-Path $PrimaryProjectPath)) {
    Write-Error "Primary project path not found: $PrimaryProjectPath"
    exit 1
}

if (-not (Test-Path $SatelliteProjectPath)) {
    Write-Error "Satellite project path not found: $SatelliteProjectPath"
    exit 1
}

Write-Info "Primary project:   $PrimaryProjectPath"
Write-Info "Satellite project: $SatelliteProjectPath"
Write-Host ""

if (-not $DryRun -and -not $PSCmdlet.ShouldProcess("both projects", "Update domain configurations")) {
    Write-Warning "Operation cancelled by user"
    exit 0
}

# Update projects
$primaryFiles = Update-PrimaryProject -ProjectPath $PrimaryProjectPath -IsDryRun $DryRun
$satelliteFiles = Update-SatelliteProject -ProjectPath $SatelliteProjectPath -IsDryRun $DryRun

Write-Host ""
Write-Header "Migration Summary"

$totalFiles = $primaryFiles + $satelliteFiles

if ($DryRun) {
    Write-Info "Dry run completed. Found $totalFiles files that would be updated."
    Write-Host ""
    Write-Host "To apply changes, run without -DryRun flag:"
    Write-Host "  .\Update-ClerkDomainConfiguration.ps1" -ForegroundColor Yellow
} else {
    Write-Success "Migration completed!"
    Write-Info "Updated $primaryFiles files in primary project"
    Write-Info "Updated $satelliteFiles files in satellite project"
    Write-Host ""
    Write-Warning "Next steps:"
    Write-Host "  1. Review the changes with: git diff" -ForegroundColor Cyan
    Write-Host "  2. Test locally before committing" -ForegroundColor Cyan
    Write-Host "  3. Commit and push to trigger deployments" -ForegroundColor Cyan
}

exit 0

