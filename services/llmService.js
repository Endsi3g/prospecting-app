/**
 * LLM Service - Integration with Ollama
 * Ollama runs locally and provides an easy-to-use API
 */

// Configuration - Ollama default API
const LLM_CONFIG = {
    url: process.env.LLM_API_URL || 'http://localhost:11434/api',
    model: process.env.LLM_MODEL || 'llama3.2'
};

/**
 * Test LLM connection
 */
async function testLLMConnection() {
    try {
        // Check if Ollama is running by listing models
        const response = await fetch(`${LLM_CONFIG.url}/tags`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const availableModels = data.models?.map(m => m.name) || [];

        return {
            connected: true,
            model: LLM_CONFIG.model,
            availableModels: availableModels,
            message: 'Connexion à Ollama réussie'
        };
    } catch (error) {
        return {
            connected: false,
            model: LLM_CONFIG.model,
            error: error.message,
            hint: 'Assurez-vous qu\'Ollama est démarré. Téléchargez-le sur https://ollama.com puis lancez: ollama run llama3.2'
        };
    }
}

/**
 * Generate personalized message for a prospect
 */
async function generateMessage(prospect, options = {}) {
    const { tone = 'professionnel', length = 'moyen', instructions = '' } = options;

    // Build context from prospect data
    const prospectContext = buildProspectContext(prospect);

    // Build the full prompt
    const prompt = buildPrompt(prospectContext, tone, length, instructions);

    try {
        const response = await fetch(`${LLM_CONFIG.url}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: LLM_CONFIG.model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                    num_predict: getMaxTokens(length)
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erreur Ollama: HTTP ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return cleanMessage(data.response);
    } catch (error) {
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
            throw new Error('Ollama n\'est pas accessible. Démarrez-le avec: ollama run llama3.2');
        }
        throw error;
    }
}

/**
 * Build prospect context string
 */
function buildProspectContext(prospect) {
    const parts = [];

    if (prospect.prenom || prospect.nom) {
        parts.push(`Nom: ${prospect.prenom || ''} ${prospect.nom || ''}`.trim());
    }
    if (prospect.entreprise || prospect.name) {
        parts.push(`Entreprise: ${prospect.entreprise || prospect.name}`);
    }
    if (prospect.poste) {
        parts.push(`Poste: ${prospect.poste}`);
    }
    if (prospect.siteWeb || prospect.website) {
        parts.push(`Site web: ${prospect.siteWeb || prospect.website}`);
    }
    if (prospect.linkedin) {
        parts.push(`LinkedIn: ${prospect.linkedin}`);
    }
    if (prospect.phone) {
        parts.push(`Téléphone: ${prospect.phone}`);
    }
    if (prospect.address) {
        parts.push(`Adresse: ${prospect.address}`);
    }
    if (prospect.category) {
        parts.push(`Catégorie: ${prospect.category}`);
    }
    if (prospect.rating) {
        parts.push(`Note: ${prospect.rating}`);
    }

    return parts.join('\n');
}

/**
 * Build the full prompt for message generation
 */
function buildPrompt(prospectContext, tone, length, instructions) {
    const toneInstructions = getToneInstructions(tone);
    const lengthInstructions = getLengthInstructions(length);

    return `Tu es un expert en rédaction de messages de prospection B2B. Tu dois rédiger un message personnalisé pour le prospect suivant.

INFORMATIONS DU PROSPECT:
${prospectContext}

CONSIGNES DE RÉDACTION:
- Tonalité: ${toneInstructions}
- Longueur: ${lengthInstructions}
${instructions ? `- Instructions supplémentaires: ${instructions}` : ''}

RÈGLES IMPORTANTES:
- Personnalise le message en utilisant les informations du prospect
- Ne commence pas par "Bonjour [Prénom]" de manière trop générique, sois créatif
- Mentionne l'entreprise ou le poste du prospect si pertinent
- Propose une valeur ajoutée claire
- Termine par un appel à l'action simple et non agressif
- Écris UNIQUEMENT le message, sans commentaires ni explications

MESSAGE:`;
}

/**
 * Get tone-specific instructions
 */
function getToneInstructions(tone) {
    const tones = {
        'professionnel': 'Formel mais accessible, vouvoiement, vocabulaire professionnel',
        'amical': 'Décontracté mais respectueux, tutoiement acceptable, ton chaleureux',
        'urgent': 'Direct, orienté action, sens de l\'urgence sans être agressif',
        'curieux': 'Questions ouvertes, intérêt sincère, exploration commune'
    };
    return tones[tone] || tones['professionnel'];
}

/**
 * Get length-specific instructions
 */
function getLengthInstructions(length) {
    const lengths = {
        'court': 'Maximum 50 mots, message très concis et percutant',
        'moyen': 'Entre 50 et 150 mots, équilibré',
        'long': 'Entre 150 et 300 mots, message détaillé avec contexte'
    };
    return lengths[length] || lengths['moyen'];
}

/**
 * Get max tokens based on desired length
 */
function getMaxTokens(length) {
    const tokens = {
        'court': 100,
        'moyen': 300,
        'long': 600
    };
    return tokens[length] || 300;
}

/**
 * Clean the generated message
 */
function cleanMessage(message) {
    if (!message) return '';

    // Remove any leading/trailing whitespace
    message = message.trim();

    // Remove any markdown formatting that might have slipped in
    message = message.replace(/^#+\s*/gm, '');
    message = message.replace(/\*\*/g, '');
    message = message.replace(/\*/g, '');

    // Remove common AI prefixes
    message = message.replace(/^(voici|voilà|je vous propose|message\s*:?\s*)/i, '');

    return message.trim();
}

module.exports = {
    generateMessage,
    testLLMConnection,
    LLM_CONFIG
};
