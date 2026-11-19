import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const config = JSON.parse(await readFile(new URL('./config.json', import.meta.url), 'utf8'))
const opportunities = JSON.parse(await readFile(new URL('../src/data/opportunities.json', import.meta.url), 'utf8'))
const folders = JSON.parse(await readFile(new URL('../src/data/workspaceFolders.json', import.meta.url), 'utf8'))

function action(connector, operationId, parameters, after) {
  return {
    type: 'OpenApiConnection',
    inputs: {
      host: { apiId: `/providers/Microsoft.PowerApps/apis/${connector}`, connectionName: connector, operationId },
      parameters,
      authentication: "@parameters('$authentication')",
    },
    runAfter: after ? { [after]: ['Succeeded'] } : {},
  }
}
const dv = (operation, parameters, after) => action('shared_commondataserviceforapps', operation, parameters, after)
const sp = (operation, parameters, after) => action('shared_sharepointonline', operation, { dataset: config.siteUrl, ...parameters }, after)
const update = (values, after) => dv('UpdateOnlyRecord', {
  entityName: 'new_proposals', recordId: "@variables('proposalId')",
  ...Object.fromEntries(Object.entries(values).map(([key, value]) => [`item/${key}`, value])),
}, after)
const set = (name, value, after) => ({ type: 'SetVariable', inputs: { name, value }, runAfter: after ? { [after]: ['Succeeded'] } : {} })
const respond = (after) => ({
  type: 'Response', kind: 'PowerApp',
  inputs: {
    statusCode: 200,
    body: { proposalid: "@variables('proposalId')" },
    schema: { type: 'object', properties: { proposalid: { title: 'proposalId', type: 'string', 'x-ms-content-hint': 'TEXT' } } },
  },
  runAfter: after ? { [after]: ['Succeeded'] } : {},
})

export function workspaceFolderName(opportunity) {
  return `${opportunity.id} - ${opportunity.name}`.normalize('NFKC')
    .replace(/["*:<>?/\\|#%'\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').slice(0, 150)
}

const catalog = opportunities.map((opportunity) => ({ ...opportunity, folderName: workspaceFolderName(opportunity) }))
const reference = (name, id) => ({
  runtimeSource: 'embedded',
  connection: { name: id, connectionReferenceLogicalName: name },
  api: { name: name === 'new_proposalsharepoint' ? 'shared_sharepointonline' : 'shared_commondataserviceforapps' },
})

const definition = {
  $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
  contentVersion: '1.0.0.0',
  parameters: {
    $connections: { defaultValue: {}, type: 'Object' },
    $authentication: { defaultValue: {}, type: 'SecureObject' },
  },
  triggers: {
    manual: {
      type: 'Request', kind: 'PowerAppV2',
      inputs: {
        schema: {
          type: 'object',
          properties: { text: { title: 'opportunityId', type: 'string', 'x-ms-content-hint': 'TEXT', 'x-ms-dynamically-added': true } },
          required: ['text'],
        },
      },
      runtimeConfiguration: { concurrency: { runs: 1, maximumWaitingRuns: 20 } },
    },
  },
  actions: {
    Initialize: {
      type: 'InitializeVariable',
      inputs: { variables: [{ name: 'proposalId', type: 'string', value: '' }, { name: 'folderName', type: 'string', value: '' }] },
      runAfter: {},
    },
    Matching_opportunity: {
      type: 'Query', inputs: { from: catalog, where: "@equals(item()?['id'], triggerBody()?['text'])" },
      runAfter: { Initialize: ['Succeeded'] },
    },
    Validate_opportunity: {
      type: 'If',
      expression: { equals: ["@length(body('Matching_opportunity'))", 1] },
      actions: {},
      else: { actions: { Invalid_opportunity: { type: 'Terminate', inputs: { runStatus: 'Failed', runError: { code: 'InvalidOpportunity', message: 'Select a configured demo opportunity.' } }, runAfter: {} } } },
      runAfter: { Matching_opportunity: ['Succeeded'] },
    },
    Provision: {
      type: 'Scope', runAfter: { Validate_opportunity: ['Succeeded'] },
      actions: {
        Find_requester: dv('ListRecords', {
          entityName: 'systemusers',
          $filter: "@concat('azureactivedirectoryobjectid eq ', triggerOutputs()?['headers']?['x-ms-user-id'])",
          $select: 'systemuserid', $top: 2,
        }),
        Validate_requester: {
          type: 'If', expression: { equals: ["@length(body('Find_requester')?['value'])", 1] },
          actions: {},
          else: { actions: { Unresolved_requester: { type: 'Terminate', inputs: { runStatus: 'Failed', runError: { code: 'UnknownRequester', message: 'The authenticated caller must resolve to one Dataverse user.' } }, runAfter: {} } } },
          runAfter: { Find_requester: ['Succeeded'] },
        },
        Find_proposal: dv('ListRecords', {
          entityName: 'new_proposals',
          $filter: "@concat('new_opportunityid eq ''', triggerBody()?['text'], '''')",
          $select: 'new_proposalid,new_foldername,new_provisioningstatus', $top: 2,
        }, 'Validate_requester'),
        Existing_proposal: {
          type: 'If', expression: { greater: ["@length(body('Find_proposal')?['value'])", 0] },
          actions: {
            Existing_id: set('proposalId', "@first(body('Find_proposal')?['value'])?['new_proposalid']"),
            Existing_folder: set('folderName', "@first(body('Find_proposal')?['value'])?['new_foldername']", 'Existing_id'),
          },
          else: {
            actions: {
              Create_proposal: dv('CreateRecord', {
                entityName: 'new_proposals',
                'item/new_name': "@first(body('Matching_opportunity'))?['name']",
                'item/new_opportunityid': "@triggerBody()?['text']",
                'item/new_opportunityname': "@first(body('Matching_opportunity'))?['name']",
                'item/new_customer': "@first(body('Matching_opportunity'))?['customer']",
                'item/new_estimatedvalue': "@first(body('Matching_opportunity'))?['estimatedValue']",
                'item/new_salesstage': "@first(body('Matching_opportunity'))?['salesStage']",
                'item/new_opportunityowner': "@first(body('Matching_opportunity'))?['owner']",
                'item/new_proposalduedate': "@first(body('Matching_opportunity'))?['proposalDueDate']",
                'item/new_foldername': "@first(body('Matching_opportunity'))?['folderName']",
                'item/new_provisioningstatus': 'Requested',
                'item/new_requestedon': '@utcNow()',
                'item/ownerid@odata.bind': "@concat('systemusers(', first(body('Find_requester')?['value'])?['systemuserid'], ')')",
              }),
              Created_id: set('proposalId', "@body('Create_proposal')?['new_proposalid']", 'Create_proposal'),
              Created_folder: set('folderName', "@first(body('Matching_opportunity'))?['folderName']", 'Created_id'),
            },
          },
          runAfter: { Find_proposal: ['Succeeded'] },
        },
        Respond_to_app: respond('Existing_proposal'),
        Needs_provisioning: {
          type: 'If',
          expression: { not: { equals: ["@if(empty(body('Find_proposal')?['value']), '', first(body('Find_proposal')?['value'])?['new_provisioningstatus'])", 'Ready'] } },
          actions: {
            Mark_provisioning: update({ new_provisioningstatus: 'Provisioning', new_provisioningerror: '', new_correlationid: "@workflow()?['run']?['name']" }),
            Library: sp('HttpRequest', {
              'parameters/method': 'GET',
              'parameters/uri': `_api/web/lists(guid'${config.libraryId}')/RootFolder?$select=ServerRelativeUrl`,
              'parameters/headers': { Accept: 'application/json;odata=nometadata' },
            }, 'Mark_provisioning'),
            Ensure_folders: {
              type: 'Foreach',
              foreach: [
                config.parentFolder,
                `@concat('${config.parentFolder}/', variables('folderName'))`,
                ...folders.map((folder) => `@concat('${config.parentFolder}/', variables('folderName'), '/${folder}')`),
              ],
              runtimeConfiguration: { concurrency: { repetitions: 1 } },
              actions: {
                Get_folder: sp('HttpRequest', {
                  'parameters/method': 'GET',
                  'parameters/uri': "@concat('_api/web/GetFolderByServerRelativePath(decodedurl=''', replace(concat(body('Library')?['ServerRelativeUrl'], '/', item()), '''', ''''''), ''')?$select=ServerRelativeUrl')",
                  'parameters/headers': { Accept: 'application/json;odata=nometadata' },
                }),
                Folder_missing: {
                  type: 'If',
                  expression: { equals: ["@outputs('Get_folder')?['statusCode']", 404] },
                  actions: {
                    Create_folder: sp('CreateNewFolder', { table: config.libraryId, 'parameters/path': '@item()' }),
                  },
                  else: { actions: {} },
                  runAfter: { Get_folder: ['Succeeded', 'Failed'] },
                },
                Verify_folder: sp('HttpRequest', {
                  'parameters/method': 'GET',
                  'parameters/uri': "@concat('_api/web/GetFolderByServerRelativePath(decodedurl=''', replace(concat(body('Library')?['ServerRelativeUrl'], '/', item()), '''', ''''''), ''')?$select=ServerRelativeUrl')",
                  'parameters/headers': { Accept: 'application/json;odata=nometadata' },
                }, 'Folder_missing'),
              },
              runAfter: { Library: ['Succeeded'] },
            },
            Mark_ready: update({
              new_provisioningstatus: 'Ready', new_provisionedon: '@utcNow()', new_provisioningerror: '',
              new_workspacepath: `@concat(body('Library')?['ServerRelativeUrl'], '/${config.parentFolder}/', variables('folderName'))`,
              new_workspaceurl: `@concat('https://0pnq2.sharepoint.com', body('Library')?['ServerRelativeUrl'], '/${config.parentFolder}/', uriComponent(variables('folderName')))`,
              new_solicitationpath: `@concat(body('Library')?['ServerRelativeUrl'], '/${config.parentFolder}/', variables('folderName'), '/02 Solicitation Documents')`,
              new_solicitationurl: `@concat('https://0pnq2.sharepoint.com', body('Library')?['ServerRelativeUrl'], '/${config.parentFolder}/', uriComponent(variables('folderName')), '/02%20Solicitation%20Documents')`,
            }, 'Ensure_folders'),
          },
          else: { actions: {} },
          runAfter: { Respond_to_app: ['Succeeded'] },
        },
      },
    },
    Failure: {
      type: 'If', expression: { not: { equals: ["@variables('proposalId')", ''] } },
      actions: {
        Mark_failed: update({
          new_provisioningstatus: 'Failed',
          new_provisioningerror: "@concat('Provisioning failed. Inspect flow run ', workflow()?['run']?['name'], ' for the failed action, correct the connection or SharePoint issue, then retry.')",
          new_correlationid: "@workflow()?['run']?['name']",
        }),
      },
      else: { actions: {} },
      runAfter: { Provision: ['Failed', 'TimedOut'] },
    },
  },
}

const workerActions = definition.actions.Provision.actions.Needs_provisioning.actions
delete definition.triggers.manual.runtimeConfiguration
delete definition.actions.Provision.actions.Needs_provisioning
definition.actions.Provision.actions.Queue_retry = {
  type: 'If',
  expression: { equals: ["@if(empty(body('Find_proposal')?['value']), '', first(body('Find_proposal')?['value'])?['new_provisioningstatus'])", 'Failed'] },
  actions: { Request_retry: update({ new_provisioningstatus: 'Requested', new_provisioningerror: '', new_requestedon: '@utcNow()' }) },
  else: { actions: {} },
  runAfter: { Existing_proposal: ['Succeeded'] },
}
definition.actions.Provision.actions.Respond_to_app.runAfter = { Queue_retry: ['Succeeded'] }
// A simultaneous create can lose the unique-key race; only a verified existing row is success.
definition.actions.Failure = {
  type: 'Scope', runAfter: { Provision: ['Failed', 'TimedOut'] },
  actions: {
    Recover_existing: dv('ListRecords', {
      entityName: 'new_proposals',
      $filter: "@concat('new_opportunityid eq ''', triggerBody()?['text'], '''')",
      $select: 'new_proposalid', $top: 2,
    }),
    Check_existing: {
      type: 'If', expression: { and: [
        { equals: ["@length(body('Recover_existing')?['value'])", 1] },
        { or: [
          { equals: ["@actions('Create_proposal')?['status']", 'Failed'] },
          { equals: ["@actions('Create_proposal')?['status']", 'TimedOut'] },
        ] },
      ] },
      actions: {
        Recovered_id: set('proposalId', "@first(body('Recover_existing')?['value'])?['new_proposalid']"),
        Respond_existing: respond('Recovered_id'),
      },
      else: { actions: { Request_failed: { type: 'Terminate', inputs: { runStatus: 'Failed', runError: { code: 'RequestFailed', message: 'Workspace request failed. Inspect the flow run before retrying.' } }, runAfter: {} } } },
      runAfter: { Recover_existing: ['Succeeded'] },
    },
  },
}
workerActions.Mark_provisioning.runAfter = { Set_folder: ['Succeeded'] }
const workerDefinition = {
  $schema: definition.$schema,
  contentVersion: definition.contentVersion,
  parameters: definition.parameters,
  triggers: {
    When_requested: {
      type: 'OpenApiConnectionWebhook',
      inputs: {
        host: { apiId: '/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps', connectionName: 'shared_commondataserviceforapps', operationId: 'SubscribeWebhookTrigger' },
        parameters: {
          'subscriptionRequest/message': 4,
          'subscriptionRequest/entityname': 'new_proposal',
          'subscriptionRequest/scope': 4,
          'subscriptionRequest/filteringattributes': 'new_provisioningstatus',
          'subscriptionRequest/filterexpression': "new_provisioningstatus eq 'Requested'",
        },
        authentication: "@parameters('$authentication')",
      },
      runtimeConfiguration: { concurrency: { runs: 1, maximumWaitingRuns: 20 } },
    },
  },
  actions: {
    Initialize: {
      type: 'InitializeVariable',
      inputs: { variables: [
        { name: 'proposalId', type: 'string', value: "@triggerBody()?['new_proposalid']" },
        { name: 'folderName', type: 'string', value: '' },
      ] },
      runAfter: {},
    },
    Read_current: dv('ListRecords', {
      entityName: 'new_proposals',
      $filter: "@concat('new_proposalid eq ', variables('proposalId'))",
      $select: 'new_proposalid,new_foldername,new_provisioningstatus', $top: 1,
    }, 'Initialize'),
    Provision: {
      type: 'If',
      expression: { equals: ["@first(body('Read_current')?['value'])?['new_provisioningstatus']", 'Requested'] },
      actions: { Set_folder: set('folderName', "@first(body('Read_current')?['value'])?['new_foldername']"), ...workerActions },
      else: { actions: {} },
      runAfter: { Read_current: ['Succeeded'] },
    },
    Failure: {
      type: 'Scope', runAfter: { Provision: ['Failed', 'TimedOut'] },
      actions: { Mark_failed: update({
        new_provisioningstatus: 'Failed',
        new_provisioningerror: "@concat('Provisioning failed. Inspect flow run ', workflow()?['run']?['name'], ' for the failed action, correct the connection or SharePoint issue, then retry.')",
        new_correlationid: "@workflow()?['run']?['name']",
      }) },
    },
  },
}
function clientDataFor(flowDefinition) {
  return {
  properties: {
    connectionReferences: {
      shared_sharepointonline: reference('new_proposalsharepoint', config.sharePointConnectionId),
      shared_commondataserviceforapps: reference('new_proposaldataverse', config.dataverseConnectionId),
    },
    definition: flowDefinition,
  },
  schemaVersion: '1.0.0.0',
  }
}
export const clientData = clientDataFor(definition)
export const workerClientData = clientDataFor(workerDefinition)

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.stdout.write(JSON.stringify(process.argv.includes('--worker') ? workerClientData : clientData))
}
