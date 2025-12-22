/**
 * CSV Service - Parse and validate CSV files
 * Supports ANY CSV format by dynamically detecting columns
 */

const { parse } = require('csv-parse/sync');

// Extended column mappings (French/English variations)
const COLUMN_MAPPINGS = {
    // Company/Name
    'nom de la compagnie': 'entreprise',
    'nom de la compagnie ': 'entreprise',
    'company': 'entreprise',
    'company name': 'entreprise',
    'entreprise': 'entreprise',
    'société': 'entreprise',
    'societe': 'entreprise',
    'business name': 'entreprise',
    'nom': 'nom',
    'name': 'nom',
    'last_name': 'nom',
    'lastname': 'nom',

    // First name
    'prénom': 'prenom',
    'prenom': 'prenom',
    'first_name': 'prenom',
    'firstname': 'prenom',
    'first name': 'prenom',

    // Email
    'email': 'email',
    'mail': 'email',
    'e-mail': 'email',
    'courriel': 'email',

    // Phone
    'téléphone': 'telephone',
    'telephone': 'telephone',
    'phone': 'telephone',
    'tel': 'telephone',
    'mobile': 'telephone',
    'numréo de téléphone': 'telephone',
    'numéro de téléphone': 'telephone',
    'phone number': 'telephone',

    // Website
    'site_web': 'siteWeb',
    'siteweb': 'siteWeb',
    'website': 'siteWeb',
    'site': 'siteWeb',
    'url': 'siteWeb',
    'lien site web': 'siteWeb',
    'web': 'siteWeb',

    // Address
    'adresse': 'adresse',
    'address': 'adresse',
    'addresse de la compagnie': 'adresse',
    'addresse de la compagnie ': 'adresse',
    'adresse de la compagnie': 'adresse',
    'location': 'adresse',

    // Job/Type
    'poste': 'poste',
    'job': 'poste',
    'title': 'poste',
    'job_title': 'poste',
    'fonction': 'poste',
    "type d'entreprises": 'typeEntreprise',
    'type': 'typeEntreprise',
    'category': 'typeEntreprise',
    'categorie': 'typeEntreprise',

    // Ratings
    'ratings': 'rating',
    'rating': 'rating',
    'note': 'rating',
    'score': 'rating',
    'stars': 'rating',
    'étoiles': 'rating',

    // Reviews
    'nombre de revues': 'nombreAvis',
    'reviews': 'nombreAvis',
    'avis': 'nombreAvis',
    'revues': 'nombreAvis',
    'review count': 'nombreAvis',

    // Status
    'fermeture ou ouverture': 'statut',
    'status': 'statut',
    'statut': 'statut',
    'open/closed': 'statut',

    // LinkedIn
    'linkedin': 'linkedin',
    'profil_linkedin': 'linkedin',
    'linkedin url': 'linkedin',

    // Google Maps Link
    'lien google maps': 'googleMapsLink',
    'lien google maps ': 'googleMapsLink',
    'google maps': 'googleMapsLink',
    'maps link': 'googleMapsLink',
};

/**
 * Normalize a column header for matching
 */
function normalizeHeader(header) {
    return header
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[_-]/g, ' ');
}

/**
 * Parse CSV content into array of objects
 * Dynamically detects and maps columns
 */
async function parseCSV(content) {
    try {
        // Remove BOM if present
        content = content.replace(/^\uFEFF/, '');

        // Parse CSV with auto-detection
        const records = parse(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true,
            relax_quotes: true,
            bom: true
        });

        if (records.length === 0) {
            return [];
        }

        // Get original headers
        const originalHeaders = Object.keys(records[0]);

        // Create header mapping
        const headerMap = {};
        const unmappedHeaders = [];

        for (const header of originalHeaders) {
            const normalized = normalizeHeader(header);
            if (COLUMN_MAPPINGS[normalized]) {
                headerMap[header] = COLUMN_MAPPINGS[normalized];
            } else {
                // Keep original header as a custom field
                const cleanKey = header
                    .replace(/[^\w\s]/g, '')
                    .trim()
                    .replace(/\s+/g, '_')
                    .toLowerCase() || `col_${unmappedHeaders.length}`;
                headerMap[header] = cleanKey;
                unmappedHeaders.push(header);
            }
        }

        // Map records to normalized structure
        return records.map(record => {
            const normalized = {};

            for (const [originalKey, value] of Object.entries(record)) {
                const mappedKey = headerMap[originalKey] || originalKey;
                // Clean up the value
                let cleanValue = (value || '').trim();
                // Remove surrounding quotes if present
                if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
                    cleanValue = cleanValue.slice(1, -1);
                }
                normalized[mappedKey] = cleanValue;
            }

            return normalized;
        });
    } catch (error) {
        throw new Error(`Erreur de parsing CSV: ${error.message}`);
    }
}

/**
 * Validate prospect data
 * More flexible - only requires at least one identifying field
 */
function validateProspectData(data) {
    const validated = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
        const row = data[i];

        // Skip completely empty rows
        const hasAnyData = Object.values(row).some(v => v && v.trim());
        if (!hasAnyData) {
            continue;
        }

        // Build prospect object with all available fields
        const prospect = {
            // Core fields (mapped)
            nom: row.nom || '',
            prenom: row.prenom || '',
            email: row.email || '',
            entreprise: row.entreprise || '',
            poste: row.poste || row.typeEntreprise || '',
            telephone: row.telephone || '',
            siteWeb: cleanUrl(row.siteWeb || ''),
            adresse: row.adresse || '',
            linkedin: row.linkedin || '',

            // Additional fields from Google Maps
            rating: row.rating || '',
            nombreAvis: row.nombreAvis || '',
            statut: row.statut || '',
            googleMapsLink: row.googleMapsLink || '',

            // Keep any other custom fields
            ...(Object.fromEntries(
                Object.entries(row).filter(([k]) =>
                    !['nom', 'prenom', 'email', 'entreprise', 'poste', 'telephone',
                        'siteWeb', 'adresse', 'linkedin', 'rating', 'nombreAvis',
                        'statut', 'googleMapsLink', 'typeEntreprise'].includes(k)
                )
            ))
        };

        // Require at least one identifying field
        const hasIdentifier = prospect.nom || prospect.prenom || prospect.entreprise || prospect.email || prospect.telephone;

        if (!hasIdentifier) {
            errors.push({ row: i + 1, error: 'Aucun champ identifiant trouvé' });
            continue;
        }

        // Email validation (optional but must be valid if present)
        if (prospect.email && !isValidEmail(prospect.email)) {
            prospect.emailValid = false;
        } else {
            prospect.emailValid = true;
        }

        validated.push(prospect);
    }

    if (errors.length > 0) {
        console.warn('CSV Validation warnings:', errors);
    }

    return validated;
}

/**
 * Clean URL - remove Google tracking parameters and extract real URL
 */
function cleanUrl(url) {
    if (!url) return '';

    // If it's a Google redirect URL, try to extract the real URL
    if (url.includes('google.com/aclk') || url.includes('google.com/url')) {
        // These are tracking URLs, might not have a clean destination
        return '';
    }

    // If it starts with http, it's a real URL
    if (url.startsWith('http')) {
        try {
            const urlObj = new URL(url);
            // Return just the domain for cleanliness
            return urlObj.origin;
        } catch {
            return url;
        }
    }

    return url;
}

/**
 * Simple email validation
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Detect CSV structure and return column info
 */
async function analyzeCSV(content) {
    try {
        content = content.replace(/^\uFEFF/, '');

        const records = parse(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true,
            relax_quotes: true,
            bom: true,
            to: 5 // Only parse first 5 rows for analysis
        });

        if (records.length === 0) {
            return { headers: [], sampleData: [], mapped: {} };
        }

        const headers = Object.keys(records[0]);
        const mapped = {};

        for (const header of headers) {
            const normalized = normalizeHeader(header);
            mapped[header] = COLUMN_MAPPINGS[normalized] || null;
        }

        return {
            headers,
            sampleData: records,
            mapped,
            totalRows: records.length
        };
    } catch (error) {
        throw new Error(`Erreur d'analyse CSV: ${error.message}`);
    }
}

module.exports = {
    parseCSV,
    validateProspectData,
    analyzeCSV
};
