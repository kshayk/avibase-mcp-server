import jsonata from 'jsonata';
import fs from 'fs';
import path from 'path';

/**
 * Bird Data Query Engine using JSONata
 * Provides various methods to query and transform bird data
 */
class BirdQueryEngine {
    constructor(dataFile = 'birdIndex.json') {
        this.dataFile = dataFile;
        this.birdData = null;
        this.loadData();
    }

    /**
     * Load bird data from JSON file
     */
    loadData() {
        try {
            console.log(`Loading bird data from ${this.dataFile}...`);
            const dataPath = path.resolve(this.dataFile);
            
            if (!fs.existsSync(dataPath)) {
                throw new Error(`Data file not found: ${dataPath}`);
            }

            const rawData = fs.readFileSync(dataPath, 'utf8');
            this.birdData = JSON.parse(rawData);
            console.log(`Loaded ${this.birdData.length} bird records`);
        } catch (error) {
            console.error('Error loading bird data:', error.message);
            throw error;
        }
    }

    /**
     * Execute a raw JSONata query
     * @param {string} queryString - JSONata query expression
     * @returns {any} Query result
     */
    async executeQuery(queryString) {
        try {
            const expression = jsonata(queryString);
            const result = await expression.evaluate(this.birdData);
            return result;
        } catch (error) {
            console.error('Query execution error:', error.message);
            throw error;
        }
    }

    /**
     * Get basic statistics about the dataset
     * @returns {Object} Dataset statistics
     */
    async getDatasetStats() {
        const queries = {
            totalRecords: '$count($)',
            totalOrders: '$count($distinct(Order[$ != ""]))',
            totalFamilies: '$count($distinct(Family[$ != ""]))',
            totalSpecies: '$count($[Taxon_rank = "species"])',
            extinctSpecies: '$count($[Extinct_or_possibly_extinct != ""])',
            iucnCategories: '$distinct(IUCN_Red_List_Category[$ != ""])'
        };

        const stats = {};
        for (const [key, query] of Object.entries(queries)) {
            stats[key] = await this.executeQuery(query);
        }

        return stats;
    }

    /**
     * Search birds by name (scientific or common name)
     * @param {string} searchTerm - Term to search for
     * @param {boolean} exactMatch - Whether to use exact match or partial match
     * @returns {Array} Matching bird records
     */
    async searchByName(searchTerm, exactMatch = false) {
        const searchQuery = exactMatch 
            ? `$[Scientific_name = "${searchTerm}" or English_name_AviList = "${searchTerm}" or English_name_Clements_v2024 = "${searchTerm}" or English_name_BirdLife_v9 = "${searchTerm}"]`
            : `$[Scientific_name ~> /.*${searchTerm}.*/i or English_name_AviList ~> /.*${searchTerm}.*/i or English_name_Clements_v2024 ~> /.*${searchTerm}.*/i or English_name_BirdLife_v9 ~> /.*${searchTerm}.*/i]`;
        
        const result = await this.executeQuery(searchQuery);
        // Ensure we always return an array (JSONata returns single object for one match)
        return Array.isArray(result) ? result : (result ? [result] : []);
    }

    /**
     * Get birds by taxonomic classification
     * @param {string} level - Taxonomic level (order, family, etc.)
     * @param {string} value - Value to filter by
     * @returns {Array} Matching bird records
     */
    async getByTaxonomy(level, value) {
        const validLevels = ['Taxon_rank', 'Order', 'Family'];
        if (!validLevels.includes(level)) {
            throw new Error(`Invalid taxonomic level. Use one of: ${validLevels.join(', ')}`);
        }

        const query = `$[${level} = "${value}"]`;
        const result = await this.executeQuery(query);
        // Ensure we always return an array (JSONata returns single object for one match)
        return Array.isArray(result) ? result : (result ? [result] : []);
    }

    /**
     * Get birds by IUCN Red List category
     * @param {string} category - IUCN category (e.g., 'CR', 'EN', 'VU', etc.)
     * @returns {Array} Birds in the specified IUCN category
     */
    async getByIUCNCategory(category) {
        const query = `$[IUCN_Red_List_Category = "${category}"]`;
        const result = await this.executeQuery(query);
        // Ensure we always return an array (JSONata returns single object for one match)
        return Array.isArray(result) ? result : (result ? [result] : []);
    }

    /**
     * Get extinct or possibly extinct species
     * @returns {Array} Extinct species records
     */
    async getExtinctSpecies() {
        const query = '$[Extinct_or_possibly_extinct != ""]';
        const result = await this.executeQuery(query);
        // Ensure we always return an array (JSONata returns single object for one match)
        return Array.isArray(result) ? result : (result ? [result] : []);
    }

    /**
     * Get birds by geographic range
     * @param {string} region - Region to search for
     * @returns {Array} Birds found in the specified region
     */
    async getByRange(region) {
        const query = `$[Range ~> /.*${region}.*/i]`;
        const result = await this.executeQuery(query);
        // Ensure we always return an array (JSONata returns single object for one match)
        return Array.isArray(result) ? result : (result ? [result] : []);
    }

    /**
     * Get unique values for a specific field
     * @param {string} field - Field name to get unique values for
     * @returns {Array} Array of unique values
     */
    async getUniqueValues(field) {
        const query = `$distinct(${field}[$ != ""])`;
        const result = await this.executeQuery(query);
        // Ensure we always return an array (JSONata returns single value for one unique value)
        return Array.isArray(result) ? result : (result ? [result] : []);
    }

    /**
     * Get birds with specific authority/author
     * @param {string} authority - Authority name to search for
     * @returns {Array} Birds described by the specified authority
     */
    async getByAuthority(authority) {
        const query = `$[Authority ~> /.*${authority}.*/i]`;
        const result = await this.executeQuery(query);
        // Ensure we always return an array (JSONata returns single object for one match)
        return Array.isArray(result) ? result : (result ? [result] : []);
    }

    /**
     * Get a random sample of birds
     * @param {number} count - Number of random birds to return
     * @returns {Array} Random sample of bird records
     */
    async getRandomSample(count = 10) {
        // JSONata doesn't have built-in random, so we'll use a different approach
        const totalCount = await this.executeQuery('$count($)');
        const randomIndices = [];
        
        for (let i = 0; i < Math.min(count, totalCount); i++) {
            let randomIndex;
            do {
                randomIndex = Math.floor(Math.random() * totalCount);
            } while (randomIndices.includes(randomIndex));
            randomIndices.push(randomIndex);
        }

        const query = `$[Sequence in [${randomIndices.map(i => i + 1).join(', ')}]]`;
        const result = await this.executeQuery(query);
        // Ensure we always return an array (JSONata returns single object for one match)
        return Array.isArray(result) ? result : (result ? [result] : []);
    }

    /**
     * Get birds grouped by a specific field
     * @param {string} groupField - Field to group by
     * @returns {Object} Grouped results
     */
    async groupBy(groupField) {
        const query = `
        {
            "${groupField}": $distinct(${groupField}[$ != ""]) ~> $map(function($group) {
                {
                    "name": $group,
                    "count": $count($[${groupField} = $group]),
                    "species": $[${groupField} = $group and Taxon_rank = "species"]
                }
            })
        }`;
        
        return await this.executeQuery(query);
    }

    /**
     * Generate a comprehensive report for a specific bird
     * @param {string} scientificName - Scientific name of the bird
     * @returns {Object} Detailed bird information
     */
    async getBirdReport(scientificName) {
        const query = `$[Scientific_name = "${scientificName}"][0]`;
        const bird = await this.executeQuery(query);
        
        if (!bird) {
            throw new Error(`Bird not found: ${scientificName}`);
        }

        // Get related birds in the same family
        const familyQuery = `$[Family = "${bird.Family}" and Scientific_name != "${scientificName}"][0..4]`;
        const relatedBirds = await this.executeQuery(familyQuery);

        return {
            bird,
            relatedInFamily: relatedBirds,
            conservationStatus: bird.IUCN_Red_List_Category || 'Not assessed',
            hasUrls: {
                birdLife: !!bird.BirdLife_DataZone_URL,
                birdsOfTheWorld: !!bird.Birds_of_the_World_URL,
                originalDescription: !!bird.Original_description_URL
            }
        };
    }

    /**
     * Custom query builder for complex searches
     * @param {Object} filters - Object containing filter criteria
     * @returns {Array} Filtered results
     */
    async customQuery(filters) {
        let conditions = [];
        
        Object.entries(filters).forEach(([field, value]) => {
            if (Array.isArray(value)) {
                conditions.push(`${field} in [${value.map(v => `"${v}"`).join(', ')}]`);
            } else if (typeof value === 'string' && value.includes('*')) {
                const pattern = value.replace(/\*/g, '.*');
                conditions.push(`${field} ~> /${pattern}/i`);
            } else {
                conditions.push(`${field} = "${value}"`);
            }
        });

        const query = `$[${conditions.join(' and ')}]`;
        const result = await this.executeQuery(query);
        // Ensure we always return an array (JSONata returns single object for one match)
        return Array.isArray(result) ? result : (result ? [result] : []);
    }
}

/**
 * Interactive CLI for querying bird data
 */
async function interactiveCLI() {
    const engine = new BirdQueryEngine();
    
    console.log('\n🦅 Bird Data Query Engine');
    console.log('========================');
    
    // Show dataset stats
    const stats = await engine.getDatasetStats();
    console.log('\n📊 Dataset Statistics:');
    console.log(`Total Records: ${stats.totalRecords}`);
    console.log(`Orders: ${stats.totalOrders}`);
    console.log(`Families: ${stats.totalFamilies}`);
    console.log(`Species: ${stats.totalSpecies}`);
    console.log(`Extinct Species: ${stats.extinctSpecies}`);
    console.log(`IUCN Categories: ${stats.iucnCategories.join(', ')}`);

    // Example queries
    console.log('\n🔍 Example Queries:');
    
    // Search for eagles
    console.log('\n1. Searching for "eagle":');
    const eagles = await engine.searchByName('eagle');
    console.log(`Found ${eagles.length} birds matching "eagle"`);
    if (eagles.length > 0) {
        console.log(`First result: ${eagles[0].Scientific_name} - ${eagles[0].English_name_AviList}`);
    }

    // Get critically endangered species
    console.log('\n2. Critically Endangered species:');
    const criticallyEndangered = await engine.getByIUCNCategory('CR');
    console.log(`Found ${criticallyEndangered.length} critically endangered species`);

    // Get extinct species
    console.log('\n3. Extinct species:');
    const extinct = await engine.getExtinctSpecies();
    console.log(`Found ${extinct.length} extinct or possibly extinct species`);

    // Random sample
    console.log('\n4. Random sample of 3 birds:');
    const randomBirds = await engine.getRandomSample(3);
    randomBirds.forEach((bird, index) => {
        console.log(`${index + 1}. ${bird.Scientific_name} - ${bird.English_name_AviList || 'No common name'}`);
    });
}

// Export the class and run interactive mode if executed directly
export { BirdQueryEngine };

// Interactive mode when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    interactiveCLI().catch(console.error);
} 