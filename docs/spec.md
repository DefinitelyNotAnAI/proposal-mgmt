# Proposal Management Center

## Project Specification

**Version:** 1.0

**Status:** Development baseline

**Platform:** Power Apps Code Apps, React, Dataverse, SharePoint, Power Automate, Azure AI

### 1\. Project objective

Build an AI\-enabled proposal management application demonstrating how federal contractors can use Microsoft Power Platform and Azure AI to automate business development collaboration, analyze solicitation documents, and govern proposal development.

The demonstration is inspired by SAIC's Virtual Proposal Center modernization requirements but is not intended to reproduce the incumbent product exactly.

The application will demonstrate:

1. Opportunity\-driven proposal workspace creation.
2. Automated SharePoint folder provisioning.
3. Multi\-document solicitation analysis using Azure AI Document Intelligence.
4. AI\-assisted extraction and classification of proposal requirements.
5. Human validation and assignment of requirements.
6. Governed proposal development and approval workflows.

The application must demonstrate capabilities beyond conversational agents by embedding AI into structured business processes.

### 2\. Technology architecture

| Component | Technology | Responsibility |
| --- | --- | --- |
| User interface | React, TypeScript, Fluent UI | Proposal management experience |
| Application hosting | Power Apps Code Apps | Authentication, hosting, Power Platform connectivity |
| Opportunity data | Local JSON | Mock Dynamics 365 opportunity selection |
| Business data | Dataverse | Proposals, requirements, assignments, approvals |
| Document storage | SharePoint Online | Proposal files, templates, version history |
| Workflow orchestration | Power Automate | Provisioning, notifications, approvals |
| Document extraction | Azure AI Document Intelligence | Text, tables, layout extraction |
| AI interpretation | Azure AI model | Requirement identification and classification |
| Collaboration | Microsoft Teams | Notifications and collaboration |

Use authenticated backend services where necessary for long\-running analysis. Do not call Azure AI endpoints using credentials embedded in the React application.

### 3\. Functional requirements

#### FR\-01: Opportunity selection

The application must provide a dropdown labeled **Dynamics 365 Opportunities (Demo Data)**.

Populate the dropdown with three to five fictional opportunities.

Each opportunity contains:

- Opportunity ID
- Opportunity name
- Customer name
- Estimated contract value
- Sales stage
- Opportunity owner
- Proposal due date

Selecting an opportunity displays its details.

**Important:** Do not implement Dynamics 365 integration. Opportunity information must come from local mock data.

Structure the code so that the mock data provider could eventually be replaced by a real Dynamics 365 adapter.

#### FR\-02: Proposal workspace provisioning

Provide a **Create Proposal Workspace** button.

When selected, the application initiates a Power Automate workflow that:

1. Creates a proposal record in Dataverse.
2. Creates a proposal folder within a designated SharePoint document library.
3. Creates standard proposal subfolders.
4. Copies available proposal templates.
5. Saves SharePoint workspace references in Dataverse.
6. Returns provisioning status to the application.

Use the following initial folder structure:

- 01 Opportunity Intelligence
- 02 Solicitation Documents
- 03 Compliance Matrix
- 04 Technical Proposal
- 05 Management Proposal
- 06 Past Performance
- 07 Pricing
- 08 Reviews
- 09 Final Submission

For the MVP, create proposal folders within one dedicated SharePoint site rather than provisioning separate site collections.

Provisioning must be idempotent. Repeated requests must not create duplicate workspaces.

#### FR\-03: Proposal document management

The application must provide an **Open Solicitation Documents** button.

Selecting the button opens the corresponding SharePoint folder.

Users upload proposal documents directly through SharePoint.

Supported initial document formats:

- PDF
- DOCX

The application must display an inventory of uploaded documents, including:

- File name
- File type
- Last modified date
- SharePoint version identifier
- Analysis status

Provide a Refresh Documents action.

Do not build a separate document\-upload interface in React.

#### FR\-04: Proposal document analysis

Provide an **Analyze Proposal** button.

Analysis must begin only when explicitly requested by the user.

When selected:

1. Retrieve the supported documents from the proposal's SharePoint solicitation folder.
2. Record the exact files and versions included in the analysis.
3. Create an analysis job.
4. Process each document independently using Azure AI Document Intelligence.
5. Extract text, tables, and document structure.
6. Pass extracted content to an AI model for requirement interpretation.
7. Consolidate requirements across the solicitation package.
8. Preserve references to the original documents.
9. Save proposed requirements to Dataverse.
10. Update analysis status.

Processing must be asynchronous so the React interface remains responsive.

Display progress and failures clearly.

Unsupported documents must be identified rather than silently ignored.

#### FR\-05: Requirements extraction

The AI workflow must attempt to identify:

- Technical requirements
- Management requirements
- Security requirements
- Compliance requirements
- Evaluation criteria
- Submission instructions

Each extracted requirement must contain:

| Field | Description |
| --- | --- |
| Requirement ID | Unique identifier |
| Source document | Original SharePoint file |
| Source version | Version included in the analysis |
| Source location | Page, section, or other available reference |
| Original text | Supporting passage from the document |
| Interpretation | AI\-generated requirement description |
| Category | Requirement classification |
| Validation status | Proposed, Accepted, Edited, Rejected |
| Assigned owner | Responsible contributor |
| Work status | Not Started, In Progress, Ready for Review, Complete |
| Supporting evidence | Links to relevant documents |

Source references must be preserved throughout processing.

Do not fabricate page numbers or confidence scores when the extraction service does not provide them.

#### FR\-06: Human validation

Extracted requirements must initially have a **Proposed** status.

The application must allow users to:

1. Inspect the original source.
2. Review the AI\-generated interpretation.
3. Edit requirement details.
4. Accept a requirement.
5. Reject a requirement.
6. Assign an accepted requirement to a contributor.

AI\-generated requirements must not automatically become authoritative business records.

Preserve reviewer edits and validation history.

#### FR\-07: Proposal development tracking

Provide a requirements management view.

Users must be able to:

- Filter requirements by document or category.
- Assign requirements to fictional team members.
- Update work status.
- Link supporting proposal documents.
- Identify outstanding requirements.
- View proposal completion metrics.

Use Dataverse as the system of record for requirements and assignments.

#### FR\-08: Governed review workflow

Implement one **Red Team Review** workflow.

The proposal manager can initiate a review from the application.

Power Automate must:

1. Create a review record.
2. Send an approval request to a configured test identity.
3. Capture approval or rejection.
4. Record reviewer comments.
5. Update the proposal review status.
6. Preserve the review decision and timestamp.

A rejected review must return the proposal to a Changes Requested state.

Do not simulate successful approval. The workflow should execute using an actual Power Automate approval.

### 4\. Application screens

The React application should have four primary screens.

**Screen 1: Opportunity Dashboard**

- Opportunity selector
- Opportunity details
- Create Proposal Workspace button
- Proposal status summary

**Screen 2: Proposal Workspace**

- Proposal details
- SharePoint workspace links
- Document inventory
- Analyze Proposal button
- Analysis progress and status

**Screen 3: Requirements Analysis**

- Consolidated requirements matrix
- Source\-document filters
- Source preview or document links
- AI interpretations
- Accept, Edit, Reject actions

**Screen 4: Proposal Governance**

- Accepted requirements
- Contributor assignments
- Completion tracking
- Review readiness
- Red Team approval workflow
- Review history

Use Fluent UI styling to provide a consistent Microsoft application experience.

### 5\. Dataverse data model

Create the following logical tables using the pmd publisher prefix.

| Table | Purpose |
| --- | --- |
| Proposal | Proposal metadata and associated mock opportunity |
| Proposal Document | SharePoint document references and versions |
| Analysis Run | Document processing job and status |
| Analysis Document Result | Individual document processing results |
| Requirement | Extracted and validated requirements |
| Review | Review requests, decisions, and comments |
| Audit Event | Significant business process changes |

Use relationships between proposals, documents, analysis runs, requirements, and reviews.

Original documents remain in SharePoint.

Store structured business data in Dataverse.

### 6\. Security and governance

The MVP must:

- Use Microsoft Entra authentication through Power Apps.
- Keep credentials and API keys out of frontend code.
- Use approved connections to SharePoint and Dataverse.
- Preserve document and requirement provenance.
- Record important workflow decisions.
- Prevent overlapping analysis runs for the same proposal.
- Avoid overwriting previously accepted requirements during reanalysis.

Use fictional opportunities and approved synthetic solicitation documents.

Do not use actual SAIC\-controlled documents in the commercial developer environment without appropriate authorization.

Do not represent the demo as GCC High\-compliant or production\-ready.

### 7\. Implementation phases

#### Phase 1: Application foundation

Build:

- React application shell
- Navigation
- Mock opportunity data
- Opportunity selector
- Opportunity details
- Workspace creation interface

**Acceptance criteria:**

- Application runs locally.
- At least three fictional opportunities are selectable.
- Opportunity details update correctly.
- No Dynamics 365 integration exists.
- Unimplemented backend actions are clearly disabled or labeled.

#### Phase 2: Workspace provisioning

Build:

- Dataverse proposal records
- SharePoint folder provisioning
- Power Automate workflow
- Workspace links
- Document inventory

**Acceptance criteria:**

- A real SharePoint workspace is created.
- The standard folder structure exists.
- The application can open the solicitation folder.
- Repeated provisioning requests do not create duplicates.

#### Phase 3: Document intelligence

Build:

- Analyze Proposal workflow
- Multi\-document extraction
- AI requirements interpretation
- Source traceability
- Requirements matrix
- Human validation

**Acceptance criteria:**

- Multiple uploaded documents can be processed.
- Extracted requirements retain source references.
- Users can accept, edit, and reject requirements.
- Validated requirements persist in Dataverse.
- Partial processing failures are visible.

#### Phase 4: Governed execution

Build:

- Requirement assignments
- Work status tracking
- Red Team approval
- Review history
- Proposal readiness indicators

**Acceptance criteria:**

- Requirements can be assigned and updated.
- Approval requests reach a real test identity.
- Approval and rejection outcomes are recorded.
- Review history is visible in the application.

### 8\. Development standards

- Use React with TypeScript.
- Follow the existing Vite and Power Apps code\-app project structure.
- Use reusable components.
- Separate UI, data access, and business logic.
- Keep mock opportunity data isolated behind an interface.
- Use strongly typed service contracts.
- Implement loading, empty, and error states.
- Validate inputs.
- Use accessible controls and keyboard navigation.
- Never hardcode secrets.
- Maintain readable, modular code.

Do not introduce additional frameworks or architectural complexity without a demonstrated need.

### 9\. Open technical decisions

The following decisions remain unresolved and should be addressed during their respective implementation phases:

1. SharePoint demo site and document library.
2. Azure AI resource configuration and model selection.
3. Power Automate versus Azure\-hosted processing for long\-running analysis.
4. Document source preview and highlighting approach.
5. Licensing and connector requirements.
6. Test identity for approval workflows.
7. Specific Dataverse column types and relationships.

Do not assume these decisions have already been made.

### 10\. Instructions for GitHub Copilot

Treat this specification as the authoritative project requirements.

Implement one phase at a time.

Before modifying code:

1. Inspect the existing project structure.
2. Identify the relevant files and dependencies.
3. Explain the proposed implementation.
4. Avoid changes unrelated to the current phase.

After implementation:

1. Run available build and validation commands.
2. Identify changed files.
3. Report test results.
4. Identify incomplete integrations.
5. Do not claim functionality works unless verified.

**Begin with Phase 1 only.**

### 11\. Reference materials

- [i3solutions Virtual Proposal Center](https://i3solutions.com/virtual-proposal-center-vpc-overview/)
- [Virtual Proposal Center product site](https://www.virtualproposalcenter.com/)
- [Power Apps code apps documentation](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/overview)
- [Power Apps code apps quickstart](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/how-to/create-an-app-from-scratch)

The folder structure and workflow sequence in this specification are proposed demo designs, not verified details of SAIC's installed Virtual Proposal Center.

