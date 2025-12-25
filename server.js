/**
 * ProspectApp - Serveur Backend
 * Application de prospection automatisée
 */

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Services
const { parseCSV, validateProspectData } = require('./services/csvService');
const { generateMessage, testLLMConnection } = require('./services/llmService');
const { generateExcel } = require('./services/excelService');
const { getYouTubeContent } = require('./services/youtubeService');
const playwrightService = require('./services/playwrightService');
const apifyService = require('./services/apifyService');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve React build (new frontend) - falls back to old public if dist doesn't exist
const reactBuildPath = path.join(__dirname, 'client', 'dist');
const oldPublicPath = path.join(__dirname, 'public');
const staticPath = fs.existsSync(reactBuildPath) ? reactBuildPath : oldPublicPath;
app.use(express.static(staticPath));

// Configuration Multer pour les uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Seuls les fichiers CSV sont acceptés'), false);
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Data storage path
const DATA_DIR = path.join(__dirname, 'data');
const PROSPECTS_FILE = path.join(DATA_DIR, 'prospects.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json');
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json');
const LISTS_FILE = path.join(DATA_DIR, 'lists.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const SEQUENCES_FILE = path.join(DATA_DIR, 'sequences.json');
const PIPELINE_FILE = path.join(DATA_DIR, 'pipeline.json');
const AUTOMATIONS_FILE = path.join(DATA_DIR, 'automations.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper functions for data persistence
function loadData(filepath) {
    if (fs.existsSync(filepath)) {
        return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }
    return [];
}

function saveData(filepath, data) {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

// ============================================
// API Routes
// ============================================

// === PROSPECTS ===

// Get all prospects
app.get('/api/prospects', (req, res) => {
    try {
        const prospects = loadData(PROSPECTS_FILE);
        res.json({ success: true, data: prospects, count: prospects.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single prospect by ID
app.get('/api/prospects/:id', (req, res) => {
    try {
        const prospects = loadData(PROSPECTS_FILE);
        const prospect = prospects.find(p => p.id === req.params.id);

        if (!prospect) {
            return res.status(404).json({ success: false, error: 'Prospect non trouvé' });
        }

        res.json({ success: true, data: prospect });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Import prospects from CSV
app.post('/api/prospects/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Aucun fichier fourni' });
        }

        const csvContent = fs.readFileSync(req.file.path, 'utf8');
        const parsedData = await parseCSV(csvContent);
        const validatedData = validateProspectData(parsedData);

        // Add IDs and timestamps
        const prospects = validatedData.map((prospect, index) => ({
            id: `prospect_${Date.now()}_${index}`,
            ...prospect,
            createdAt: new Date().toISOString(),
            status: 'new'
        }));

        // Load existing and merge
        const existingProspects = loadData(PROSPECTS_FILE);
        const allProspects = [...existingProspects, ...prospects];
        saveData(PROSPECTS_FILE, allProspects);

        // Cleanup uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            imported: prospects.length,
            total: allProspects.length,
            data: prospects
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Preview CSV without importing
app.post('/api/prospects/preview', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Aucun fichier fourni' });
        }

        const csvContent = fs.readFileSync(req.file.path, 'utf8');
        const parsedData = await parseCSV(csvContent);

        // Cleanup uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            count: parsedData.length,
            data: parsedData.slice(0, 50) // Preview max 50 rows
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete prospect
app.delete('/api/prospects/:id', (req, res) => {
    try {
        const prospects = loadData(PROSPECTS_FILE);
        const filtered = prospects.filter(p => p.id !== req.params.id);
        saveData(PROSPECTS_FILE, filtered);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update prospect
app.put('/api/prospects/:id', (req, res) => {
    try {
        const prospects = loadData(PROSPECTS_FILE);
        const index = prospects.findIndex(p => p.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Prospect non trouvé' });
        }

        // Update only provided fields
        const updateFields = ['prenom', 'nom', 'email', 'telephone', 'entreprise', 'poste',
            'adresse', 'siteWeb', 'linkedin', 'triageStatus', 'interestScore',
            'notes', 'tags'];

        updateFields.forEach(field => {
            if (req.body[field] !== undefined) {
                prospects[index][field] = req.body[field];
            }
        });

        prospects[index].updatedAt = new Date().toISOString();
        saveData(PROSPECTS_FILE, prospects);

        res.json({ success: true, data: prospects[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Clear all prospects
app.delete('/api/prospects', (req, res) => {
    try {
        saveData(PROSPECTS_FILE, []);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update prospect interest score
app.put('/api/prospects/:id/score', (req, res) => {
    try {
        const { interestScore } = req.body;
        if (interestScore === undefined || interestScore < 0 || interestScore > 100) {
            return res.status(400).json({ success: false, error: 'Score invalide (0-100)' });
        }

        const prospects = loadData(PROSPECTS_FILE);
        const index = prospects.findIndex(p => p.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Prospect non trouvé' });
        }

        prospects[index].interestScore = interestScore;
        prospects[index].scoreUpdatedAt = new Date().toISOString();
        saveData(PROSPECTS_FILE, prospects);

        res.json({ success: true, data: prospects[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === ENRICHMENT & SCORING ===

// Calculate ICP Score based on prospect data
function calculateICPScore(prospect, icpCriteria = {}) {
    let score = 0;
    let maxScore = 0;

    // Email presence (+15)
    maxScore += 15;
    if (prospect.email) score += 15;

    // Phone presence (+10)
    maxScore += 10;
    if (prospect.telephone) score += 10;

    // Company info (+15)
    maxScore += 15;
    if (prospect.entreprise) score += 15;

    // Position/Role (+10)
    maxScore += 10;
    if (prospect.poste) {
        score += 10;
        // Bonus for decision maker roles
        const decisionMakerKeywords = ['CEO', 'CTO', 'CFO', 'directeur', 'director', 'manager', 'head', 'chief', 'président', 'founder', 'owner', 'gérant'];
        if (decisionMakerKeywords.some(kw => prospect.poste.toLowerCase().includes(kw.toLowerCase()))) {
            score += 5;
        }
    }

    // Website (+10)
    maxScore += 10;
    if (prospect.siteWeb) score += 10;

    // LinkedIn (+10)
    maxScore += 10;
    if (prospect.linkedin) score += 10;

    // Address (+5)
    maxScore += 5;
    if (prospect.adresse) score += 5;

    // Rating from Google (+10)
    maxScore += 10;
    if (prospect.rating) {
        const rating = parseFloat(prospect.rating);
        if (rating >= 4.0) score += 10;
        else if (rating >= 3.5) score += 7;
        else if (rating >= 3.0) score += 5;
    }

    // Normalize to 0-100
    const normalizedScore = Math.round((score / maxScore) * 100);
    return Math.min(100, normalizedScore);
}

// Get ICP breakdown
app.get('/api/prospects/:id/icp', (req, res) => {
    try {
        const prospects = loadData(PROSPECTS_FILE);
        const prospect = prospects.find(p => p.id === req.params.id);

        if (!prospect) {
            return res.status(404).json({ success: false, error: 'Prospect non trouvé' });
        }

        const breakdown = {
            email: { value: !!prospect.email, points: prospect.email ? 15 : 0, maxPoints: 15, label: 'Email' },
            phone: { value: !!prospect.telephone, points: prospect.telephone ? 10 : 0, maxPoints: 10, label: 'Téléphone' },
            company: { value: !!prospect.entreprise, points: prospect.entreprise ? 15 : 0, maxPoints: 15, label: 'Entreprise' },
            role: { value: !!prospect.poste, points: prospect.poste ? 10 : 0, maxPoints: 10, label: 'Poste' },
            website: { value: !!prospect.siteWeb, points: prospect.siteWeb ? 10 : 0, maxPoints: 10, label: 'Site web' },
            linkedin: { value: !!prospect.linkedin, points: prospect.linkedin ? 10 : 0, maxPoints: 10, label: 'LinkedIn' },
            address: { value: !!prospect.adresse, points: prospect.adresse ? 5 : 0, maxPoints: 5, label: 'Adresse' },
            rating: { value: prospect.rating ? parseFloat(prospect.rating) : null, points: prospect.rating ? Math.min(10, Math.round(parseFloat(prospect.rating) * 2)) : 0, maxPoints: 10, label: 'Avis Google' }
        };

        const totalScore = calculateICPScore(prospect);
        const level = totalScore >= 80 ? 'hot' : totalScore >= 50 ? 'warm' : 'cold';

        res.json({ success: true, data: { score: totalScore, level, breakdown } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Enrich prospect with external data
app.post('/api/prospects/:id/enrich', async (req, res) => {
    try {
        const prospects = loadData(PROSPECTS_FILE);
        const index = prospects.findIndex(p => p.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Prospect non trouvé' });
        }

        const prospect = prospects[index];
        const enrichmentData = {};
        const enrichmentSources = [];

        // 1. Try to enrich via website scraping using Apify
        if (prospect.siteWeb && apifyService.isConfigured()) {
            try {
                const websiteData = await apifyService.scrapeWebsite(prospect.siteWeb);
                if (websiteData) {
                    enrichmentSources.push('website');
                    if (!prospect.email && websiteData.email) {
                        enrichmentData.email = websiteData.email;
                    }
                    if (!prospect.telephone && websiteData.phone) {
                        enrichmentData.telephone = websiteData.phone;
                    }
                    if (!prospect.adresse && websiteData.address) {
                        enrichmentData.adresse = websiteData.address;
                    }
                    if (!prospect.linkedin && websiteData.linkedin) {
                        enrichmentData.linkedin = websiteData.linkedin;
                    }
                    enrichmentData.websiteData = websiteData;
                }
            } catch (err) {
                console.log('Website enrichment failed:', err.message);
            }
        }

        // 2. Try to enrich via Google Maps if we have company name
        if (prospect.entreprise && apifyService.isConfigured()) {
            try {
                const searchQuery = prospect.entreprise + (prospect.adresse ? ` ${prospect.adresse}` : '');
                const mapsResults = await apifyService.searchGoogleMaps(searchQuery, prospect.adresse || 'France', 1);

                if (mapsResults && mapsResults.length > 0) {
                    const place = mapsResults[0];
                    enrichmentSources.push('google_maps');

                    if (!prospect.telephone && place.phone) {
                        enrichmentData.telephone = place.phone;
                    }
                    if (!prospect.siteWeb && place.website) {
                        enrichmentData.siteWeb = place.website;
                    }
                    if (!prospect.adresse && place.address) {
                        enrichmentData.adresse = place.address;
                    }
                    if (!prospect.rating && place.rating) {
                        enrichmentData.rating = place.rating.toString();
                    }
                    enrichmentData.googleMapsData = {
                        rating: place.rating,
                        reviewCount: place.reviewCount,
                        category: place.category,
                        url: place.googleMapsUrl
                    };
                }
            } catch (err) {
                console.log('Google Maps enrichment failed:', err.message);
            }
        }

        // 3. Use LLM to generate insights if we have enough data
        if (prospect.entreprise) {
            try {
                const response = await fetch('http://localhost:11434/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'llama3.2',
                        prompt: `Analyse cette entreprise et génère des insights pour la prospection commerciale.
                        
Entreprise: ${prospect.entreprise}
Poste du contact: ${prospect.poste || 'Non spécifié'}
Secteur/Catégorie: ${enrichmentData.googleMapsData?.category || 'Non spécifié'}

Génère un JSON avec uniquement ces champs:
{
    "painPoints": ["3 points de douleur potentiels"],
    "approaches": ["3 approches de prospection"],
    "valueProposition": "proposition de valeur adaptée"
}

Réponds UNIQUEMENT avec le JSON.`,
                        stream: false,
                        options: { temperature: 0.7, num_predict: 500 }
                    })
                });

                if (response.ok) {
                    const llmResult = await response.json();
                    const jsonMatch = llmResult.response.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        enrichmentData.aiInsights = JSON.parse(jsonMatch[0]);
                        enrichmentSources.push('ai_analysis');
                    }
                }
            } catch (err) {
                console.log('AI enrichment failed:', err.message);
            }
        }

        // Update prospect with enrichment data
        Object.assign(prospects[index], enrichmentData);
        prospects[index].enrichedAt = new Date().toISOString();
        prospects[index].enrichmentSources = enrichmentSources;

        // Recalculate ICP score
        prospects[index].interestScore = calculateICPScore(prospects[index]);

        saveData(PROSPECTS_FILE, prospects);

        res.json({
            success: true,
            data: prospects[index],
            enrichment: {
                sources: enrichmentSources,
                fieldsUpdated: Object.keys(enrichmentData).filter(k => !['websiteData', 'googleMapsData', 'aiInsights'].includes(k)),
                aiInsights: enrichmentData.aiInsights || null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk recalculate ICP scores
app.post('/api/prospects/recalculate-scores', (req, res) => {
    try {
        const prospects = loadData(PROSPECTS_FILE);
        let updated = 0;

        prospects.forEach(prospect => {
            const newScore = calculateICPScore(prospect);
            if (prospect.interestScore !== newScore) {
                prospect.interestScore = newScore;
                prospect.scoreUpdatedAt = new Date().toISOString();
                updated++;
            }
        });

        saveData(PROSPECTS_FILE, prospects);
        res.json({ success: true, updated, total: prospects.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === RESEARCH ENDPOINTS ===

// Research prospect using Playwright (free, local scraping)
app.post('/api/prospects/:id/research/playwright', async (req, res) => {
    try {
        const prospects = loadData(PROSPECTS_FILE);
        const index = prospects.findIndex(p => p.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Prospect non trouvé' });
        }

        const prospect = prospects[index];

        // Get online presence using Playwright service
        const researchData = await playwrightService.getOnlinePresence({
            name: `${prospect.prenom || ''} ${prospect.nom || ''}`.trim() || prospect.entreprise,
            company: prospect.entreprise,
            linkedin: prospect.linkedin,
            website: prospect.siteWeb
        });

        // Save research data to prospect
        prospects[index].playwrightResearch = {
            ...researchData,
            researchedAt: new Date().toISOString()
        };
        saveData(PROSPECTS_FILE, prospects);

        res.json({
            success: true,
            data: {
                prospect: { id: prospect.id, name: `${prospect.prenom || ''} ${prospect.nom || ''}`.trim() },
                ...researchData,
                scrapedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Playwright research error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Research prospect using Apify (advanced, requires API key)
app.post('/api/prospects/:id/research/apify', async (req, res) => {
    try {
        // Check if Apify is configured
        if (!apifyService.isConfigured()) {
            return res.status(400).json({
                success: false,
                error: 'Apify n\'est pas configuré. Veuillez ajouter votre clé API dans les paramètres.'
            });
        }

        const prospects = loadData(PROSPECTS_FILE);
        const index = prospects.findIndex(p => p.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Prospect non trouvé' });
        }

        const prospect = prospects[index];

        // Research prospect using Apify actors
        const researchData = await apifyService.researchProspect({
            name: `${prospect.prenom || ''} ${prospect.nom || ''}`.trim() || prospect.entreprise,
            company: prospect.entreprise,
            linkedin: prospect.linkedin,
            website: prospect.siteWeb
        });

        // Save research data to prospect
        prospects[index].apifyResearch = {
            ...researchData,
            researchedAt: new Date().toISOString()
        };
        saveData(PROSPECTS_FILE, prospects);

        res.json({
            success: true,
            data: {
                prospect: { id: prospect.id, name: `${prospect.prenom || ''} ${prospect.nom || ''}`.trim() },
                ...researchData,
                researchedAt: new Date().toISOString(),
                source: 'apify'
            }
        });
    } catch (error) {
        console.error('Apify research error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// === COMPANY ANALYSIS ===


// Analyze a company using LLM
app.post('/api/company/analyze', async (req, res) => {
    try {
        const { companyName, website, context, prospectInfo } = req.body;

        if (!companyName) {
            return res.status(400).json({ success: false, error: 'Nom de l\'entreprise requis' });
        }

        // Build comprehensive prompt for LLM
        const prompt = `Tu es un expert en analyse d'entreprises B2B. Analyse l'entreprise suivante et génère un rapport structuré.

ENTREPRISE: ${companyName}
${website ? `SITE WEB: ${website}` : ''}
${context ? `CONTEXTE ADDITIONNEL: ${context}` : ''}
${prospectInfo ? `INFORMATIONS SUR LES CONTACTS: ${prospectInfo}` : ''}

Génère une analyse complète au format JSON avec la structure suivante:
{
    "interestScore": <nombre entre 0 et 100 représentant le potentiel commercial>,
    "overview": "<description générale de l'entreprise en 2-3 phrases>",
    "industryAnalysis": "<analyse du secteur d'activité, tendances et positionnement>",
    "painPoints": ["<liste de 3-5 points de douleur potentiels>"],
    "opportunities": ["<liste de 3-5 opportunités commerciales>"],
    "recommendedApproach": "<stratégie d'approche recommandée pour la prospection>"
}

IMPORTANT: Réponds UNIQUEMENT avec le JSON, sans commentaires ni explications.`;

        // Call LLM using the existing service
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.2',
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    num_predict: 1000
                }
            })
        });

        if (!response.ok) {
            throw new Error('Erreur lors de l\'appel au LLM');
        }

        const llmResult = await response.json();
        let analysisData;

        try {
            // Try to extract JSON from response
            const jsonMatch = llmResult.response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysisData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Format de réponse invalide');
            }
        } catch (parseError) {
            // Fallback with default structure
            analysisData = {
                interestScore: Math.floor(Math.random() * 40) + 40, // 40-80
                overview: `${companyName} est une entreprise qui opère dans son secteur d'activité. Une analyse plus approfondie serait nécessaire pour des informations détaillées.`,
                industryAnalysis: "Secteur avec potentiel de croissance. Les entreprises de ce domaine cherchent généralement à optimiser leurs processus et améliorer leur efficacité.",
                painPoints: [
                    "Gestion de la croissance",
                    "Optimisation des processus",
                    "Acquisition de nouveaux clients",
                    "Digitalisation des opérations"
                ],
                opportunities: [
                    "Amélioration de la productivité",
                    "Nouveaux marchés potentiels",
                    "Partenariats stratégiques",
                    "Innovation produit/service"
                ],
                recommendedApproach: "Approche consultative axée sur la valeur ajoutée. Proposer une découverte de leurs enjeux actuels avant de présenter des solutions."
            };
        }

        // Ensure score is within bounds
        analysisData.interestScore = Math.max(0, Math.min(100, analysisData.interestScore || 50));

        res.json({
            success: true,
            data: analysisData
        });

    } catch (error) {
        console.error('Company analysis error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// === MESSAGES GENERATION ===

// Test LLM connection
app.get('/api/llm/test', async (req, res) => {
    try {
        const result = await testLLMConnection();
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Generate messages for prospects
app.post('/api/messages/generate', async (req, res) => {
    try {
        const { prospectIds, tone, length, instructions } = req.body;

        if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
            return res.status(400).json({ success: false, error: 'IDs de prospects requis' });
        }

        const prospects = loadData(PROSPECTS_FILE);
        const selectedProspects = prospects.filter(p => prospectIds.includes(p.id));

        if (selectedProspects.length === 0) {
            return res.status(404).json({ success: false, error: 'Aucun prospect trouvé' });
        }

        const messages = [];
        for (const prospect of selectedProspects) {
            try {
                const generatedContent = await generateMessage(prospect, { tone, length, instructions });
                messages.push({
                    id: `msg_${Date.now()}_${prospect.id}`,
                    prospectId: prospect.id,
                    content: generatedContent,
                    channel: 'email',
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    generatedAt: new Date().toISOString()
                });
            } catch (err) {
                messages.push({
                    id: `msg_${Date.now()}_${prospect.id}`,
                    prospectId: prospect.id,
                    content: '',
                    channel: 'email',
                    status: 'pending',
                    error: err.message,
                    createdAt: new Date().toISOString(),
                    generatedAt: new Date().toISOString()
                });
            }
        }

        // Save messages
        const existingMessages = loadData(MESSAGES_FILE);
        const allMessages = [...existingMessages, ...messages];
        saveData(MESSAGES_FILE, allMessages);

        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all generated messages
app.get('/api/messages', (req, res) => {
    try {
        const messages = loadData(MESSAGES_FILE);
        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update a message
app.put('/api/messages/:id', (req, res) => {
    try {
        const messages = loadData(MESSAGES_FILE);
        const index = messages.findIndex(m => m.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Message non trouvé' });
        }
        messages[index] = { ...messages[index], ...req.body, updatedAt: new Date().toISOString() };
        saveData(MESSAGES_FILE, messages);
        res.json({ success: true, data: messages[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete a message
app.delete('/api/messages/:id', (req, res) => {
    try {
        const messages = loadData(MESSAGES_FILE);
        const filtered = messages.filter(m => m.id !== req.params.id);
        saveData(MESSAGES_FILE, filtered);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Regenerate a single message
app.post('/api/messages/:id/regenerate', async (req, res) => {
    try {
        const messages = loadData(MESSAGES_FILE);
        const index = messages.findIndex(m => m.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Message non trouvé' });
        }

        const message = messages[index];
        const prospects = loadData(PROSPECTS_FILE);
        const prospect = prospects.find(p => p.id === message.prospectId);

        if (!prospect) {
            return res.status(404).json({ success: false, error: 'Prospect non trouvé' });
        }

        // Regenerate with LLM
        const { tone = 'professionnel', length = 'moyen' } = req.body;
        const newContent = await generateMessage(prospect, { tone, length });

        // Update message
        messages[index] = {
            ...message,
            content: newContent,
            regeneratedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        saveData(MESSAGES_FILE, messages);
        res.json({ success: true, data: messages[index] });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Clear all messages
app.delete('/api/messages/clear', (req, res) => {
    try {
        saveData(MESSAGES_FILE, []);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === EXPORT ===

// Export to Excel
app.post('/api/export/excel', async (req, res) => {
    try {
        const { prospectIds, includeMessages } = req.body;

        const prospects = loadData(PROSPECTS_FILE);
        const messages = loadData(MESSAGES_FILE);

        let dataToExport = prospects;
        if (prospectIds && Array.isArray(prospectIds) && prospectIds.length > 0) {
            dataToExport = prospects.filter(p => prospectIds.includes(p.id));
        }

        // Merge messages if requested
        if (includeMessages) {
            dataToExport = dataToExport.map(prospect => {
                const msg = messages.find(m => m.prospectId === prospect.id);
                return {
                    ...prospect,
                    messageGenere: msg ? msg.message : ''
                };
            });
        }

        const buffer = await generateExcel(dataToExport);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=prospects_${Date.now()}.xlsx`);
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === CAMPAIGNS ===

// Get all campaigns
app.get('/api/campaigns', (req, res) => {
    try {
        const campaigns = loadData(CAMPAIGNS_FILE);
        res.json({ success: true, data: campaigns });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create campaign
app.post('/api/campaigns', (req, res) => {
    try {
        const campaigns = loadData(CAMPAIGNS_FILE);
        const prospects = loadData(PROSPECTS_FILE);

        // Calculate target count from prospectIds
        const prospectIds = req.body.prospectIds || [];
        const targetProspects = prospects.filter(p => prospectIds.includes(p.id));

        const newCampaign = {
            id: `campaign_${Date.now()}`,
            name: req.body.name || 'Nouvelle campagne',
            objective: req.body.objective || 'rendez-vous',
            status: 'draft',
            dateStart: req.body.dateStart || null,
            dateEnd: req.body.dateEnd || null,
            budget: req.body.budget || 0,
            prospectIds: prospectIds,
            templateId: req.body.templateId || null,
            progress: 0,
            stats: {
                totalTargets: targetProspects.length,
                sent: 0,
                opened: 0,
                replied: 0
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: req.body.createdBy || 'Utilisateur'
        };
        campaigns.push(newCampaign);
        saveData(CAMPAIGNS_FILE, campaigns);
        res.json({ success: true, data: newCampaign });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single campaign
app.get('/api/campaigns/:id', (req, res) => {
    try {
        const campaigns = loadData(CAMPAIGNS_FILE);
        const campaign = campaigns.find(c => c.id === req.params.id);
        if (!campaign) {
            return res.status(404).json({ success: false, error: 'Campagne non trouvée' });
        }
        res.json({ success: true, data: campaign });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update campaign
app.put('/api/campaigns/:id', (req, res) => {
    try {
        const campaigns = loadData(CAMPAIGNS_FILE);
        const index = campaigns.findIndex(c => c.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Campagne non trouvée' });
        }

        const prospects = loadData(PROSPECTS_FILE);
        const prospectIds = req.body.prospectIds || campaigns[index].prospectIds || [];
        const targetProspects = prospects.filter(p => prospectIds.includes(p.id));

        campaigns[index] = {
            ...campaigns[index],
            ...req.body,
            stats: {
                ...campaigns[index].stats,
                totalTargets: targetProspects.length
            },
            updatedAt: new Date().toISOString()
        };
        saveData(CAMPAIGNS_FILE, campaigns);
        res.json({ success: true, data: campaigns[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete campaign
app.delete('/api/campaigns/:id', (req, res) => {
    try {
        const campaigns = loadData(CAMPAIGNS_FILE);
        const filtered = campaigns.filter(c => c.id !== req.params.id);
        if (filtered.length === campaigns.length) {
            return res.status(404).json({ success: false, error: 'Campagne non trouvée' });
        }
        saveData(CAMPAIGNS_FILE, filtered);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Change campaign status
app.post('/api/campaigns/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['draft', 'active', 'paused', 'completed'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Statut invalide' });
        }

        const campaigns = loadData(CAMPAIGNS_FILE);
        const index = campaigns.findIndex(c => c.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Campagne non trouvée' });
        }

        campaigns[index].status = status;
        campaigns[index].updatedAt = new Date().toISOString();

        // If launching, set progress and update start date if not set
        if (status === 'active' && !campaigns[index].dateStart) {
            campaigns[index].dateStart = new Date().toISOString().split('T')[0];
        }

        // If completing, set progress to 100%
        if (status === 'completed') {
            campaigns[index].progress = 100;
            if (!campaigns[index].dateEnd) {
                campaigns[index].dateEnd = new Date().toISOString().split('T')[0];
            }
        }

        saveData(CAMPAIGNS_FILE, campaigns);
        res.json({ success: true, data: campaigns[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Duplicate campaign
app.post('/api/campaigns/:id/duplicate', (req, res) => {
    try {
        const campaigns = loadData(CAMPAIGNS_FILE);
        const original = campaigns.find(c => c.id === req.params.id);
        if (!original) {
            return res.status(404).json({ success: false, error: 'Campagne non trouvée' });
        }

        const duplicate = {
            ...original,
            id: `campaign_${Date.now()}`,
            name: `${original.name} (copie)`,
            status: 'draft',
            progress: 0,
            stats: {
                ...original.stats,
                sent: 0,
                opened: 0,
                replied: 0
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        campaigns.push(duplicate);
        saveData(CAMPAIGNS_FILE, campaigns);
        res.json({ success: true, data: duplicate });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === TEMPLATES ===

// Get all templates
app.get('/api/templates', (req, res) => {
    try {
        const templates = loadData(TEMPLATES_FILE);
        res.json({ success: true, data: templates });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single template
app.get('/api/templates/:id', (req, res) => {
    try {
        const templates = loadData(TEMPLATES_FILE);
        const template = templates.find(t => t.id === req.params.id);
        if (!template) {
            return res.status(404).json({ success: false, error: 'Template non trouvé' });
        }
        res.json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create template
app.post('/api/templates', (req, res) => {
    try {
        const templates = loadData(TEMPLATES_FILE);
        const newTemplate = {
            id: `template_${Date.now()}`,
            name: req.body.name || 'Nouveau template',
            channel: req.body.channel || 'email',
            content: req.body.content || '',
            description: req.body.description || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        templates.push(newTemplate);
        saveData(TEMPLATES_FILE, templates);
        res.json({ success: true, data: newTemplate });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update template
app.put('/api/templates/:id', (req, res) => {
    try {
        const templates = loadData(TEMPLATES_FILE);
        const index = templates.findIndex(t => t.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Template non trouvé' });
        }
        templates[index] = {
            ...templates[index],
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        saveData(TEMPLATES_FILE, templates);
        res.json({ success: true, data: templates[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete template
app.delete('/api/templates/:id', (req, res) => {
    try {
        const templates = loadData(TEMPLATES_FILE);
        const filtered = templates.filter(t => t.id !== req.params.id);
        if (filtered.length === templates.length) {
            return res.status(404).json({ success: false, error: 'Template non trouvé' });
        }
        saveData(TEMPLATES_FILE, filtered);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Duplicate template
app.post('/api/templates/:id/duplicate', (req, res) => {
    try {
        const templates = loadData(TEMPLATES_FILE);
        const original = templates.find(t => t.id === req.params.id);
        if (!original) {
            return res.status(404).json({ success: false, error: 'Template non trouvé' });
        }
        const duplicate = {
            ...original,
            id: `template_${Date.now()}`,
            name: `${original.name} (copie)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        templates.push(duplicate);
        saveData(TEMPLATES_FILE, templates);
        res.json({ success: true, data: duplicate });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Import template from YouTube (extract transcript)
app.post('/api/templates/import/youtube', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ success: false, error: 'URL YouTube requise' });
        }

        // Extract video ID from URL
        const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
        if (!videoIdMatch) {
            return res.status(400).json({ success: false, error: 'URL YouTube invalide' });
        }
        const videoId = videoIdMatch[1];

        // For now, return a placeholder since YouTube transcript API requires additional setup
        // In production, you would use youtube-transcript or similar library
        const placeholderContent = `[Contenu vidéo YouTube - ${videoId}]\n\nBonjour {{prenom}},\n\nJ'ai récemment visionné une vidéo qui aborde {{sujet}} et je pense que cela pourrait vous intéresser dans le cadre de votre rôle chez {{entreprise}}.\n\nSeriez-vous disponible pour un échange rapide cette semaine ?\n\nCordialement,\n[Votre nom]`;

        res.json({
            success: true,
            data: {
                content: placeholderContent,
                videoId: videoId,
                source: 'youtube'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Import template from document (PDF, Word, TXT)
app.post('/api/templates/import/document', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Aucun fichier fourni' });
        }

        const filePath = req.file.path;
        const fileExt = path.extname(req.file.originalname).toLowerCase();
        let content = '';

        try {
            if (fileExt === '.txt') {
                content = fs.readFileSync(filePath, 'utf8');
            } else if (fileExt === '.pdf') {
                // For PDF, we'd need pdf-parse library - returning placeholder
                content = `[Contenu importé depuis ${req.file.originalname}]\n\nBonjour {{prenom}},\n\nCe message a été créé à partir d'un document PDF. Vous pouvez personnaliser ce contenu selon vos besoins.\n\nCordialement,\n[Votre nom]`;
            } else if (fileExt === '.doc' || fileExt === '.docx') {
                // For Word, we'd need mammoth or similar - returning placeholder
                content = `[Contenu importé depuis ${req.file.originalname}]\n\nBonjour {{prenom}},\n\nCe message a été créé à partir d'un document Word. Vous pouvez personnaliser ce contenu selon vos besoins.\n\nCordialement,\n[Votre nom]`;
            } else {
                content = fs.readFileSync(filePath, 'utf8');
            }
        } catch (readError) {
            content = `[Contenu importé depuis ${req.file.originalname}]\n\nBonjour {{prenom}},\n\nN'hésitez pas à personnaliser ce template selon vos besoins.\n\nCordialement,\n[Votre nom]`;
        }

        // Cleanup uploaded file
        try {
            fs.unlinkSync(filePath);
        } catch (e) {
            console.error('Error cleaning up file:', e);
        }

        res.json({
            success: true,
            data: {
                content: content,
                filename: req.file.originalname,
                source: 'document'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === PROSPECT LISTS (GROUPS) ===

// Get all lists
app.get('/api/lists', (req, res) => {
    try {
        const lists = loadData(LISTS_FILE);
        const prospects = loadData(PROSPECTS_FILE);

        // Enrich lists with prospect count
        const enrichedLists = lists.map(list => ({
            ...list,
            prospectCount: list.prospectIds ? list.prospectIds.length : 0
        }));

        res.json({ success: true, data: enrichedLists });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create list
app.post('/api/lists', (req, res) => {
    try {
        const lists = loadData(LISTS_FILE);
        const newList = {
            id: `list_${Date.now()}`,
            name: req.body.name || 'Nouvelle liste',
            description: req.body.description || '',
            color: req.body.color || 'blue',
            icon: req.body.icon || 'folder',
            prospectIds: req.body.prospectIds || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        lists.push(newList);
        saveData(LISTS_FILE, lists);
        res.json({ success: true, data: newList });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single list with prospects
app.get('/api/lists/:id', (req, res) => {
    try {
        const lists = loadData(LISTS_FILE);
        const list = lists.find(l => l.id === req.params.id);
        if (!list) {
            return res.status(404).json({ success: false, error: 'Liste non trouvée' });
        }

        // Get prospects in this list
        const prospects = loadData(PROSPECTS_FILE);
        const listProspects = prospects.filter(p => list.prospectIds.includes(p.id));

        res.json({
            success: true,
            data: {
                ...list,
                prospects: listProspects,
                prospectCount: listProspects.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update list
app.put('/api/lists/:id', (req, res) => {
    try {
        const lists = loadData(LISTS_FILE);
        const index = lists.findIndex(l => l.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Liste non trouvée' });
        }
        lists[index] = {
            ...lists[index],
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        saveData(LISTS_FILE, lists);
        res.json({ success: true, data: lists[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete list
app.delete('/api/lists/:id', (req, res) => {
    try {
        const lists = loadData(LISTS_FILE);
        const filtered = lists.filter(l => l.id !== req.params.id);
        if (filtered.length === lists.length) {
            return res.status(404).json({ success: false, error: 'Liste non trouvée' });
        }
        saveData(LISTS_FILE, filtered);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add prospects to list
app.post('/api/lists/:id/prospects', (req, res) => {
    try {
        const { prospectIds } = req.body;
        if (!prospectIds || !Array.isArray(prospectIds)) {
            return res.status(400).json({ success: false, error: 'prospectIds requis' });
        }

        const lists = loadData(LISTS_FILE);
        const index = lists.findIndex(l => l.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Liste non trouvée' });
        }

        // Add new prospects (avoid duplicates)
        const currentIds = new Set(lists[index].prospectIds || []);
        prospectIds.forEach(id => currentIds.add(id));
        lists[index].prospectIds = Array.from(currentIds);
        lists[index].updatedAt = new Date().toISOString();

        saveData(LISTS_FILE, lists);
        res.json({ success: true, data: lists[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Remove prospects from list
app.delete('/api/lists/:id/prospects', (req, res) => {
    try {
        const { prospectIds } = req.body;
        if (!prospectIds || !Array.isArray(prospectIds)) {
            return res.status(400).json({ success: false, error: 'prospectIds requis' });
        }

        const lists = loadData(LISTS_FILE);
        const index = lists.findIndex(l => l.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Liste non trouvée' });
        }

        // Remove prospects from list
        const removeSet = new Set(prospectIds);
        lists[index].prospectIds = (lists[index].prospectIds || []).filter(id => !removeSet.has(id));
        lists[index].updatedAt = new Date().toISOString();

        saveData(LISTS_FILE, lists);
        res.json({ success: true, data: lists[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Duplicate list
app.post('/api/lists/:id/duplicate', (req, res) => {
    try {
        const lists = loadData(LISTS_FILE);
        const original = lists.find(l => l.id === req.params.id);
        if (!original) {
            return res.status(404).json({ success: false, error: 'Liste non trouvée' });
        }
        const duplicate = {
            ...original,
            id: `list_${Date.now()}`,
            name: `${original.name} (copie)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        lists.push(duplicate);
        saveData(LISTS_FILE, lists);
        res.json({ success: true, data: duplicate });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === PROSPECT TRIAGE ===

// Update single prospect triage status
app.put('/api/prospects/:id/triage', (req, res) => {
    try {
        const { status, note } = req.body;
        const validStatuses = ['nouveau', 'qualifié', 'contacté', 'intéressé', 'non_intéressé'];

        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Statut de triage invalide' });
        }

        const prospects = loadData(PROSPECTS_FILE);
        const index = prospects.findIndex(p => p.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Prospect non trouvé' });
        }

        if (status) prospects[index].triageStatus = status;
        if (note !== undefined) prospects[index].triageNote = note;
        prospects[index].triageUpdatedAt = new Date().toISOString();

        saveData(PROSPECTS_FILE, prospects);
        res.json({ success: true, data: prospects[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk update prospect triage status
app.put('/api/prospects/bulk/triage', (req, res) => {
    try {
        const { prospectIds, status, note } = req.body;
        const validStatuses = ['nouveau', 'qualifié', 'contacté', 'intéressé', 'non_intéressé'];

        if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
            return res.status(400).json({ success: false, error: 'prospectIds requis' });
        }

        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Statut de triage invalide' });
        }

        const prospects = loadData(PROSPECTS_FILE);
        const updateSet = new Set(prospectIds);
        let updated = 0;

        prospects.forEach((prospect, index) => {
            if (updateSet.has(prospect.id)) {
                if (status) prospects[index].triageStatus = status;
                if (note !== undefined) prospects[index].triageNote = note;
                prospects[index].triageUpdatedAt = new Date().toISOString();
                updated++;
            }
        });

        saveData(PROSPECTS_FILE, prospects);
        res.json({ success: true, updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk add/remove prospects to/from list
app.put('/api/prospects/bulk/list', (req, res) => {
    try {
        const { prospectIds, listId, action } = req.body;

        if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
            return res.status(400).json({ success: false, error: 'prospectIds requis' });
        }

        if (!listId) {
            return res.status(400).json({ success: false, error: 'listId requis' });
        }

        if (!['add', 'remove'].includes(action)) {
            return res.status(400).json({ success: false, error: 'action doit être "add" ou "remove"' });
        }

        const lists = loadData(LISTS_FILE);
        const index = lists.findIndex(l => l.id === listId);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Liste non trouvée' });
        }

        const currentIds = new Set(lists[index].prospectIds || []);

        if (action === 'add') {
            prospectIds.forEach(id => currentIds.add(id));
        } else {
            prospectIds.forEach(id => currentIds.delete(id));
        }

        lists[index].prospectIds = Array.from(currentIds);
        lists[index].updatedAt = new Date().toISOString();

        saveData(LISTS_FILE, lists);
        res.json({ success: true, data: lists[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === SETTINGS ===

// Get LLM settings
app.get('/api/settings', (req, res) => {
    res.json({
        success: true,
        data: {
            llm: {
                url: process.env.LLM_API_URL || 'http://localhost:11434/api/generate',
                model: process.env.LLM_MODEL || 'llama3'
            }
        }
    });
});

// === YOUTUBE ===

// Extract YouTube video transcript
app.post('/api/youtube/transcript', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL YouTube requise' });
        }

        const result = await getYouTubeContent(url);

        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }

        res.json({
            success: true,
            data: {
                videoId: result.videoId,
                title: result.videoInfo?.title || '',
                channelName: result.videoInfo?.channelName || '',
                description: result.videoInfo?.description || '',
                transcript: result.transcript,
                hasTranscript: result.hasTranscript,
                message: result.message
            }
        });
    } catch (error) {
        console.error('YouTube transcript error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// === STATS & ANALYTICS ===

// Get dashboard statistics
app.get('/api/stats/overview', (req, res) => {
    try {
        const prospects = loadData(PROSPECTS_FILE);
        const messages = loadData(MESSAGES_FILE);
        const campaigns = loadData(CAMPAIGNS_FILE);

        // Calculate weekly comparison
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const prospectsThisWeek = prospects.filter(p => new Date(p.createdAt) >= oneWeekAgo).length;
        const prospectsLastWeek = prospects.filter(p => {
            const date = new Date(p.createdAt);
            return date >= twoWeeksAgo && date < oneWeekAgo;
        }).length;

        const messagesThisWeek = messages.filter(m => new Date(m.generatedAt) >= oneWeekAgo).length;
        const messagesLastWeek = messages.filter(m => {
            const date = new Date(m.generatedAt);
            return date >= twoWeeksAgo && date < oneWeekAgo;
        }).length;

        // Campaign stats
        const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
        const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
        const draftCampaigns = campaigns.filter(c => c.status === 'draft').length;

        // Calculate engagement rate (messages with status 'sent' / total messages)
        const sentMessages = messages.filter(m => m.status === 'sent' || m.status === 'ready').length;
        const engagementRate = messages.length > 0 ? Math.round((sentMessages / messages.length) * 100) : 0;

        // Weekly performance data for chart
        const weeklyData = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

            const dayProspects = prospects.filter(p => {
                const date = new Date(p.createdAt);
                return date >= dayStart && date < dayEnd;
            }).length;

            const dayMessages = messages.filter(m => {
                const date = new Date(m.generatedAt);
                return date >= dayStart && date < dayEnd;
            }).length;

            weeklyData.push({
                day: dayStart.toLocaleDateString('fr-FR', { weekday: 'short' }),
                date: dayStart.toISOString().split('T')[0],
                prospects: dayProspects,
                messages: dayMessages
            });
        }

        res.json({
            success: true,
            data: {
                prospects: {
                    total: prospects.length,
                    thisWeek: prospectsThisWeek,
                    lastWeek: prospectsLastWeek,
                    change: prospectsLastWeek > 0 ? Math.round(((prospectsThisWeek - prospectsLastWeek) / prospectsLastWeek) * 100) : 0
                },
                messages: {
                    total: messages.length,
                    thisWeek: messagesThisWeek,
                    lastWeek: messagesLastWeek,
                    change: messagesLastWeek > 0 ? Math.round(((messagesThisWeek - messagesLastWeek) / messagesLastWeek) * 100) : 0
                },
                campaigns: {
                    total: campaigns.length,
                    active: activeCampaigns,
                    completed: completedCampaigns,
                    draft: draftCampaigns
                },
                engagementRate,
                weeklyData
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get recent activity for dashboard
app.get('/api/activity', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const prospects = loadData(PROSPECTS_FILE);
        const messages = loadData(MESSAGES_FILE);
        const campaigns = loadData(CAMPAIGNS_FILE);

        // Collect all activities with their timestamps
        const activities = [];

        // Recent prospect imports
        prospects.forEach(p => {
            if (p.createdAt) {
                activities.push({
                    id: `activity_prospect_${p.id}`,
                    type: 'import',
                    title: 'Prospect ajouté',
                    description: `${p.prenom || ''} ${p.nom || ''} - ${p.entreprise || 'Entreprise non renseignée'}`.trim(),
                    timestamp: p.createdAt,
                    metadata: { prospectId: p.id }
                });
            }
        });

        // Recent messages generated
        messages.forEach(m => {
            if (m.generatedAt) {
                const prospect = prospects.find(p => p.id === m.prospectId);
                activities.push({
                    id: `activity_message_${m.id}`,
                    type: 'message_generated',
                    title: 'Message généré',
                    description: `Message pour ${prospect?.prenom || prospect?.nom || prospect?.entreprise || 'un prospect'}`,
                    timestamp: m.generatedAt,
                    metadata: { messageId: m.id, prospectId: m.prospectId }
                });
            }

            // Message sent activity
            if (m.status === 'sent' && m.sentAt) {
                activities.push({
                    id: `activity_sent_${m.id}`,
                    type: 'message_sent',
                    title: 'Message envoyé',
                    description: `Message envoyé à ${prospects.find(p => p.id === m.prospectId)?.entreprise || 'un prospect'}`,
                    timestamp: m.sentAt,
                    metadata: { messageId: m.id }
                });
            }
        });

        // Campaign activities
        campaigns.forEach(c => {
            if (c.status === 'active' && c.updatedAt) {
                activities.push({
                    id: `activity_campaign_started_${c.id}`,
                    type: 'campaign_started',
                    title: 'Campagne lancée',
                    description: `Campagne "${c.name}" démarrée`,
                    timestamp: c.updatedAt,
                    metadata: { campaignId: c.id }
                });
            }
            if (c.status === 'completed' && c.updatedAt) {
                activities.push({
                    id: `activity_campaign_completed_${c.id}`,
                    type: 'campaign_completed',
                    title: 'Campagne terminée',
                    description: `Campagne "${c.name}" terminée avec succès`,
                    timestamp: c.updatedAt,
                    metadata: { campaignId: c.id }
                });
            }
        });

        // Sort by timestamp (most recent first) and limit
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const limitedActivities = activities.slice(0, limit);

        res.json({ success: true, data: limitedActivities });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get goals and progress for dashboard
app.get('/api/stats/goals', (req, res) => {
    try {
        const prospects = loadData(PROSPECTS_FILE);
        const messages = loadData(MESSAGES_FILE);
        const campaigns = loadData(CAMPAIGNS_FILE);

        // Default monthly goals
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Count items created this month
        const prospectsThisMonth = prospects.filter(p =>
            p.createdAt && new Date(p.createdAt) >= startOfMonth
        ).length;

        const messagesThisMonth = messages.filter(m =>
            m.generatedAt && new Date(m.generatedAt) >= startOfMonth
        ).length;

        const messagesSentThisMonth = messages.filter(m =>
            m.status === 'sent' && m.sentAt && new Date(m.sentAt) >= startOfMonth
        ).length;

        const repliesThisMonth = messages.filter(m =>
            m.status === 'replied' && m.repliedAt && new Date(m.repliedAt) >= startOfMonth
        ).length;

        // Goals configuration
        const goals = [
            { id: 'prospects', title: 'Nouveaux prospects', current: prospectsThisMonth, target: 100, type: 'prospects' },
            { id: 'messages', title: 'Messages envoyés', current: messagesSentThisMonth, target: 50, type: 'messages' },
            { id: 'replies', title: 'Réponses reçues', current: repliesThisMonth, target: 20, type: 'engagement' }
        ];

        const totalProgress = goals.reduce((sum, g) => sum + Math.min(g.current / g.target, 1), 0) / goals.length;
        const status = totalProgress >= 0.8 ? 'excellent' : totalProgress >= 0.5 ? 'good' : 'needs_attention';

        res.json({
            success: true,
            data: {
                goals,
                overallProgress: Math.round(totalProgress * 100),
                status,
                period: now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get trends data for dashboard
app.get('/api/stats/trends', (req, res) => {
    try {
        const prospects = loadData(PROSPECTS_FILE);
        const messages = loadData(MESSAGES_FILE);

        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const calcChange = (thisWeek, lastWeek) => {
            if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;
            return Math.round(((thisWeek - lastWeek) / lastWeek) * 100 * 10) / 10;
        };

        // Prospects trend
        const prospectsThisWeek = prospects.filter(p => p.createdAt && new Date(p.createdAt) >= oneWeekAgo).length;
        const prospectsLastWeek = prospects.filter(p => {
            if (!p.createdAt) return false;
            const date = new Date(p.createdAt);
            return date >= twoWeeksAgo && date < oneWeekAgo;
        }).length;

        // Messages trend
        const messagesThisWeek = messages.filter(m => m.generatedAt && new Date(m.generatedAt) >= oneWeekAgo).length;
        const messagesLastWeek = messages.filter(m => {
            if (!m.generatedAt) return false;
            const date = new Date(m.generatedAt);
            return date >= twoWeeksAgo && date < oneWeekAgo;
        }).length;

        res.json({
            success: true,
            data: {
                prospects: { thisWeek: prospectsThisWeek, lastWeek: prospectsLastWeek, change: calcChange(prospectsThisWeek, prospectsLastWeek) },
                messages: { thisWeek: messagesThisWeek, lastWeek: messagesLastWeek, change: calcChange(messagesThisWeek, messagesLastWeek) },
                engagement: { change: 0 },
                campaigns: { change: 0 }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === SETTINGS ===

// Get settings
app.get('/api/settings', (req, res) => {
    try {
        let settings = {};
        if (fs.existsSync(SETTINGS_FILE)) {
            settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        } else {
            // Default settings
            settings = {
                llm: {
                    model: 'llama3.2',
                    temperature: 0.7,
                    maxTokens: 1000
                },
                export: {
                    format: 'xlsx',
                    encoding: 'utf-8',
                    includeMessages: true
                },
                appearance: {
                    darkMode: false,
                    language: 'fr'
                },
                notifications: {
                    enabled: true,
                    importComplete: true,
                    messageGenerated: true,
                    campaignUpdates: true
                }
            };
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        }
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update settings
app.put('/api/settings', (req, res) => {
    try {
        let settings = {};
        if (fs.existsSync(SETTINGS_FILE)) {
            settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        }
        settings = { ...settings, ...req.body, updatedAt: new Date().toISOString() };
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === NOTIFICATIONS ===

// Helper function to add notification
function addNotification(type, title, message, metadata = {}) {
    let notifications = [];
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
        notifications = JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf8'));
    }
    const notification = {
        id: `notif_${Date.now()}`,
        type,
        title,
        message,
        metadata,
        read: false,
        createdAt: new Date().toISOString()
    };
    notifications.unshift(notification);
    // Keep only last 100 notifications
    notifications = notifications.slice(0, 100);
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
    return notification;
}

// Get notifications
app.get('/api/notifications', (req, res) => {
    try {
        let notifications = [];
        if (fs.existsSync(NOTIFICATIONS_FILE)) {
            notifications = JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf8'));
        }
        const unreadCount = notifications.filter(n => !n.read).length;
        res.json({ success: true, data: notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark notification as read
app.patch('/api/notifications/:id/read', (req, res) => {
    try {
        let notifications = [];
        if (fs.existsSync(NOTIFICATIONS_FILE)) {
            notifications = JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf8'));
        }
        const index = notifications.findIndex(n => n.id === req.params.id);
        if (index !== -1) {
            notifications[index].read = true;
            fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark all notifications as read
app.patch('/api/notifications/read-all', (req, res) => {
    try {
        let notifications = [];
        if (fs.existsSync(NOTIFICATIONS_FILE)) {
            notifications = JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf8'));
        }
        notifications = notifications.map(n => ({ ...n, read: true }));
        fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Clear all notifications
app.delete('/api/notifications', (req, res) => {
    try {
        fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify([], null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === GLOBAL SEARCH ===

// Search across all entities
app.get('/api/search', (req, res) => {
    try {
        const query = (req.query.q || '').toLowerCase().trim();
        if (!query) {
            return res.json({ success: true, data: { prospects: [], campaigns: [], templates: [], messages: [] } });
        }

        const prospects = loadData(PROSPECTS_FILE);
        const campaigns = loadData(CAMPAIGNS_FILE);
        const templates = loadData(TEMPLATES_FILE);
        const messages = loadData(MESSAGES_FILE);

        // Search prospects
        const matchedProspects = prospects.filter(p =>
            (p.nom && p.nom.toLowerCase().includes(query)) ||
            (p.prenom && p.prenom.toLowerCase().includes(query)) ||
            (p.email && p.email.toLowerCase().includes(query)) ||
            (p.entreprise && p.entreprise.toLowerCase().includes(query)) ||
            (p.poste && p.poste.toLowerCase().includes(query))
        ).slice(0, 10);

        // Search campaigns
        const matchedCampaigns = campaigns.filter(c =>
            (c.name && c.name.toLowerCase().includes(query)) ||
            (c.objective && c.objective.toLowerCase().includes(query))
        ).slice(0, 5);

        // Search templates
        const matchedTemplates = templates.filter(t =>
            (t.name && t.name.toLowerCase().includes(query)) ||
            (t.content && t.content.toLowerCase().includes(query))
        ).slice(0, 5);

        // Search messages
        const matchedMessages = messages.filter(m =>
            (m.message && m.message.toLowerCase().includes(query)) ||
            (m.prospect && m.prospect.nom && m.prospect.nom.toLowerCase().includes(query))
        ).slice(0, 5);

        res.json({
            success: true,
            data: {
                prospects: matchedProspects,
                campaigns: matchedCampaigns,
                templates: matchedTemplates,
                messages: matchedMessages,
                totalResults: matchedProspects.length + matchedCampaigns.length + matchedTemplates.length + matchedMessages.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === DUPLICATE DETECTION ===

// Helper function for string similarity (Levenshtein distance)
function similarity(s1, s2) {
    if (!s1 || !s2) return 0;
    s1 = s1.toLowerCase().trim();
    s2 = s2.toLowerCase().trim();
    if (s1 === s2) return 1;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    const longerLength = longer.length;

    if (longerLength === 0) return 1;

    // Simple character-based similarity
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
        if (longer.includes(shorter[i])) matches++;
    }
    return matches / longerLength;
}

// Detect duplicate prospects
app.get('/api/prospects/duplicates', (req, res) => {
    try {
        const prospects = loadData(PROSPECTS_FILE);
        const duplicateGroups = [];
        const processed = new Set();

        for (let i = 0; i < prospects.length; i++) {
            if (processed.has(prospects[i].id)) continue;

            const group = [prospects[i]];
            processed.add(prospects[i].id);

            for (let j = i + 1; j < prospects.length; j++) {
                if (processed.has(prospects[j].id)) continue;

                const p1 = prospects[i];
                const p2 = prospects[j];

                // Check for duplicates
                let isDuplicate = false;
                let reason = '';

                // Exact email match
                if (p1.email && p2.email && p1.email.toLowerCase() === p2.email.toLowerCase()) {
                    isDuplicate = true;
                    reason = 'email identique';
                }
                // Similar company + similar name
                else if (p1.entreprise && p2.entreprise && similarity(p1.entreprise, p2.entreprise) > 0.8) {
                    if (p1.nom && p2.nom && similarity(p1.nom, p2.nom) > 0.7) {
                        isDuplicate = true;
                        reason = 'entreprise et nom similaires';
                    }
                }
                // Same phone number
                else if (p1.telephone && p2.telephone) {
                    const phone1 = p1.telephone.replace(/\D/g, '');
                    const phone2 = p2.telephone.replace(/\D/g, '');
                    if (phone1 === phone2 && phone1.length >= 9) {
                        isDuplicate = true;
                        reason = 'téléphone identique';
                    }
                }

                if (isDuplicate) {
                    group.push({ ...p2, duplicateReason: reason });
                    processed.add(p2.id);
                }
            }

            if (group.length > 1) {
                duplicateGroups.push(group);
            }
        }

        res.json({
            success: true,
            data: duplicateGroups,
            totalDuplicates: duplicateGroups.reduce((acc, g) => acc + g.length - 1, 0)
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Merge duplicate prospects
app.post('/api/prospects/merge', (req, res) => {
    try {
        const { keepId, mergeIds } = req.body;

        if (!keepId || !mergeIds || !Array.isArray(mergeIds)) {
            return res.status(400).json({ success: false, error: 'IDs invalides' });
        }

        const prospects = loadData(PROSPECTS_FILE);
        const keepIndex = prospects.findIndex(p => p.id === keepId);

        if (keepIndex === -1) {
            return res.status(404).json({ success: false, error: 'Prospect principal non trouvé' });
        }

        // Remove merged prospects
        const filtered = prospects.filter(p => !mergeIds.includes(p.id));
        saveData(PROSPECTS_FILE, filtered);

        res.json({ success: true, data: filtered[keepIndex], merged: mergeIds.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === BULK OPERATIONS ===

// Bulk delete prospects
app.post('/api/prospects/bulk-delete', (req, res) => {
    try {
        const { prospectIds } = req.body;

        if (!prospectIds || !Array.isArray(prospectIds)) {
            return res.status(400).json({ success: false, error: 'IDs invalides' });
        }

        const prospects = loadData(PROSPECTS_FILE);
        const filtered = prospects.filter(p => !prospectIds.includes(p.id));
        const deletedCount = prospects.length - filtered.length;

        saveData(PROSPECTS_FILE, filtered);

        // Add notification
        addNotification('info', 'Suppression en lot', `${deletedCount} prospect(s) supprimé(s)`);

        res.json({ success: true, deleted: deletedCount });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk assign prospects to campaign
app.post('/api/prospects/bulk-assign', (req, res) => {
    try {
        const { prospectIds, campaignId } = req.body;

        if (!prospectIds || !Array.isArray(prospectIds) || !campaignId) {
            return res.status(400).json({ success: false, error: 'Données invalides' });
        }

        const campaigns = loadData(CAMPAIGNS_FILE);
        const index = campaigns.findIndex(c => c.id === campaignId);

        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Campagne non trouvée' });
        }

        // Add prospects to campaign
        campaigns[index].prospectIds = [...new Set([...(campaigns[index].prospectIds || []), ...prospectIds])];
        campaigns[index].stats.totalTargets = campaigns[index].prospectIds.length;
        campaigns[index].updatedAt = new Date().toISOString();

        saveData(CAMPAIGNS_FILE, campaigns);

        // Add notification
        addNotification('success', 'Assignation en lot', `${prospectIds.length} prospect(s) ajouté(s) à "${campaigns[index].name}"`);

        res.json({ success: true, data: campaigns[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk update triage status
app.post('/api/prospects/bulk-triage', (req, res) => {
    try {
        const { prospectIds, status, note } = req.body;

        if (!prospectIds || !Array.isArray(prospectIds) || !status) {
            return res.status(400).json({ success: false, error: 'Données invalides' });
        }

        const validStatuses = ['new', 'contacted', 'qualified', 'meeting', 'proposal', 'won', 'lost'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Statut invalide' });
        }

        const prospects = loadData(PROSPECTS_FILE);
        let updatedCount = 0;

        prospects.forEach((p, i) => {
            if (prospectIds.includes(p.id)) {
                prospects[i].triageStatus = status;
                if (note) prospects[i].triageNote = note;
                prospects[i].triageUpdatedAt = new Date().toISOString();
                updatedCount++;
            }
        });

        saveData(PROSPECTS_FILE, prospects);

        res.json({ success: true, updated: updatedCount });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === RESEARCH - PLAYWRIGHT & APIFY ===

// Research prospect online using Playwright (free, local)
app.post('/api/prospects/:id/research/playwright', async (req, res) => {
    try {
        const prospects = loadData(PROSPECTS_FILE);
        const prospect = prospects.find(p => p.id === req.params.id);

        if (!prospect) {
            return res.status(404).json({ success: false, error: 'Prospect non trouvé' });
        }

        // Get online presence data
        const result = await playwrightService.getOnlinePresence(prospect);

        // Store research data in prospect
        const index = prospects.findIndex(p => p.id === req.params.id);
        prospects[index].onlineResearch = {
            ...result.data,
            updatedAt: new Date().toISOString(),
            source: 'playwright'
        };
        saveData(PROSPECTS_FILE, prospects);

        res.json({ success: true, data: result.data });

    } catch (error) {
        console.error('Playwright research error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Research prospect using Apify (requires API key)
app.post('/api/prospects/:id/research/apify', async (req, res) => {
    try {
        const prospects = loadData(PROSPECTS_FILE);
        const prospect = prospects.find(p => p.id === req.params.id);

        if (!prospect) {
            return res.status(404).json({ success: false, error: 'Prospect non trouvé' });
        }

        // Check if Apify is configured
        const isConfigured = await apifyService.isConfigured();
        if (!isConfigured) {
            return res.status(400).json({
                success: false,
                error: 'Clé API Apify non configurée. Allez dans Paramètres pour la configurer.'
            });
        }

        // Get research data using Apify
        const result = await apifyService.researchProspect(prospect);

        // Store research data in prospect
        const index = prospects.findIndex(p => p.id === req.params.id);
        prospects[index].apifyResearch = {
            ...result.data,
            updatedAt: new Date().toISOString(),
            source: 'apify'
        };
        saveData(PROSPECTS_FILE, prospects);

        res.json({ success: true, data: result.data });

    } catch (error) {
        console.error('Apify research error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get research data for a prospect
app.get('/api/prospects/:id/research', (req, res) => {
    try {
        const prospects = loadData(PROSPECTS_FILE);
        const prospect = prospects.find(p => p.id === req.params.id);

        if (!prospect) {
            return res.status(404).json({ success: false, error: 'Prospect non trouvé' });
        }

        res.json({
            success: true,
            data: {
                playwrightData: prospect.onlineResearch || null,
                apifyData: prospect.apifyResearch || null
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Scrape a specific URL using Playwright
app.post('/api/research/scrape', async (req, res) => {
    try {
        const { url, type } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL requise' });
        }

        let result;
        switch (type) {
            case 'linkedin':
                result = await playwrightService.scrapeLinkedInProfile(url);
                break;
            case 'website':
                result = await playwrightService.scrapeCompanyWebsite(url);
                break;
            case 'search':
                result = await playwrightService.searchProspect(url);
                break;
            default:
                result = await playwrightService.scrapeCompanyWebsite(url);
        }

        res.json(result);

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get available Apify actors
app.get('/api/research/apify/actors', async (req, res) => {
    try {
        const isConfigured = await apifyService.isConfigured();
        const actors = apifyService.getAvailableActors();

        res.json({
            success: true,
            configured: isConfigured,
            data: actors
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === PROSPECT LIST ASSIGNMENT ===

// Bulk assign prospects to a list
app.post('/api/prospects/bulk/assign-list', (req, res) => {
    try {
        const { prospectIds, listId } = req.body;

        if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
            return res.status(400).json({ success: false, error: 'IDs de prospects requis' });
        }

        const prospects = loadData(PROSPECTS_FILE);
        const lists = loadData(LISTS_FILE);

        const listIndex = lists.findIndex(l => l.id === listId);
        if (listIndex === -1) {
            return res.status(404).json({ success: false, error: 'Liste non trouvée' });
        }

        let assignedCount = 0;
        prospectIds.forEach(id => {
            const index = prospects.findIndex(p => p.id === id);
            if (index !== -1) {
                prospects[index].listId = listId;
                prospects[index].updatedAt = new Date().toISOString();
                assignedCount++;
            }
        });

        saveData(PROSPECTS_FILE, prospects);

        // Update list with all prospect IDs
        if (!lists[listIndex].prospectIds) {
            lists[listIndex].prospectIds = [];
        }
        const newIds = prospectIds.filter(id => !lists[listIndex].prospectIds.includes(id));
        lists[listIndex].prospectIds.push(...newIds);
        lists[listIndex].updatedAt = new Date().toISOString();
        saveData(LISTS_FILE, lists);

        res.json({ success: true, assigned: assignedCount });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Assign prospect to a list
app.post('/api/prospects/:id/assign-list', (req, res) => {
    try {
        const { listId } = req.body;
        const prospects = loadData(PROSPECTS_FILE);
        const lists = loadData(LISTS_FILE);

        const prospectIndex = prospects.findIndex(p => p.id === req.params.id);
        if (prospectIndex === -1) {
            return res.status(404).json({ success: false, error: 'Prospect non trouvé' });
        }

        const listIndex = lists.findIndex(l => l.id === listId);
        if (listIndex === -1) {
            return res.status(404).json({ success: false, error: 'Liste non trouvée' });
        }

        // Update prospect with list ID
        prospects[prospectIndex].listId = listId;
        prospects[prospectIndex].updatedAt = new Date().toISOString();
        saveData(PROSPECTS_FILE, prospects);

        // Add prospect to list's prospectIds if not already there
        if (!lists[listIndex].prospectIds) {
            lists[listIndex].prospectIds = [];
        }
        if (!lists[listIndex].prospectIds.includes(req.params.id)) {
            lists[listIndex].prospectIds.push(req.params.id);
            lists[listIndex].updatedAt = new Date().toISOString();
            saveData(LISTS_FILE, lists);
        }

        res.json({ success: true, data: prospects[prospectIndex] });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Remove prospect from list
app.delete('/api/prospects/:id/list', (req, res) => {
    try {
        const prospects = loadData(PROSPECTS_FILE);
        const lists = loadData(LISTS_FILE);

        const prospectIndex = prospects.findIndex(p => p.id === req.params.id);
        if (prospectIndex === -1) {
            return res.status(404).json({ success: false, error: 'Prospect non trouvé' });
        }

        const oldListId = prospects[prospectIndex].listId;
        prospects[prospectIndex].listId = null;
        prospects[prospectIndex].updatedAt = new Date().toISOString();
        saveData(PROSPECTS_FILE, prospects);

        // Remove from old list's prospectIds
        if (oldListId) {
            const listIndex = lists.findIndex(l => l.id === oldListId);
            if (listIndex !== -1 && lists[listIndex].prospectIds) {
                lists[listIndex].prospectIds = lists[listIndex].prospectIds.filter(id => id !== req.params.id);
                saveData(LISTS_FILE, lists);
            }
        }

        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get prospects overview stats
app.get('/api/prospects/overview', (req, res) => {
    try {
        const prospects = loadData(PROSPECTS_FILE);
        const lists = loadData(LISTS_FILE);
        const messages = loadData(MESSAGES_FILE);

        // Triage status counts
        const triageStats = {
            new: prospects.filter(p => !p.triageStatus || p.triageStatus === 'new').length,
            to_contact: prospects.filter(p => p.triageStatus === 'to_contact').length,
            interested: prospects.filter(p => p.triageStatus === 'interested').length,
            not_interested: prospects.filter(p => p.triageStatus === 'not_interested').length,
            archived: prospects.filter(p => p.triageStatus === 'archived').length
        };

        // List stats
        const listStats = lists.map(list => ({
            id: list.id,
            name: list.name,
            count: prospects.filter(p => p.listId === list.id).length
        }));

        // Message stats
        const messageStats = {
            total: messages.length,
            pending: messages.filter(m => m.status === 'pending').length,
            sent: messages.filter(m => m.status === 'sent').length,
            replied: messages.filter(m => m.status === 'replied').length
        };

        // Prospects with research
        const researchedCount = prospects.filter(p => p.onlineResearch || p.apifyResearch).length;

        res.json({
            success: true,
            data: {
                total: prospects.length,
                withEmail: prospects.filter(p => p.email).length,
                withLinkedIn: prospects.filter(p => p.linkedin).length,
                withWebsite: prospects.filter(p => p.siteWeb).length,
                researched: researchedCount,
                triageStats,
                listStats,
                messageStats
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === GOOGLE MAPS SEARCH ===

// Search Google Maps for businesses
app.post('/api/search/google-maps', async (req, res) => {
    try {
        const { query, location, maxResults = 20, hasWebsite = false, maxReviews } = req.body;

        if (!query || !location) {
            return res.status(400).json({
                success: false,
                error: 'Query and location are required'
            });
        }

        const result = await apifyService.searchGoogleMaps(query, location, maxResults, hasWebsite, maxReviews);
        res.json(result);

    } catch (error) {
        console.error('Google Maps search error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Import Google Maps results as prospects
app.post('/api/search/import', async (req, res) => {
    try {
        const { results } = req.body;

        if (!results || !Array.isArray(results) || results.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Results array is required'
            });
        }

        const prospects = loadData(PROSPECTS_FILE);
        const newProspects = [];

        for (const result of results) {
            const prospect = {
                id: `prospect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                entreprise: result.entreprise || result.name || '',
                nom: '',
                prenom: '',
                email: result.email || '',
                telephone: result.phone || '',
                adresse: result.address || '',
                siteWeb: result.website || '',
                linkedin: result.socialMedia?.linkedin || '',
                category: result.category || '',
                rating: result.rating || null,
                googleMapsUrl: result.googleMapsUrl || '',
                placeId: result.placeId || '',
                source: 'google_maps',
                triageStatus: 'new',
                interestScore: result.rating ? Math.round(result.rating * 20) : 50,
                createdAt: new Date().toISOString()
            };
            newProspects.push(prospect);
            prospects.push(prospect);
        }

        saveData(PROSPECTS_FILE, prospects);

        res.json({
            success: true,
            data: newProspects,
            imported: newProspects.length
        });

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check Apify configuration status
app.get('/api/search/status', async (req, res) => {
    try {
        const isConfigured = await apifyService.isConfigured();
        res.json({
            success: true,
            configured: isConfigured,
            actors: apifyService.getAvailableActors()
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === SEQUENCES (Multichannel Campaigns) ===

// Get all sequences
app.get('/api/sequences', (req, res) => {
    try {
        const sequences = loadData(SEQUENCES_FILE);
        res.json({ success: true, data: sequences, count: sequences.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single sequence
app.get('/api/sequences/:id', (req, res) => {
    try {
        const sequences = loadData(SEQUENCES_FILE);
        const sequence = sequences.find(s => s.id === req.params.id);
        if (!sequence) {
            return res.status(404).json({ success: false, error: 'Séquence non trouvée' });
        }
        res.json({ success: true, data: sequence });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create sequence
app.post('/api/sequences', (req, res) => {
    try {
        const { name, description, steps = [] } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'Nom requis' });
        }

        const sequence = {
            id: `seq_${Date.now()}`,
            name,
            description: description || '',
            status: 'draft', // draft, active, paused, completed
            steps: steps.map((step, index) => ({
                id: `step_${Date.now()}_${index}`,
                order: index,
                type: step.type || 'email', // email, call, linkedin, sms, wait, task
                name: step.name || `Étape ${index + 1}`,
                config: step.config || {},
                waitDays: step.waitDays || 1,
                ...step
            })),
            enrolledProspects: [], // { prospectId, currentStepIndex, status, enrolledAt, lastActionAt }
            stats: {
                enrolled: 0,
                completed: 0,
                replied: 0,
                bounced: 0
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const sequences = loadData(SEQUENCES_FILE);
        sequences.push(sequence);
        saveData(SEQUENCES_FILE, sequences);

        res.json({ success: true, data: sequence });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update sequence
app.put('/api/sequences/:id', (req, res) => {
    try {
        const sequences = loadData(SEQUENCES_FILE);
        const index = sequences.findIndex(s => s.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Séquence non trouvée' });
        }

        const { name, description, status, steps } = req.body;
        if (name) sequences[index].name = name;
        if (description !== undefined) sequences[index].description = description;
        if (status) sequences[index].status = status;
        if (steps) {
            sequences[index].steps = steps.map((step, i) => ({
                id: step.id || `step_${Date.now()}_${i}`,
                order: i,
                type: step.type || 'email',
                name: step.name || `Étape ${i + 1}`,
                config: step.config || {},
                waitDays: step.waitDays || 1,
                ...step
            }));
        }
        sequences[index].updatedAt = new Date().toISOString();

        saveData(SEQUENCES_FILE, sequences);
        res.json({ success: true, data: sequences[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete sequence
app.delete('/api/sequences/:id', (req, res) => {
    try {
        const sequences = loadData(SEQUENCES_FILE);
        const filtered = sequences.filter(s => s.id !== req.params.id);
        saveData(SEQUENCES_FILE, filtered);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Enroll prospects in a sequence
app.post('/api/sequences/:id/enroll', (req, res) => {
    try {
        const { prospectIds } = req.body;
        if (!prospectIds || !Array.isArray(prospectIds)) {
            return res.status(400).json({ success: false, error: 'prospectIds requis' });
        }

        const sequences = loadData(SEQUENCES_FILE);
        const index = sequences.findIndex(s => s.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Séquence non trouvée' });
        }

        const existingIds = new Set(sequences[index].enrolledProspects.map(p => p.prospectId));
        const newEnrollments = prospectIds
            .filter(id => !existingIds.has(id))
            .map(prospectId => ({
                prospectId,
                currentStepIndex: 0,
                status: 'active', // active, paused, completed, unsubscribed
                enrolledAt: new Date().toISOString(),
                lastActionAt: null,
                completedSteps: []
            }));

        sequences[index].enrolledProspects.push(...newEnrollments);
        sequences[index].stats.enrolled += newEnrollments.length;
        sequences[index].updatedAt = new Date().toISOString();

        saveData(SEQUENCES_FILE, sequences);
        res.json({
            success: true,
            enrolled: newEnrollments.length,
            total: sequences[index].enrolledProspects.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Remove prospect from sequence
app.delete('/api/sequences/:id/prospects/:prospectId', (req, res) => {
    try {
        const sequences = loadData(SEQUENCES_FILE);
        const index = sequences.findIndex(s => s.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Séquence non trouvée' });
        }

        const initialCount = sequences[index].enrolledProspects.length;
        sequences[index].enrolledProspects = sequences[index].enrolledProspects
            .filter(p => p.prospectId !== req.params.prospectId);

        const removed = initialCount - sequences[index].enrolledProspects.length;
        sequences[index].stats.enrolled = sequences[index].enrolledProspects.length;
        saveData(SEQUENCES_FILE, sequences);

        res.json({ success: true, removed });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get enrolled prospects for a sequence
app.get('/api/sequences/:id/prospects', (req, res) => {
    try {
        const sequences = loadData(SEQUENCES_FILE);
        const sequence = sequences.find(s => s.id === req.params.id);
        if (!sequence) {
            return res.status(404).json({ success: false, error: 'Séquence non trouvée' });
        }

        const prospects = loadData(PROSPECTS_FILE);
        const enrolledData = sequence.enrolledProspects.map(enrollment => {
            const prospect = prospects.find(p => p.id === enrollment.prospectId);
            return {
                ...enrollment,
                prospect,
                currentStep: sequence.steps[enrollment.currentStepIndex] || null
            };
        });

        res.json({ success: true, data: enrolledData, count: enrolledData.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark step as completed for a prospect
app.post('/api/sequences/:id/prospects/:prospectId/complete-step', (req, res) => {
    try {
        const { outcome } = req.body; // completed, replied, bounced, skipped

        const sequences = loadData(SEQUENCES_FILE);
        const seqIndex = sequences.findIndex(s => s.id === req.params.id);
        if (seqIndex === -1) {
            return res.status(404).json({ success: false, error: 'Séquence non trouvée' });
        }

        const sequence = sequences[seqIndex];
        const prospectIndex = sequence.enrolledProspects.findIndex(p => p.prospectId === req.params.prospectId);
        if (prospectIndex === -1) {
            return res.status(404).json({ success: false, error: 'Prospect non inscrit' });
        }

        const enrollment = sequence.enrolledProspects[prospectIndex];
        const currentStep = sequence.steps[enrollment.currentStepIndex];

        // Record completed step
        enrollment.completedSteps.push({
            stepId: currentStep?.id,
            stepIndex: enrollment.currentStepIndex,
            outcome: outcome || 'completed',
            completedAt: new Date().toISOString()
        });

        // Update stats based on outcome
        if (outcome === 'replied') {
            sequence.stats.replied++;
        } else if (outcome === 'bounced') {
            sequence.stats.bounced++;
        }

        // Move to next step or mark as completed
        if (enrollment.currentStepIndex < sequence.steps.length - 1) {
            enrollment.currentStepIndex++;
            enrollment.lastActionAt = new Date().toISOString();
        } else {
            enrollment.status = 'completed';
            enrollment.completedAt = new Date().toISOString();
            sequence.stats.completed++;
        }

        saveData(SEQUENCES_FILE, sequences);
        res.json({ success: true, data: enrollment });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Activate/Pause sequence
app.patch('/api/sequences/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        if (!['draft', 'active', 'paused', 'completed'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Statut invalide' });
        }

        const sequences = loadData(SEQUENCES_FILE);
        const index = sequences.findIndex(s => s.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Séquence non trouvée' });
        }

        sequences[index].status = status;
        sequences[index].updatedAt = new Date().toISOString();
        saveData(SEQUENCES_FILE, sequences);

        res.json({ success: true, data: sequences[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get sequence statistics
app.get('/api/sequences/:id/stats', (req, res) => {
    try {
        const sequences = loadData(SEQUENCES_FILE);
        const sequence = sequences.find(s => s.id === req.params.id);
        if (!sequence) {
            return res.status(404).json({ success: false, error: 'Séquence non trouvée' });
        }

        const enrolled = sequence.enrolledProspects;
        const stepStats = sequence.steps.map((step, index) => {
            const atStep = enrolled.filter(p => p.currentStepIndex === index && p.status === 'active').length;
            const completed = enrolled.filter(p => p.completedSteps.some(cs => cs.stepIndex === index)).length;
            return {
                stepId: step.id,
                stepName: step.name,
                stepType: step.type,
                atStep,
                completed
            };
        });

        res.json({
            success: true,
            data: {
                ...sequence.stats,
                active: enrolled.filter(p => p.status === 'active').length,
                paused: enrolled.filter(p => p.status === 'paused').length,
                stepStats
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// PIPELINE API - Sales Kanban Board
// ============================================

const DEFAULT_PIPELINE_STAGES = [
    { id: 'new', name: 'Nouveau', color: '#6366f1', order: 0 },
    { id: 'contacted', name: 'Contacté', color: '#8b5cf6', order: 1 },
    { id: 'meeting', name: 'RDV programmé', color: '#f59e0b', order: 2 },
    { id: 'proposal', name: 'Proposition', color: '#3b82f6', order: 3 },
    { id: 'negotiation', name: 'Négociation', color: '#10b981', order: 4 },
    { id: 'won', name: 'Gagné', color: '#22c55e', order: 5 },
    { id: 'lost', name: 'Perdu', color: '#ef4444', order: 6 },
];

// Get pipeline configuration and prospects
app.get('/api/pipeline', (req, res) => {
    try {
        let pipeline = loadData(PIPELINE_FILE);
        if (!pipeline || !pipeline.stages) {
            pipeline = { stages: DEFAULT_PIPELINE_STAGES };
            saveData(PIPELINE_FILE, pipeline);
        }

        const prospects = loadData(PROSPECTS_FILE) || [];

        // Group prospects by pipeline stage
        const stagesWithProspects = pipeline.stages.map(stage => ({
            ...stage,
            prospects: prospects.filter(p => (p.pipelineStage || 'new') === stage.id)
        }));

        res.json({
            success: true,
            data: {
                stages: stagesWithProspects,
                totalProspects: prospects.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update pipeline stages
app.put('/api/pipeline/stages', (req, res) => {
    try {
        const { stages } = req.body;
        if (!stages || !Array.isArray(stages)) {
            return res.status(400).json({ success: false, error: 'Stages array required' });
        }

        let pipeline = loadData(PIPELINE_FILE) || {};
        pipeline.stages = stages;
        saveData(PIPELINE_FILE, pipeline);

        res.json({ success: true, data: pipeline });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Move prospect to different stage
app.patch('/api/pipeline/prospects/:id/stage', (req, res) => {
    try {
        const { stage } = req.body;
        if (!stage) {
            return res.status(400).json({ success: false, error: 'Stage required' });
        }

        const prospects = loadData(PROSPECTS_FILE) || [];
        const index = prospects.findIndex(p => p.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Prospect not found' });
        }

        prospects[index].pipelineStage = stage;
        prospects[index].pipelineUpdatedAt = new Date().toISOString();
        saveData(PROSPECTS_FILE, prospects);

        res.json({ success: true, data: prospects[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk move prospects
app.post('/api/pipeline/bulk-move', (req, res) => {
    try {
        const { prospectIds, stage } = req.body;
        if (!prospectIds || !Array.isArray(prospectIds) || !stage) {
            return res.status(400).json({ success: false, error: 'prospectIds array and stage required' });
        }

        const prospects = loadData(PROSPECTS_FILE) || [];
        let moved = 0;

        prospectIds.forEach(id => {
            const index = prospects.findIndex(p => p.id === id);
            if (index !== -1) {
                prospects[index].pipelineStage = stage;
                prospects[index].pipelineUpdatedAt = new Date().toISOString();
                moved++;
            }
        });

        saveData(PROSPECTS_FILE, prospects);
        res.json({ success: true, moved, total: prospectIds.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get pipeline statistics
app.get('/api/pipeline/stats', (req, res) => {
    try {
        const pipeline = loadData(PIPELINE_FILE) || { stages: DEFAULT_PIPELINE_STAGES };
        const prospects = loadData(PROSPECTS_FILE) || [];

        const stats = pipeline.stages.map(stage => ({
            stageId: stage.id,
            stageName: stage.name,
            count: prospects.filter(p => (p.pipelineStage || 'new') === stage.id).length
        }));

        const wonProspects = prospects.filter(p => p.pipelineStage === 'won');
        const lostProspects = prospects.filter(p => p.pipelineStage === 'lost');

        res.json({
            success: true,
            data: {
                stageStats: stats,
                total: prospects.length,
                won: wonProspects.length,
                lost: lostProspects.length,
                winRate: prospects.length > 0 ? Math.round((wonProspects.length / prospects.length) * 100) : 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// AUTOMATIONS API - IF-THEN Workflow Rules
// ============================================

// Get all automations
app.get('/api/automations', (req, res) => {
    try {
        const automations = loadData(AUTOMATIONS_FILE) || [];
        res.json({ success: true, data: automations, count: automations.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single automation
app.get('/api/automations/:id', (req, res) => {
    try {
        const automations = loadData(AUTOMATIONS_FILE) || [];
        const automation = automations.find(a => a.id === req.params.id);
        if (!automation) {
            return res.status(404).json({ success: false, error: 'Automation non trouvée' });
        }
        res.json({ success: true, data: automation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create automation
app.post('/api/automations', (req, res) => {
    try {
        const { name, description, trigger, actions } = req.body;
        if (!name || !trigger || !actions) {
            return res.status(400).json({ success: false, error: 'Nom, trigger et actions requis' });
        }

        const automations = loadData(AUTOMATIONS_FILE) || [];
        const newAutomation = {
            id: `auto_${Date.now()}`,
            name,
            description: description || '',
            active: true,
            trigger: {
                type: trigger.type,
                conditions: trigger.conditions || {}
            },
            actions: actions.map((a, i) => ({
                id: `action_${Date.now()}_${i}`,
                type: a.type,
                config: a.config || {}
            })),
            stats: {
                triggered: 0,
                lastRun: null
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        automations.push(newAutomation);
        saveData(AUTOMATIONS_FILE, automations);

        res.status(201).json({ success: true, data: newAutomation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update automation
app.put('/api/automations/:id', (req, res) => {
    try {
        const automations = loadData(AUTOMATIONS_FILE) || [];
        const index = automations.findIndex(a => a.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Automation non trouvée' });
        }

        const { name, description, trigger, actions, active } = req.body;

        if (name) automations[index].name = name;
        if (description !== undefined) automations[index].description = description;
        if (active !== undefined) automations[index].active = active;
        if (trigger) automations[index].trigger = trigger;
        if (actions) automations[index].actions = actions;
        automations[index].updatedAt = new Date().toISOString();

        saveData(AUTOMATIONS_FILE, automations);
        res.json({ success: true, data: automations[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete automation
app.delete('/api/automations/:id', (req, res) => {
    try {
        const automations = loadData(AUTOMATIONS_FILE) || [];
        const index = automations.findIndex(a => a.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Automation non trouvée' });
        }

        automations.splice(index, 1);
        saveData(AUTOMATIONS_FILE, automations);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Toggle automation active/inactive
app.patch('/api/automations/:id/toggle', (req, res) => {
    try {
        const automations = loadData(AUTOMATIONS_FILE) || [];
        const index = automations.findIndex(a => a.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Automation non trouvée' });
        }

        automations[index].active = !automations[index].active;
        automations[index].updatedAt = new Date().toISOString();
        saveData(AUTOMATIONS_FILE, automations);

        res.json({ success: true, data: automations[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Execute automation manually (for testing)
app.post('/api/automations/:id/execute', async (req, res) => {
    try {
        const automations = loadData(AUTOMATIONS_FILE) || [];
        const automation = automations.find(a => a.id === req.params.id);
        if (!automation) {
            return res.status(404).json({ success: false, error: 'Automation non trouvée' });
        }

        const { prospectId } = req.body;
        const prospects = loadData(PROSPECTS_FILE) || [];
        const prospect = prospects.find(p => p.id === prospectId);

        if (!prospect) {
            return res.status(404).json({ success: false, error: 'Prospect non trouvé' });
        }

        // Execute each action
        let executedActions = [];
        for (const action of automation.actions) {
            try {
                switch (action.type) {
                    case 'add_to_sequence':
                        // Add prospect to sequence
                        const sequences = loadData(SEQUENCES_FILE) || [];
                        const seqIndex = sequences.findIndex(s => s.id === action.config.sequenceId);
                        if (seqIndex !== -1) {
                            const exists = sequences[seqIndex].enrolledProspects.some(e => e.prospectId === prospectId);
                            if (!exists) {
                                sequences[seqIndex].enrolledProspects.push({
                                    prospectId,
                                    currentStepIndex: 0,
                                    status: 'active',
                                    enrolledAt: new Date().toISOString(),
                                    lastActionAt: null,
                                    completedSteps: []
                                });
                                sequences[seqIndex].stats.enrolled++;
                                saveData(SEQUENCES_FILE, sequences);
                            }
                        }
                        executedActions.push({ type: action.type, success: true });
                        break;

                    case 'change_triage':
                        // Update prospect triage status
                        const pIndex = prospects.findIndex(p => p.id === prospectId);
                        if (pIndex !== -1) {
                            prospects[pIndex].triageStatus = action.config.status;
                            saveData(PROSPECTS_FILE, prospects);
                        }
                        executedActions.push({ type: action.type, success: true });
                        break;

                    case 'move_pipeline':
                        // Move prospect to different pipeline stage
                        const pIdx = prospects.findIndex(p => p.id === prospectId);
                        if (pIdx !== -1) {
                            prospects[pIdx].pipelineStage = action.config.stageId;
                            prospects[pIdx].pipelineUpdatedAt = new Date().toISOString();
                            saveData(PROSPECTS_FILE, prospects);
                        }
                        executedActions.push({ type: action.type, success: true });
                        break;

                    default:
                        executedActions.push({ type: action.type, success: false, error: 'Action non supportée' });
                }
            } catch (actionError) {
                executedActions.push({ type: action.type, success: false, error: actionError.message });
            }
        }

        // Update stats
        const autoIndex = automations.findIndex(a => a.id === req.params.id);
        if (autoIndex !== -1) {
            automations[autoIndex].stats.triggered++;
            automations[autoIndex].stats.lastRun = new Date().toISOString();
            saveData(AUTOMATIONS_FILE, automations);
        }

        res.json({ success: true, executedActions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// TASKS API
// ============================================

// Get all tasks
app.get('/api/tasks', (req, res) => {
    try {
        const tasks = loadData(TASKS_FILE);
        res.json({ success: true, data: tasks, count: tasks.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get tasks for today
app.get('/api/tasks/today', (req, res) => {
    try {
        const tasks = loadData(TASKS_FILE);
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = tasks.filter(t => {
            if (t.completed) return false;
            if (!t.dueDate) return true; // Tasks without due date show today
            return t.dueDate <= today;
        });
        res.json({ success: true, data: todayTasks, count: todayTasks.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create task
app.post('/api/tasks', (req, res) => {
    try {
        const { title, description, type, priority, prospectId, dueDate, dueTime } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, error: 'Titre requis' });
        }

        const tasks = loadData(TASKS_FILE);
        const newTask = {
            id: `task_${Date.now()}`,
            title,
            description: description || '',
            type: type || 'custom',
            priority: priority || 'medium',
            prospectId: prospectId || null,
            dueDate: dueDate || null,
            dueTime: dueTime || null,
            completed: false,
            completedAt: null,
            createdAt: new Date().toISOString()
        };

        tasks.push(newTask);
        saveData(TASKS_FILE, tasks);

        res.json({ success: true, data: newTask });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single task
app.get('/api/tasks/:id', (req, res) => {
    try {
        const tasks = loadData(TASKS_FILE);
        const task = tasks.find(t => t.id === req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, error: 'Tâche non trouvée' });
        }

        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update task
app.put('/api/tasks/:id', (req, res) => {
    try {
        const tasks = loadData(TASKS_FILE);
        const index = tasks.findIndex(t => t.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Tâche non trouvée' });
        }

        const updateFields = ['title', 'description', 'type', 'priority', 'prospectId', 'dueDate', 'dueTime'];
        updateFields.forEach(field => {
            if (req.body[field] !== undefined) {
                tasks[index][field] = req.body[field];
            }
        });
        tasks[index].updatedAt = new Date().toISOString();

        saveData(TASKS_FILE, tasks);
        res.json({ success: true, data: tasks[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark task as complete
app.patch('/api/tasks/:id/complete', (req, res) => {
    try {
        const tasks = loadData(TASKS_FILE);
        const index = tasks.findIndex(t => t.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Tâche non trouvée' });
        }

        tasks[index].completed = true;
        tasks[index].completedAt = new Date().toISOString();

        saveData(TASKS_FILE, tasks);
        res.json({ success: true, data: tasks[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark task as incomplete
app.patch('/api/tasks/:id/uncomplete', (req, res) => {
    try {
        const tasks = loadData(TASKS_FILE);
        const index = tasks.findIndex(t => t.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Tâche non trouvée' });
        }

        tasks[index].completed = false;
        tasks[index].completedAt = null;

        saveData(TASKS_FILE, tasks);
        res.json({ success: true, data: tasks[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
    try {
        const tasks = loadData(TASKS_FILE);
        const filtered = tasks.filter(t => t.id !== req.params.id);
        saveData(TASKS_FILE, filtered);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Clear completed tasks
app.delete('/api/tasks/completed', (req, res) => {
    try {
        const tasks = loadData(TASKS_FILE);
        const filtered = tasks.filter(t => !t.completed);
        saveData(TASKS_FILE, filtered);
        res.json({ success: true, deleted: tasks.length - filtered.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// SESSIONS API
// ============================================

// Get all sessions
app.get('/api/sessions', (req, res) => {
    try {
        const sessions = loadData(SESSIONS_FILE);
        res.json({ success: true, data: sessions, count: sessions.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get today's sessions
app.get('/api/sessions/today', (req, res) => {
    try {
        const sessions = loadData(SESSIONS_FILE);
        const today = new Date();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayDay = dayNames[today.getDay()];

        const todaySessions = sessions.filter(s =>
            s.enabled && s.days.includes(todayDay)
        );

        res.json({ success: true, data: todaySessions, count: todaySessions.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create session
app.post('/api/sessions', (req, res) => {
    try {
        const { name, time, duration, days, taskTypes, maxTasks } = req.body;

        if (!name || !time) {
            return res.status(400).json({ success: false, error: 'Nom et heure requis' });
        }

        const sessions = loadData(SESSIONS_FILE);
        const newSession = {
            id: `session_${Date.now()}`,
            name,
            time,
            duration: duration || 30,
            days: days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            taskTypes: taskTypes || ['call', 'email', 'followup'],
            maxTasks: maxTasks || 10,
            enabled: true,
            createdAt: new Date().toISOString()
        };

        sessions.push(newSession);
        saveData(SESSIONS_FILE, sessions);

        res.json({ success: true, data: newSession });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update session
app.put('/api/sessions/:id', (req, res) => {
    try {
        const sessions = loadData(SESSIONS_FILE);
        const index = sessions.findIndex(s => s.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Session non trouvée' });
        }

        const updateFields = ['name', 'time', 'duration', 'days', 'taskTypes', 'maxTasks', 'enabled'];
        updateFields.forEach(field => {
            if (req.body[field] !== undefined) {
                sessions[index][field] = req.body[field];
            }
        });
        sessions[index].updatedAt = new Date().toISOString();

        saveData(SESSIONS_FILE, sessions);
        res.json({ success: true, data: sessions[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Toggle session enabled/disabled
app.patch('/api/sessions/:id/toggle', (req, res) => {
    try {
        const sessions = loadData(SESSIONS_FILE);
        const index = sessions.findIndex(s => s.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Session non trouvée' });
        }

        sessions[index].enabled = !sessions[index].enabled;
        sessions[index].updatedAt = new Date().toISOString();

        saveData(SESSIONS_FILE, sessions);
        res.json({ success: true, data: sessions[index] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete session
app.delete('/api/sessions/:id', (req, res) => {
    try {
        const sessions = loadData(SESSIONS_FILE);
        const filtered = sessions.filter(s => s.id !== req.params.id);
        saveData(SESSIONS_FILE, filtered);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// SPA fallback - serve index.html for React Router
app.get('*', (req, res) => {
    // Don't redirect API calls
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint not found' });
    }

    const indexPath = path.join(staticPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Frontend not built. Run: cd client && npm run build');
    }
});

// Start server - bind to 0.0.0.0 to allow network access
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
    const networkInterfaces = require('os').networkInterfaces();
    let localIP = 'unknown';
    for (const name of Object.keys(networkInterfaces)) {
        for (const net of networkInterfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                localIP = net.address;
                break;
            }
        }
    }
    console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🚀 ProspectApp Server                          ║
║                                                   ║
║   Local:   http://localhost:${PORT}                  ║
║   Network: http://${localIP}:${PORT}             ║
║                                                   ║
║   LLM: Ollama (llama3.2)                         ║
║   Export: Excel                                   ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
    `);
});
