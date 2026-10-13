# ==============================================================================
# Add-ClerkDnsRecords.ps1
# ==============================================================================
# Description: Batch-create all 5 Clerk CNAME records in Route 53 for a primary domain
# Author: System Administrator
# Created: 2025-01-25
# ==============================================================================

<#
.SYNOPSIS
    Creates all 5 required Clerk CNAME DNS records in AWS Route 53 for a primary domain.

.DESCRIPTION
    This script creates all 5 CNAME records required by Clerk for primary domain setup:
    1. clerk.{domain} → frontend-api.clerk.services (Frontend API)
    2. accounts.{domain} → accounts.clerk.services (Account portal)
    3. clkmail.{domain} → mail.{instance-id}.clerk.services (Email)
    4. clk._domainkey.{domain} → dkim1.{instance-id}.clerk.services (Email DKIM)
    5. clk2._domainkey.{domain} → dkim2.{instance-id}.clerk.services (Email DKIM)

    The script uses AWS Route 53 change-batch API to create all records in a single operation.

.PARAMETER Domain
    The primary domain name (without www prefix). Example: kluvo.ai

.PARAMETER HostedZoneId
    The Route 53 hosted zone ID for the domain. If not provided, script will attempt to find it.

.PARAMETER ClerkMailInstanceId
    The Clerk mail instance ID (e.g., "ulg16gghuyou" from mail.ulg16gghuyou.clerk.services).
    If not provided, script will prompt for it.

.PARAMETER TTL
    Time to live for DNS records. Default: 3600 (1 hour).

.EXAMPLE
    .\Add-ClerkDnsRecords.ps1 -Domain "kluvo.ai" -HostedZoneId "Z0123456789ABCDEF" -ClerkMailInstanceId "ulg16gghuyou"

    Creates all 5 CNAME records for kluvo.ai in the specified hosted zone.

.EXAMPLE
    .\Add-ClerkDnsRecords.ps1 -Domain "kluvo.ai"

    Prompts for hosted zone ID and Clerk mail instance ID, then creates records.
#>

[CmdletBinding(SupportsShouldProcess=$true)]
param(
    [Parameter(Mandatory=$true, HelpMessage="Domain name (e.g., kluvo.ai)")]
    [string]$Domain,

    [Parameter(Mandatory=$false, HelpMessage="Route 53 hosted zone ID")]
    [string]$HostedZoneId,

    [Parameter(Mandatory=$false, HelpMessage="Clerk mail instance ID (e.g., ulg16gghuyou from mail.ulg16gghuyou.clerk.services)")]
    [string]$ClerkMailInstanceId,

    [Parameter(Mandatory=$false)]
    [int]$TTL = 3600
)

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

function Test-AwsCliInstalled {
    $awsVersion = aws --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "AWS CLI is not installed or not in PATH"
        Write-Host "Please install AWS CLI: https://aws.amazon.com/cli/" -ForegroundColor Yellow
        return $false
    }
    Write-Info "AWS CLI found: $awsVersion"
    return $true
}

function Test-AwsCredentials {
    try {
        $result = aws sts get-caller-identity 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Error "AWS credentials not configured or invalid"
            Write-Host "Please run: aws configure" -ForegroundColor Yellow
            return $false
        }
        $identity = $result | ConvertFrom-Json
        Write-Info "AWS Identity: $($identity.Arn)"
        return $true
    }
    catch {
        Write-Error "Failed to verify AWS credentials: $_"
        return $false
    }
}

function Get-HostedZoneId {
    param([string]$DomainName)

    Write-Info "Searching for hosted zone ID for domain: $DomainName"

    try {
        # List hosted zones and find matching domain
        $zones = aws route53 list-hosted-zones --query "HostedZones[?Name=='$DomainName.'].Id" --output text 2>&1

        if ($LASTEXITCODE -eq 0 -and $zones -and $zones.Trim()) {
            # Extract zone ID (remove /hostedzone/ prefix if present)
            $zoneId = ($zones -replace '/hostedzone/', '').Trim()
            Write-Success "Found hosted zone ID: $zoneId"
            return $zoneId
        }

        Write-Warning "Hosted zone not found for $DomainName"
        Write-Host ""
        Write-Host "Available hosted zones:" -ForegroundColor Yellow
        aws route53 list-hosted-zones --query "HostedZones[*].[Name,Id]" --output table

        return $null
    }
    catch {
        Write-Error "Error searching for hosted zone: $_"
        return $null
    }
}

function Get-ClerkMailInstanceId {
    Write-Header "Clerk Mail Instance ID Required"

    Write-Host "The Clerk mail instance ID is required for email CNAME records."
    Write-Host ""
    Write-Host "To find it:" -ForegroundColor Yellow
    Write-Host "  1. Go to Clerk Dashboard → Configure → Domains"
    Write-Host "  2. Look at the Email section CNAME records"
    Write-Host "  3. The value will be like: mail.{INSTANCE_ID}.clerk.services"
    Write-Host "  4. Extract the {INSTANCE_ID} (e.g., 'ulg16gghuyou')"
    Write-Host ""

    $maxTries = 3
    $tryCount = 0

    while ($tryCount -lt $maxTries) {
        $instanceId = Read-Host "Enter Clerk mail instance ID (or 'cancel' to exit)"

        if ($instanceId -eq "cancel") {
            Write-Warning "Operation cancelled by user"
            return $null
        }

        if ($instanceId -match '^[a-z0-9]+$') {
            return $instanceId
        }

        $tryCount++
        Write-Error "Invalid format. Must be lowercase alphanumeric (e.g., ulg16gghuyou)"
        Write-Host "Attempts remaining: $($maxTries - $tryCount)" -ForegroundColor Yellow
        Write-Host ""
    }

    Write-Error "Maximum attempts reached. Exiting."
    return $null
}

function Create-ClerkDnsRecords {
    param(
        [string]$DomainName,
        [string]$ZoneId,
        [string]$MailInstanceId,
        [int]$RecordTTL
    )

    Write-Header "Creating Clerk DNS Records for $DomainName"

    # Remove trailing dot from domain if present (Route 53 adds it automatically)
    $cleanDomain = $DomainName.TrimEnd('.')

    # Define all 5 Clerk CNAME records
    $records = @(
        @{
            Name = "clerk.$cleanDomain"
            Type = "CNAME"
            Value = "frontend-api.clerk.services"
            Description = "Frontend API"
        },
        @{
            Name = "accounts.$cleanDomain"
            Type = "CNAME"
            Value = "accounts.clerk.services"
            Description = "Account portal"
        },
        @{
            Name = "clkmail.$cleanDomain"
            Type = "CNAME"
            Value = "mail.$MailInstanceId.clerk.services"
            Description = "Email service"
        },
        @{
            Name = "clk._domainkey.$cleanDomain"
            Type = "CNAME"
            Value = "dkim1.$MailInstanceId.clerk.services"
            Description = "Email DKIM #1"
        },
        @{
            Name = "clk2._domainkey.$cleanDomain"
            Type = "CNAME"
            Value = "dkim2.$MailInstanceId.clerk.services"
            Description = "Email DKIM #2"
        }
    )

    # Build change batch JSON
    $changes = @()
    foreach ($record in $records) {
        $changes += @{
            Action = "UPSERT"
            ResourceRecordSet = @{
                Name = "$($record.Name)."
                Type = $record.Type
                TTL = $RecordTTL
                ResourceRecords = @(
                    @{
                        Value = "$($record.Value)."
                    }
                )
            }
        }

        Write-Info "$($record.Description): $($record.Name) → $($record.Value)"
    }

    $changeBatch = @{
        Comment = "Add Clerk DNS records for $cleanDomain"
        Changes = $changes
    }

    $changeBatchJson = $changeBatch | ConvertTo-Json -Depth 10

    Write-Host ""
    Write-Info "Change batch JSON prepared:"
    Write-Host $changeBatchJson -ForegroundColor Gray
    Write-Host ""

    if (-not $PSCmdlet.ShouldProcess("Route 53 hosted zone $ZoneId", "Create 5 CNAME records")) {
        Write-Warning "Operation cancelled by user"
        return $false
    }

    # Save JSON to temp file (UTF-8 without BOM for AWS CLI compatibility)
    $tempFile = [System.IO.Path]::GetTempFileName()
    $tempFile = $tempFile -replace '\.tmp$', '.json'

    try {
        # Write UTF-8 without BOM (AWS CLI doesn't handle BOM)
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($tempFile, $changeBatchJson, $utf8NoBom)
        Write-Info "Saved change batch to: $tempFile"

        # Execute Route 53 change
        Write-Info "Executing Route 53 change-batch operation..."
        $result = aws route53 change-resource-record-sets `
            --hosted-zone-id $ZoneId `
            --change-batch "file://$tempFile" `
            2>&1

        if ($LASTEXITCODE -eq 0) {
            $changeInfo = $result | ConvertFrom-Json
            Write-Success "DNS records created successfully!"
            Write-Host ""
            Write-Host "Change ID: $($changeInfo.ChangeInfo.Id)" -ForegroundColor Yellow
            Write-Host "Status: $($changeInfo.ChangeInfo.Status)" -ForegroundColor Yellow
            Write-Host ""
            Write-Info "DNS propagation typically takes 5-60 minutes."
            Write-Info "Verify records in Clerk Dashboard after propagation."
            return $true
        }
        else {
            Write-Error "Failed to create DNS records"
            Write-Host $result -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Error "Error executing Route 53 change: $_"
        return $false
    }
    finally {
        # Clean up temp file
        if (Test-Path $tempFile) {
            Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
        }
    }
}

# ==============================================================================
# Main Script Logic
# ==============================================================================

Write-Header "Clerk DNS Records Setup Script"

# Step 1: Verify AWS CLI
if (-not (Test-AwsCliInstalled)) {
    exit 1
}

if (-not (Test-AwsCredentials)) {
    exit 1
}

# Step 2: Get Hosted Zone ID
if ([string]::IsNullOrWhiteSpace($HostedZoneId)) {
    $HostedZoneId = Get-HostedZoneId -DomainName $Domain

    if ([string]::IsNullOrWhiteSpace($HostedZoneId)) {
        Write-Host ""
        $HostedZoneId = Read-Host "Enter hosted zone ID manually (or 'cancel' to exit)"

        if ($HostedZoneId -eq "cancel" -or [string]::IsNullOrWhiteSpace($HostedZoneId)) {
            Write-Warning "Operation cancelled"
            exit 1
        }
    }
}

# Step 3: Get Clerk Mail Instance ID
if ([string]::IsNullOrWhiteSpace($ClerkMailInstanceId)) {
    $ClerkMailInstanceId = Get-ClerkMailInstanceId

    if ([string]::IsNullOrWhiteSpace($ClerkMailInstanceId)) {
        Write-Error "Clerk mail instance ID is required"
        exit 1
    }
}

# Step 4: Confirm operation
Write-Header "Configuration Summary"
Write-Host "Domain:                  " -NoNewline
Write-Host $Domain -ForegroundColor Cyan
Write-Host "Hosted Zone ID:          " -NoNewline
Write-Host $HostedZoneId -ForegroundColor Cyan
Write-Host "Clerk Mail Instance ID:  " -NoNewline
Write-Host $ClerkMailInstanceId -ForegroundColor Cyan
Write-Host "TTL:                     " -NoNewline
Write-Host $TTL -ForegroundColor Cyan
Write-Host ""
Write-Host "This will create 5 CNAME records:" -ForegroundColor Yellow
Write-Host "  1. clerk.$Domain → frontend-api.clerk.services"
Write-Host "  2. accounts.$Domain → accounts.clerk.services"
Write-Host "  3. clkmail.$Domain → mail.$ClerkMailInstanceId.clerk.services"
Write-Host "  4. clk._domainkey.$Domain → dkim1.$ClerkMailInstanceId.clerk.services"
Write-Host "  5. clk2._domainkey.$Domain → dkim2.$ClerkMailInstanceId.clerk.services"
Write-Host ""

$confirm = Read-Host "Continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Warning "Operation cancelled by user"
    exit 0
}

# Step 5: Create DNS records
$success = Create-ClerkDnsRecords -DomainName $Domain -ZoneId $HostedZoneId -MailInstanceId $ClerkMailInstanceId -RecordTTL $TTL

if ($success) {
    Write-Host ""
    Write-Success "Setup complete! Next steps:"
    Write-Host "  1. Wait 5-60 minutes for DNS propagation"
    Write-Host "  2. Go to Clerk Dashboard → Configure → Domains"
    Write-Host "  3. Click 'Verify' for each domain section"
    Write-Host "  4. SSL certificates will be issued automatically after verification"
    Write-Host ""
    exit 0
}
else {
    Write-Error "Setup failed. Please check the errors above."
    exit 1
}

