# 🦅 Bird Data API Server

A comprehensive RESTful API server for querying bird data using JSONata. This MCP (Model Context Protocol) server provides powerful querying capabilities over a comprehensive bird dataset with taxonomic, conservation, and geographic information.

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Usage Examples](#usage-examples)
- [Query Engine](#query-engine)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- **Comprehensive Bird Database**: Access to extensive bird data including taxonomic classifications, conservation status, and geographic ranges
- **JSONata Query Engine**: Powerful query capabilities using JSONata expressions
- **RESTful API**: Well-structured REST endpoints with consistent response formats
- **Pagination Support**: Built-in pagination for large result sets
- **Rate Limiting**: Protection against abuse with configurable rate limits
- **Search Capabilities**: Name-based search (exact and partial matching)
- **Taxonomic Queries**: Query by Order, Family, and taxonomic rank
- **Conservation Status**: Filter by IUCN Red List categories
- **Geographic Filtering**: Search by geographic range
- **Custom Queries**: Build complex queries with multiple filters
- **Random Sampling**: Get random bird samples for discovery
- **Security**: Helmet.js security headers and CORS support

## 🚀 Installation

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager

### Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd mcp-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Ensure data file exists**:
   Make sure `birdIndex.json` is present in the root directory with your bird data.

4. **Start the server**:
   ```bash
   npm start
   ```

   For development with higher rate limits:
   ```bash
   node server.js --dev
   ```

The server will start on port 3022 by default.

## 🏃‍♂️ Quick Start

Once the server is running, you can access:

- **API Documentation**: http://localhost:3022/api/docs
- **Health Check**: http://localhost:3022/api/health
- **Dataset Statistics**: http://localhost:3022/api/stats

### Basic Examples

```bash
# Get dataset statistics
curl http://localhost:3022/api/stats

# Search for eagles
curl "http://localhost:3022/api/search?q=eagle"

# Get critically endangered species
curl http://localhost:3022/api/conservation/CR

# Get birds from Madagascar
curl "http://localhost:3022/api/range?region=Madagascar"
```

## 📚 API Documentation

### Base URL
```
http://localhost:3022/api
```

### Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "message": "Success message",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": "response data",
  "pagination": {
    "currentPage": 1,
    "totalItems": 100,
    "itemsPerPage": 50,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Endpoints

#### `GET /api/stats`
Get comprehensive dataset statistics.

#### `GET /api/search`
Search birds by scientific or common name.

**Parameters:**
- `q` (required): Search term
- `exact` (optional): `true` for exact match, `false` for partial (default: `false`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

#### `GET /api/taxonomy/:level/:value`
Get birds by taxonomic classification.

**Parameters:**
- `level`: `Order`, `Family`, or `Taxon_rank`
- `value`: The taxonomic value to filter by
- `page`, `limit`: Pagination parameters

#### `GET /api/conservation/:category`
Get birds by IUCN Red List category.

**Parameters:**
- `category`: IUCN category (e.g., `CR`, `EN`, `VU`, `LC`, `NT`, `DD`, `EX`)
- `page`, `limit`: Pagination parameters

#### `GET /api/range`
Get birds by geographic range.

**Parameters:**
- `region` (required): Geographic region to search
- `page`, `limit`: Pagination parameters

#### `GET /api/extinct`
Get all extinct or possibly extinct species.

**Parameters:**
- `page`, `limit`: Pagination parameters

#### `GET /api/authority`
Get birds described by a specific authority.

**Parameters:**
- `name` (required): Authority name to search for
- `page`, `limit`: Pagination parameters

#### `GET /api/random`
Get random sample of birds.

**Parameters:**
- `count` (optional): Number of birds to return (default: 10, max: 100)

#### `GET /api/bird/:scientificName`
Get detailed report for a specific bird.

**Parameters:**
- `scientificName`: URL-encoded scientific name

#### `POST /api/custom`
Execute custom query with multiple filters.

**Request Body:**
```json
{
  "filters": {
    "Field": "value",
    "AnotherField": ["value1", "value2"],
    "PartialField": "partial*match"
  },
  "page": 1,
  "limit": 50
}
```

#### `POST /api/query`
Execute raw JSONata query.

**Request Body:**
```json
{
  "query": "$[Order = 'Strigiformes']",
  "page": 1,
  "limit": 50
}
```

#### `GET /api/unique/:field`
Get unique values for a specific field.

**Parameters:**
- `field`: Field name to get unique values for
- `page`, `limit`: Pagination parameters

## 💡 Usage Examples

### JavaScript/Node.js

```javascript
const fetch = require('node-fetch');

// Search for owls
async function searchOwls() {
  const response = await fetch('http://localhost:3022/api/search?q=owl&limit=5');
  const data = await response.json();
  console.log(`Found ${data.pagination.totalItems} owls`);
  return data.data;
}

// Get endangered species
async function getEndangeredSpecies() {
  const response = await fetch('http://localhost:3022/api/conservation/EN');
  const data = await response.json();
  return data.data;
}

// Custom query example
async function customQuery() {
  const response = await fetch('http://localhost:3022/api/custom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: {
        Order: 'Passeriformes',
        IUCN_Red_List_Category: ['CR', 'EN']
      },
      limit: 10
    })
  });
  const data = await response.json();
  return data.data;
}
```

### Python

```python
import requests

# Search for birds
def search_birds(query, exact=False):
    params = {'q': query, 'exact': str(exact).lower()}
    response = requests.get('http://localhost:3022/api/search', params=params)
    return response.json()

# Get birds by family
def get_family_birds(family):
    response = requests.get(f'http://localhost:3022/api/taxonomy/Family/{family}')
    return response.json()

# Execute JSONata query
def execute_query(query_string):
    data = {'query': query_string}
    response = requests.post('http://localhost:3022/api/query', json=data)
    return response.json()
```

### curl Examples

```bash
# Get all orders
curl "http://localhost:3022/api/unique/Order"

# Get birds from a specific family
curl "http://localhost:3022/api/taxonomy/Family/Accipitridae"

# Get detailed information about a specific bird
curl "http://localhost:3022/api/bird/Aquila%20chrysaetos"

# Complex JSONata query
curl -X POST "http://localhost:3022/api/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "$[Order=\"Strigiformes\" and IUCN_Red_List_Category=\"CR\"]"}'
```

## 🔧 Query Engine

The BirdQueryEngine class provides the core functionality:

### Key Methods

- `searchByName(term, exact)`: Search by scientific or common names
- `getByTaxonomy(level, value)`: Filter by taxonomic classification
- `getByIUCNCategory(category)`: Filter by conservation status
- `getByRange(region)`: Filter by geographic range
- `getExtinctSpecies()`: Get extinct species
- `getByAuthority(authority)`: Filter by naming authority
- `getRandomSample(count)`: Get random sample
- `customQuery(filters)`: Build complex queries
- `executeQuery(jsonataQuery)`: Execute raw JSONata queries
- `getBirdReport(scientificName)`: Get comprehensive bird report

### JSONata Examples

```javascript
// Get all critically endangered raptors
"$[Order='Accipitriformes' and IUCN_Red_List_Category='CR']"

// Count species by family
"Family^(count($))"

// Get birds with specific characteristics
"$[Range ~> /.*Madagascar.*/ and Taxon_rank='species']"
```

## 🛠️ Development

### Project Structure

```
mcp-server/
├── server.js              # Main Express.js server
├── birdQueryEngine.js      # Core query engine using JSONata
├── birdIndex.json          # Bird data file
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

### Running in Development Mode

```bash
node server.js --dev
```

Development mode provides:
- Higher rate limits (1000 vs 100 requests per 15 minutes)
- Additional debugging information

### Testing the Interactive CLI

```bash
node birdQueryEngine.js
```

This will run an interactive demonstration of the query engine capabilities.

## 🔒 Security Features

- **Helmet.js**: Security headers for protection against common vulnerabilities
- **CORS**: Cross-origin resource sharing configuration
- **Rate Limiting**: 100 requests per 15 minutes per IP (1000 in dev mode)
- **Input Validation**: Request parameter validation
- **Error Handling**: Secure error responses without sensitive information exposure

## 📊 Data Schema

The bird data includes fields such as:
- `Scientific_name`: Scientific name of the bird
- `English_name_*`: Common names from various sources
- `Order`, `Family`: Taxonomic classification
- `Taxon_rank`: Taxonomic rank (species, subspecies, etc.)
- `IUCN_Red_List_Category`: Conservation status
- `Range`: Geographic distribution
- `Authority`: Naming authority
- `Extinct_or_possibly_extinct`: Extinction status
- URLs for additional resources

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Bird data sourced from comprehensive ornithological databases
- JSONata for powerful JSON querying capabilities
- Express.js ecosystem for robust web server framework 