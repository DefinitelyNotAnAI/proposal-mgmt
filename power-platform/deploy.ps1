param([string]$AzureConfigDir)
$ErrorActionPreference = 'Stop'
if ($AzureConfigDir) { $env:AZURE_CONFIG_DIR = $AzureConfigDir }
$config = Get-Content (Join-Path $PSScriptRoot 'config.json') -Raw | ConvertFrom-Json
$token = az account get-access-token --resource $config.organizationUrl --output json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Sign in to the demo tenant before deployment.' }
$headers = @{
    Authorization = "Bearer $($token.accessToken)"
    Accept = 'application/json'
    'OData-Version' = '4.0'
    'OData-MaxVersion' = '4.0'
    'MSCRM.SolutionUniqueName' = $config.solutionUniqueName
}
$api = "$($config.organizationUrl)/api/data/v9.2"
function Invoke-Dataverse([string]$Method, [string]$Path, $Body) {
    $parameters = @{ Method = $Method; Uri = "$api/$Path"; Headers = $headers; ContentType = 'application/json; charset=utf-8' }
    if ($null -ne $Body) { $parameters.Body = [Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 100 -Compress)) }
    Invoke-RestMethod @parameters
}
function Label([string]$Text) { @{ LocalizedLabels = @(@{ Label = $Text; LanguageCode = 1033 }) } }
function Text-Column([string]$Name, [string]$Title, [int]$Length = 200) {
    @{
        '@odata.type' = 'Microsoft.Dynamics.CRM.StringAttributeMetadata'
        SchemaName = $Name; DisplayName = (Label $Title); MaxLength = $Length
        RequiredLevel = @{ Value = 'None' }; FormatName = @{ Value = 'Text' }
    }
}

$who = Invoke-Dataverse GET 'WhoAmI'
if ($who.OrganizationId -ne 'bdd16c2a-49e3-f111-8be6-002248098a39') { throw 'Unexpected Dataverse organization. Deployment refused.' }
$solution = Invoke-Dataverse GET "solutions($($config.solutionId))?`$select=uniquename&`$expand=publisherid(`$select=customizationprefix)"
if ($solution.uniquename -ne $config.solutionUniqueName -or $solution.publisherid.customizationprefix -ne 'new') {
    throw 'Solution or publisher does not match the confirmed configuration.'
}
$tables = Invoke-Dataverse GET "EntityDefinitions?`$select=LogicalName&`$filter=LogicalName eq 'new_proposal'"
if ($tables.value.Count -eq 0) {
    $name = Text-Column new_name 'Proposal name'
    $name.IsPrimaryName = $true
    Invoke-Dataverse POST 'EntityDefinitions' @{
        '@odata.type' = 'Microsoft.Dynamics.CRM.EntityMetadata'
        SchemaName = 'new_Proposal'; EntitySetName = 'new_proposals'
        DisplayName = (Label 'Proposal'); DisplayCollectionName = (Label 'Proposals')
        Description = (Label 'Proposal workspace metadata for the fictional opportunity demo.')
        OwnershipType = 'UserOwned'; IsActivity = $false; HasActivities = $false; HasNotes = $false
        IsAuditEnabled = @{ Value = $true }; PrimaryNameAttribute = 'new_name'; Attributes = @($name)
    } | Out-Null
    Write-Output 'Created new_proposal table.'
}
$columns = @(
    (Text-Column new_opportunityid 'Opportunity ID' 100),
    (Text-Column new_opportunityname 'Opportunity name'),
    (Text-Column new_customer 'Customer'),
    (Text-Column new_salesstage 'Sales stage' 100),
    (Text-Column new_opportunityowner 'Fictional opportunity owner' 100),
    (Text-Column new_provisioningstatus 'Provisioning status' 30),
    (Text-Column new_foldername 'Workspace folder name' 150),
    (Text-Column new_workspacepath 'Workspace path' 400),
    (Text-Column new_workspaceurl 'Workspace URL' 1000),
    (Text-Column new_solicitationpath 'Solicitation folder path' 400),
    (Text-Column new_solicitationurl 'Solicitation folder URL' 1000),
    (Text-Column new_correlationid 'Provisioning flow run ID' 100),
    @{
        '@odata.type' = 'Microsoft.Dynamics.CRM.DecimalAttributeMetadata'; SchemaName = 'new_estimatedvalue'
        DisplayName = (Label 'Estimated contract value (USD)'); Precision = 2; MinValue = 0; MaxValue = 100000000000
    },
    @{
        '@odata.type' = 'Microsoft.Dynamics.CRM.MemoAttributeMetadata'; SchemaName = 'new_provisioningerror'
        DisplayName = (Label 'Provisioning error'); MaxLength = 4000
    }
)
foreach ($date in @('proposalduedate', 'requestedon', 'provisionedon')) {
    $dateOnly = $date -eq 'proposalduedate'
    $columns += @{
        '@odata.type' = 'Microsoft.Dynamics.CRM.DateTimeAttributeMetadata'; SchemaName = "new_$date"
        DisplayName = (Label $date); Format = $(if ($dateOnly) { 'DateOnly' } else { 'DateAndTime' })
        DateTimeBehavior = @{ Value = $(if ($dateOnly) { 'DateOnly' } else { 'UserLocal' }) }
    }
}
$existing = Invoke-Dataverse GET "EntityDefinitions(LogicalName='new_proposal')/Attributes?`$select=LogicalName"
foreach ($column in $columns) {
    if ($column.SchemaName.ToLowerInvariant() -notin $existing.value.LogicalName) {
        Invoke-Dataverse POST "EntityDefinitions(LogicalName='new_proposal')/Attributes" $column | Out-Null
        Write-Output "Created $($column.SchemaName)."
    }
}
$keys = Invoke-Dataverse GET "EntityDefinitions(LogicalName='new_proposal')/Keys"
if ('new_opportunitykey' -notin $keys.value.SchemaName) {
    Invoke-Dataverse POST "EntityDefinitions(LogicalName='new_proposal')/Keys" @{
        SchemaName = 'new_opportunitykey'; DisplayName = (Label 'Unique mock opportunity'); KeyAttributes = @('new_opportunityid')
    } | Out-Null
}
Invoke-Dataverse POST 'PublishXml' @{ ParameterXml = '<importexportxml><entities><entity>new_proposal</entity></entities></importexportxml>' } | Out-Null
$keyReady = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    $key = (Invoke-Dataverse GET "EntityDefinitions(LogicalName='new_proposal')/Keys").value | Where-Object SchemaName -eq new_opportunitykey
    if ($key.EntityKeyIndexStatus -eq 'Active') { $keyReady = $true; break }
    if ($key.EntityKeyIndexStatus -eq 'Failed') { throw 'The opportunity unique-key index failed.' }
    Start-Sleep -Seconds 2
}
if (-not $keyReady) { throw 'Unique key is not active yet. Re-run deployment after the index completes.' }

foreach ($reference in @(
    @{ logicalName = 'new_proposalsharepoint'; name = 'Proposal Management SharePoint'; connector = 'shared_sharepointonline'; connection = $config.sharePointConnectionId },
    @{ logicalName = 'new_proposaldataverse'; name = 'Proposal Management Dataverse'; connector = 'shared_commondataserviceforapps'; connection = $config.dataverseConnectionId }
)) {
    $found = Invoke-Dataverse GET "connectionreferences?`$filter=connectionreferencelogicalname eq '$($reference.logicalName)'&`$select=connectionreferenceid"
    if ($found.value.Count -eq 0) {
        Invoke-Dataverse POST 'connectionreferences' @{
            connectionreferencelogicalname = $reference.logicalName; connectionreferencedisplayname = $reference.name
            connectorid = "/providers/Microsoft.PowerApps/apis/$($reference.connector)"; connectionid = $reference.connection
        } | Out-Null
    }
}
function Deploy-Flow([string]$FlowId, [string]$Name, [switch]$Worker) {
$arguments = @((Join-Path $PSScriptRoot 'provisioning.mjs'))
if ($Worker) { $arguments += '--worker' }
$clientData = & node @arguments
if ($LASTEXITCODE -ne 0) { throw 'Flow definition generation failed.' }
$flows = Invoke-Dataverse GET "workflows?`$filter=workflowid eq $flowId&`$select=workflowid,statecode"
if ($flows.value.Count -eq 0) {
    Invoke-Dataverse POST 'workflows' @{
        workflowid = $flowId; category = 5; type = 1; primaryentity = 'none'
        name = $Name; description = 'Phase 2: idempotent SharePoint provisioning with persistent Dataverse status.'
        clientdata = $clientData
    } | Out-Null
} else {
    if ($flows.value[0].statecode -eq 1) { Invoke-Dataverse PATCH "workflows($flowId)" @{ statecode = 0; statuscode = 1 } | Out-Null }
    Invoke-Dataverse PATCH "workflows($flowId)" @{ clientdata = $clientData } | Out-Null
}
Invoke-Dataverse POST 'AddSolutionComponent' @{ ComponentId = $flowId; ComponentType = 29; SolutionUniqueName = $config.solutionUniqueName; AddRequiredComponents = $false } | Out-Null
Invoke-Dataverse PATCH "workflows($flowId)" @{ statecode = 1; statuscode = 2 } | Out-Null
Write-Output "Activated $Name ($flowId)."
}
Deploy-Flow $config.workerFlowId 'Provision Proposal Workspace Worker' -Worker
Deploy-Flow $config.provisioningFlowId 'Provision Proposal Workspace'
Write-Output 'Next: generate the Dataverse and flow code-app bindings with the Power Apps CLI.'
