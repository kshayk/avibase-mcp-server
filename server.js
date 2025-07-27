import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { BirdQueryEngine } from './birdQueryEngine.js';

const app = express();
const PORT = 3022;
const isDev = process.argv.includes('--dev');

const PREFIX = '/avibase-mcp';

// Initialize the bird query engine
let birdEngine;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 1000 : 100, // limit each IP to 100 requests per windowMs in production, 1000 in dev
    message: {
        error: 'Too many requests, please try again later.',
        retryAfter: '15 minutes'
    }
});
app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${req.method} ${req.path} - ${req.ip}`);
    next();
});

// Initialize engine
async function initializeEngine() {
    try {
        console.log('🦅 Initializing Bird Query Engine...');
        birdEngine = new BirdQueryEngine();
        console.log('✅ Bird Query Engine ready!');
    } catch (error) {
        console.error('❌ Failed to initialize Bird Query Engine:', error.message);
        process.exit(1);
    }
}

// Utility functions
function formatResponse(data, message = 'Success', pagination = null) {
    const response = {
        success: true,
        message,
        timestamp: new Date().toISOString(),
        data
    };
    
    if (pagination) {
        response.pagination = pagination;
    }
    
    return response;
}

function formatError(message, statusCode = 500, details = null) {
    return {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
        statusCode,
        ...(details && { details })
    };
}

function paginateResults(results, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const paginatedResults = results.slice(offset, offset + limit);
    
    return {
        results: paginatedResults,
        pagination: {
            currentPage: page,
            totalItems: results.length,
            itemsPerPage: limit,
            totalPages: Math.ceil(results.length / limit),
            hasNext: offset + limit < results.length,
            hasPrev: page > 1
        }
    };
}

// API Routes

const router = express.Router();

// Root endpoint
router.get('/', (req, res) => {
    res.json({
        name: '🦅 Bird Data JSONata Query API',
        version: '1.0.0',
        description: 'RESTful API for querying comprehensive bird data using JSONata',
        endpoints: {
            stats: 'GET /api/stats',
            search: 'GET /api/search?q=term&exact=false',
            taxonomy: 'GET /api/taxonomy/:level/:value',
            conservation: 'GET /api/conservation/:category',
            range: 'GET /api/range?region=name',
            extinct: 'GET /api/extinct',
            authority: 'GET /api/authority?name=authority',
            random: 'GET /api/random?count=10',
            bird: 'GET /api/bird/:scientificName',
            customQuery: 'POST /api/custom',
            rawQuery: 'POST /api/query'
        },
        documentation: '/api/docs',
        healthCheck: '/api/health'
    });
});

// Health check
router.get('/api/health', (req, res) => {
    res.json(formatResponse({
        status: 'healthy',
        uptime: process.uptime(),
        engineReady: !!birdEngine,
        timestamp: new Date().toISOString()
    }, 'Service is healthy'));
});

// API Documentation
router.get('/api/docs', (req, res) => {
    res.json({
        name: 'Bird Data Query API Documentation',
        version: '1.0.0',
        baseUrl: `${req.protocol}://${req.get('host')}/api`,
        endpoints: [
            {
                path: '/stats',
                method: 'GET',
                description: 'Get comprehensive dataset statistics',
                parameters: 'None',
                example: '/api/stats'
            },
            {
                path: '/search',
                method: 'GET',
                description: 'Search birds by scientific or common name',
                parameters: 'q (required), exact (optional, default: false), page, limit',
                example: '/api/search?q=eagle&exact=false&page=1&limit=10'
            },
            {
                path: '/taxonomy/:level/:value',
                method: 'GET',
                description: 'Get birds by taxonomic classification',
                parameters: 'level (Order|Family|Taxon_rank), value, page, limit',
                example: '/api/taxonomy/Order/Strigiformes'
            },
            {
                path: '/conservation/:category',
                method: 'GET',
                description: 'Get birds by IUCN Red List category',
                parameters: 'category (CR|EN|VU|EX|etc.), page, limit',
                example: '/api/conservation/CR'
            },
            {
                path: '/range',
                method: 'GET',
                description: 'Get birds by geographic range',
                parameters: 'region (required), page, limit',
                example: '/api/range?region=Madagascar'
            },
            {
                path: '/extinct',
                method: 'GET',
                description: 'Get all extinct or possibly extinct species',
                parameters: 'page, limit',
                example: '/api/extinct'
            },
            {
                path: '/authority',
                method: 'GET',
                description: 'Get birds described by specific authority',
                parameters: 'name (required), page, limit',
                example: '/api/authority?name=Linnaeus'
            },
            {
                path: '/random',
                method: 'GET',
                description: 'Get random sample of birds',
                parameters: 'count (optional, default: 10)',
                example: '/api/random?count=5'
            },
            {
                path: '/bird/:scientificName',
                method: 'GET',
                description: 'Get detailed report for specific bird',
                parameters: 'scientificName (required)',
                example: '/api/bird/Aquila chrysaetos'
            },
            {
                path: '/custom',
                method: 'POST',
                description: 'Custom query with multiple filters',
                body: '{ "filters": { "Field": "value" }, "page": 1, "limit": 50 }',
                example: 'POST /api/custom'
            },
            {
                path: '/query',
                method: 'POST',
                description: 'Execute raw JSONata query',
                body: '{ "query": "JSONata expression", "page": 1, "limit": 50 }',
                example: 'POST /api/query'
            }
        ]
    });
});

// Dataset statistics
router.get('/api/stats', async (req, res) => {
    try {
        const stats = await birdEngine.getDatasetStats();
        res.json(formatResponse(stats, 'Dataset statistics retrieved successfully'));
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json(formatError('Failed to get dataset statistics', 500, error.message));
    }
});

// Search birds by name
router.get('/api/search', async (req, res) => {
    try {
        const { q, exact = 'false', page = 1, limit = 50 } = req.query;
        
        if (!q) {
            return res.status(400).json(formatError('Query parameter "q" is required', 400));
        }

        const exactMatch = exact === 'true';
        const results = await birdEngine.searchByName(q, exactMatch);
        const paginated = paginateResults(results, parseInt(page), parseInt(limit));

        res.json(formatResponse(
            paginated.results, 
            `Found ${results.length} birds matching "${q}"`,
            paginated.pagination
        ));
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json(formatError('Search failed', 500, error.message));
    }
});

// Get birds by taxonomy
router.get('/api/taxonomy/:level/:value', async (req, res) => {
    try {
        const { level, value } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const results = await birdEngine.getByTaxonomy(level, value);
        const paginated = paginateResults(results, parseInt(page), parseInt(limit));

        res.json(formatResponse(
            paginated.results,
            `Found ${results.length} records for ${level}: ${value}`,
            paginated.pagination
        ));
    } catch (error) {
        console.error('Taxonomy error:', error);
        res.status(500).json(formatError('Taxonomy query failed', 500, error.message));
    }
});

// Get birds by conservation status
router.get('/api/conservation/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const results = await birdEngine.getByIUCNCategory(category);
        const paginated = paginateResults(results, parseInt(page), parseInt(limit));

        res.json(formatResponse(
            paginated.results,
            `Found ${results.length} species with IUCN status: ${category}`,
            paginated.pagination
        ));
    } catch (error) {
        console.error('Conservation error:', error);
        res.status(500).json(formatError('Conservation query failed', 500, error.message));
    }
});

// Get birds by geographic range
router.get('/api/range', async (req, res) => {
    try {
        const { region, page = 1, limit = 50 } = req.query;
        
        if (!region) {
            return res.status(400).json(formatError('Query parameter "region" is required', 400));
        }

        const results = await birdEngine.getByRange(region);
        const paginated = paginateResults(results, parseInt(page), parseInt(limit));

        res.json(formatResponse(
            paginated.results,
            `Found ${results.length} birds in region: ${region}`,
            paginated.pagination
        ));
    } catch (error) {
        console.error('Range error:', error);
        res.status(500).json(formatError('Range query failed', 500, error.message));
    }
});

// Get extinct species
router.get('/api/extinct', async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;

        const results = await birdEngine.getExtinctSpecies();
        const paginated = paginateResults(results, parseInt(page), parseInt(limit));

        res.json(formatResponse(
            paginated.results,
            `Found ${results.length} extinct or possibly extinct species`,
            paginated.pagination
        ));
    } catch (error) {
        console.error('Extinct error:', error);
        res.status(500).json(formatError('Extinct species query failed', 500, error.message));
    }
});

// Get birds by authority
router.get('/api/authority', async (req, res) => {
    try {
        const { name, page = 1, limit = 50 } = req.query;
        
        if (!name) {
            return res.status(400).json(formatError('Query parameter "name" is required', 400));
        }

        const results = await birdEngine.getByAuthority(name);
        const paginated = paginateResults(results, parseInt(page), parseInt(limit));

        res.json(formatResponse(
            paginated.results,
            `Found ${results.length} birds described by: ${name}`,
            paginated.pagination
        ));
    } catch (error) {
        console.error('Authority error:', error);
        res.status(500).json(formatError('Authority query failed', 500, error.message));
    }
});

// Get random sample
router.get('/api/random', async (req, res) => {
    try {
        const { count = 10 } = req.query;
        const sampleCount = Math.min(parseInt(count), 100); // Limit to 100 for performance

        const results = await birdEngine.getRandomSample(sampleCount);

        res.json(formatResponse(
            results,
            `Retrieved ${results.length} random birds`
        ));
    } catch (error) {
        console.error('Random error:', error);
        res.status(500).json(formatError('Random sample failed', 500, error.message));
    }
});

// Get detailed bird report
router.get('/api/bird/:scientificName', async (req, res) => {
    try {
        const { scientificName } = req.params;
        const decodedName = decodeURIComponent(scientificName);

        const report = await birdEngine.getBirdReport(decodedName);

        res.json(formatResponse(
            report,
            `Retrieved detailed report for: ${decodedName}`
        ));
    } catch (error) {
        console.error('Bird report error:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json(formatError('Bird report failed', statusCode, error.message));
    }
});

// Custom query with filters
router.post('/api/custom', async (req, res) => {
    try {
        const { filters, page = 1, limit = 50 } = req.body;
        
        if (!filters || typeof filters !== 'object') {
            return res.status(400).json(formatError('Request body must contain "filters" object', 400));
        }

        const results = await birdEngine.customQuery(filters);
        const paginated = paginateResults(results, parseInt(page), parseInt(limit));

        res.json(formatResponse(
            paginated.results,
            `Custom query returned ${results.length} results`,
            paginated.pagination
        ));
    } catch (error) {
        console.error('Custom query error:', error);
        res.status(500).json(formatError('Custom query failed', 500, error.message));
    }
});

// Raw JSONata query
router.post('/api/query', async (req, res) => {
    try {
        const { query, page = 1, limit = 50 } = req.body;
        
        if (!query || typeof query !== 'string') {
            return res.status(400).json(formatError('Request body must contain "query" string', 400));
        }

        const results = await birdEngine.executeQuery(query);
        
        // Handle different result types
        if (Array.isArray(results)) {
            const paginated = paginateResults(results, parseInt(page), parseInt(limit));
            res.json(formatResponse(
                paginated.results,
                `JSONata query returned ${results.length} results`,
                paginated.pagination
            ));
        } else {
            res.json(formatResponse(
                results,
                'JSONata query executed successfully'
            ));
        }
    } catch (error) {
        console.error('JSONata query error:', error);
        res.status(400).json(formatError('JSONata query failed', 400, error.message));
    }
});

// Get unique values for a field
router.get('/api/unique/:field', async (req, res) => {
    try {
        const { field } = req.params;
        const { page = 1, limit = 100 } = req.query;

        const results = await birdEngine.getUniqueValues(field);
        const paginated = paginateResults(results, parseInt(page), parseInt(limit));

        res.json(formatResponse(
            paginated.results,
            `Found ${results.length} unique values for field: ${field}`,
            paginated.pagination
        ));
    } catch (error) {
        console.error('Unique values error:', error);
        res.status(500).json(formatError('Unique values query failed', 500, error.message));
    }
});

app.use(PREFIX, router);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json(formatError('Internal server error', 500));
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json(formatError('Endpoint not found', 404, `${req.method} ${req.originalUrl}`));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});

// Start server
async function startServer() {
    await initializeEngine();
    
    app.listen(PORT, () => {
        console.log(`🚀 Bird Data API Server running on port ${PORT}`);
        console.log(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
        console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
        console.log(`📊 Dataset Stats: http://localhost:${PORT}/api/stats`);
        
        if (isDev) {
            console.log('🛠️  Running in development mode (higher rate limits)');
        }
    });
}

// Start the server
startServer().catch(console.error); 