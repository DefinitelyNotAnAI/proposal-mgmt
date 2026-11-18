# Proposal Management Center

Phase 1 foundation for the [project specification](docs/spec.md), built with React, TypeScript, Fluent UI React v9, Vite, and Power Apps Code Apps.

## Running and validating

Use Node.js 20.19+ or 22.12+ as required by Vite 7:

```powershell
npm install
npm run dev -- --port 3000
npm run build
npm run lint
```

Port 3000 matches the existing Power Apps local app URL. Open the URL printed by Vite. Add `--strictPort` to fail rather than use another port if it is occupied.

The existing Power Apps SDK, Vite plugin, and `power.config.json` remain unchanged. No connection or database references have been added.

## Phase 1 functionality

- Responsive Fluent UI shell with keyboard-accessible controls, skip link, and focus indicators.
- Opportunity dashboard and workspace preview navigation, preserving selection during the current app session.
- Four fictional opportunities with IDs, customers, estimated USD contract values, sales stages, owners, and date-only due dates displayed in UTC.
- **Dynamics 365 Opportunities (Demo Data)** selector with loading, empty, error/retry, and invalid-data feedback.
- Planned nine-folder structure and clearly unprovisioned workspace/document/analysis states.
- Light/dark appearance based on system preference at page load. Override using `?scoutTheme=light` or `?scoutTheme=dark`.

### Application structure

- `src/types/opportunity.ts`: opportunity model and replaceable `OpportunityProvider` contract.
- `src/data/opportunities.json`: synthetic local opportunity records.
- `src/services/opportunityService.ts`: asynchronous JSON loading, validation, and explicit errors. A future adapter can implement the same contract.
- `src/components/OpportunityDetails.tsx`: selected opportunity details.
- `src/components/WorkspacePreview.tsx`: planned workspace and future document/analysis interface.
- `src/App.tsx`: state, navigation, loading, Fluent theme, and dashboard.
- `src/index.css` and `src/App.css`: theme variables and responsive layout.

Selection is not persisted across browser reloads. No test framework is installed; use build/lint and browser checks for this foundation.

### Deliberately unavailable

**Create Proposal Workspace**, **Open Solicitation Documents**, and **Refresh Documents** are disabled pending Phase 2. No proposal record or SharePoint folder exists. Folder names represent a plan; no workspace URLs or document inventory are fabricated.

**Analyze Proposal** and Requirements Analysis are disabled until Phase 3. Proposal Governance and approvals are disabled until Phase 4. No successful workflows, requirements, decisions, analysis progress, or completion metrics are simulated.

There are **no live Dynamics 365, Dataverse, SharePoint, Power Automate, or Azure integrations** and no frontend credentials. Authentication/hosting remains the responsibility of the existing Power Apps configuration; this phase does not configure or claim to validate deployed authentication.

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
