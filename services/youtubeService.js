/**
 * YouTube Service - Extract video transcripts
 */

const https = require('https');
const http = require('http');

/**
 * Extract video ID from various YouTube URL formats
 */
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/  // Direct video ID
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

/**
 * Fetch YouTube video page and extract metadata
 */
async function fetchVideoPage(videoId) {
    return new Promise((resolve, reject) => {
        const url = `https://www.youtube.com/watch?v=${videoId}`;

        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

/**
 * Extract video info from page HTML
 */
function extractVideoInfo(html) {
    const info = {
        title: '',
        description: '',
        channelName: '',
        duration: ''
    };

    // Extract title
    const titleMatch = html.match(/"title":\s*"([^"]+)"/);
    if (titleMatch) info.title = titleMatch[1];

    // Extract description (first 500 chars)
    const descMatch = html.match(/"shortDescription":\s*"([^"]{0,500})/);
    if (descMatch) info.description = descMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');

    // Extract channel name
    const channelMatch = html.match(/"ownerChannelName":\s*"([^"]+)"/);
    if (channelMatch) info.channelName = channelMatch[1];

    return info;
}

/**
 * Fetch transcript using timedtext API (works for many videos)
 */
async function fetchTranscript(videoId) {
    return new Promise(async (resolve, reject) => {
        try {
            // First, get the video page to find caption tracks
            const html = await fetchVideoPage(videoId);

            // Look for caption track URL
            const captionMatch = html.match(/"captionTracks":\s*\[(.*?)\]/);

            if (!captionMatch) {
                // No captions available, use description as fallback
                const info = extractVideoInfo(html);
                resolve({
                    success: true,
                    hasTranscript: false,
                    videoInfo: info,
                    transcript: info.description || 'Aucune transcription disponible pour cette vidéo.',
                    message: 'Transcription non disponible - description utilisée'
                });
                return;
            }

            // Parse caption track info
            const captionData = captionMatch[1];
            const urlMatch = captionData.match(/"baseUrl":\s*"([^"]+)"/);

            if (!urlMatch) {
                const info = extractVideoInfo(html);
                resolve({
                    success: true,
                    hasTranscript: false,
                    videoInfo: info,
                    transcript: info.description || 'Aucune transcription disponible.',
                    message: 'Transcription non disponible - description utilisée'
                });
                return;
            }

            // Fetch the actual transcript
            const captionUrl = urlMatch[1].replace(/\\u0026/g, '&');

            https.get(captionUrl, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    // Parse XML transcript
                    const textMatches = data.matchAll(/<text[^>]*>([^<]*)<\/text>/g);
                    const texts = [];
                    for (const match of textMatches) {
                        const text = match[1]
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&quot;/g, '"')
                            .replace(/&#39;/g, "'")
                            .replace(/\n/g, ' ');
                        if (text.trim()) texts.push(text.trim());
                    }

                    const info = extractVideoInfo(html);
                    const transcript = texts.join(' ').trim();

                    // If transcript is empty, use description
                    if (!transcript) {
                        resolve({
                            success: true,
                            hasTranscript: false,
                            videoInfo: info,
                            transcript: info.description || 'Contenu non disponible.',
                            message: 'Sous-titres vides - description utilisée'
                        });
                        return;
                    }

                    resolve({
                        success: true,
                        hasTranscript: true,
                        videoInfo: info,
                        transcript: transcript,
                        message: 'Transcription extraite avec succès'
                    });
                });
            }).on('error', () => {
                const info = extractVideoInfo(html);
                resolve({
                    success: true,
                    hasTranscript: false,
                    videoInfo: info,
                    transcript: info.description || 'Erreur lors de la récupération.',
                    message: 'Erreur de récupération - description utilisée'
                });
            });

        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Main function to get YouTube video content
 */
async function getYouTubeContent(url) {
    const videoId = extractVideoId(url);

    if (!videoId) {
        return {
            success: false,
            error: 'URL YouTube invalide'
        };
    }

    try {
        const result = await fetchTranscript(videoId);
        return {
            success: true,
            videoId,
            ...result
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    extractVideoId,
    getYouTubeContent,
    fetchTranscript
};
