/* eslint-disable @typescript-eslint/no-explicit-any */
// API client for backend communication
const API_BASE = '';

interface ApiOptions extends RequestInit {
    body?: any;
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { body, ...fetchOptions } = options;

    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        ...fetchOptions,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue');
    }

    return data;
}

// Prospects
export const prospectsApi = {
    getAll: () => request<{ data: Prospect[] }>('/api/prospects'),
    getById: (id: string) => request<{ data: Prospect }>(`/api/prospects/${id}`),
    update: (id: string, data: Partial<Prospect>) => request<{ data: Prospect }>(`/api/prospects/${id}`, {
        method: 'PUT', body: data
    }),
    delete: (id: string) => request(`/api/prospects/${id}`, { method: 'DELETE' }),
    deleteAll: () => request('/api/prospects', { method: 'DELETE' }),
    bulkDelete: (ids: string[]) => request('/api/prospects/bulk-delete', {
        method: 'POST', body: { prospectIds: ids }
    }),
    bulkAssign: (ids: string[], campaignId: string) => request('/api/prospects/bulk-assign', {
        method: 'POST', body: { prospectIds: ids, campaignId }
    }),
    getDuplicates: () => request<{ data: Prospect[][], totalDuplicates: number }>('/api/prospects/duplicates'),
    merge: (keepId: string, mergeIds: string[]) => request('/api/prospects/merge', {
        method: 'POST', body: { keepId, mergeIds }
    }),
};

// Messages
export const messagesApi = {
    getAll: () => request<{ data: Message[] }>('/api/messages'),
    generate: (data: GenerateMessagesRequest) => request<{ data: Message[] }>('/api/messages/generate', {
        method: 'POST', body: data
    }),
    update: (id: string, data: Partial<Message>) => request(`/api/messages/${id}`, {
        method: 'PUT', body: data
    }),
    regenerate: (id: string, options?: { tone?: string; length?: string }) => request<{ data: Message }>(`/api/messages/${id}/regenerate`, {
        method: 'POST', body: options || {}
    }),
};

// Campaigns
export const campaignsApi = {
    getAll: () => request<{ data: Campaign[] }>('/api/campaigns'),
    getById: (id: string) => request<{ data: Campaign }>(`/api/campaigns/${id}`),
    create: (data: CreateCampaignRequest) => request<{ data: Campaign }>('/api/campaigns', {
        method: 'POST', body: data
    }),
    update: (id: string, data: Partial<Campaign>) => request(`/api/campaigns/${id}`, {
        method: 'PUT', body: data
    }),
    delete: (id: string) => request(`/api/campaigns/${id}`, { method: 'DELETE' }),
    changeStatus: (id: string, status: string) => request(`/api/campaigns/${id}/status`, {
        method: 'POST', body: { status }
    }),
};

// Sequences (Multichannel Campaigns)
export const sequencesApi = {
    getAll: () => request<{ data: Sequence[]; count: number }>('/api/sequences'),
    getById: (id: string) => request<{ data: Sequence }>(`/api/sequences/${id}`),
    create: (data: CreateSequenceRequest) => request<{ data: Sequence }>('/api/sequences', {
        method: 'POST', body: data
    }),
    update: (id: string, data: Partial<Sequence>) => request<{ data: Sequence }>(`/api/sequences/${id}`, {
        method: 'PUT', body: data
    }),
    delete: (id: string) => request(`/api/sequences/${id}`, { method: 'DELETE' }),
    changeStatus: (id: string, status: SequenceStatus) => request<{ data: Sequence }>(`/api/sequences/${id}/status`, {
        method: 'PATCH', body: { status }
    }),
    // Enrollment
    enroll: (id: string, prospectIds: string[]) => request<{ enrolled: number; total: number }>(`/api/sequences/${id}/enroll`, {
        method: 'POST', body: { prospectIds }
    }),
    removeProspect: (id: string, prospectId: string) => request(`/api/sequences/${id}/prospects/${prospectId}`, {
        method: 'DELETE'
    }),
    getProspects: (id: string) => request<{ data: EnrolledProspect[]; count: number }>(`/api/sequences/${id}/prospects`),
    // Step management
    completeStep: (id: string, prospectId: string, outcome: StepOutcome) =>
        request<{ data: ProspectEnrollment }>(`/api/sequences/${id}/prospects/${prospectId}/complete-step`, {
            method: 'POST', body: { outcome }
        }),
    getStats: (id: string) => request<{ data: SequenceStats }>(`/api/sequences/${id}/stats`),
};

// Templates
export const templatesApi = {
    getAll: () => request<{ data: Template[] }>('/api/templates'),
    getById: (id: string) => request<{ data: Template }>(`/api/templates/${id}`),
    create: (data: CreateTemplateRequest) => request<{ data: Template }>('/api/templates', {
        method: 'POST', body: data
    }),
    update: (id: string, data: Partial<Template>) => request(`/api/templates/${id}`, {
        method: 'PUT', body: data
    }),
    delete: (id: string) => request(`/api/templates/${id}`, { method: 'DELETE' }),
};

// Lists
export const listsApi = {
    getAll: () => request<{ data: ProspectList[] }>('/api/lists'),
    getById: (id: string) => request<{ data: ProspectList }>(`/api/lists/${id}`),
    create: (data: CreateListRequest) => request<{ data: ProspectList }>('/api/lists', {
        method: 'POST', body: data
    }),
    update: (id: string, data: Partial<ProspectList>) => request(`/api/lists/${id}`, {
        method: 'PUT', body: data
    }),
    delete: (id: string) => request(`/api/lists/${id}`, { method: 'DELETE' }),
    assignProspect: (prospectId: string, listId: string) => request(`/api/prospects/${prospectId}/assign-list`, {
        method: 'POST', body: { listId }
    }),
    bulkAssign: (prospectIds: string[], listId: string) => request('/api/prospects/bulk/assign-list', {
        method: 'POST', body: { prospectIds, listId }
    }),
    removeProspect: (prospectId: string) => request(`/api/prospects/${prospectId}/list`, {
        method: 'DELETE'
    }),
};

// Research (Playwright & Apify)
export const researchApi = {
    // Get research data for a prospect
    getData: (prospectId: string) => request<{ data: ResearchData }>(`/api/prospects/${prospectId}/research`),

    // Research using Playwright (free, local)
    runPlaywright: (prospectId: string) => request<{ data: PlaywrightResearch }>(`/api/prospects/${prospectId}/research/playwright`, {
        method: 'POST'
    }),

    // Research using Apify (requires API key)
    runApify: (prospectId: string) => request<{ data: ApifyResearch }>(`/api/prospects/${prospectId}/research/apify`, {
        method: 'POST'
    }),

    // Scrape a specific URL
    scrapeUrl: (url: string, type: 'linkedin' | 'website' | 'search') => request('/api/research/scrape', {
        method: 'POST', body: { url, type }
    }),

    // Get available Apify actors
    getApifyActors: () => request<{ configured: boolean; data: ApifyActor[] }>('/api/research/apify/actors'),
};

// Enrichment & Scoring
export const enrichmentApi = {
    // Get ICP score breakdown
    getICPScore: (prospectId: string) => request<{ data: ICPScoreData }>(`/api/prospects/${prospectId}/icp`),

    // Enrich prospect with external data
    enrich: (prospectId: string) => request<EnrichmentResponse>(`/api/prospects/${prospectId}/enrich`, {
        method: 'POST'
    }),

    // Bulk recalculate all ICP scores
    recalculateScores: () => request<{ success: boolean; updated: number; total: number }>('/api/prospects/recalculate-scores', {
        method: 'POST'
    }),
};

// Prospects Overview
export const prospectsOverviewApi = {
    get: () => request<{ data: ProspectsOverview }>('/api/prospects/overview'),
};

// Stats
export const statsApi = {
    getOverview: () => request<{ data: StatsOverview }>('/api/stats/overview'),
    getGoals: () => request<{ data: GoalsData }>('/api/stats/goals'),
    getTrends: () => request<{ data: TrendsData }>('/api/stats/trends'),
};

// Activity
export const activityApi = {
    getRecent: (limit = 10) => request<{ data: Activity[] }>(`/api/activity?limit=${limit}`),
};

// Settings
export const settingsApi = {
    get: () => request<{ data: Settings }>('/api/settings'),
    update: (data: Settings) => request('/api/settings', { method: 'PUT', body: data }),
};

// Notifications
export const notificationsApi = {
    getAll: () => request<{ data: Notification[], unreadCount: number }>('/api/notifications'),
    markRead: (id: string) => request(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => request('/api/notifications/read-all', { method: 'PATCH' }),
    clear: () => request('/api/notifications', { method: 'DELETE' }),
};

// Search
export const searchApi = {
    search: (query: string) => request<{ data: SearchResults }>(`/api/search?q=${encodeURIComponent(query)}`),
    googleMaps: (query: string, location: string, maxResults = 20) =>
        request<GoogleMapsSearchResponse>('/api/search/google-maps', {
            method: 'POST',
            body: { query, location, maxResults }
        }),
    importResults: (results: GoogleMapsResult[]) =>
        request<{ success: boolean; data: Prospect[]; imported: number }>('/api/search/import', {
            method: 'POST',
            body: { results }
        }),
    getStatus: () => request<{ success: boolean; configured: boolean; actors: ApifyActor[] }>('/api/search/status'),
};

// LLM
export const llmApi = {
    test: () => request('/api/llm/test'),
};

// Types
export interface Prospect {
    id: string;
    prenom?: string;
    nom?: string;
    fullName?: string;
    email?: string;
    entreprise?: string;
    company?: string;
    poste?: string;
    telephone?: string;
    phone?: string;
    adresse?: string;
    siteWeb?: string;
    linkedin?: string;
    triageStatus?: string;
    interestScore?: number;
    rating?: string;
    duplicateReason?: string;
    pipelineStage?: string;
    pipelineUpdatedAt?: string;
    aiInsights?: AIInsights;
}

export interface Message {
    id: string;
    prospectId: string;
    content: string;
    message?: string; // Legacy field for backward compatibility
    channel: 'email' | 'linkedin' | 'sms';
    status: 'pending' | 'sent' | 'replied';
    createdAt: string;
}

export interface Campaign {
    id: string;
    name: string;
    description?: string;
    status: 'draft' | 'active' | 'paused' | 'completed';
    prospectIds: string[];
    templateId?: string;
    createdAt: string;
}

export interface Template {
    id: string;
    name: string;
    content: string;
    channel: 'email' | 'linkedin' | 'sms';
    createdAt: string;
}

export interface ProspectList {
    id: string;
    name: string;
    description?: string;
    prospectIds: string[];
    createdAt: string;
}

export interface StatsOverview {
    prospects: { total: number };
    messages: { total: number; pending: number; sent: number; replied: number };
    campaigns: { total: number; active: number; completed: number; draft: number };
    weeklyData: { week: string; prospects: number; messages: number }[];
}

export interface Goal {
    id: string;
    title: string;
    current: number;
    target: number;
    type: 'prospects' | 'messages' | 'campaigns' | 'engagement';
}

export interface GoalsData {
    goals: Goal[];
    overallProgress: number;
    status: 'excellent' | 'good' | 'needs_attention';
    period: string;
}

export interface TrendsData {
    prospects: { thisWeek: number; lastWeek: number; change: number };
    messages: { thisWeek: number; lastWeek: number; change: number };
    engagement: { change: number };
    campaigns: { change: number };
}

export interface Activity {
    id: string;
    type: 'import' | 'message_generated' | 'message_sent' | 'prospect_added' | 'campaign_started' | 'campaign_completed' | 'template_created' | 'reply_received' | 'error';
    title: string;
    description?: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

export interface Settings {
    llm: { model: string; temperature: number; maxTokens: number };
    appearance: { darkMode: boolean };
    notifications: { enabled: boolean; importComplete: boolean; messageGenerated: boolean; campaignUpdates: boolean };
    export: { format: string; includeMessages: boolean };
}

export interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
}

export interface SearchResults {
    prospects: Prospect[];
    campaigns: Campaign[];
    templates: Template[];
    messages: Message[];
    totalResults: number;
}

export interface GenerateMessagesRequest {
    prospectIds: string[];
    tone: string;
    length: string;
    templateId?: string;
}

export interface CreateCampaignRequest {
    name: string;
    description?: string;
    templateId?: string;
    prospectIds?: string[];
}

export interface CreateTemplateRequest {
    name: string;
    content: string;
    channel: 'email' | 'linkedin' | 'sms';
}

export interface CreateListRequest {
    name: string;
    description?: string;
}

// Research types
export interface ResearchData {
    playwrightData: PlaywrightResearch | null;
    apifyData: ApifyResearch | null;
}

export interface PlaywrightResearch {
    prospect: { id: string; name: string };
    linkedin: { success: boolean; data?: unknown; error?: string } | null;
    website: { success: boolean; data?: unknown; error?: string } | null;
    searchResults: { success: boolean; data?: unknown[]; error?: string } | null;
    scrapedAt: string;
}

export interface ApifyResearch {
    prospect: { id: string; name: string };
    linkedin: { success: boolean; data?: unknown; error?: string } | null;
    website: { success: boolean; data?: unknown; error?: string } | null;
    contacts: { success: boolean; data?: unknown; error?: string } | null;
    searchResults: { success: boolean; data?: unknown; error?: string } | null;
    researchedAt: string;
    source: string;
}

export interface ApifyActor {
    id: string;
    name: string;
    description: string;
}

export interface ProspectsOverview {
    total: number;
    withEmail: number;
    withLinkedIn: number;
    withWebsite: number;
    researched: number;
    triageStats: {
        new: number;
        to_contact: number;
        interested: number;
        not_interested: number;
        archived: number;
    };
    listStats: { id: string; name: string; count: number }[];
    messageStats: {
        total: number;
        pending: number;
        sent: number;
        replied: number;
    };
}

// Google Maps Search Types
export interface GoogleMapsResult {
    id: string;
    name: string;
    entreprise: string;
    address: string;
    phone: string;
    website: string;
    email: string;
    category: string;
    rating: number | null;
    reviewCount: number;
    googleMapsUrl: string;
    placeId: string;
    latitude: number | null;
    longitude: number | null;
    socialMedia: {
        facebook: string | null;
        instagram: string | null;
        linkedin: string | null;
    };
    source: string;
    scrapedAt: string;
}

export interface GoogleMapsSearchResponse {
    success: boolean;
    data?: GoogleMapsResult[];
    totalResults?: number;
    error?: string;
    source?: string;
    actorId?: string;
    runId?: string;
}

// ICP Score Types
export interface ICPScoreBreakdownItem {
    value: boolean | number | null;
    points: number;
    maxPoints: number;
    label: string;
}

export interface ICPScoreData {
    score: number;
    level: 'hot' | 'warm' | 'cold';
    breakdown: {
        email: ICPScoreBreakdownItem;
        phone: ICPScoreBreakdownItem;
        company: ICPScoreBreakdownItem;
        role: ICPScoreBreakdownItem;
        website: ICPScoreBreakdownItem;
        linkedin: ICPScoreBreakdownItem;
        address: ICPScoreBreakdownItem;
        rating: ICPScoreBreakdownItem;
    };
}

export interface AIInsights {
    painPoints: string[];
    approaches: string[];
    valueProposition: string;
}

export interface EnrichmentResponse {
    success: boolean;
    data: Prospect;
    enrichment: {
        sources: string[];
        fieldsUpdated: string[];
        aiInsights: AIInsights | null;
    };
}

// Sequence Types
export type SequenceStatus = 'draft' | 'active' | 'paused' | 'completed';
export type StepType = 'email' | 'call' | 'linkedin' | 'sms' | 'wait' | 'task';
export type StepOutcome = 'completed' | 'replied' | 'bounced' | 'skipped';
export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'unsubscribed';

export interface SequenceStep {
    id: string;
    order: number;
    type: StepType;
    name: string;
    config: {
        templateId?: string;
        subject?: string;
        content?: string;
        message?: string;
        taskDescription?: string;
    };
    waitDays: number;
}

export interface CompletedStep {
    stepId: string;
    stepIndex: number;
    outcome: StepOutcome;
    completedAt: string;
}

export interface ProspectEnrollment {
    prospectId: string;
    currentStepIndex: number;
    status: EnrollmentStatus;
    enrolledAt: string;
    lastActionAt: string | null;
    completedAt?: string;
    completedSteps: CompletedStep[];
}

export interface EnrolledProspect extends ProspectEnrollment {
    prospect: Prospect;
    currentStep: SequenceStep | null;
}

export interface SequenceStats {
    enrolled: number;
    completed: number;
    replied: number;
    bounced: number;
    active: number;
    paused: number;
    stepStats: {
        stepId: string;
        stepName: string;
        stepType: StepType;
        atStep: number;
        completed: number;
    }[];
}

export interface Sequence {
    id: string;
    name: string;
    description: string;
    status: SequenceStatus;
    steps: SequenceStep[];
    enrolledProspects: ProspectEnrollment[];
    stats: {
        enrolled: number;
        completed: number;
        replied: number;
        bounced: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface CreateSequenceRequest {
    name: string;
    description?: string;
    steps?: Partial<SequenceStep>[];
}
