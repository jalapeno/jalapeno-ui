# jalapeno-ui

A web-based network topology visualization and path calculation tool.

## Features
- Network topology visualization
- Path calculation and highlighting
- Integration with ArangoDB backend
- RESTful API integration

## Technology Stack
- Frontend: React + [Cytoscape.js](https://js.cytoscape.org/)
- Backend: ArangoDB
- API: [Your API tech stack]

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Access to the backend API

### Installation

```bash
## Clone the repository
git clone [your-repo-url]

## Install dependencies
cd jalapeno-ui
npm install # or yarn install

## Start the development server
npm start # or yarn start
```

### maybe?
npx create-react-app jalapeno-ui
cd jalapeno-ui
npm install cytoscape cytoscape-cola @types/cytoscape react-cytoscapejs axios

### local dev
toggle src/config.js, uncomment devApiUrl


### CLOS layout

tiers:

"tier": "dc-workload"
"tier": "dc-endpoint"
"tier": "dc-tier-0"
"tier": "dc-tier-1"
"tier": "dc-tier-2"
"tier": "dc-tier-3"
"tier": "dci-tier-0"
"tier": "dci-tier-1"
"tier": "dci-tier-2"
"tier": "dci-tier-3"
"tier": "wan-tier-0"
"tier": "wan-tier-1"
"tier": "wan-tier-2"
"tier": "wan-tier-3"
"tier": "access-tier-0"
"tier": "access-tier-1"
"tier": "access-tier-2"
"tier": "access-tier-3"
"tier": "endpoint"


