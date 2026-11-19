# Proposal Management Center

Phase 2 workspace provisioning for the [project specification](docs/spec.md), built with React, TypeScript, Fluent UI React v9, Vite, and Power Apps Code Apps.

## Running and validating

Use Node.js 20.19+ or 22.12+ as required by Vite 7:

```powershell
npm install
npm run dev -- --port 3000
npm run build
npm run lint
```

Port 3000 matches the existing Power Apps local app URL. Open the URL printed by Vite. Add `--strictPort` to fail rather than use another port if it is occupied.

The existing Power Apps SDK, Vite plugin, target environment, and hosting settings are retained. The Power Apps CLI adds generated Dataverse, SharePoint, and flow bindings to `power.config.json`, `.power`, and `src/generated`. Do not hand-edit generated files.

Use the **Local Play** URL printed by the Power Apps Vite plugin for authenticated service access. A standalone localhost page can display the shell and mock opportunities, but it does not supply the Power Apps connection runtime; connection errors are shown rather than simulated success.

Published Code Apps require a qualifying Power Apps Premium entitlement or supported capacity-based licensing; Power Apps for Microsoft 365 alone is not sufficient. Users must also consent to the app's connector connections when Power Apps prompts. Licensing and connection consent are separate from SharePoint site membership and Dataverse permissions.

## Phase 2 architecture and deployment

- `power-platform/config.json` contains the confirmed development environment, existing solution, SharePoint library, connection IDs, and stable flow IDs. These are resource identifiers, not credentials.
- `power-platform/deploy.ps1` creates the user-owned `new_proposal` table, snapshot/status/reference columns, unique opportunity key, connection references, and two solution-aware flows in **Proposal Management Demo**. It is additive and can resume after the asynchronous unique-key index becomes active.
- **Provision Proposal Workspace** uses the supported Power Apps V2 trigger. It resolves the authenticated requester's Dataverse identity, creates or locates a proposal, queues failed proposals for retry, and returns the proposal ID. Opportunity details come from the configured fictional catalog, not user-supplied path strings.
- **Provision Proposal Workspace Worker** reacts to newly added or modified Requested proposals. Global trigger concurrency is one; it rereads current status, creates only missing folders, verifies each folder, saves real SharePoint URLs, and marks Ready only after successful verification. Partial failures retain the record/folders and persist a flow-run reference for diagnosis.
- Folder names are frozen in Dataverse. Repeated requests and renamed opportunities reuse the same workspace. No folder, proposal, or template is deleted by provisioning.
- Workspaces live under **Documents > Proposals** in the configured private Team site and inherit permissions. No templates are configured.
- The client polls status every five seconds while provisioning, stops polling on errors, and exposes Refresh Status to recover. Requests with uncertain outcomes require a status refresh before another attempt.
- Inventory is loaded through the SharePoint connector, filtered to direct files in the exact solicitation folder. Unsupported types remain visible; uploads happen only in SharePoint. Partial inventories are rejected explicitly rather than silently truncated.

Deployment requires an authenticated Azure CLI session in the demo tenant with a token for the configured Dataverse organization:

```powershell
.\power-platform\deploy.ps1
npm exec -- pa app add data-source --connector dataverse --table new_proposal --org-url https://org19eb8ebf.crm.dynamics.com/ --non-interactive
npm exec -- pa app add flow --flow-id b9e53cc5-62c2-48f5-93bc-c9bb3497f6e2 --non-interactive
npm run build
npm exec -- pa app push --solution-id 3aff7e97-4ae3-f111-84e8-70a8a5af8fa3 --non-interactive
```

For an isolated Azure CLI profile, pass `-AzureConfigDir <directory>` to the deployment script after authenticating that profile. Never put tokens, passwords, or signed trigger URLs in this repository. Quiesce requests and wait for active worker runs to finish before redeploying flows; deployment briefly deactivates them.

The configured maker account owns the embedded flow connections. The requester owns the resulting proposal record. Additional demo users need app/flow run access, appropriate Dataverse proposal read permissions, and site/library membership; this implementation does not grant tenant-wide access or alter existing security roles. Keep the table's provisioning fields restricted to trusted makers/flow identity if expanding beyond the single-maker demo.

Focused tests use Node's built-in runner (Node 22.18+ or 24+ for TypeScript stripping), without adding a test framework:

```powershell
node --test .\tests\workspace.test.mjs
```

## Phase 1 functionality

- Responsive Fluent UI shell with keyboard-accessible controls, skip link, and focus indicators.
- Opportunity dashboard and proposal workspace navigation, preserving selection during the current app session.
- Four fictional opportunities with IDs, customers, estimated USD contract values, sales stages, owners, and date-only due dates displayed in UTC.
- **Dynamics 365 Opportunities (Demo Data)** selector with loading, empty, error/retry, and invalid-data feedback.
- Nine-folder structure with clear provisioning, document, and future analysis states.
- Light/dark appearance based on system preference at page load. Override using `?scoutTheme=light` or `?scoutTheme=dark`.

### Application structure

- `src/types/opportunity.ts`: opportunity model and replaceable `OpportunityProvider` contract.
- `src/data/opportunities.json`: synthetic local opportunity records.
- `src/services/opportunityService.ts`: bundled local JSON behind an asynchronous, cancellable provider with validation and explicit errors. Bundling avoids a separate data fetch in the Power Apps host. A future adapter can implement the same contract.
- `src/components/OpportunityDetails.tsx`: selected opportunity details.
- `src/components/WorkspacePanel.tsx`: live workspace status, retry controls, links, and document inventory.
- `src/services/workspaceService.ts` and `workspaceMapping.ts`: generated SDK adapters and validated domain mapping.
- `src/App.tsx`: state, navigation, loading, Fluent theme, and dashboard.
- `src/index.css` and `src/App.css`: theme variables and responsive layout.

Opportunity selection is not persisted across browser reloads. Proposal status and workspace references persist in Dataverse and are recovered when the opportunity is selected again.

### Deliberately unavailable

**Create Proposal Workspace** is enabled only after a successful status check for a selected opportunity. **Open Solicitation Documents** and **Refresh Documents** become available only when the workspace is Ready. Connection failures remain visible; no workspace URLs or document inventory are fabricated.

**Analyze Proposal** and Requirements Analysis are disabled until Phase 3. Proposal Governance and approvals are disabled until Phase 4. No successful workflows, requirements, decisions, analysis progress, or completion metrics are simulated.

**Dynamics 365 remains mocked.** There are no Azure AI integrations or frontend credentials. Authentication and connection hosting remain the responsibility of Power Apps.

This fictional-data demonstration is not production-ready or represented as GCC High-compliant.

---

## Original starter reference

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

It is preconfigured to work with Power Apps Code Apps.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
