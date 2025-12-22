/**
 * ProspectApp - Main Frontend Application
 * SPA with client-side routing and API integration
 */

// ===========================================
// State Management
// ===========================================
const AppState = {
    prospects: [],
    messages: [],
    campaigns: [],
    templates: [],
    lists: [],
    notifications: [],
    settings: {},
    selectedProspects: new Set(),
    currentPage: 'dashboard',
    currentListId: null,
    triageFilter: null,
    llmConnected: false,
    loading: false,
    unreadNotifications: 0,
    searchQuery: ''
};

// ===========================================
// API Client
// ===========================================
const API = {
    baseUrl: '',

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: { 'Content-Type': 'application/json', ...options.headers },
                ...options
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erreur API');
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Prospects
    getProspects: () => API.request('/api/prospects'),
    getProspect: (id) => API.request(`/api/prospects/${id}`),
    deleteProspect: (id) => API.request(`/api/prospects/${id}`, { method: 'DELETE' }),
    clearProspects: () => API.request('/api/prospects', { method: 'DELETE' }),

    async uploadCSV(file, preview = false) {
        const formData = new FormData();
        formData.append('file', file);
        const endpoint = preview ? '/api/prospects/preview' : '/api/prospects/import';
        return fetch(endpoint, { method: 'POST', body: formData }).then(r => r.json());
    },

    // Messages
    getMessages: () => API.request('/api/messages'),
    generateMessages: (data) => API.request('/api/messages/generate', {
        method: 'POST', body: JSON.stringify(data)
    }),
    updateMessage: (id, data) => API.request(`/api/messages/${id}`, {
        method: 'PUT', body: JSON.stringify(data)
    }),

    // LLM
    testLLM: () => API.request('/api/llm/test'),

    // Export
    async exportExcel(data) {
        const response = await fetch('/api/export/excel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Export failed');
        return response.blob();
    },

    // Campaigns
    getCampaigns: () => API.request('/api/campaigns'),
    getCampaign: (id) => API.request(`/api/campaigns/${id}`),
    createCampaign: (data) => API.request('/api/campaigns', {
        method: 'POST', body: JSON.stringify(data)
    }),
    updateCampaign: (id, data) => API.request(`/api/campaigns/${id}`, {
        method: 'PUT', body: JSON.stringify(data)
    }),
    deleteCampaign: (id) => API.request(`/api/campaigns/${id}`, { method: 'DELETE' }),
    changeCampaignStatus: (id, status) => API.request(`/api/campaigns/${id}/status`, {
        method: 'POST', body: JSON.stringify({ status })
    }),
    duplicateCampaign: (id) => API.request(`/api/campaigns/${id}/duplicate`, { method: 'POST' }),

    // Templates
    getTemplates: () => API.request('/api/templates'),
    getTemplate: (id) => API.request(`/api/templates/${id}`),
    createTemplate: (data) => API.request('/api/templates', {
        method: 'POST', body: JSON.stringify(data)
    }),
    updateTemplate: (id, data) => API.request(`/api/templates/${id}`, {
        method: 'PUT', body: JSON.stringify(data)
    }),
    deleteTemplate: (id) => API.request(`/api/templates/${id}`, { method: 'DELETE' }),
    duplicateTemplate: (id) => API.request(`/api/templates/${id}/duplicate`, { method: 'POST' }),

    // Lists (Groups)
    getLists: () => API.request('/api/lists'),
    getList: (id) => API.request(`/api/lists/${id}`),
    createList: (data) => API.request('/api/lists', {
        method: 'POST', body: JSON.stringify(data)
    }),
    updateList: (id, data) => API.request(`/api/lists/${id}`, {
        method: 'PUT', body: JSON.stringify(data)
    }),
    deleteList: (id) => API.request(`/api/lists/${id}`, { method: 'DELETE' }),
    duplicateList: (id) => API.request(`/api/lists/${id}/duplicate`, { method: 'POST' }),
    addProspectsToList: (id, prospectIds) => API.request(`/api/lists/${id}/prospects`, {
        method: 'POST', body: JSON.stringify({ prospectIds })
    }),
    removeProspectsFromList: (id, prospectIds) => API.request(`/api/lists/${id}/prospects`, {
        method: 'DELETE', body: JSON.stringify({ prospectIds })
    }),

    // Triage
    updateProspectTriage: (id, status, note) => API.request(`/api/prospects/${id}/triage`, {
        method: 'PUT', body: JSON.stringify({ status, note })
    }),
    bulkUpdateTriage: (prospectIds, status) => API.request('/api/prospects/bulk-triage', {
        method: 'POST', body: JSON.stringify({ prospectIds, status })
    }),
    bulkAddToList: (prospectIds, listId) => API.request('/api/prospects/bulk/list', {
        method: 'PUT', body: JSON.stringify({ prospectIds, listId, action: 'add' })
    }),
    bulkRemoveFromList: (prospectIds, listId) => API.request('/api/prospects/bulk/list', {
        method: 'PUT', body: JSON.stringify({ prospectIds, listId, action: 'remove' })
    }),

    // === NEW API METHODS ===

    // Stats & Analytics
    getStats: () => API.request('/api/stats/overview'),

    // Settings
    getSettings: () => API.request('/api/settings'),
    updateSettings: (data) => API.request('/api/settings', {
        method: 'PUT', body: JSON.stringify(data)
    }),

    // Notifications
    getNotifications: () => API.request('/api/notifications'),
    markNotificationRead: (id) => API.request(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    markAllNotificationsRead: () => API.request('/api/notifications/read-all', { method: 'PATCH' }),
    clearNotifications: () => API.request('/api/notifications', { method: 'DELETE' }),

    // Global Search
    search: (query) => API.request(`/api/search?q=${encodeURIComponent(query)}`),

    // Duplicate Detection
    getDuplicates: () => API.request('/api/prospects/duplicates'),
    mergeProspects: (keepId, mergeIds) => API.request('/api/prospects/merge', {
        method: 'POST', body: JSON.stringify({ keepId, mergeIds })
    }),

    // Bulk Operations
    bulkDeleteProspects: (prospectIds) => API.request('/api/prospects/bulk-delete', {
        method: 'POST', body: JSON.stringify({ prospectIds })
    }),
    bulkAssignToCampaign: (prospectIds, campaignId) => API.request('/api/prospects/bulk-assign', {
        method: 'POST', body: JSON.stringify({ prospectIds, campaignId })
    })
};

// ===========================================
// Router
// ===========================================
const Router = {
    routes: {
        '/': 'dashboard',
        '/prospects': 'prospects',
        '/lists': 'lists',
        '/import': 'import',
        '/generate': 'generate',
        '/messages': 'messages',
        '/export': 'export',
        '/campaigns': 'campaigns',
        '/templates': 'templates',
        '/templates/new': 'templateEditor',
        '/analyze': 'analyze',
        '/settings': 'settings'
    },

    // Dynamic route for editing templates and prospect details
    getRoute(hash) {
        if (this.routes[hash]) return this.routes[hash];
        if (hash.startsWith('/templates/edit/')) return 'templateEditor';
        if (hash.startsWith('/lists/')) return 'listDetail';
        if (hash.startsWith('/prospects/')) return 'prospectDetail';
        return 'dashboard';
    },

    init() {
        window.addEventListener('hashchange', () => this.navigate());
        this.navigate();
    },

    navigate() {
        const hash = window.location.hash.slice(1) || '/';
        const page = this.getRoute(hash);
        AppState.currentPage = page;
        this.updateNav(hash);
        this.renderPage(page);
    },

    updateNav(hash) {
        document.querySelectorAll('.nav-link').forEach(link => {
            const linkHash = link.getAttribute('href');
            if (linkHash === `#${hash}` || (hash === '' && linkHash === '#/')) {
                link.classList.add('bg-primary/10', 'text-primary');
                link.classList.remove('text-text-secondary');
            } else {
                link.classList.remove('bg-primary/10', 'text-primary');
                link.classList.add('text-text-secondary');
            }
        });
    },

    renderPage(page) {
        const content = document.getElementById('page-content');

        // Show skeleton loading state with animation
        content.innerHTML = `
            <div class="max-w-6xl mx-auto space-y-6 animate-fade-in">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="skeleton skeleton-text" style="width: 200px; height: 2rem;"></div>
                        <div class="skeleton skeleton-text short" style="margin-top: 0.5rem;"></div>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="skeleton skeleton-card"></div>
                    <div class="skeleton skeleton-card"></div>
                    <div class="skeleton skeleton-card"></div>
                    <div class="skeleton skeleton-card"></div>
                </div>
            </div>
        `;

        setTimeout(() => {
            // Apply page-content class for entry animation
            const pageHtml = Pages[page] ? Pages[page]() : Pages.dashboard();
            content.innerHTML = `<div class="page-content">${pageHtml}</div>`;
            Pages.init && Pages.init[page] && Pages.init[page]();
        }, 150);
    }
};

// ===========================================
// Page Templates
// ===========================================
const Pages = {
    // Dashboard
    dashboard() {
        return `
        <div class="max-w-6xl mx-auto space-y-8">
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
                <div>
                    <h1 class="text-3xl font-bold tracking-tight text-text-main">Tableau de bord</h1>
                    <p class="text-text-secondary mt-1">Vue d'ensemble de votre activité de prospection</p>
                </div>
                <a href="#/import" class="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-md shadow-primary/20 btn-ripple btn-press">
                    <span class="material-symbols-outlined text-[18px]">add</span>
                    Importer des prospects
                </a>
            </div>
            
            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 stagger-grid">
                <div class="bg-surface-light rounded-2xl p-6 border border-gray-100 shadow-apple card-hover">
                    <div class="flex items-center justify-between">
                        <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center icon-hover">
                            <span class="material-symbols-outlined text-primary">people</span>
                        </div>
                        <span class="text-2xl font-bold text-text-main" id="stat-prospects">0</span>
                    </div>
                    <p class="text-sm text-text-secondary mt-3">Total Prospects</p>
                </div>
                <div class="bg-surface-light rounded-2xl p-6 border border-gray-100 shadow-apple card-hover">
                    <div class="flex items-center justify-between">
                        <div class="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center icon-hover">
                            <span class="material-symbols-outlined text-green-600">mail</span>
                        </div>
                        <span class="text-2xl font-bold text-text-main" id="stat-messages">0</span>
                    </div>
                    <p class="text-sm text-text-secondary mt-3">Messages générés</p>
                </div>
                <div class="bg-surface-light rounded-2xl p-6 border border-gray-100 shadow-apple card-hover">
                    <div class="flex items-center justify-between">
                        <div class="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center icon-hover">
                            <span class="material-symbols-outlined text-purple-600">campaign</span>
                        </div>
                        <span class="text-2xl font-bold text-text-main" id="stat-campaigns">0</span>
                    </div>
                    <p class="text-sm text-text-secondary mt-3">Campagnes actives</p>
                </div>
                <div class="bg-surface-light rounded-2xl p-6 border border-gray-100 shadow-apple card-hover">
                    <div class="flex items-center justify-between">
                        <div class="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center icon-hover">
                            <span class="material-symbols-outlined text-orange-600">download</span>
                        </div>
                        <span class="text-2xl font-bold text-text-main" id="stat-exports">-</span>
                    </div>
                    <p class="text-sm text-text-secondary mt-3">Exports</p>
                </div>
            </div>
            
            <!-- Quick Actions -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-grid" style="animation-delay: 0.2s;">
                <a href="#/import" class="group bg-surface-light rounded-2xl p-6 border border-gray-100 hover:border-primary/30 card-hover">
                    <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform animate-float">
                        <span class="material-symbols-outlined text-primary text-[28px]">upload_file</span>
                    </div>
                    <h3 class="text-lg font-semibold text-text-main mb-1">Importer des prospects</h3>
                    <p class="text-sm text-text-secondary">Chargez un fichier CSV avec vos contacts</p>
                </a>
                
                <a href="#/generate" class="group bg-surface-light rounded-2xl p-6 border border-gray-100 hover:border-primary/30 card-hover">
                    <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform animate-float" style="animation-delay: 0.5s;">
                        <span class="material-symbols-outlined text-primary text-[28px]">auto_awesome</span>
                    </div>
                    <h3 class="text-lg font-semibold text-text-main mb-1">Générer des messages</h3>
                    <p class="text-sm text-text-secondary">Créez des messages personnalisés avec l'IA</p>
                </a>
                
                <a href="#/export" class="group bg-surface-light rounded-2xl p-6 border border-gray-100 hover:border-primary/30 card-hover">
                    <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform animate-float" style="animation-delay: 1s;">
                        <span class="material-symbols-outlined text-primary text-[28px]">file_download</span>
                    </div>
                    <h3 class="text-lg font-semibold text-text-main mb-1">Exporter les données</h3>
                    <p class="text-sm text-text-secondary">Téléchargez vos prospects en Excel</p>
                </a>
            </div>
        </div>`;
    },

    // Import Page
    import() {
        return `
        <div class="max-w-4xl mx-auto space-y-6">
            <div class="animate-fade-in-up">
                <h1 class="text-3xl font-bold tracking-tight text-text-main">Importation de prospects</h1>
                <p class="text-text-secondary mt-1">Ajoutez de nouveaux contacts via un fichier CSV</p>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-grid">
                <!-- Drop Zone -->
                <div class="lg:col-span-2">
                    <div id="drop-zone" class="drop-zone relative group cursor-pointer flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-gray-300 hover:border-primary/50 bg-surface-light px-8 py-16">
                        <input type="file" id="file-input" accept=".csv" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                        <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform animate-float">
                            <span class="material-symbols-outlined text-primary text-[32px]">cloud_upload</span>
                        </div>
                        <div class="text-center">
                            <p class="text-lg font-semibold text-text-main">Glissez votre fichier CSV ici</p>
                            <p class="text-sm text-text-secondary">ou <span class="text-primary font-medium link-animate">cliquez pour parcourir</span></p>
                        </div>
                        <p class="text-xs text-gray-400">Format: .csv (Max 5MB)</p>
                    </div>
                    
                    <!-- File info -->
                    <div id="file-info" class="hidden mt-4 bg-surface-light rounded-xl p-4 border border-gray-200 flex items-center gap-4 animate-fade-in-scale card-hover">
                        <div class="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center animate-bounce-in">
                            <span class="material-symbols-outlined">description</span>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-medium text-text-main" id="file-name">-</p>
                            <p class="text-xs text-text-secondary" id="file-size">-</p>
                        </div>
                        <button id="remove-file" class="p-2 text-gray-400 hover:text-red-500 icon-hover">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
                
                <!-- Instructions -->
                <div class="bg-surface-light rounded-2xl p-6 border border-gray-200 h-fit card-hover">
                    <div class="flex items-center gap-2 mb-4 text-primary">
                        <span class="material-symbols-outlined">info</span>
                        <h3 class="font-bold text-text-main">Instructions</h3>
                    </div>
                    <ul class="space-y-3 text-sm text-gray-600">
                        <li class="flex gap-2 stagger-item">
                            <span class="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                            Fichier CSV encodé en UTF-8
                        </li>
                        <li class="flex gap-2 stagger-item">
                            <span class="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                            <strong>N'importe quel format CSV</strong> (Google Maps, etc.)
                        </li>
                        <li class="flex gap-2 stagger-item">
                            <span class="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                            Colonnes détectées automatiquement
                        </li>
                    </ul>
                </div>
            </div>
            
            <!-- Preview Table -->
            <div id="preview-section" class="hidden">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-bold text-text-main">
                        Aperçu des données 
                        <span id="preview-count" class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold ml-2">0</span>
                    </h3>
                </div>
                <div class="bg-surface-light rounded-2xl border border-gray-200 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm" id="preview-table">
                            <thead id="preview-head" class="bg-gray-50 border-b border-gray-200"></thead>
                            <tbody id="preview-body" class="divide-y divide-gray-100"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <!-- Action Bar -->
            <div id="import-actions" class="hidden fixed bottom-0 left-0 right-0 bg-surface-light/90 backdrop-blur-md border-t border-gray-200 p-4 z-30">
                <div class="max-w-4xl mx-auto flex items-center justify-between">
                    <button id="cancel-import" class="text-sm font-medium text-gray-500 hover:text-gray-800 px-4 py-2">Annuler</button>
                    <div class="flex items-center gap-4">
                        <span class="text-sm text-gray-500"><span id="import-count">0</span> prospects prêts</span>
                        <button id="confirm-import" class="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-md shadow-primary/20">
                            <span class="material-symbols-outlined text-[18px]">check</span>
                            Valider l'import
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    },

    // Prospects Page
    prospects() {
        return `
        <div class="max-w-6xl mx-auto space-y-6">
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
                <div>
                    <h1 class="text-3xl font-bold tracking-tight text-text-main">Gestion des Prospects</h1>
                    <p class="text-text-secondary mt-1">Gérez et suivez votre pipeline de prospection</p>
                </div>
                <div class="flex gap-3">
                    <a href="#/import" class="h-10 px-4 rounded-lg border border-gray-200 bg-white text-text-main text-sm font-medium hover:bg-gray-50 transition flex items-center gap-2 btn-press">
                        <span class="material-symbols-outlined text-[18px]">upload_file</span>
                        Importer
                    </a>
                    <a href="#/generate" class="h-10 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition flex items-center gap-2 shadow-md shadow-primary/20 btn-ripple btn-press">
                        <span class="material-symbols-outlined text-[18px]">auto_awesome</span>
                        Générer messages
                    </a>
                </div>
            </div>
            
            <!-- Toolbar -->
            <div class="bg-surface-light rounded-xl border border-gray-200 p-3 flex flex-col md:flex-row gap-3 items-center justify-between animate-fade-in-scale card-hover">
                <div class="relative w-full md:w-80">
                    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                    <input type="text" id="search-prospects" placeholder="Rechercher..." class="w-full pl-10 pr-4 py-2 border-none rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white input-animate"/>
                </div>
                <div class="flex gap-2">
                    <button id="select-all-btn" class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg btn-press">Tout sélectionner</button>
                    <button id="delete-selected-btn" class="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg hidden btn-press">Supprimer</button>
                </div>
            </div>
            
            <!-- Table -->
            <div class="bg-surface-light rounded-2xl border border-gray-200 overflow-hidden animate-fade-in-up" style="animation-delay: 0.1s;">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th class="p-4 w-12"><input type="checkbox" id="check-all" class="rounded border-gray-300 text-primary focus:ring-primary/20 checkbox-animate"/></th>
                                <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Nom & Prénom</th>
                                <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Email</th>
                                <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Entreprise</th>
                                <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Poste</th>
                                <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Téléphone</th>
                                <th class="p-4 w-20"></th>
                            </tr>
                        </thead>
                        <tbody id="prospects-body" class="divide-y divide-gray-100"></tbody>
                    </table>
                </div>
                <div id="empty-prospects" class="hidden p-12 text-center">
                    <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 animate-float">
                        <span class="material-symbols-outlined text-gray-400 text-[28px]">people</span>
                    </div>
                    <h3 class="text-lg font-semibold text-text-main mb-1">Aucun prospect</h3>
                    <p class="text-text-secondary text-sm mb-4">Importez des contacts pour commencer</p>
                    <a href="#/import" class="inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline link-animate">
                        <span class="material-symbols-outlined text-[16px]">add</span>
                        Importer des prospects
                    </a>
                </div>
            </div>
        </div>`;
    },

    // Generate Page
    generate() {
        return `
        <div class="max-w-5xl mx-auto space-y-6">
            <div class="animate-fade-in-up">
                <h1 class="text-3xl font-bold tracking-tight text-text-main">Génération de messages</h1>
                <p class="text-text-secondary mt-1">Créez des messages personnalisés avec l'IA</p>
            </div>
            
            <!-- YouTube Import -->
            <div class="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-6 border border-red-200 animate-fade-in-scale card-hover">
                <h3 class="text-base font-semibold text-text-main flex items-center gap-2 mb-4">
                    <span class="material-symbols-outlined text-red-500">smart_display</span>
                    Importer depuis YouTube
                </h3>
                <p class="text-sm text-gray-600 mb-4">Extrayez le contenu d'une vidéo YouTube pour inspirer vos messages</p>
                
                <div class="flex gap-3">
                    <input type="text" id="youtube-url" class="flex-1 h-11 px-4 rounded-xl bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 input-animate" placeholder="https://youtube.com/watch?v=... ou ID de vidéo"/>
                    <button id="youtube-import-btn" class="flex items-center gap-2 h-11 px-5 rounded-xl bg-red-500 text-white font-medium text-sm hover:bg-red-600 shadow-sm btn-press">
                        <span class="material-symbols-outlined text-[18px]">download</span>
                        Extraire
                    </button>
                </div>
                
                <div id="youtube-result" class="hidden mt-4 p-4 bg-white rounded-xl border border-gray-200">
                    <div class="flex items-start gap-3 mb-3">
                        <img id="youtube-thumb" src="" class="w-24 h-14 rounded-lg object-cover bg-gray-100"/>
                        <div class="flex-1 min-w-0">
                            <h4 id="youtube-title" class="font-semibold text-text-main text-sm truncate"></h4>
                            <p id="youtube-channel" class="text-xs text-gray-500"></p>
                        </div>
                        <button id="youtube-use-btn" class="shrink-0 text-sm text-primary font-medium hover:underline btn-press">Utiliser</button>
                    </div>
                    <p id="youtube-transcript" class="text-xs text-gray-600 line-clamp-3"></p>
                </div>
            </div>
            
            <!-- Configuration -->
            <div class="bg-surface-light rounded-2xl p-6 border border-gray-200 animate-fade-in-scale card-hover" style="animation-delay: 0.05s;">
                <h3 class="text-base font-semibold text-text-main flex items-center gap-2 mb-6">
                    <span class="material-symbols-outlined text-primary animate-float">tune</span>
                    Configuration du Prompt
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="text-xs font-semibold text-gray-500 uppercase mb-2 block">Instructions pour l'IA</label>
                        <textarea id="gen-instructions" class="w-full h-32 p-4 rounded-xl bg-gray-50 border-transparent focus:border-primary focus:ring-1 focus:ring-primary text-sm resize-none input-animate" placeholder="Ex: Utilisez un ton amical, mentionnez notre produit X..."></textarea>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <label class="text-xs font-semibold text-gray-500 uppercase mb-2 block">Tonalité</label>
                            <select id="gen-tone" class="w-full p-3 rounded-xl bg-gray-50 border-transparent focus:border-primary text-sm input-animate">
                                <option value="professionnel">Professionnel & Direct</option>
                                <option value="amical">Amical & Décontracté</option>
                                <option value="urgent">Persuasif & Urgent</option>
                                <option value="curieux">Curieux & Exploratoire</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-xs font-semibold text-gray-500 uppercase mb-2 block">Longueur</label>
                            <select id="gen-length" class="w-full p-3 rounded-xl bg-gray-50 border-transparent focus:border-primary text-sm input-animate">
                                <option value="court">Court (< 50 mots)</option>
                                <option value="moyen" selected>Moyen (50-150 mots)</option>
                                <option value="long">Long (> 150 mots)</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Generate Button -->
                <div class="mt-6 flex items-center justify-between">
                    <span class="text-sm text-gray-500"><span id="selected-count">0</span> prospect(s) sélectionné(s)</span>
                    <button id="generate-btn" class="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-medium text-sm flex items-center gap-2 shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed btn-ripple btn-press" disabled>
                        <span class="material-symbols-outlined text-[18px]">auto_awesome</span>
                        Générer les messages
                    </button>
                </div>
            </div>
            
            <!-- Prospects Selection -->
            <div class="bg-surface-light rounded-2xl border border-gray-200 overflow-hidden animate-fade-in-up" style="animation-delay: 0.1s;">
                <div class="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 class="font-semibold text-text-main">Sélectionnez les prospects</h3>
                    <button id="select-all-gen" class="text-sm text-primary font-medium hover:underline link-animate btn-press">Tout sélectionner</button>
                </div>
                <div class="max-h-64 overflow-y-auto">
                    <div id="gen-prospects-list" class="divide-y divide-gray-100"></div>
                </div>
            </div>
            
            <!-- Results -->
            <div id="gen-results" class="hidden space-y-4">
                <h3 class="text-xl font-bold text-text-main animate-fade-in-up">Résultats</h3>
                <div id="gen-results-list" class="space-y-4"></div>
            </div>
        </div>`;
    },

    // Messages Page
    messages() {
        return `
        <div class="max-w-6xl mx-auto space-y-6 animate-fade-in-up">
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 class="text-3xl font-bold tracking-tight text-text-main">Messages Générés</h1>
                    <p class="text-text-secondary mt-1">Gérez et envoyez vos messages personnalisés</p>
                </div>
                <div class="flex items-center gap-3">
                    <button id="clear-all-messages-btn" class="flex items-center gap-2 h-10 px-4 rounded-xl border border-red-200 text-red-600 font-medium text-sm hover:bg-red-50 btn-press">
                        <span class="material-symbols-outlined text-[18px]">delete_sweep</span>
                        <span class="hidden sm:inline">Tout effacer</span>
                    </button>
                    <a href="#/generate" class="flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary-hover shadow-sm shadow-primary/20 btn-ripple btn-press">
                        <span class="material-symbols-outlined text-[18px]">add</span>
                        <span class="hidden sm:inline">Générer des messages</span>
                        <span class="sm:hidden">Générer</span>
                    </a>
                </div>
            </div>
            
            <!-- Stats Cards -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-grid">
                <div class="bg-surface-light rounded-2xl p-4 border border-gray-200 card-hover">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <span class="material-symbols-outlined text-primary text-[20px]">mail</span>
                        </div>
                        <div>
                            <p id="stat-total-messages" class="text-2xl font-bold text-text-main">0</p>
                            <p class="text-xs text-text-secondary">Total</p>
                        </div>
                    </div>
                </div>
                <div class="bg-surface-light rounded-2xl p-4 border border-gray-200 card-hover">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <span class="material-symbols-outlined text-amber-600 text-[20px]">schedule</span>
                        </div>
                        <div>
                            <p id="stat-pending-messages" class="text-2xl font-bold text-text-main">0</p>
                            <p class="text-xs text-text-secondary">En attente</p>
                        </div>
                    </div>
                </div>
                <div class="bg-surface-light rounded-2xl p-4 border border-gray-200 card-hover">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                            <span class="material-symbols-outlined text-green-600 text-[20px]">check_circle</span>
                        </div>
                        <div>
                            <p id="stat-sent-messages" class="text-2xl font-bold text-text-main">0</p>
                            <p class="text-xs text-text-secondary">Envoyés</p>
                        </div>
                    </div>
                </div>
                <div class="bg-surface-light rounded-2xl p-4 border border-gray-200 card-hover">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <span class="material-symbols-outlined text-blue-600 text-[20px]">reply</span>
                        </div>
                        <div>
                            <p id="stat-replied-messages" class="text-2xl font-bold text-text-main">0</p>
                            <p class="text-xs text-text-secondary">Réponses</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Filters & Search -->
            <div class="bg-surface-light rounded-2xl p-4 border border-gray-200 flex flex-col lg:flex-row gap-4">
                <div class="relative flex-1">
                    <span class="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <span class="material-symbols-outlined text-gray-400 text-[20px]">search</span>
                    </span>
                    <input id="message-search" class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary input-animate" placeholder="Rechercher un message ou prospect..." type="text"/>
                </div>
                <div id="message-filters" class="flex gap-2 overflow-x-auto pb-1">
                    <button data-filter="all" class="message-filter-btn shrink-0 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium transition-colors btn-press">Tous</button>
                    <button data-filter="ready" class="message-filter-btn shrink-0 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors btn-press">Prêts</button>
                    <button data-filter="sent" class="message-filter-btn shrink-0 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors btn-press">Envoyés</button>
                    <button data-filter="replied" class="message-filter-btn shrink-0 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors btn-press">Répondus</button>
                </div>
            </div>
            
            <!-- Messages List -->
            <div class="bg-surface-light rounded-2xl border border-gray-200 overflow-hidden">
                <div id="messages-list" class="divide-y divide-gray-100">
                    <!-- Messages will be rendered here -->
                </div>
                <div id="no-messages" class="hidden text-center py-12">
                    <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 animate-float">
                        <span class="material-symbols-outlined text-gray-400 text-[28px]">mail</span>
                    </div>
                    <h3 class="text-lg font-semibold text-text-main mb-1">Aucun message</h3>
                    <p class="text-text-secondary text-sm mb-4">Générez des messages pour vos prospects</p>
                    <a href="#/generate" class="inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline link-animate">
                        <span class="material-symbols-outlined text-[16px]">add</span>
                        Générer des messages
                    </a>
                </div>
            </div>
        </div>`;
    },

    // Export Page
    export() {
        return `
        <div class="max-w-4xl mx-auto space-y-8">
            <div class="animate-fade-in-up">
                <h1 class="text-3xl font-bold tracking-tight text-text-main">Exporter vos prospects</h1>
                <p class="text-text-secondary mt-1">Téléchargez vos données au format Excel</p>
            </div>
            
            <!-- Export Options -->
            <div class="bg-surface-light rounded-2xl p-6 border border-gray-200 animate-fade-in-scale card-hover" style="animation-delay: 0.05s;">
                <h3 class="text-lg font-semibold text-text-main mb-6">Options d'export</h3>
                
                <div class="space-y-4">
                    <label class="flex items-start gap-4 p-4 rounded-xl border border-gray-200 cursor-pointer hover:border-primary/30 transition-colors card-hover">
                        <input type="checkbox" id="export-messages" class="mt-1 rounded text-primary focus:ring-primary/20 checkbox-animate" checked/>
                        <div>
                            <span class="font-medium text-text-main">Inclure les messages générés</span>
                            <p class="text-sm text-text-secondary mt-0.5">Ajoute une colonne avec les messages personnalisés</p>
                        </div>
                    </label>
                </div>
            </div>
            
            <!-- Summary -->
            <div class="bg-surface-light rounded-2xl p-6 border border-gray-200 animate-fade-in-up card-hover" style="animation-delay: 0.1s;">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-text-secondary">Prospects à exporter</p>
                        <p class="text-3xl font-bold text-text-main mt-1" id="export-count">0</p>
                    </div>
                    <button id="export-btn" class="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-xl font-medium flex items-center gap-2 shadow-md shadow-primary/20 btn-ripple btn-press">
                        <span class="material-symbols-outlined">download</span>
                        Télécharger Excel
                    </button>
                </div>
            </div>
        </div>`;
    },

    // Campaigns Page
    campaigns() {
        return `
        <div class="max-w-7xl mx-auto space-y-6">
            <!-- Header -->
            <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-up">
                <div>
                    <h1 class="text-3xl font-bold tracking-tight text-text-main">Campagnes</h1>
                    <p class="text-text-secondary mt-1">Gérez et suivez vos campagnes de prospection</p>
                </div>
                <div class="flex items-center gap-3">
                    <button id="export-campaigns-btn" class="flex items-center justify-center gap-1.5 h-9 px-4 bg-white hover:bg-gray-50 text-text-main border border-gray-200 font-medium text-[13px] rounded-lg shadow-sm transition-all btn-press">
                        <span class="material-symbols-outlined text-[18px]">download</span>
                        <span>Exporter</span>
                    </button>
                    <button id="new-campaign-btn" class="flex items-center justify-center gap-1.5 h-9 px-4 bg-primary hover:bg-primary-hover text-white font-medium text-[13px] rounded-lg shadow-sm transition-all active:scale-[0.98] btn-ripple btn-press">
                        <span class="material-symbols-outlined text-[18px]">add</span>
                        <span>Nouvelle campagne</span>
                    </button>
                </div>
            </header>
            
            <!-- Overview Stats -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-scale stagger-grid">
                <div class="bg-surface-light rounded-2xl p-5 border border-gray-100 shadow-apple card-hover">
                    <div class="flex items-center justify-between">
                        <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center icon-hover">
                            <span class="material-symbols-outlined text-emerald-600 text-[20px]">play_circle</span>
                        </div>
                        <span class="text-2xl font-bold text-text-main" id="stat-campaigns-active">0</span>
                    </div>
                    <p class="text-sm text-text-secondary mt-3">Campagnes actives</p>
                </div>
                <div class="bg-surface-light rounded-2xl p-5 border border-gray-100 shadow-apple card-hover">
                    <div class="flex items-center justify-between">
                        <div class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center icon-hover">
                            <span class="material-symbols-outlined text-gray-500 text-[20px]">edit_note</span>
                        </div>
                        <span class="text-2xl font-bold text-text-main" id="stat-campaigns-draft">0</span>
                    </div>
                    <p class="text-sm text-text-secondary mt-3">Brouillons</p>
                </div>
                <div class="bg-surface-light rounded-2xl p-5 border border-gray-100 shadow-apple card-hover">
                    <div class="flex items-center justify-between">
                        <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center icon-hover">
                            <span class="material-symbols-outlined text-blue-600 text-[20px]">check_circle</span>
                        </div>
                        <span class="text-2xl font-bold text-text-main" id="stat-campaigns-completed">0</span>
                    </div>
                    <p class="text-sm text-text-secondary mt-3">Terminées</p>
                </div>
                <div class="bg-surface-light rounded-2xl p-5 border border-gray-100 shadow-apple card-hover">
                    <div class="flex items-center justify-between">
                        <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center icon-hover">
                            <span class="material-symbols-outlined text-purple-600 text-[20px]">groups</span>
                        </div>
                        <span class="text-2xl font-bold text-text-main" id="stat-campaigns-targets">0</span>
                    </div>
                    <p class="text-sm text-text-secondary mt-3">Total cibles</p>
                </div>
            </div>
            
            <!-- Filter and Search Bar -->
            <div class="flex flex-col lg:flex-row gap-4 items-center justify-between animate-fade-in-scale">
                <div class="relative w-full lg:w-80 group">
                    <span class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <span class="material-symbols-outlined text-gray-400 text-[20px]">search</span>
                    </span>
                    <input id="campaign-search" class="block w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-text-main placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm input-animate" placeholder="Rechercher..." type="text"/>
                </div>
                <div id="campaign-filters" class="flex p-1 bg-gray-100 rounded-lg w-full lg:w-auto overflow-x-auto no-scrollbar">
                    <button data-filter="all" class="campaign-filter-btn active px-4 py-1 rounded-md bg-white shadow-sm text-[13px] font-medium text-text-main transition-all whitespace-nowrap">
                        Toutes
                    </button>
                    <button data-filter="active" class="campaign-filter-btn px-4 py-1 rounded-md text-[13px] font-medium text-gray-500 hover:text-text-main transition-all whitespace-nowrap">
                        Actives
                    </button>
                    <button data-filter="draft" class="campaign-filter-btn px-4 py-1 rounded-md text-[13px] font-medium text-gray-500 hover:text-text-main transition-all whitespace-nowrap">
                        Brouillons
                    </button>
                    <button data-filter="completed" class="campaign-filter-btn px-4 py-1 rounded-md text-[13px] font-medium text-gray-500 hover:text-text-main transition-all whitespace-nowrap">
                        Terminées
                    </button>
                </div>
            </div>
            
            <!-- Campaigns Table -->
            <div id="campaigns-table-container" class="bg-surface-light rounded-xl shadow-apple border border-gray-200/60 overflow-hidden animate-fade-in-up" style="animation-delay:0.1s">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr class="border-b border-gray-100 bg-gray-50/50">
                                <th class="pl-6 pr-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-[30%]">Campagne</th>
                                <th class="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-[12%]">Statut</th>
                                <th class="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-[20%]">Performance</th>
                                <th class="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-[15%] hidden md:table-cell">Création</th>
                                <th class="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-[10%] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="campaigns-tbody" class="divide-y divide-gray-100">
                        </tbody>
                    </table>
                </div>
                <!-- Pagination -->
                <div id="campaigns-pagination" class="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-white">
                    <span class="text-[11px] text-gray-500" id="campaigns-count-label">0 campagnes</span>
                    <div class="flex gap-1">
                        <button id="campaigns-prev-btn" class="size-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" disabled>
                            <span class="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>
                        <button id="campaigns-next-btn" class="size-7 flex items-center justify-center rounded-md text-text-main hover:bg-gray-100 transition-colors">
                            <span class="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Empty State -->
            <div id="empty-campaigns" class="hidden bg-surface-light rounded-2xl p-12 text-center border border-gray-200 animate-fade-in-scale">
                <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 animate-float">
                    <span class="material-symbols-outlined text-gray-400 text-[28px]">campaign</span>
                </div>
                <h3 class="text-lg font-semibold text-text-main mb-1">Aucune campagne</h3>
                <p class="text-text-secondary text-sm mb-4">Créez votre première campagne de prospection</p>
                <button id="create-first-campaign-btn" class="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl font-medium text-sm shadow-md shadow-primary/20 btn-ripple btn-press">
                    <span class="material-symbols-outlined text-[18px]">add</span>
                    Créer une campagne
                </button>
            </div>
            
            <!-- Info Cards -->
            <div class="mt-auto grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 stagger-grid" style="animation-delay:0.2s">
                <div class="bg-surface-light rounded-xl p-5 shadow-apple border border-gray-200/60 flex items-start gap-4 hover:border-blue-200 transition-colors group cursor-pointer card-hover">
                    <div class="p-2 bg-blue-50 rounded-lg text-primary">
                        <span class="material-symbols-outlined text-[24px]">school</span>
                    </div>
                    <div>
                        <h3 class="font-semibold text-text-main text-[14px]">Centre d'aide</h3>
                        <p class="text-[13px] text-gray-500 mt-1 leading-relaxed">Apprenez à structurer vos campagnes pour maximiser vos résultats.</p>
                        <span class="text-[12px] font-medium text-primary mt-2 inline-block group-hover:underline link-animate">Voir le guide →</span>
                    </div>
                </div>
                <div class="bg-surface-light rounded-xl p-5 shadow-apple border border-gray-200/60 flex items-start gap-4 card-hover">
                    <div class="p-2 bg-blue-50 rounded-lg text-primary">
                        <span class="material-symbols-outlined text-[24px]">lightbulb</span>
                    </div>
                    <div>
                        <h3 class="font-semibold text-text-main text-[14px]">Conseil pro</h3>
                        <p class="text-[13px] text-gray-500 mt-1 leading-relaxed">Les mardis et jeudis matin ont généralement les meilleurs taux d'ouverture.</p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Campaign Modal -->
        <div id="campaign-modal" class="fixed inset-0 z-50 hidden overflow-y-auto">
            <div class="modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm"></div>
            <div class="flex min-h-full items-center justify-center p-4">
                <div class="modal-content relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
                    <!-- Modal Header -->
                    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 id="campaign-modal-title" class="text-lg font-semibold text-text-main">Nouvelle campagne</h2>
                        <button id="close-campaign-modal" class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                    
                    <!-- Modal Body -->
                    <div class="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                        <!-- Section 1: General Info -->
                        <section class="bg-gray-50 rounded-xl p-5 border border-gray-100">
                            <div class="flex items-center gap-2 mb-4">
                                <span class="material-symbols-outlined text-primary">info</span>
                                <h3 class="text-sm font-semibold text-text-main">Informations Générales</h3>
                            </div>
                            <div class="space-y-4">
                                <div>
                                    <label class="text-xs font-medium text-gray-600 block mb-1.5">Nom de la campagne</label>
                                    <input id="campaign-name" type="text" class="w-full bg-white border border-gray-200 rounded-lg px-4 h-11 text-sm text-text-main focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-gray-400 transition-all input-animate" placeholder="Ex: Prospection Q3 - Directeurs Tech"/>
                                </div>
                                <div>
                                    <label class="text-xs font-medium text-gray-600 block mb-1.5">Objectif principal</label>
                                    <div class="grid grid-cols-3 gap-3">
                                        <label class="cursor-pointer group relative">
                                            <input type="radio" name="campaign-objective" value="rendez-vous" checked class="peer sr-only"/>
                                            <div class="flex flex-col gap-2 p-3 rounded-lg border-2 border-transparent bg-white hover:bg-gray-50 peer-checked:border-primary peer-checked:bg-primary/5 transition-all">
                                                <div class="p-1.5 w-fit rounded-md bg-blue-100 text-primary">
                                                    <span class="material-symbols-outlined text-[18px]">calendar_month</span>
                                                </div>
                                                <p class="font-medium text-xs">Rendez-vous</p>
                                            </div>
                                        </label>
                                        <label class="cursor-pointer group relative">
                                            <input type="radio" name="campaign-objective" value="inscription" class="peer sr-only"/>
                                            <div class="flex flex-col gap-2 p-3 rounded-lg border-2 border-transparent bg-white hover:bg-gray-50 peer-checked:border-primary peer-checked:bg-primary/5 transition-all">
                                                <div class="p-1.5 w-fit rounded-md bg-green-100 text-green-600">
                                                    <span class="material-symbols-outlined text-[18px]">rocket_launch</span>
                                                </div>
                                                <p class="font-medium text-xs">Inscription</p>
                                            </div>
                                        </label>
                                        <label class="cursor-pointer group relative">
                                            <input type="radio" name="campaign-objective" value="partenariat" class="peer sr-only"/>
                                            <div class="flex flex-col gap-2 p-3 rounded-lg border-2 border-transparent bg-white hover:bg-gray-50 peer-checked:border-primary peer-checked:bg-primary/5 transition-all">
                                                <div class="p-1.5 w-fit rounded-md bg-orange-100 text-orange-600">
                                                    <span class="material-symbols-outlined text-[18px]">handshake</span>
                                                </div>
                                                <p class="font-medium text-xs">Partenariat</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </section>
                        
                        <!-- Section 2: Planning & Budget -->
                        <section class="bg-gray-50 rounded-xl p-5 border border-gray-100">
                            <div class="flex items-center gap-2 mb-4">
                                <span class="material-symbols-outlined text-primary">schedule</span>
                                <h3 class="text-sm font-semibold text-text-main">Planification & Budget</h3>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="text-xs font-medium text-gray-600 block mb-1.5">Date de début</label>
                                    <input id="campaign-date-start" type="date" class="w-full bg-white border border-gray-200 rounded-lg px-4 h-11 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary input-animate"/>
                                </div>
                                <div>
                                    <label class="text-xs font-medium text-gray-600 block mb-1.5">Date de fin</label>
                                    <input id="campaign-date-end" type="date" class="w-full bg-white border border-gray-200 rounded-lg px-4 h-11 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary input-animate"/>
                                </div>
                                <div class="col-span-2">
                                    <label class="text-xs font-medium text-gray-600 block mb-1.5">Budget quotidien limite (€)</label>
                                    <div class="relative">
                                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                                        <input id="campaign-budget" type="number" class="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-4 h-11 text-sm text-text-main focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-gray-400 input-animate" placeholder="0.00"/>
                                    </div>
                                </div>
                            </div>
                        </section>
                        
                        <!-- Section 3: Audience -->
                        <section class="bg-gray-50 rounded-xl p-5 border border-gray-100">
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-primary">groups</span>
                                    <h3 class="text-sm font-semibold text-text-main">Audience</h3>
                                </div>
                                <span id="campaign-audience-count" class="text-xs text-gray-500">0 prospects sélectionnés</span>
                            </div>
                            <div id="campaign-prospect-selector" class="max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                                <div id="campaign-prospects-list" class="divide-y divide-gray-100">
                                    <!-- Prospects will be loaded here -->
                                </div>
                            </div>
                            <button type="button" id="select-all-campaign-prospects" class="mt-2 text-xs text-primary font-medium hover:underline">Tout sélectionner</button>
                        </section>
                    </div>
                    
                    <!-- Modal Footer -->
                    <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                        <button id="save-campaign-draft" class="text-sm font-medium text-gray-600 hover:text-gray-800 px-4 py-2">
                            Sauvegarder en brouillon
                        </button>
                        <button id="create-campaign-btn" class="bg-primary hover:bg-primary-hover text-white font-semibold h-10 px-6 rounded-lg shadow-md shadow-primary/20 flex items-center gap-2 transition-all active:scale-95 btn-ripple btn-press">
                            <span>Créer la campagne</span>
                            <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Campaign Actions Dropdown (reusable) -->
        <div id="campaign-actions-dropdown" class="fixed hidden z-50 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-fade-in-scale">
            <button data-action="view" class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">visibility</span>
                Voir les détails
            </button>
            <button data-action="edit" class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">edit</span>
                Modifier
            </button>
            <button data-action="duplicate" class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">content_copy</span>
                Dupliquer
            </button>
            <hr class="my-1 border-gray-100"/>
            <button data-action="launch" class="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">play_arrow</span>
                Lancer
            </button>
            <button data-action="pause" class="w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2 hidden">
                <span class="material-symbols-outlined text-[18px]">pause</span>
                Mettre en pause
            </button>
            <button data-action="complete" class="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">check_circle</span>
                Marquer terminée
            </button>
            <hr class="my-1 border-gray-100"/>
            <button data-action="delete" class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">delete</span>
                Supprimer
            </button>
        </div>`;
    },

    // Lists (Groups) Page
    lists() {
        return `
        <div class="max-w-7xl mx-auto space-y-6">
            <!-- Header -->
            <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-up">
                <div>
                    <h1 class="text-3xl font-bold tracking-tight text-text-main">Listes de Prospects</h1>
                    <p class="text-text-secondary mt-1">Organisez vos contacts en groupes ciblés pour vos campagnes</p>
                </div>
                <div class="flex items-center gap-3">
                    <button id="new-list-btn" class="flex items-center justify-center gap-1.5 h-10 px-5 bg-primary hover:bg-primary-hover text-white font-medium text-sm rounded-xl shadow-md shadow-primary/20 transition-all active:scale-[0.98] btn-ripple btn-press">
                        <span class="material-symbols-outlined text-[18px]">add</span>
                        <span>Nouvelle liste</span>
                    </button>
                </div>
            </header>
            
            <!-- Search Bar -->
            <div class="flex flex-col lg:flex-row gap-4 items-center justify-between animate-fade-in-scale">
                <div class="relative w-full lg:w-80">
                    <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span class="material-symbols-outlined text-gray-400 text-[20px]">search</span>
                    </span>
                    <input id="list-search" class="block w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-text-main placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm input-animate" placeholder="Rechercher une liste..." type="text"/>
                </div>
            </div>
            
            <!-- Lists Table -->
            <div id="lists-table-container" class="bg-surface-light rounded-xl shadow-apple border border-gray-200/60 overflow-hidden animate-fade-in-up" style="animation-delay:0.1s">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="border-b border-gray-100 bg-gray-50/50">
                                <th class="pl-6 pr-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-[40%]">Nom de la liste</th>
                                <th class="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Prospects</th>
                                <th class="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Dernière modification</th>
                                <th class="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-right"></th>
                            </tr>
                        </thead>
                        <tbody id="lists-tbody" class="divide-y divide-gray-100">
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Empty State -->
            <div id="empty-lists" class="hidden bg-surface-light rounded-2xl p-12 text-center border border-gray-200 animate-fade-in-scale">
                <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 animate-float">
                    <span class="material-symbols-outlined text-gray-400 text-[28px]">folder</span>
                </div>
                <h3 class="text-lg font-semibold text-text-main mb-1">Aucune liste</h3>
                <p class="text-text-secondary text-sm mb-4">Créez votre première liste pour organiser vos prospects</p>
                <button id="create-first-list-btn" class="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl font-medium text-sm shadow-md shadow-primary/20 btn-ripple btn-press">
                    <span class="material-symbols-outlined text-[18px]">add</span>
                    Créer une liste
                </button>
            </div>
        </div>
        
        <!-- List Modal -->
        <div id="list-modal" class="fixed inset-0 z-50 hidden overflow-y-auto">
            <div class="modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm"></div>
            <div class="flex min-h-full items-center justify-center p-4">
                <div class="modal-content relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
                    <!-- Modal Header -->
                    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 id="list-modal-title" class="text-lg font-semibold text-text-main">Nouvelle liste</h2>
                        <button id="close-list-modal" class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                    
                    <!-- Modal Body -->
                    <div class="p-6 space-y-4">
                        <div>
                            <label class="text-xs font-medium text-gray-600 block mb-1.5">Nom de la liste</label>
                            <input id="list-name" type="text" class="w-full bg-white border border-gray-200 rounded-lg px-4 h-11 text-sm text-text-main focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-gray-400 transition-all input-animate" placeholder="Ex: Startups Tech Paris"/>
                        </div>
                        <div>
                            <label class="text-xs font-medium text-gray-600 block mb-1.5">Description (optionnel)</label>
                            <textarea id="list-description" class="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-text-main focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-gray-400 transition-all input-animate resize-none h-20" placeholder="Ex: Prospects de startups tech..."></textarea>
                        </div>
                        <div>
                            <label class="text-xs font-medium text-gray-600 block mb-1.5">Couleur</label>
                            <div class="flex gap-2" id="list-color-picker">
                                <button type="button" class="list-color-btn w-8 h-8 rounded-full bg-blue-500 ring-2 ring-offset-2 ring-blue-500" data-color="blue"></button>
                                <button type="button" class="list-color-btn w-8 h-8 rounded-full bg-green-500" data-color="green"></button>
                                <button type="button" class="list-color-btn w-8 h-8 rounded-full bg-purple-500" data-color="purple"></button>
                                <button type="button" class="list-color-btn w-8 h-8 rounded-full bg-orange-500" data-color="orange"></button>
                                <button type="button" class="list-color-btn w-8 h-8 rounded-full bg-pink-500" data-color="pink"></button>
                                <button type="button" class="list-color-btn w-8 h-8 rounded-full bg-indigo-500" data-color="indigo"></button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Modal Footer -->
                    <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button id="cancel-list-btn" class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Annuler</button>
                        <button id="save-list-btn" class="bg-primary hover:bg-primary-hover text-white font-semibold h-10 px-6 rounded-lg shadow-md shadow-primary/20 flex items-center gap-2 transition-all active:scale-95 btn-ripple btn-press">
                            <span>Enregistrer</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- List Actions Dropdown -->
        <div id="list-actions-dropdown" class="fixed hidden z-50 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-fade-in-scale">
            <button data-action="view" class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">visibility</span>
                Voir les prospects
            </button>
            <button data-action="edit" class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">edit</span>
                Modifier
            </button>
            <button data-action="duplicate" class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">content_copy</span>
                Dupliquer
            </button>
            <hr class="my-1 border-gray-100"/>
            <button data-action="delete" class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">delete</span>
                Supprimer
            </button>
        </div>`;
    },

    // Templates Page
    templates() {
        return `
        <div class="max-w-6xl mx-auto space-y-6 animate-fade-in-up">
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 class="text-3xl font-bold tracking-tight text-text-main">Templates</h1>
                    <p class="text-text-secondary mt-1">Gérez vos modèles de messages réutilisables pour Email, LinkedIn et SMS.</p>
                </div>
                <div class="flex items-center gap-3">
                    <button id="import-template-btn" class="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all shadow-sm btn-press">
                        <span class="material-symbols-outlined text-[18px]">upload_file</span>
                        <span>Importer</span>
                    </button>
                    <a href="#/templates/new" class="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-all shadow-md shadow-primary/20 btn-press">
                        <span class="material-symbols-outlined text-[18px]">add</span>
                        <span>Nouveau template</span>
                    </a>
                </div>
            </div>
            
            <!-- Filters & Search Bar -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-light p-2 rounded-xl border border-gray-100">
                <!-- Search -->
                <div class="relative w-full sm:max-w-md">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span class="material-symbols-outlined text-gray-400 text-[20px]">search</span>
                    </div>
                    <input id="template-search" class="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg bg-gray-50 text-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition-all input-animate" placeholder="Rechercher par nom ou contenu..." type="text"/>
                </div>
                <!-- Filter Chips -->
                <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto" id="channel-filters">
                    <button data-channel="all" class="channel-filter shrink-0 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium shadow-sm transition-all btn-press">Tous</button>
                    <button data-channel="email" class="channel-filter shrink-0 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors btn-press">Email</button>
                    <button data-channel="linkedin" class="channel-filter shrink-0 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors btn-press">LinkedIn</button>
                    <button data-channel="sms" class="channel-filter shrink-0 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors btn-press">SMS</button>
                </div>
            </div>
            
            <!-- Template Table -->
            <div class="bg-surface-light rounded-2xl shadow-apple border border-gray-100 overflow-hidden">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50/50 border-b border-gray-100">
                            <th class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">Nom</th>
                            <th class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">Aperçu du contenu</th>
                            <th class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-auto">Canal</th>
                            <th class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-auto text-right">Modifié</th>
                            <th class="px-6 py-4 w-12"></th>
                        </tr>
                    </thead>
                    <tbody id="templates-body" class="divide-y divide-gray-100"></tbody>
                </table>
                
                <!-- Empty State -->
                <div id="empty-templates" class="hidden p-12 text-center">
                    <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 animate-float">
                        <span class="material-symbols-outlined text-gray-400 text-[28px]">description</span>
                    </div>
                    <h3 class="text-lg font-semibold text-text-main mb-1">Aucun template</h3>
                    <p class="text-text-secondary text-sm mb-4">Créez votre premier modèle de message</p>
                    <a href="#/templates/new" class="inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline link-animate">
                        <span class="material-symbols-outlined text-[16px]">add</span>
                        Créer un template
                    </a>
                </div>
                
                <!-- Pagination Footer -->
                <div id="templates-pagination" class="hidden px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <p class="text-xs text-gray-500" id="templates-count">Affichage de 0 résultats</p>
                </div>
            </div>
        </div>
        
        <!-- Template Actions Modal -->
        <div id="template-actions-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center">
            <div class="absolute inset-0 bg-black/30 backdrop-blur-sm modal-overlay" onclick="closeTemplateActionsModal()"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-48 py-2 modal-content animate-fade-in-scale">
                <button onclick="editTemplate()" class="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                    Modifier
                </button>
                <button onclick="duplicateTemplate()" class="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                    <span class="material-symbols-outlined text-[18px]">content_copy</span>
                    Dupliquer
                </button>
                <hr class="my-1 border-gray-100"/>
                <button onclick="deleteTemplate()" class="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                    Supprimer
                </button>
            </div>
        </div>`;
    },

    // Template Editor Page
    templateEditor() {
        const hash = window.location.hash.slice(1);
        const isEditing = hash.startsWith('/templates/edit/');
        const templateId = isEditing ? hash.replace('/templates/edit/', '') : null;

        return `
        <div class="max-w-4xl mx-auto animate-fade-in-up">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-4">
                    <a href="#/templates" class="flex items-center justify-center p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-text-main">
                        <span class="material-symbols-outlined text-[20px]">arrow_back_ios_new</span>
                    </a>
                    <div>
                        <h1 class="text-2xl font-bold text-text-main" id="editor-title">${isEditing ? 'Modifier le template' : 'Nouveau template'}</h1>
                        <span class="text-sm text-gray-500" id="editor-status">Brouillon</span>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <button id="preview-template-btn" class="flex items-center justify-center h-9 px-4 rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors">
                        <span class="mr-2 material-symbols-outlined text-[18px]">visibility</span>
                        Prévisualiser
                    </button>
                    <div class="h-6 w-px bg-gray-300"></div>
                    <a href="#/templates" class="flex items-center justify-center h-9 px-4 rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors">
                        Annuler
                    </a>
                    <button id="save-template-btn" class="flex items-center justify-center h-9 px-5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium shadow-sm shadow-primary/20 transition-all btn-press">
                        Enregistrer
                    </button>
                </div>
            </div>
            
            <!-- Metadata Card -->
            <div class="bg-surface-light rounded-2xl shadow-apple border border-gray-100 p-6 mb-6 space-y-6">
                <!-- Title Input -->
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-semibold uppercase tracking-wider text-gray-500 pl-1">Nom du template</label>
                    <input id="template-name" class="w-full text-2xl font-semibold text-text-main placeholder-gray-300 border-none p-0 focus:ring-0 bg-transparent input-animate" placeholder="Ex: Relance post-événement..." type="text" value=""/>
                </div>
                
                <!-- Channel Selector -->
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-semibold uppercase tracking-wider text-gray-500 pl-1">Canal de diffusion</label>
                    <div class="flex w-full sm:w-auto self-start bg-gray-100 p-1 rounded-lg">
                        <label class="cursor-pointer relative flex-1 sm:flex-none">
                            <input checked name="channel" type="radio" value="email" class="peer sr-only"/>
                            <div class="px-6 py-1.5 rounded-md text-sm font-medium text-gray-500 transition-all peer-checked:bg-white peer-checked:text-primary peer-checked:shadow-sm flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined text-[18px]">mail</span>
                                Email
                            </div>
                        </label>
                        <label class="cursor-pointer relative flex-1 sm:flex-none">
                            <input name="channel" type="radio" value="linkedin" class="peer sr-only"/>
                            <div class="px-6 py-1.5 rounded-md text-sm font-medium text-gray-500 transition-all peer-checked:bg-white peer-checked:text-[#0077b5] peer-checked:shadow-sm flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined text-[18px]">work</span>
                                LinkedIn
                            </div>
                        </label>
                        <label class="cursor-pointer relative flex-1 sm:flex-none">
                            <input name="channel" type="radio" value="sms" class="peer sr-only"/>
                            <div class="px-6 py-1.5 rounded-md text-sm font-medium text-gray-500 transition-all peer-checked:bg-white peer-checked:text-purple-600 peer-checked:shadow-sm flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined text-[18px]">sms</span>
                                SMS
                            </div>
                        </label>
                    </div>
                </div>
                
                <!-- Description -->
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-semibold uppercase tracking-wider text-gray-500 pl-1">Description (optionnelle)</label>
                    <input id="template-description" class="w-full text-sm text-text-main placeholder-gray-400 border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50 input-animate" placeholder="Ex: Template pour la campagne Q4..." type="text" value=""/>
                </div>
            </div>
            
            <!-- Editor Card -->
            <div class="bg-surface-light rounded-2xl shadow-apple border border-gray-100 overflow-hidden">
                <!-- Toolbar -->
                <div class="bg-white/95 border-b border-gray-100 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <!-- Formatting Tools -->
                    <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        <button type="button" class="format-btn p-1.5 rounded hover:bg-white hover:shadow-sm text-gray-700 transition-all" title="Gras" data-format="bold">
                            <span class="material-symbols-outlined text-[20px]">format_bold</span>
                        </button>
                        <button type="button" class="format-btn p-1.5 rounded hover:bg-white hover:shadow-sm text-gray-700 transition-all" title="Italique" data-format="italic">
                            <span class="material-symbols-outlined text-[20px]">format_italic</span>
                        </button>
                        <button type="button" class="format-btn p-1.5 rounded hover:bg-white hover:shadow-sm text-gray-700 transition-all" title="Liste" data-format="list">
                            <span class="material-symbols-outlined text-[20px]">format_list_bulleted</span>
                        </button>
                        <div class="w-px h-4 bg-gray-300 mx-1"></div>
                        <button type="button" class="format-btn p-1.5 rounded hover:bg-white hover:shadow-sm text-gray-700 transition-all" title="Lien" data-format="link">
                            <span class="material-symbols-outlined text-[20px]">link</span>
                        </button>
                    </div>
                    <!-- Variable Insertion -->
                    <div class="relative" id="variable-dropdown-container">
                        <button type="button" id="insert-variable-btn" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors btn-press">
                            <span class="material-symbols-outlined text-[18px]">data_object</span>
                            Insérer variable
                            <span class="material-symbols-outlined text-[16px]">expand_more</span>
                        </button>
                        <div id="variable-dropdown" class="hidden absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-10 animate-fade-in-scale">
                            <button type="button" class="var-btn w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary" data-var="{{prenom}}">Prénom</button>
                            <button type="button" class="var-btn w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary" data-var="{{nom}}">Nom</button>
                            <button type="button" class="var-btn w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary" data-var="{{entreprise}}">Entreprise</button>
                            <button type="button" class="var-btn w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary" data-var="{{poste}}">Poste</button>
                            <button type="button" class="var-btn w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary" data-var="{{email}}">Email</button>
                        </div>
                    </div>
                </div>
                
                <!-- Text Area -->
                <div class="p-6">
                    <textarea id="template-content" class="w-full min-h-[300px] text-base leading-relaxed text-text-main focus:outline-none resize-none border-none bg-transparent placeholder-gray-400" placeholder="Saisissez votre message ici... Utilisez les variables comme {{prenom}} pour personnaliser."></textarea>
                </div>
                
                <!-- Footer Status -->
                <div class="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                    <span id="word-count">~0 mots</span>
                    <span id="last-modified">Non enregistré</span>
                </div>
            </div>
            
            <!-- Helper Tip -->
            <div class="mt-6 flex gap-4 p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 text-sm">
                <span class="material-symbols-outlined text-blue-600 shrink-0">info</span>
                <div>
                    <p class="font-medium mb-1">Astuce de rédaction</p>
                    <p class="opacity-90 leading-relaxed">Les messages LinkedIn sont plus efficaces lorsqu'ils font moins de 300 caractères. Utilisez des variables pour personnaliser chaque approche.</p>
                </div>
            </div>
        </div>`;
    },


    // Settings Page
    settings() {
        return `
        <div class="max-w-3xl mx-auto space-y-8">
            <div class="animate-fade-in-up">
                <h1 class="text-3xl font-bold tracking-tight text-text-main">Paramètres</h1>
                <p class="text-text-secondary mt-1">Configuration de l'application</p>
            </div>
            
            <!-- LLM Settings -->
            <div class="bg-surface-light rounded-2xl p-6 border border-gray-200 animate-fade-in-scale card-hover" style="animation-delay: 0.05s;">
                <h3 class="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary animate-float">smart_toy</span>
                    Configuration LLM
                </h3>
                <div class="space-y-4">
                    <div>
                        <label class="text-sm font-medium text-gray-600 block mb-2">Modèle Ollama</label>
                        <select id="setting-llm-model" class="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary">
                            <option value="llama3.2">Llama 3.2 (Recommandé)</option>
                            <option value="llama3">Llama 3</option>
                            <option value="mistral">Mistral</option>
                            <option value="mixtral">Mixtral</option>
                            <option value="codellama">CodeLlama</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-gray-600 block mb-2">Température <span id="temp-value" class="text-primary font-bold">0.7</span></label>
                        <input type="range" id="setting-temperature" min="0" max="1" step="0.1" value="0.7" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"/>
                        <div class="flex justify-between text-xs text-gray-400 mt-1">
                            <span>Précis</span>
                            <span>Créatif</span>
                        </div>
                    </div>
                    <div class="flex gap-3 pt-2">
                        <button id="test-llm-btn" class="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium btn-ripple btn-press">
                            Tester la connexion
                        </button>
                        <div id="llm-test-result" class="hidden flex items-center gap-2 px-4 py-2 rounded-lg text-sm"></div>
                    </div>
                </div>
            </div>
            
            <!-- Appearance -->
            <div class="bg-surface-light rounded-2xl p-6 border border-gray-200 animate-fade-in-scale card-hover" style="animation-delay: 0.1s;">
                <h3 class="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-purple-500">palette</span>
                    Apparence
                </h3>
                <div class="space-y-4">
                    <label class="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:border-primary/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <span class="material-symbols-outlined text-gray-500">dark_mode</span>
                            <div>
                                <span class="font-medium text-text-main">Mode sombre</span>
                                <p class="text-xs text-text-secondary">Interface adaptée pour une utilisation nocturne</p>
                            </div>
                        </div>
                        <div class="relative">
                            <input type="checkbox" id="setting-dark-mode" class="sr-only peer"/>
                            <div class="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </div>
                    </label>
                </div>
            </div>
            
            <!-- Notifications -->
            <div class="bg-surface-light rounded-2xl p-6 border border-gray-200 animate-fade-in-scale card-hover" style="animation-delay: 0.15s;">
                <h3 class="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-amber-500">notifications</span>
                    Notifications
                </h3>
                <div class="space-y-3">
                    <label class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                        <span class="text-sm text-text-main">Import de prospects terminé</span>
                        <input type="checkbox" id="setting-notif-import" checked class="rounded text-primary focus:ring-primary/20"/>
                    </label>
                    <label class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                        <span class="text-sm text-text-main">Génération de messages terminée</span>
                        <input type="checkbox" id="setting-notif-messages" checked class="rounded text-primary focus:ring-primary/20"/>
                    </label>
                    <label class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                        <span class="text-sm text-text-main">Mises à jour de campagne</span>
                        <input type="checkbox" id="setting-notif-campaigns" checked class="rounded text-primary focus:ring-primary/20"/>
                    </label>
                </div>
            </div>
            
            <!-- Export Preferences -->
            <div class="bg-surface-light rounded-2xl p-6 border border-gray-200 animate-fade-in-scale card-hover" style="animation-delay: 0.2s;">
                <h3 class="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-green-500">download</span>
                    Préférences d'export
                </h3>
                <div class="space-y-4">
                    <div>
                        <label class="text-sm font-medium text-gray-600 block mb-2">Format par défaut</label>
                        <select id="setting-export-format" class="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm">
                            <option value="xlsx">Excel (.xlsx)</option>
                            <option value="csv">CSV (.csv)</option>
                        </select>
                    </div>
                    <label class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" id="setting-include-messages" checked class="rounded text-primary focus:ring-primary/20"/>
                        <span class="text-sm text-text-main">Inclure les messages générés par défaut</span>
                    </label>
                </div>
            </div>
            
            <!-- Data Management -->
            <div class="bg-surface-light rounded-2xl p-6 border border-gray-200 animate-fade-in-up card-hover" style="animation-delay: 0.25s;">
                <h3 class="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-red-500">database</span>
                    Gestion des données
                </h3>
                <div class="space-y-4">
                    <div class="flex flex-wrap gap-3">
                        <button id="export-all-data-btn" class="flex items-center gap-2 px-4 py-2 border border-gray-200 text-text-main hover:bg-gray-50 rounded-lg text-sm font-medium btn-press">
                            <span class="material-symbols-outlined text-[18px]">cloud_download</span>
                            Exporter toutes les données
                        </button>
                        <button id="clear-data-btn" class="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium btn-press">
                            <span class="material-symbols-outlined text-[18px]">delete_forever</span>
                            Supprimer toutes les données
                        </button>
                    </div>
                    <p class="text-xs text-gray-400">Attention: la suppression des données est irréversible.</p>
                </div>
            </div>
            
            <!-- Save Button -->
            <div class="flex justify-end pb-8">
                <button id="save-settings-btn" class="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-medium shadow-md shadow-primary/20 btn-ripple btn-press">
                    <span class="material-symbols-outlined text-[18px]">save</span>
                    Enregistrer les paramètres
                </button>
            </div>
        </div>`;
    },

    // Company Analysis Page
    analyze() {
        return `
        <div class="max-w-6xl mx-auto space-y-6 animate-fade-in-up">
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 class="text-3xl font-bold tracking-tight text-text-main">Analyse de Compagnie</h1>
                    <p class="text-text-secondary mt-1">Générez des rapports détaillés et des scores d'intérêt avec l'IA</p>
                </div>
            </div>
            
            <!-- Analysis Form -->
            <div class="bg-surface-light rounded-2xl p-6 border border-gray-200 card-hover animate-fade-in-scale" style="animation-delay: 0.05s;">
                <h3 class="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary">business</span>
                    Sélectionner une compagnie
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Option 1: Select from prospects -->
                    <div class="space-y-3">
                        <label class="text-sm font-medium text-text-main">Depuis vos prospects</label>
                        <select id="analyze-company-select" class="w-full h-11 px-4 rounded-xl bg-white border border-gray-200 text-text-main focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                            <option value="">Choisir une entreprise...</option>
                        </select>
                    </div>
                    
                    <!-- Option 2: Manual input -->
                    <div class="space-y-3">
                        <label class="text-sm font-medium text-text-main">Ou saisir manuellement</label>
                        <input type="text" id="analyze-company-input" class="w-full h-11 px-4 rounded-xl bg-white border border-gray-200 text-text-main placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="Nom de l'entreprise...">
                    </div>
                </div>
                
                <div class="mt-4 space-y-3">
                    <label class="text-sm font-medium text-text-main">Site web (optionnel)</label>
                    <input type="url" id="analyze-website-input" class="w-full h-11 px-4 rounded-xl bg-white border border-gray-200 text-text-main placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="https://example.com">
                </div>
                
                <div class="mt-4 space-y-3">
                    <label class="text-sm font-medium text-text-main">Contexte additionnel (optionnel)</label>
                    <textarea id="analyze-context" class="w-full h-24 p-4 rounded-xl bg-white border border-gray-200 text-text-main placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none" placeholder="Informations supplémentaires sur la compagnie, votre offre, vos objectifs..."></textarea>
                </div>
                
                <div class="mt-6 flex justify-end">
                    <button id="start-analysis-btn" class="flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover shadow-md shadow-primary/20 btn-ripple btn-press">
                        <span class="material-symbols-outlined text-[20px]">auto_awesome</span>
                        Lancer l'analyse IA
                    </button>
                </div>
            </div>
            
            <!-- Analysis Progress -->
            <div id="analysis-progress" class="hidden bg-surface-light rounded-2xl p-6 border border-gray-200 card-hover">
                <div class="flex items-center gap-4">
                    <div class="spinner-lg"></div>
                    <div>
                        <p class="text-lg font-semibold text-text-main">Analyse en cours...</p>
                        <p id="analysis-step" class="text-sm text-text-secondary">Collecte des informations...</p>
                    </div>
                </div>
                <div class="mt-4 w-full bg-gray-200 rounded-full h-2">
                    <div id="analysis-progress-bar" class="bg-primary h-2 rounded-full transition-all duration-500" style="width: 0%"></div>
                </div>
            </div>
            
            <!-- Analysis Result -->
            <div id="analysis-result" class="hidden space-y-6">
                <!-- Header with Score -->
                <div class="bg-gradient-to-r from-primary to-indigo-600 rounded-2xl p-6 text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-white/70 text-sm font-medium">Analyse de</p>
                            <h2 id="result-company-name" class="text-2xl font-bold mt-1">-</h2>
                        </div>
                        <div class="text-center">
                            <div id="result-score" class="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold">
                                -
                            </div>
                            <p class="text-white/70 text-xs mt-2">Score d'intérêt</p>
                        </div>
                    </div>
                </div>
                
                <!-- Report Sections -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Company Overview -->
                    <div class="bg-surface-light rounded-2xl p-6 border border-gray-200 card-hover">
                        <h3 class="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
                            <span class="material-symbols-outlined text-primary">info</span>
                            Vue d'ensemble
                        </h3>
                        <div id="result-overview" class="text-sm text-text-secondary leading-relaxed">-</div>
                    </div>
                    
                    <!-- Industry Analysis -->
                    <div class="bg-surface-light rounded-2xl p-6 border border-gray-200 card-hover">
                        <h3 class="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
                            <span class="material-symbols-outlined text-amber-500">factory</span>
                            Analyse du secteur
                        </h3>
                        <div id="result-industry" class="text-sm text-text-secondary leading-relaxed">-</div>
                    </div>
                    
                    <!-- Pain Points -->
                    <div class="bg-surface-light rounded-2xl p-6 border border-gray-200 card-hover">
                        <h3 class="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
                            <span class="material-symbols-outlined text-red-500">report_problem</span>
                            Points de douleur potentiels
                        </h3>
                        <ul id="result-pain-points" class="text-sm text-text-secondary space-y-2">-</ul>
                    </div>
                    
                    <!-- Opportunities -->
                    <div class="bg-surface-light rounded-2xl p-6 border border-gray-200 card-hover">
                        <h3 class="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
                            <span class="material-symbols-outlined text-green-500">lightbulb</span>
                            Opportunités
                        </h3>
                        <ul id="result-opportunities" class="text-sm text-text-secondary space-y-2">-</ul>
                    </div>
                </div>
                
                <!-- Recommended Approach -->
                <div class="bg-surface-light rounded-2xl p-6 border border-gray-200 card-hover">
                    <h3 class="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary">psychology</span>
                        Approche recommandée
                    </h3>
                    <div id="result-approach" class="text-sm text-text-secondary leading-relaxed">-</div>
                </div>
                
                <!-- Key Contacts -->
                <div id="result-contacts-section" class="hidden bg-surface-light rounded-2xl p-6 border border-gray-200 card-hover">
                    <h3 class="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
                        <span class="material-symbols-outlined text-indigo-500">group</span>
                        Contacts associés
                    </h3>
                    <div id="result-contacts" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">-</div>
                </div>
                
                <!-- Actions -->
                <div class="flex flex-wrap gap-4">
                    <button id="save-report-btn" class="flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover shadow-md shadow-primary/20 btn-press">
                        <span class="material-symbols-outlined text-[20px]">save</span>
                        Sauvegarder le rapport
                    </button>
                    <button id="apply-scores-btn" class="flex items-center gap-2 h-11 px-6 rounded-xl border border-gray-200 bg-white text-text-main font-medium hover:bg-gray-50 btn-press">
                        <span class="material-symbols-outlined text-[20px]">trending_up</span>
                        Appliquer le score aux prospects
                    </button>
                    <button id="export-report-btn" class="flex items-center gap-2 h-11 px-6 rounded-xl border border-gray-200 bg-white text-text-main font-medium hover:bg-gray-50 btn-press">
                        <span class="material-symbols-outlined text-[20px]">download</span>
                        Exporter en PDF
                    </button>
                    <button id="new-analysis-btn" class="flex items-center gap-2 h-11 px-6 rounded-xl border border-gray-200 bg-white text-text-main font-medium hover:bg-gray-50 btn-press">
                        <span class="material-symbols-outlined text-[20px]">refresh</span>
                        Nouvelle analyse
                    </button>
                </div>
            </div>
            
            <!-- Previous Reports -->
            <div id="previous-reports" class="bg-surface-light rounded-2xl p-6 border border-gray-200 card-hover animate-fade-in-up" style="animation-delay: 0.1s;">
                <h3 class="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-gray-500">history</span>
                    Rapports précédents
                </h3>
                <div id="reports-list" class="space-y-3">
                    <p class="text-sm text-text-secondary text-center py-4">Aucun rapport sauvegardé</p>
                </div>
            </div>
        </div>`;
    },

    // Prospect Detail Page
    prospectDetail() {
        return `
        <div class="max-w-[1200px] mx-auto space-y-6 animate-fade-in-up">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div class="flex items-center gap-2 text-sm">
                    <a href="#/prospects" class="text-text-secondary hover:text-primary transition-colors">Prospects</a>
                    <span class="material-symbols-outlined text-[16px] text-gray-400">chevron_right</span>
                    <span class="text-text-main font-medium">Détails du prospect</span>
                </div>
                <div class="flex gap-3">
                    <button id="delete-prospect-btn" class="group flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 bg-white text-text-secondary text-sm font-medium hover:bg-gray-50 hover:text-red-600 transition-all btn-press">
                        <span class="material-symbols-outlined text-[18px]">delete</span><span>Supprimer</span>
                    </button>
                    <button class="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm shadow-primary/30 btn-ripple btn-press">
                        <span class="material-symbols-outlined text-[18px]">link</span><span>Lier à campagne</span>
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div class="lg:col-span-4 flex flex-col gap-6">
                    <div class="bg-surface-light rounded-2xl shadow-apple border border-gray-100 p-6 overflow-hidden relative card-hover">
                        <div class="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-50 to-indigo-50"></div>
                        <div class="relative flex flex-col items-center text-center mt-4">
                            <div id="prospect-avatar" class="w-24 h-24 rounded-full border-4 border-white bg-primary/10 shadow-md mb-4 flex items-center justify-center text-primary text-3xl font-bold">--</div>
                            <h1 id="prospect-name" class="text-2xl font-bold text-text-main">Chargement...</h1>
                            <p id="prospect-title" class="text-text-secondary font-medium mt-1">-</p>
                            <p id="prospect-company-link" class="text-sm text-primary mt-1">-</p>
                            
                            <!-- Social Contact Buttons -->
                            <div class="flex gap-3 mt-6 w-full justify-center flex-wrap">
                                <a id="prospect-email-btn" href="#" title="Envoyer un email" class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-text-main hover:bg-blue-500 hover:text-white transition-all">
                                    <span class="material-symbols-outlined text-[20px]">mail</span>
                                </a>
                                <a id="prospect-phone-btn" href="#" title="Appeler" class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-text-main hover:bg-green-500 hover:text-white transition-all">
                                    <span class="material-symbols-outlined text-[20px]">call</span>
                                </a>
                                <a id="prospect-linkedin-btn" href="#" target="_blank" title="Voir sur LinkedIn" class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-text-main hover:bg-[#0077b5] hover:text-white transition-all">
                                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                                </a>
                                <a id="prospect-whatsapp-btn" href="#" target="_blank" title="Contacter sur WhatsApp" class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-text-main hover:bg-[#25D366] hover:text-white transition-all">
                                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                </a>
                                <a id="prospect-twitter-btn" href="#" target="_blank" title="Voir sur Twitter/X" class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-text-main hover:bg-black hover:text-white transition-all">
                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                </a>
                                <a id="prospect-web-btn" href="#" target="_blank" title="Visiter le site web" class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-text-main hover:bg-primary hover:text-white transition-all">
                                    <span class="material-symbols-outlined text-[20px]">language</span>
                                </a>
                            </div>
                        </div>
                        <div class="mt-8 border-t border-gray-200 pt-6">
                            <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 items-baseline">
                                <span class="text-xs font-semibold uppercase tracking-wider text-gray-400 col-span-2 mb-2">Coordonnées</span>
                                <span class="text-sm text-text-secondary">Email</span><span id="prospect-email" class="text-sm font-medium text-text-main truncate">-</span>
                                <span class="text-sm text-text-secondary mt-3">Tél</span><span id="prospect-phone" class="text-sm font-medium text-text-main mt-3">-</span>
                                <span class="text-sm text-text-secondary mt-3">Adresse</span><span id="prospect-address" class="text-sm font-medium text-text-main mt-3">-</span>
                                <span class="text-sm text-text-secondary mt-3">Site</span><a id="prospect-website" href="#" target="_blank" class="text-sm font-medium text-primary mt-3 hover:underline">-</a>
                                <span class="text-xs font-semibold uppercase tracking-wider text-gray-400 col-span-2 mb-2 mt-6">Informations Pro</span>
                                <span class="text-sm text-text-secondary">Entreprise</span><span id="prospect-company" class="text-sm font-medium text-text-main">-</span>
                                <span class="text-sm text-text-secondary mt-3">Poste</span><span id="prospect-role" class="text-sm font-medium text-text-main mt-3">-</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Interest Score Card -->
                    <div class="bg-surface-light rounded-2xl shadow-apple border border-gray-100 p-5 card-hover">
                        <h3 class="text-sm font-semibold text-text-main mb-4 flex items-center gap-2">
                            <span class="material-symbols-outlined text-primary text-[18px]">trending_up</span>
                            Score d'intérêt
                        </h3>
                        <div class="space-y-4">
                            <div class="flex items-center gap-4">
                                <div id="interest-score-display" class="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                                    0
                                </div>
                                <div class="flex-1">
                                    <input type="range" id="interest-score-slider" min="0" max="100" value="0" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary">
                                    <div class="flex justify-between text-xs text-gray-400 mt-1">
                                        <span>Froid</span>
                                        <span>Tiède</span>
                                        <span>Chaud</span>
                                    </div>
                                </div>
                            </div>
                            <button id="save-score-btn" class="w-full py-2 bg-gray-100 hover:bg-primary hover:text-white text-text-secondary text-sm font-medium rounded-lg transition-all btn-press">
                                Enregistrer le score
                            </button>
                        </div>
                    </div>
                    
                    <div class="bg-surface-light rounded-2xl shadow-apple border border-gray-100 p-5 card-hover">
                        <h3 class="text-sm font-semibold text-text-main mb-3">Statut & Évaluation</h3>
                        <div class="flex flex-wrap gap-2"><span id="prospect-status-badge" class="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">Nouveau</span></div>
                        <div id="prospect-rating-section" class="hidden mt-4 pt-4 border-t border-gray-100">
                            <div class="flex items-center gap-2"><span class="material-symbols-outlined text-yellow-500 text-[20px]">star</span><span id="prospect-rating" class="text-sm font-semibold text-text-main">-</span><span id="prospect-reviews" class="text-xs text-text-secondary">-</span></div>
                        </div>
                    </div>
                    <div id="google-maps-section" class="hidden bg-surface-light rounded-2xl shadow-apple border border-gray-100 p-5 card-hover">
                        <a id="google-maps-link" href="#" target="_blank" class="flex items-center gap-3 text-primary hover:underline"><span class="material-symbols-outlined text-[20px]">location_on</span><span class="text-sm font-medium">Voir sur Google Maps</span></a>
                    </div>
                </div>
                <div class="lg:col-span-8 flex flex-col gap-6">
                    <div class="grid grid-cols-3 gap-4">
                        <div class="bg-surface-light rounded-2xl shadow-apple border border-gray-100 p-4 flex flex-col items-center text-center card-hover">
                            <div id="stat-interest" class="text-2xl font-bold text-text-main flex items-center gap-1">
                                <span id="stat-interest-value">-</span>
                                <span id="stat-interest-indicator" class="text-sm"></span>
                            </div>
                            <span class="text-xs text-text-secondary mt-1">Score d'intérêt</span>
                        </div>
                        <div class="bg-surface-light rounded-2xl shadow-apple border border-gray-100 p-4 flex flex-col items-center text-center card-hover"><span id="stat-interactions" class="text-2xl font-bold text-text-main">0</span><span class="text-xs text-text-secondary mt-1">Interactions</span></div>
                        <div class="bg-surface-light rounded-2xl shadow-apple border border-gray-100 p-4 flex flex-col items-center text-center card-hover"><span id="stat-campaigns-count" class="text-2xl font-bold text-text-main">0</span><span class="text-xs text-text-secondary mt-1">Campagnes</span></div>
                    </div>
                    <div class="bg-surface-light rounded-2xl shadow-apple border border-gray-100 flex flex-col min-h-[400px] card-hover">
                        <div class="flex border-b border-gray-200 px-6">
                            <button data-tab="history" class="prospect-tab flex items-center gap-2 py-4 px-2 mr-6 text-primary border-b-2 border-primary font-medium text-sm"><span class="material-symbols-outlined text-[20px]">history</span>Historique</button>
                            <button data-tab="campaigns" class="prospect-tab flex items-center gap-2 py-4 px-2 mr-6 text-text-secondary hover:text-text-main font-medium text-sm border-b-2 border-transparent"><span class="material-symbols-outlined text-[20px]">campaign</span>Campagnes<span id="campaigns-badge" class="ml-1 bg-gray-100 text-text-secondary text-xs py-0.5 px-2 rounded-full">0</span></button>
                            <button data-tab="notes" class="prospect-tab flex items-center gap-2 py-4 px-2 text-text-secondary hover:text-text-main font-medium text-sm border-b-2 border-transparent"><span class="material-symbols-outlined text-[20px]">sticky_note_2</span>Notes</button>
                        </div>
                        <div id="tab-history" class="tab-content p-6">
                            <div class="relative pl-4 border-l border-gray-200 ml-2 space-y-8">
                                <div class="relative pl-6">
                                    <div class="absolute -left-[25px] top-1 w-8 h-8 rounded-full bg-gray-100 border-4 border-white flex items-center justify-center text-gray-500"><span class="material-symbols-outlined text-[16px]">person_add</span></div>
                                    <div class="flex flex-col gap-1"><div class="flex items-center justify-between"><p class="text-sm font-semibold text-text-main">Prospect créé</p><span id="prospect-created-date" class="text-xs text-gray-400">-</span></div><p class="text-sm text-text-secondary">Importé dans la base de données</p></div>
                                </div>
                            </div>
                        </div>
                        <div id="tab-campaigns" class="tab-content hidden p-6"><div id="campaigns-list"><p class="text-center text-text-secondary text-sm py-8">Aucune campagne associée</p></div></div>
                        <div id="tab-notes" class="tab-content hidden p-6"><textarea id="prospect-notes" class="w-full h-32 p-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary text-sm resize-none" placeholder="Ajoutez des notes..."></textarea><button id="save-notes-btn" class="mt-4 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium btn-press">Enregistrer</button></div>
                    </div>
                </div>
            </div>
        </div>`;
    }
};

// Page initialization functions
Pages.init = {
    async dashboard() {
        await loadDashboardStats();
    },
    async import() {
        initImportPage();
    },
    async prospects() {
        await loadProspectsTable();
    },
    async lists() {
        await initListsPage();
    },
    async listDetail() {
        await initListDetailPage();
    },
    async generate() {
        await initGeneratePage();
    },
    async export() {
        await initExportPage();
    },
    async campaigns() {
        await loadCampaigns();
    },
    async templates() {
        await initTemplatesPage();
    },
    async templateEditor() {
        await initTemplateEditor();
    },
    settings() {
        initSettingsPage();
    },
    async analyze() {
        await initAnalyzePage();
    },
    async messages() {
        await initMessagesPage();
    },
    async prospectDetail() {
        await initProspectDetailPage();
    }
};

// ===========================================
// Page Functions
// ===========================================

async function loadDashboardStats() {
    try {
        const [prospectsRes, messagesRes, campaignsRes] = await Promise.all([
            API.getProspects(),
            API.getMessages(),
            API.getCampaigns()
        ]);
        document.getElementById('stat-prospects').textContent = prospectsRes.data?.length || 0;

        // Only count ready messages (not errors)
        const readyMessages = (messagesRes.data || []).filter(m => m.status === 'ready' || m.status === 'sent' || m.status === 'replied');
        document.getElementById('stat-messages').textContent = readyMessages.length;

        // Count active campaigns
        const activeCampaigns = (campaignsRes.data || []).filter(c => c.status === 'active').length;
        document.getElementById('stat-campaigns').textContent = activeCampaigns;
    } catch (e) {
        console.error(e);
    }
}

function initImportPage() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    let selectedFile = null;

    ['dragenter', 'dragover'].forEach(e => {
        dropZone.addEventListener(e, (ev) => { ev.preventDefault(); dropZone.classList.add('drag-over'); });
    });
    ['dragleave', 'drop'].forEach(e => {
        dropZone.addEventListener(e, (ev) => { ev.preventDefault(); dropZone.classList.remove('drag-over'); });
    });

    dropZone.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));
    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

    async function handleFile(file) {
        if (!file || !file.name.endsWith('.csv')) {
            showToast('Veuillez sélectionner un fichier CSV', 'error');
            return;
        }
        selectedFile = file;
        document.getElementById('file-info').classList.remove('hidden');
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-size').textContent = `${(file.size / 1024).toFixed(1)} KB`;

        try {
            const result = await API.uploadCSV(file, true);
            if (result.success) {
                showPreview(result.data);
            }
        } catch (e) {
            showToast(e.message, 'error');
        }
    }

    function showPreview(data) {
        document.getElementById('preview-section').classList.remove('hidden');
        document.getElementById('import-actions').classList.remove('hidden');
        document.getElementById('preview-count').textContent = data.length + ' détectés';
        document.getElementById('import-count').textContent = data.length;

        // Determine which columns to show (prioritize important ones)
        const priorityColumns = ['entreprise', 'nom', 'prenom', 'email', 'telephone', 'adresse', 'poste', 'siteWeb', 'rating'];
        const availableColumns = [];

        if (data.length > 0) {
            for (const col of priorityColumns) {
                if (data.some(d => d[col] && d[col].trim())) {
                    availableColumns.push(col);
                }
            }
        }

        // Show max 5 columns in preview
        const displayColumns = availableColumns.slice(0, 5);

        const columnLabels = {
            entreprise: 'Entreprise',
            nom: 'Nom',
            prenom: 'Prénom',
            email: 'Email',
            telephone: 'Téléphone',
            adresse: 'Adresse',
            poste: 'Poste/Type',
            siteWeb: 'Site Web',
            rating: 'Note'
        };

        const thead = document.getElementById('preview-head');
        thead.innerHTML = `<tr>${displayColumns.map(col =>
            `<th class="px-4 py-3 font-semibold text-gray-700">${columnLabels[col] || col}</th>`
        ).join('')}</tr>`;

        const tbody = document.getElementById('preview-body');
        tbody.innerHTML = data.slice(0, 10).map(p => `
            <tr class="hover:bg-gray-50">
                ${displayColumns.map(col =>
            `<td class="px-4 py-3 text-gray-600 max-w-xs truncate">${p[col] || '-'}</td>`
        ).join('')}
            </tr>
        `).join('');
    }

    document.getElementById('remove-file')?.addEventListener('click', () => {
        selectedFile = null;
        document.getElementById('file-info').classList.add('hidden');
        document.getElementById('preview-section').classList.add('hidden');
        document.getElementById('import-actions').classList.add('hidden');
        fileInput.value = '';
    });

    document.getElementById('cancel-import')?.addEventListener('click', () => {
        window.location.hash = '#/prospects';
    });

    document.getElementById('confirm-import')?.addEventListener('click', async () => {
        if (!selectedFile) return;
        try {
            showLoading(true);
            const result = await API.uploadCSV(selectedFile, false);
            showLoading(false);
            if (result.success) {
                showToast(`${result.imported} prospects importés avec succès`, 'success');
                window.location.hash = '#/prospects';
            }
        } catch (e) {
            showLoading(false);
            showToast(e.message, 'error');
        }
    });
}

async function loadProspectsTable() {
    try {
        const result = await API.getProspects();
        AppState.prospects = result.data || [];
        renderProspects();
    } catch (e) {
        console.error(e);
    }
}

function renderProspects() {
    const tbody = document.getElementById('prospects-body');
    const empty = document.getElementById('empty-prospects');

    if (!AppState.prospects.length) {
        tbody.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    // Get display name - use entreprise if no nom/prenom (for Google Maps data)
    const getDisplayName = (p) => {
        const fullName = `${p.prenom || ''} ${p.nom || ''}`.trim();
        return fullName || p.entreprise || 'Sans nom';
    };

    const getInitials = (p) => {
        const name = getDisplayName(p);
        return name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
    };

    tbody.innerHTML = AppState.prospects.map((p, index) => `
        <tr class="group table-row-animate stagger-item cursor-pointer hover:bg-blue-50/30" style="animation-delay: ${Math.min(index * 0.03, 0.3)}s;" onclick="window.location.hash='#/prospects/${p.id}'">
            <td class="p-4" onclick="event.stopPropagation()"><input type="checkbox" data-id="${p.id}" class="prospect-check rounded border-gray-300 text-primary focus:ring-primary/20 checkbox-animate"/></td>
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                        ${getInitials(p)}
                    </div>
                    <div class="flex flex-col">
                        <span class="font-medium text-text-main">${getDisplayName(p)}</span>
                        ${p.rating ? `<span class="text-xs text-yellow-600">⭐ ${p.rating}</span>` : ''}
                    </div>
                </div>
            </td>
            <td class="p-4 text-gray-600 text-sm">${p.email || '-'}</td>
            <td class="p-4 text-sm font-medium text-text-main max-w-xs truncate">${p.entreprise || '-'}</td>
            <td class="p-4 text-gray-600 text-sm max-w-xs truncate">${p.poste || '-'}</td>
            <td class="p-4 text-gray-500 text-sm">${p.telephone || '-'}</td>
            <td class="p-4 text-right" onclick="event.stopPropagation()">
                <button onclick="deleteProspect('${p.id}')" class="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all icon-hover">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
            </td>
        </tr>
    `).join('');
}

async function deleteProspect(id) {
    if (!confirm('Supprimer ce prospect ?')) return;
    try {
        await API.deleteProspect(id);
        AppState.prospects = AppState.prospects.filter(p => p.id !== id);
        renderProspects();
        showToast('Prospect supprimé', 'success');
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ===========================================
// Prospect Detail Page
// ===========================================
async function initProspectDetailPage() {
    const hash = window.location.hash.slice(1);
    const prospectId = hash.replace('/prospects/', '');

    // Find prospect from state or fetch it
    let prospect = AppState.prospects.find(p => p.id === prospectId);
    if (!prospect) {
        try {
            const result = await API.getProspects();
            AppState.prospects = result.data || [];
            prospect = AppState.prospects.find(p => p.id === prospectId);
        } catch (e) {
            showToast('Erreur lors du chargement', 'error');
            window.location.hash = '#/prospects';
            return;
        }
    }

    if (!prospect) {
        showToast('Prospect introuvable', 'error');
        window.location.hash = '#/prospects';
        return;
    }

    // Helper functions
    const getDisplayName = (p) => {
        const fullName = `${p.prenom || ''} ${p.nom || ''}`.trim();
        return fullName || p.entreprise || 'Sans nom';
    };

    const getInitials = (p) => {
        const name = getDisplayName(p);
        return name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
    };

    // Populate UI elements
    document.getElementById('prospect-avatar').textContent = getInitials(prospect);
    document.getElementById('prospect-name').textContent = getDisplayName(prospect);
    document.getElementById('prospect-title').textContent = prospect.poste || '-';
    document.getElementById('prospect-company-link').textContent = prospect.entreprise || '-';

    // Contact info
    document.getElementById('prospect-email').textContent = prospect.email || '-';
    document.getElementById('prospect-phone').textContent = prospect.telephone || '-';
    document.getElementById('prospect-address').textContent = prospect.adresse || '-';
    document.getElementById('prospect-company').textContent = prospect.entreprise || '-';
    document.getElementById('prospect-role').textContent = prospect.poste || '-';

    // Website
    const websiteEl = document.getElementById('prospect-website');
    if (prospect.siteWeb) {
        websiteEl.textContent = prospect.siteWeb.replace(/^https?:\/\//, '').replace(/\/$/, '');
        websiteEl.href = prospect.siteWeb.startsWith('http') ? prospect.siteWeb : `https://${prospect.siteWeb}`;
    }

    // Action buttons
    const emailBtn = document.getElementById('prospect-email-btn');
    if (prospect.email) emailBtn.href = `mailto:${prospect.email}`;
    else emailBtn.style.opacity = '0.5';

    const phoneBtn = document.getElementById('prospect-phone-btn');
    if (prospect.telephone) phoneBtn.href = `tel:${prospect.telephone}`;
    else phoneBtn.style.opacity = '0.5';

    const webBtn = document.getElementById('prospect-web-btn');
    if (prospect.siteWeb) webBtn.href = prospect.siteWeb.startsWith('http') ? prospect.siteWeb : `https://${prospect.siteWeb}`;
    else webBtn.style.opacity = '0.5';

    // Status badge
    const statusBadge = document.getElementById('prospect-status-badge');
    const statusConfig = {
        'new': { text: 'Nouveau', class: 'bg-blue-50 text-blue-700 border-blue-200' },
        'contacted': { text: 'Contacté', class: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
        'interested': { text: 'Intéressé', class: 'bg-green-50 text-green-700 border-green-200' },
        'not_interested': { text: 'Pas intéressé', class: 'bg-gray-50 text-gray-600 border-gray-200' }
    };
    const status = statusConfig[prospect.status] || statusConfig['new'];
    statusBadge.textContent = status.text;
    statusBadge.className = `px-3 py-1 text-xs font-medium rounded-full border ${status.class}`;

    // Rating (for Google Maps data)
    if (prospect.rating) {
        const ratingSection = document.getElementById('prospect-rating-section');
        ratingSection.classList.remove('hidden');
        document.getElementById('prospect-rating').textContent = prospect.rating;
        document.getElementById('prospect-reviews').textContent = prospect.nombreAvis ? `(${prospect.nombreAvis})` : '';
    }

    // Google Maps link
    if (prospect.googleMapsLink) {
        const mapsSection = document.getElementById('google-maps-section');
        mapsSection.classList.remove('hidden');
        document.getElementById('google-maps-link').href = prospect.googleMapsLink;
    }

    // Created date
    if (prospect.createdAt) {
        const date = new Date(prospect.createdAt);
        document.getElementById('prospect-created-date').textContent = date.toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    }

    // === INTEREST SCORE ===
    const interestScore = prospect.interestScore || 0;
    const scoreSlider = document.getElementById('interest-score-slider');
    const scoreDisplay = document.getElementById('interest-score-display');
    const scoreValue = document.getElementById('stat-interest-value');
    const scoreIndicator = document.getElementById('stat-interest-indicator');

    // Update score display function
    const updateScoreDisplay = (score) => {
        scoreDisplay.textContent = score;
        scoreValue.textContent = score;

        // Color coding based on score
        let colorClass, indicator;
        if (score < 33) {
            colorClass = 'from-blue-400 to-blue-600';
            indicator = '❄️';
        } else if (score < 66) {
            colorClass = 'from-yellow-400 to-orange-500';
            indicator = '🔥';
        } else {
            colorClass = 'from-red-500 to-rose-600';
            indicator = '🔥🔥';
        }
        scoreDisplay.className = `w-16 h-16 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white text-xl font-bold shadow-lg`;
        scoreIndicator.textContent = indicator;
    };

    // Initialize score
    scoreSlider.value = interestScore;
    updateScoreDisplay(interestScore);

    // Slider change handler
    scoreSlider.addEventListener('input', (e) => {
        updateScoreDisplay(parseInt(e.target.value));
    });

    // Save score button
    document.getElementById('save-score-btn').addEventListener('click', async () => {
        const newScore = parseInt(scoreSlider.value);
        try {
            await API.request(`/api/prospects/${prospectId}/score`, {
                method: 'PUT',
                body: JSON.stringify({ interestScore: newScore })
            });
            showToast('Score d\'intérêt enregistré', 'success');
        } catch (e) {
            showToast(e.message, 'error');
        }
    });

    // === SOCIAL CONTACT BUTTONS ===
    const linkedinBtn = document.getElementById('prospect-linkedin-btn');
    const whatsappBtn = document.getElementById('prospect-whatsapp-btn');
    const twitterBtn = document.getElementById('prospect-twitter-btn');

    // LinkedIn - search by name and company
    if (prospect.linkedin) {
        linkedinBtn.href = prospect.linkedin.startsWith('http') ? prospect.linkedin : `https://linkedin.com/in/${prospect.linkedin}`;
    } else {
        const searchQuery = encodeURIComponent(`${getDisplayName(prospect)} ${prospect.entreprise || ''}`);
        linkedinBtn.href = `https://www.linkedin.com/search/results/all/?keywords=${searchQuery}`;
    }

    // WhatsApp - if phone available
    if (prospect.telephone) {
        const cleanPhone = prospect.telephone.replace(/\D/g, '');
        whatsappBtn.href = `https://wa.me/${cleanPhone}`;
    } else {
        whatsappBtn.style.opacity = '0.4';
        whatsappBtn.style.pointerEvents = 'none';
    }

    // Twitter/X - search by name
    const twitterSearch = encodeURIComponent(getDisplayName(prospect));
    twitterBtn.href = `https://twitter.com/search?q=${twitterSearch}`;

    // Tab functionality
    document.querySelectorAll('.prospect-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.prospect-tab').forEach(t => {
                t.classList.remove('text-primary', 'border-primary');
                t.classList.add('text-text-secondary', 'border-transparent');
            });
            tab.classList.add('text-primary', 'border-primary');
            tab.classList.remove('text-text-secondary', 'border-transparent');

            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden');
        });
    });

    // Delete button
    document.getElementById('delete-prospect-btn').addEventListener('click', async () => {
        if (!confirm('Supprimer ce prospect ?')) return;
        try {
            await API.deleteProspect(prospectId);
            showToast('Prospect supprimé', 'success');
            window.location.hash = '#/prospects';
        } catch (e) {
            showToast(e.message, 'error');
        }
    });
}

// ===========================================
// Company Analysis Page
// ===========================================

let currentAnalysisReport = null;
let savedReports = [];

async function initAnalyzePage() {
    // Load prospects to populate company dropdown
    const result = await API.getProspects();
    AppState.prospects = result.data || [];

    // Get unique companies from prospects
    const companies = [...new Set(AppState.prospects.map(p => p.entreprise).filter(Boolean))].sort();

    const companySelect = document.getElementById('analyze-company-select');
    companySelect.innerHTML = '<option value="">Choisir une entreprise...</option>' +
        companies.map(c => `<option value="${c}">${c}</option>`).join('');

    // Sync select with input
    companySelect.addEventListener('change', (e) => {
        const company = e.target.value;
        document.getElementById('analyze-company-input').value = company;

        // Try to find website from prospects
        const prospect = AppState.prospects.find(p => p.entreprise === company);
        if (prospect?.siteWeb) {
            document.getElementById('analyze-website-input').value = prospect.siteWeb;
        }
    });

    // Start analysis button
    document.getElementById('start-analysis-btn').addEventListener('click', startCompanyAnalysis);

    // New analysis button
    document.getElementById('new-analysis-btn')?.addEventListener('click', () => {
        document.getElementById('analysis-result').classList.add('hidden');
        document.getElementById('analyze-company-input').value = '';
        document.getElementById('analyze-company-select').value = '';
        document.getElementById('analyze-website-input').value = '';
        document.getElementById('analyze-context').value = '';
        currentAnalysisReport = null;
    });

    // Save report button
    document.getElementById('save-report-btn')?.addEventListener('click', saveCurrentReport);

    // Apply scores button
    document.getElementById('apply-scores-btn')?.addEventListener('click', applyScoresToProspects);

    // Export report button
    document.getElementById('export-report-btn')?.addEventListener('click', exportReportAsPDF);

    // Load saved reports
    loadSavedReports();
}

async function startCompanyAnalysis() {
    const companyName = document.getElementById('analyze-company-input').value.trim() ||
        document.getElementById('analyze-company-select').value;
    const website = document.getElementById('analyze-website-input').value.trim();
    const context = document.getElementById('analyze-context').value.trim();

    if (!companyName) {
        showToast('Veuillez saisir un nom d\'entreprise', 'error');
        return;
    }

    // Show progress
    const progressSection = document.getElementById('analysis-progress');
    const resultSection = document.getElementById('analysis-result');
    const progressBar = document.getElementById('analysis-progress-bar');
    const stepText = document.getElementById('analysis-step');

    progressSection.classList.remove('hidden');
    resultSection.classList.add('hidden');

    const steps = [
        { text: 'Collecte des informations...', progress: 20 },
        { text: 'Analyse du secteur d\'activité...', progress: 40 },
        { text: 'Identification des opportunités...', progress: 60 },
        { text: 'Calcul du score d\'intérêt...', progress: 80 },
        { text: 'Génération du rapport...', progress: 95 }
    ];

    // Animate progress
    let stepIndex = 0;
    const progressInterval = setInterval(() => {
        if (stepIndex < steps.length) {
            stepText.textContent = steps[stepIndex].text;
            progressBar.style.width = steps[stepIndex].progress + '%';
            stepIndex++;
        }
    }, 1500);

    try {
        // Get related prospects
        const relatedProspects = AppState.prospects.filter(p =>
            p.entreprise?.toLowerCase() === companyName.toLowerCase()
        );

        // Build context for LLM
        const prospectInfo = relatedProspects.length > 0
            ? `Prospects connus: ${relatedProspects.map(p => `${p.prenom || ''} ${p.nom || ''} (${p.poste || 'Poste inconnu'})`).join(', ')}`
            : '';

        // Call LLM to generate analysis
        const analysisResult = await API.request('/api/company/analyze', {
            method: 'POST',
            body: JSON.stringify({
                companyName,
                website,
                context,
                prospectInfo
            })
        });

        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        stepText.textContent = 'Analyse terminée!';

        // Store and display result
        currentAnalysisReport = {
            ...analysisResult.data,
            companyName,
            website,
            relatedProspects,
            createdAt: new Date().toISOString()
        };

        setTimeout(() => {
            displayAnalysisResult(currentAnalysisReport);
            progressSection.classList.add('hidden');
        }, 500);

    } catch (error) {
        clearInterval(progressInterval);
        progressSection.classList.add('hidden');
        showToast('Erreur lors de l\'analyse: ' + error.message, 'error');
    }
}

function displayAnalysisResult(report) {
    const resultSection = document.getElementById('analysis-result');
    resultSection.classList.remove('hidden');

    // Header
    document.getElementById('result-company-name').textContent = report.companyName;
    document.getElementById('result-score').textContent = report.interestScore || '-';

    // Sections
    document.getElementById('result-overview').textContent = report.overview || 'Aucune information disponible';
    document.getElementById('result-industry').textContent = report.industryAnalysis || 'Aucune information disponible';
    document.getElementById('result-approach').textContent = report.recommendedApproach || 'Aucune recommandation disponible';

    // Pain points (list)
    const painPoints = report.painPoints || [];
    document.getElementById('result-pain-points').innerHTML = painPoints.length
        ? painPoints.map(p => `<li class="flex items-start gap-2"><span class="material-symbols-outlined text-red-400 text-[16px] mt-0.5">arrow_right</span>${p}</li>`).join('')
        : '<li>Aucun point de douleur identifié</li>';

    // Opportunities (list)
    const opportunities = report.opportunities || [];
    document.getElementById('result-opportunities').innerHTML = opportunities.length
        ? opportunities.map(o => `<li class="flex items-start gap-2"><span class="material-symbols-outlined text-green-500 text-[16px] mt-0.5">arrow_right</span>${o}</li>`).join('')
        : '<li>Aucune opportunité identifiée</li>';

    // Related contacts
    if (report.relatedProspects?.length > 0) {
        const contactsSection = document.getElementById('result-contacts-section');
        contactsSection.classList.remove('hidden');

        document.getElementById('result-contacts').innerHTML = report.relatedProspects.map(p => `
            <a href="#/prospects/${p.id}" class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                    ${(p.prenom?.[0] || '') + (p.nom?.[0] || '')}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-text-main truncate">${p.prenom || ''} ${p.nom || ''}</p>
                    <p class="text-xs text-text-secondary truncate">${p.poste || '-'}</p>
                </div>
            </a>
        `).join('');
    }

    showToast('Analyse terminée!', 'success');
}

function saveCurrentReport() {
    if (!currentAnalysisReport) {
        showToast('Aucun rapport à sauvegarder', 'error');
        return;
    }

    // Save to localStorage
    const reports = JSON.parse(localStorage.getItem('companyReports') || '[]');
    reports.unshift(currentAnalysisReport);
    localStorage.setItem('companyReports', JSON.stringify(reports.slice(0, 20))); // Keep last 20

    loadSavedReports();
    showToast('Rapport sauvegardé!', 'success');
}

function loadSavedReports() {
    savedReports = JSON.parse(localStorage.getItem('companyReports') || '[]');

    const reportsList = document.getElementById('reports-list');
    if (savedReports.length === 0) {
        reportsList.innerHTML = '<p class="text-sm text-text-secondary text-center py-4">Aucun rapport sauvegardé</p>';
        return;
    }

    reportsList.innerHTML = savedReports.map((report, index) => `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer" onclick="viewSavedReport(${index})">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center font-bold">
                    ${report.interestScore || '-'}
                </div>
                <div>
                    <p class="font-medium text-text-main">${report.companyName}</p>
                    <p class="text-xs text-text-secondary">${new Date(report.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
            </div>
            <button onclick="event.stopPropagation(); deleteSavedReport(${index})" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
        </div>
    `).join('');
}

function viewSavedReport(index) {
    const report = savedReports[index];
    if (report) {
        currentAnalysisReport = report;
        displayAnalysisResult(report);
    }
}

function deleteSavedReport(index) {
    if (!confirm('Supprimer ce rapport ?')) return;
    savedReports.splice(index, 1);
    localStorage.setItem('companyReports', JSON.stringify(savedReports));
    loadSavedReports();
    showToast('Rapport supprimé', 'success');
}

async function applyScoresToProspects() {
    if (!currentAnalysisReport?.interestScore || !currentAnalysisReport?.relatedProspects?.length) {
        showToast('Aucun prospect à mettre à jour', 'error');
        return;
    }

    const score = currentAnalysisReport.interestScore;
    const prospectIds = currentAnalysisReport.relatedProspects.map(p => p.id);

    try {
        // Update each prospect's score
        await Promise.all(prospectIds.map(id =>
            API.request(`/api/prospects/${id}/score`, {
                method: 'PUT',
                body: JSON.stringify({ interestScore: score })
            })
        ));

        showToast(`Score ${score} appliqué à ${prospectIds.length} prospect(s)`, 'success');
    } catch (e) {
        showToast('Erreur: ' + e.message, 'error');
    }
}

function exportReportAsPDF() {
    if (!currentAnalysisReport) {
        showToast('Aucun rapport à exporter', 'error');
        return;
    }

    // Create printable content
    const printContent = `
        <html>
        <head>
            <title>Rapport - ${currentAnalysisReport.companyName}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                h1 { color: #3B82F6; border-bottom: 2px solid #3B82F6; padding-bottom: 10px; }
                h2 { color: #374151; margin-top: 30px; }
                .score { font-size: 48px; font-weight: bold; color: #3B82F6; text-align: center; margin: 20px 0; }
                ul { padding-left: 20px; }
                li { margin: 8px 0; }
                .section { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px; }
            </style>
        </head>
        <body>
            <h1>Analyse de ${currentAnalysisReport.companyName}</h1>
            <p>Date: ${new Date(currentAnalysisReport.createdAt).toLocaleDateString('fr-FR')}</p>
            <div class="score">Score: ${currentAnalysisReport.interestScore}/100</div>
            
            <div class="section">
                <h2>Vue d'ensemble</h2>
                <p>${currentAnalysisReport.overview || '-'}</p>
            </div>
            
            <div class="section">
                <h2>Analyse du secteur</h2>
                <p>${currentAnalysisReport.industryAnalysis || '-'}</p>
            </div>
            
            <div class="section">
                <h2>Points de douleur</h2>
                <ul>${(currentAnalysisReport.painPoints || []).map(p => `<li>${p}</li>`).join('')}</ul>
            </div>
            
            <div class="section">
                <h2>Opportunités</h2>
                <ul>${(currentAnalysisReport.opportunities || []).map(o => `<li>${o}</li>`).join('')}</ul>
            </div>
            
            <div class="section">
                <h2>Approche recommandée</h2>
                <p>${currentAnalysisReport.recommendedApproach || '-'}</p>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

// Global functions for onclick
window.viewSavedReport = viewSavedReport;
window.deleteSavedReport = deleteSavedReport;

async function initGeneratePage() {
    const result = await API.getProspects();
    AppState.prospects = result.data || [];

    const list = document.getElementById('gen-prospects-list');
    if (!list) return;

    list.innerHTML = AppState.prospects.map(p => `
        <label class="gen-prospect-item flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
            <input type="checkbox" value="${p.id}" class="gen-prospect-check w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"/>
            <div class="flex-1 min-w-0">
                <span class="font-medium text-text-main">${p.prenom || ''} ${p.nom || ''}</span>
                <span class="text-sm text-gray-500 ml-2 truncate">${p.entreprise || ''}</span>
            </div>
        </label>
    `).join('') || '<p class="p-4 text-center text-gray-500">Aucun prospect. <a href="#/import" class="text-primary">Importer</a></p>';

    // Use event delegation for better performance and to avoid duplicate listeners
    list.onclick = function (e) {
        // Only handle checkbox changes
        if (e.target.classList.contains('gen-prospect-check')) {
            updateSelectedCount();
        }
    };

    const selectAllBtn = document.getElementById('select-all-gen');
    const generateBtn = document.getElementById('generate-btn');
    const countEl = document.getElementById('selected-count');

    // Select all button
    if (selectAllBtn) {
        selectAllBtn.onclick = function () {
            document.querySelectorAll('.gen-prospect-check').forEach(cb => cb.checked = true);
            updateSelectedCount();
        };
    }

    // YouTube import functionality
    let youtubeData = null;
    const youtubeBtn = document.getElementById('youtube-import-btn');
    const youtubeUrlInput = document.getElementById('youtube-url');
    const youtubeResult = document.getElementById('youtube-result');
    const youtubeUseBtn = document.getElementById('youtube-use-btn');

    if (youtubeBtn) {
        youtubeBtn.onclick = async function () {
            const url = youtubeUrlInput?.value?.trim();
            if (!url) {
                showToast('Veuillez entrer une URL YouTube', 'error');
                return;
            }

            youtubeBtn.disabled = true;
            youtubeBtn.innerHTML = '<div class="spinner"></div> Extraction...';

            try {
                const result = await API.request('/api/youtube/transcript', {
                    method: 'POST',
                    body: JSON.stringify({ url })
                });

                if (result.success && result.data) {
                    youtubeData = result.data;

                    // Show result
                    document.getElementById('youtube-thumb').src = `https://img.youtube.com/vi/${result.data.videoId}/mqdefault.jpg`;
                    document.getElementById('youtube-title').textContent = result.data.title || 'Vidéo YouTube';
                    document.getElementById('youtube-channel').textContent = result.data.channelName || '';
                    document.getElementById('youtube-transcript').textContent = result.data.transcript?.substring(0, 300) + '...' || '';
                    youtubeResult?.classList.remove('hidden');

                    showToast(result.data.message || 'Contenu extrait!', 'success');
                } else {
                    showToast(result.error || 'Erreur d\'extraction', 'error');
                }
            } catch (e) {
                showToast('Erreur: ' + e.message, 'error');
            } finally {
                youtubeBtn.disabled = false;
                youtubeBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">download</span> Extraire';
            }
        };
    }

    // Use YouTube content as instructions
    if (youtubeUseBtn) {
        youtubeUseBtn.onclick = function () {
            if (youtubeData?.transcript) {
                const instructions = document.getElementById('gen-instructions');
                if (instructions) {
                    instructions.value = `Inspire-toi de ce contenu pour créer un message de prospection:\n\n${youtubeData.transcript.substring(0, 1000)}`;
                    showToast('Contenu YouTube ajouté aux instructions!', 'success');
                }
            }
        };
    }

    // Generate button
    if (generateBtn) {
        generateBtn.onclick = async function () {
            const checkboxes = document.querySelectorAll('.gen-prospect-check:checked');
            const selectedIds = Array.from(checkboxes).map(cb => cb.value);

            console.log('Generating for:', selectedIds.length, 'prospects');

            if (selectedIds.length === 0) {
                showToast('Veuillez sélectionner au moins un prospect', 'error');
                return;
            }

            generateBtn.disabled = true;
            generateBtn.innerHTML = '<div class="spinner"></div> Génération...';

            try {
                const result = await API.generateMessages({
                    prospectIds: selectedIds,
                    tone: document.getElementById('gen-tone')?.value || 'professionnel',
                    length: document.getElementById('gen-length')?.value || 'moyen',
                    instructions: document.getElementById('gen-instructions')?.value || ''
                });

                if (result.success) {
                    showGenerationResults(result.data);
                    showToast(`${result.data.length} message(s) généré(s)`, 'success');

                    // Uncheck all after generation
                    document.querySelectorAll('.gen-prospect-check').forEach(cb => cb.checked = false);
                    updateSelectedCount();
                }
            } catch (e) {
                console.error('Generation error:', e);
                showToast(e.message, 'error');
            } finally {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">auto_awesome</span> Générer les messages';
            }
        };
    }

    // Initial state
    updateSelectedCount();

    function updateSelectedCount() {
        const count = document.querySelectorAll('.gen-prospect-check:checked').length;
        if (countEl) countEl.textContent = count;
        if (generateBtn) generateBtn.disabled = count === 0;
    }
}

function showGenerationResults(messages) {
    const container = document.getElementById('gen-results');
    const list = document.getElementById('gen-results-list');
    if (!container || !list) return;

    container.classList.remove('hidden');

    list.innerHTML = messages.map(m => `
        <div class="bg-surface-light rounded-xl p-5 border border-gray-200">
            <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                    ${(m.prospect.prenom?.[0] || '') + (m.prospect.nom?.[0] || '')}
                </div>
                <div>
                    <p class="font-semibold text-text-main">${m.prospect.prenom || ''} ${m.prospect.nom || ''}</p>
                    <p class="text-xs text-gray-500">${m.prospect.entreprise || ''}</p>
                </div>
                <span class="ml-auto px-2 py-1 rounded-full text-xs font-medium ${m.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                    ${m.status === 'ready' ? 'Prêt' : 'Erreur'}
                </span>
            </div>
            <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">${m.message || m.error || '-'}</p>
        </div>
    `).join('');
}

// ===========================================
// Messages Page
// ===========================================

let messagesFilter = 'all';
let messagesSearch = '';

async function initMessagesPage() {
    // Load messages and prospects
    const [messagesRes, prospectsRes] = await Promise.all([
        API.getMessages(),
        API.getProspects()
    ]);

    AppState.messages = messagesRes.data || [];
    AppState.prospects = prospectsRes.data || [];

    // Update stats
    updateMessageStats();

    // Render messages
    renderMessages();

    // Search handler
    document.getElementById('message-search')?.addEventListener('input', (e) => {
        messagesSearch = e.target.value.toLowerCase();
        renderMessages();
    });

    // Filter handlers
    document.querySelectorAll('.message-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            messagesFilter = btn.dataset.filter;
            // Update UI
            document.querySelectorAll('.message-filter-btn').forEach(b => {
                if (b.dataset.filter === messagesFilter) {
                    b.className = 'message-filter-btn shrink-0 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium transition-colors btn-press';
                } else {
                    b.className = 'message-filter-btn shrink-0 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors btn-press';
                }
            });
            renderMessages();
        });
    });

    // Clear all messages handler
    document.getElementById('clear-all-messages-btn')?.addEventListener('click', async () => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer TOUS les messages générés? Cette action est irréversible.')) return;

        try {
            await API.request('/api/messages/clear', { method: 'DELETE' });
            AppState.messages = [];
            updateMessageStats();
            renderMessages();
            showToast('Tous les messages ont été supprimés', 'success');
        } catch (e) {
            showToast('Erreur: ' + e.message, 'error');
        }
    });
}

function updateMessageStats() {
    const messages = AppState.messages || [];
    const total = messages.length;
    const pending = messages.filter(m => m.status === 'ready').length;
    const sent = messages.filter(m => m.status === 'sent').length;
    const replied = messages.filter(m => m.status === 'replied').length;

    document.getElementById('stat-total-messages').textContent = total;
    document.getElementById('stat-pending-messages').textContent = pending;
    document.getElementById('stat-sent-messages').textContent = sent;
    document.getElementById('stat-replied-messages').textContent = replied;
}

function renderMessages() {
    const list = document.getElementById('messages-list');
    const noMessages = document.getElementById('no-messages');

    // Filter and search
    let filtered = AppState.messages || [];

    if (messagesFilter !== 'all') {
        filtered = filtered.filter(m => m.status === messagesFilter);
    }

    if (messagesSearch) {
        filtered = filtered.filter(m => {
            const prospect = AppState.prospects.find(p => p.id === m.prospectId) || m.prospect || {};
            const searchText = `${prospect.prenom || ''} ${prospect.nom || ''} ${prospect.entreprise || ''} ${m.message || ''}`.toLowerCase();
            return searchText.includes(messagesSearch);
        });
    }

    if (filtered.length === 0) {
        list.innerHTML = '';
        noMessages.classList.remove('hidden');
        return;
    }

    noMessages.classList.add('hidden');

    list.innerHTML = filtered.map(m => {
        const prospect = AppState.prospects.find(p => p.id === m.prospectId) || m.prospect || {};
        const name = `${prospect.prenom || ''} ${prospect.nom || ''}`.trim() || prospect.entreprise || 'Inconnu';
        const initials = name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();

        const statusConfig = {
            'ready': { label: 'Prêt', class: 'bg-amber-100 text-amber-700' },
            'sent': { label: 'Envoyé', class: 'bg-green-100 text-green-700' },
            'replied': { label: 'Répondu', class: 'bg-blue-100 text-blue-700' },
            'error': { label: 'Erreur', class: 'bg-red-100 text-red-700' }
        };
        const status = statusConfig[m.status] || statusConfig['ready'];

        const date = m.createdAt ? new Date(m.createdAt).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'short'
        }) : '-';

        return `
            <div class="p-4 hover:bg-gray-50 transition-colors group">
                <div class="flex items-start gap-4">
                    <a href="#/prospects/${prospect.id || m.prospectId}" class="shrink-0">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                            ${initials}
                        </div>
                    </a>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-3 mb-1">
                            <a href="#/prospects/${prospect.id || m.prospectId}" class="font-semibold text-text-main hover:text-primary transition-colors">
                                ${name}
                            </a>
                            <span class="text-sm text-gray-400">${prospect.entreprise || ''}</span>
                            <span class="px-2 py-0.5 rounded-full text-xs font-medium ${status.class}">${status.label}</span>
                            <span class="text-xs text-gray-400 ml-auto">${date}</span>
                        </div>
                        <p class="text-sm text-gray-600 line-clamp-2">${m.message || m.error || '-'}</p>
                        <div class="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="copyMessage('${m.id}')" class="text-xs text-gray-500 hover:text-primary flex items-center gap-1 btn-press">
                                <span class="material-symbols-outlined text-[14px]">content_copy</span>
                                Copier
                            </button>
                            <button onclick="markMessageSent('${m.id}')" class="text-xs text-gray-500 hover:text-green-600 flex items-center gap-1 btn-press ${m.status === 'sent' || m.status === 'replied' ? 'hidden' : ''}">
                                <span class="material-symbols-outlined text-[14px]">check</span>
                                Marquer envoyé
                            </button>
                            <button onclick="markMessageReplied('${m.id}')" class="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 btn-press ${m.status === 'replied' ? 'hidden' : ''}">
                                <span class="material-symbols-outlined text-[14px]">reply</span>
                                A répondu
                            </button>
                            <button onclick="deleteMessage('${m.id}')" class="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 btn-press ml-auto">
                                <span class="material-symbols-outlined text-[14px]">delete</span>
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function copyMessage(id) {
    const message = AppState.messages.find(m => m.id === id);
    if (message?.message) {
        await navigator.clipboard.writeText(message.message);
        showToast('Message copié!', 'success');
    }
}

async function markMessageSent(id) {
    try {
        await API.updateMessage(id, { status: 'sent' });
        const message = AppState.messages.find(m => m.id === id);
        if (message) message.status = 'sent';
        updateMessageStats();
        renderMessages();
        showToast('Message marqué comme envoyé', 'success');
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function markMessageReplied(id) {
    try {
        await API.updateMessage(id, { status: 'replied' });
        const message = AppState.messages.find(m => m.id === id);
        if (message) message.status = 'replied';
        updateMessageStats();
        renderMessages();
        showToast('Réponse enregistrée', 'success');
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function deleteMessage(id) {
    if (!confirm('Supprimer ce message ?')) return;
    try {
        await API.request(`/api/messages/${id}`, { method: 'DELETE' });
        AppState.messages = AppState.messages.filter(m => m.id !== id);
        updateMessageStats();
        renderMessages();
        showToast('Message supprimé', 'success');
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// Global functions
window.copyMessage = copyMessage;
window.markMessageSent = markMessageSent;
window.markMessageReplied = markMessageReplied;
window.deleteMessage = deleteMessage;

async function initExportPage() {
    const result = await API.getProspects();
    document.getElementById('export-count').textContent = result.data?.length || 0;

    document.getElementById('export-btn')?.addEventListener('click', async () => {
        try {
            showLoading(true);
            const blob = await API.exportExcel({
                includeMessages: document.getElementById('export-messages').checked
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `prospects_${new Date().toISOString().split('T')[0]}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            showLoading(false);
            showToast('Export réussi!', 'success');
        } catch (e) {
            showLoading(false);
            showToast(e.message, 'error');
        }
    });
}

async function loadCampaigns() {
    // Campaign state
    let campaignsData = [];
    let filteredCampaigns = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let currentPage = 1;
    const pageSize = 10;
    let editingCampaignId = null;
    let selectedProspectIds = new Set();

    try {
        // Load campaigns and prospects
        const [campaignsResult, prospectsResult] = await Promise.all([
            API.getCampaigns(),
            API.getProspects()
        ]);

        campaignsData = campaignsResult.data || [];
        AppState.prospects = prospectsResult.data || [];
        AppState.campaigns = campaignsData;

        updateOverviewStats();
        filterAndRender();
        initEventListeners();

    } catch (e) {
        console.error('Error loading campaigns:', e);
        showToast('Erreur de chargement des campagnes', 'error');
    }

    function updateOverviewStats() {
        const activeCampaigns = campaignsData.filter(c => c.status === 'active').length;
        const draftCampaigns = campaignsData.filter(c => c.status === 'draft').length;
        const completedCampaigns = campaignsData.filter(c => c.status === 'completed').length;
        const totalTargets = campaignsData.reduce((sum, c) => sum + (c.stats?.totalTargets || 0), 0);

        const activeEl = document.getElementById('stat-campaigns-active');
        const draftEl = document.getElementById('stat-campaigns-draft');
        const completedEl = document.getElementById('stat-campaigns-completed');
        const targetsEl = document.getElementById('stat-campaigns-targets');

        if (activeEl) activeEl.textContent = activeCampaigns;
        if (draftEl) draftEl.textContent = draftCampaigns;
        if (completedEl) completedEl.textContent = completedCampaigns;
        if (targetsEl) targetsEl.textContent = totalTargets.toLocaleString('fr-FR');
    }

    function filterAndRender() {
        // Apply filter
        filteredCampaigns = campaignsData.filter(c => {
            if (currentFilter === 'all') return true;
            return c.status === currentFilter;
        });

        // Apply search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filteredCampaigns = filteredCampaigns.filter(c =>
                c.name?.toLowerCase().includes(q) ||
                c.objective?.toLowerCase().includes(q)
            );
        }

        renderCampaignsTable();
    }

    function renderCampaignsTable() {
        const tbody = document.getElementById('campaigns-tbody');
        const empty = document.getElementById('empty-campaigns');
        const tableContainer = document.getElementById('campaigns-table-container');
        const countLabel = document.getElementById('campaigns-count-label');

        if (!filteredCampaigns.length) {
            tableContainer.classList.add('hidden');
            empty.classList.remove('hidden');
            return;
        }

        tableContainer.classList.remove('hidden');
        empty.classList.add('hidden');

        // Pagination
        const totalPages = Math.ceil(filteredCampaigns.length / pageSize);
        const startIdx = (currentPage - 1) * pageSize;
        const endIdx = startIdx + pageSize;
        const paginatedCampaigns = filteredCampaigns.slice(startIdx, endIdx);

        countLabel.textContent = `${startIdx + 1}-${Math.min(endIdx, filteredCampaigns.length)} sur ${filteredCampaigns.length}`;

        // Pagination buttons
        document.getElementById('campaigns-prev-btn').disabled = currentPage <= 1;
        document.getElementById('campaigns-next-btn').disabled = currentPage >= totalPages;

        const objectiveIcons = {
            'rendez-vous': 'calendar_month',
            'inscription': 'rocket_launch',
            'partenariat': 'handshake'
        };

        tbody.innerHTML = paginatedCampaigns.map((c, idx) => {
            const statusBadge = getStatusBadge(c.status);
            const icon = objectiveIcons[c.objective] || 'campaign';
            const progress = c.progress || 0;
            const totalTargets = c.stats?.totalTargets || 0;
            const createdDate = c.createdAt ? new Date(c.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
            const isCompleted = c.status === 'completed';

            return `
                <tr class="group hover:bg-gray-50 transition-colors table-row-animate stagger-item" data-campaign-id="${c.id}">
                    <td class="pl-6 pr-4 py-3.5">
                        <div class="flex items-center gap-3 ${isCompleted ? 'opacity-60 group-hover:opacity-100 transition-opacity' : ''}">
                            <div class="size-9 rounded-full bg-blue-50 text-primary flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-[18px]">${icon}</span>
                            </div>
                            <div class="flex flex-col min-w-0">
                                <span class="text-[13px] font-semibold text-text-main truncate">${c.name || 'Sans nom'}</span>
                                <span class="text-[11px] text-gray-500 truncate">${c.createdBy || 'Utilisateur'}</span>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-3.5">
                        ${statusBadge}
                    </td>
                    <td class="px-4 py-3.5">
                        ${totalTargets > 0 ? `
                            <div class="flex flex-col gap-1.5 max-w-full ${isCompleted ? 'opacity-60 group-hover:opacity-100 transition-opacity' : ''}">
                                <div class="flex justify-between items-end gap-2">
                                    <span class="text-[11px] font-medium text-text-main whitespace-nowrap">${totalTargets.toLocaleString('fr-FR')} cibles</span>
                                    <span class="text-[10px] text-gray-500">${progress}%</span>
                                </div>
                                <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div class="h-full ${isCompleted ? 'bg-blue-400' : 'bg-primary'} rounded-full transition-all" style="width: ${progress}%"></div>
                                </div>
                            </div>
                        ` : '<span class="text-[13px] text-gray-400">–</span>'}
                    </td>
                    <td class="px-4 py-3.5 hidden md:table-cell">
                        <span class="text-[13px] text-gray-500">${createdDate}</span>
                    </td>
                    <td class="px-4 py-3.5 text-right">
                        <button class="campaign-action-btn text-gray-400 hover:text-text-main transition-colors p-1.5 rounded-lg hover:bg-gray-100" data-campaign-id="${c.id}">
                            <span class="material-symbols-outlined text-[20px]">more_horiz</span>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach action button listeners
        document.querySelectorAll('.campaign-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                showActionDropdown(btn, btn.dataset.campaignId);
            });
        });
    }

    function getStatusBadge(status) {
        const badges = {
            'active': `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700">
                <span class="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active
            </span>`,
            'draft': `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600">
                Brouillon
            </span>`,
            'paused': `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-orange-50 text-orange-600">
                <span class="size-1.5 rounded-full bg-orange-500"></span>
                En pause
            </span>`,
            'completed': `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-600">
                Terminée
            </span>`
        };
        return badges[status] || badges['draft'];
    }

    function showActionDropdown(button, campaignId) {
        const dropdown = document.getElementById('campaign-actions-dropdown');
        const campaign = campaignsData.find(c => c.id === campaignId);

        if (!campaign) return;

        // Position dropdown with smart viewport awareness
        const rect = button.getBoundingClientRect();
        const dropdownWidth = 192; // w-48 = 12rem = 192px
        const dropdownHeight = 280; // approximate height of dropdown
        const padding = 8;

        // Calculate horizontal position - prefer to the left of button, but stay in viewport
        let left = rect.right - dropdownWidth;
        if (left < padding) {
            left = padding;
        }
        if (left + dropdownWidth > window.innerWidth - padding) {
            left = window.innerWidth - dropdownWidth - padding;
        }

        // Calculate vertical position - open below if enough space, otherwise above
        let top;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        if (spaceBelow >= dropdownHeight + padding || spaceBelow >= spaceAbove) {
            // Open below the button
            top = rect.bottom + 4;
        } else {
            // Open above the button
            top = rect.top - dropdownHeight - 4;
        }

        // Ensure top doesn't go negative
        if (top < padding) {
            top = padding;
        }

        dropdown.style.top = `${top}px`;
        dropdown.style.left = `${left}px`;
        dropdown.classList.remove('hidden');
        dropdown.dataset.campaignId = campaignId;

        // Show/hide action buttons based on status
        const launchBtn = dropdown.querySelector('[data-action="launch"]');
        const pauseBtn = dropdown.querySelector('[data-action="pause"]');
        const completeBtn = dropdown.querySelector('[data-action="complete"]');

        launchBtn.classList.toggle('hidden', campaign.status === 'active' || campaign.status === 'completed');
        pauseBtn.classList.toggle('hidden', campaign.status !== 'active');
        completeBtn.classList.toggle('hidden', campaign.status === 'completed');

        // Close on outside click
        const closeDropdown = (e) => {
            if (!dropdown.contains(e.target) && e.target !== button) {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', closeDropdown);
            }
        };
        setTimeout(() => document.addEventListener('click', closeDropdown), 0);
    }

    function initEventListeners() {
        // Filter buttons
        document.querySelectorAll('.campaign-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.campaign-filter-btn').forEach(b => {
                    b.classList.remove('active', 'bg-white', 'shadow-sm', 'text-text-main');
                    b.classList.add('text-gray-500');
                });
                btn.classList.add('active', 'bg-white', 'shadow-sm', 'text-text-main');
                btn.classList.remove('text-gray-500');
                currentFilter = btn.dataset.filter;
                currentPage = 1;
                filterAndRender();
            });
        });

        // Search
        document.getElementById('campaign-search')?.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            currentPage = 1;
            filterAndRender();
        });

        // Pagination
        document.getElementById('campaigns-prev-btn')?.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderCampaignsTable();
            }
        });

        document.getElementById('campaigns-next-btn')?.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredCampaigns.length / pageSize);
            if (currentPage < totalPages) {
                currentPage++;
                renderCampaignsTable();
            }
        });

        // New campaign buttons
        ['new-campaign-btn', 'create-first-campaign-btn'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', () => openCampaignModal());
        });

        // Modal close
        document.getElementById('close-campaign-modal')?.addEventListener('click', closeCampaignModal);
        document.querySelector('#campaign-modal .modal-overlay')?.addEventListener('click', closeCampaignModal);

        // Create campaign
        document.getElementById('create-campaign-btn')?.addEventListener('click', saveCampaign);
        document.getElementById('save-campaign-draft')?.addEventListener('click', () => saveCampaign(true));

        // Select all prospects in modal
        document.getElementById('select-all-campaign-prospects')?.addEventListener('click', () => {
            document.querySelectorAll('.campaign-prospect-check').forEach(cb => cb.checked = true);
            updateAudienceCount();
        });

        // Dropdown actions
        document.getElementById('campaign-actions-dropdown')?.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const campaignId = document.getElementById('campaign-actions-dropdown').dataset.campaignId;
                const action = btn.dataset.action;

                document.getElementById('campaign-actions-dropdown').classList.add('hidden');

                await handleCampaignAction(action, campaignId);
            });
        });
    }

    async function handleCampaignAction(action, campaignId) {
        const campaign = campaignsData.find(c => c.id === campaignId);
        if (!campaign) return;

        try {
            switch (action) {
                case 'view':
                case 'edit':
                    openCampaignModal(campaign);
                    break;

                case 'duplicate':
                    showLoading(true);
                    await API.duplicateCampaign(campaignId);
                    showToast('Campagne dupliquée', 'success');
                    await refreshCampaigns();
                    showLoading(false);
                    break;

                case 'launch':
                    showLoading(true);
                    await API.changeCampaignStatus(campaignId, 'active');
                    showToast('Campagne lancée', 'success');
                    await refreshCampaigns();
                    showLoading(false);
                    break;

                case 'pause':
                    showLoading(true);
                    await API.changeCampaignStatus(campaignId, 'paused');
                    showToast('Campagne mise en pause', 'success');
                    await refreshCampaigns();
                    showLoading(false);
                    break;

                case 'complete':
                    showLoading(true);
                    await API.changeCampaignStatus(campaignId, 'completed');
                    showToast('Campagne marquée terminée', 'success');
                    await refreshCampaigns();
                    showLoading(false);
                    break;

                case 'delete':
                    if (!confirm(`Supprimer la campagne "${campaign.name}" ?`)) return;
                    showLoading(true);
                    await API.deleteCampaign(campaignId);
                    showToast('Campagne supprimée', 'success');
                    await refreshCampaigns();
                    showLoading(false);
                    break;
            }
        } catch (e) {
            showLoading(false);
            showToast(e.message, 'error');
        }
    }

    async function refreshCampaigns() {
        const result = await API.getCampaigns();
        campaignsData = result.data || [];
        AppState.campaigns = campaignsData;
        filterAndRender();
    }

    function openCampaignModal(campaign = null) {
        const modal = document.getElementById('campaign-modal');
        const title = document.getElementById('campaign-modal-title');
        const createBtn = document.getElementById('create-campaign-btn');

        editingCampaignId = campaign?.id || null;
        selectedProspectIds = new Set(campaign?.prospectIds || []);

        title.textContent = campaign ? 'Modifier la campagne' : 'Nouvelle campagne';
        createBtn.querySelector('span:first-child').textContent = campaign ? 'Enregistrer' : 'Créer la campagne';

        // Fill form
        document.getElementById('campaign-name').value = campaign?.name || '';
        document.getElementById('campaign-date-start').value = campaign?.dateStart || '';
        document.getElementById('campaign-date-end').value = campaign?.dateEnd || '';
        document.getElementById('campaign-budget').value = campaign?.budget || '';

        // Set objective
        const objective = campaign?.objective || 'rendez-vous';
        document.querySelector(`input[name="campaign-objective"][value="${objective}"]`).checked = true;

        // Load prospects in modal
        const prospectsList = document.getElementById('campaign-prospects-list');
        prospectsList.innerHTML = AppState.prospects.map(p => {
            const name = `${p.prenom || ''} ${p.nom || ''}`.trim() || p.entreprise || 'Sans nom';
            const isChecked = selectedProspectIds.has(p.id);
            return `
                <label class="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" data-id="${p.id}" class="campaign-prospect-check rounded border-gray-300 text-primary focus:ring-primary/20" ${isChecked ? 'checked' : ''}/>
                    <div class="flex-1 min-w-0">
                        <span class="text-xs font-medium text-text-main truncate block">${name}</span>
                        ${p.entreprise ? `<span class="text-[10px] text-gray-500">${p.entreprise}</span>` : ''}
                    </div>
                </label>
            `;
        }).join('') || '<p class="p-4 text-center text-gray-500 text-xs">Aucun prospect. <a href="#/import" class="text-primary">Importer</a></p>';

        // Attach change listeners
        document.querySelectorAll('.campaign-prospect-check').forEach(cb => {
            cb.addEventListener('change', updateAudienceCount);
        });

        updateAudienceCount();

        // Show modal with animation
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.querySelector('.modal-overlay').classList.add('active');
            modal.querySelector('.modal-content').classList.add('active');
        }, 10);
    }

    function closeCampaignModal() {
        const modal = document.getElementById('campaign-modal');
        modal.querySelector('.modal-overlay').classList.remove('active');
        modal.querySelector('.modal-content').classList.remove('active');
        setTimeout(() => {
            modal.classList.add('hidden');
            editingCampaignId = null;
        }, 300);
    }

    function updateAudienceCount() {
        const count = document.querySelectorAll('.campaign-prospect-check:checked').length;
        document.getElementById('campaign-audience-count').textContent = `${count} prospect${count !== 1 ? 's' : ''} sélectionné${count !== 1 ? 's' : ''}`;
    }

    async function saveCampaign(asDraft = false) {
        const name = document.getElementById('campaign-name').value.trim();
        const objective = document.querySelector('input[name="campaign-objective"]:checked')?.value || 'rendez-vous';
        const dateStart = document.getElementById('campaign-date-start').value;
        const dateEnd = document.getElementById('campaign-date-end').value;
        const budget = parseFloat(document.getElementById('campaign-budget').value) || 0;

        const prospectIds = [];
        document.querySelectorAll('.campaign-prospect-check:checked').forEach(cb => {
            prospectIds.push(cb.dataset.id);
        });

        if (!name) {
            showToast('Veuillez entrer un nom de campagne', 'error');
            return;
        }

        const campaignData = {
            name,
            objective,
            dateStart: dateStart || null,
            dateEnd: dateEnd || null,
            budget,
            prospectIds
        };

        try {
            showLoading(true);

            if (editingCampaignId) {
                await API.updateCampaign(editingCampaignId, campaignData);
                showToast('Campagne mise à jour', 'success');
            } else {
                await API.createCampaign(campaignData);
                showToast(asDraft ? 'Brouillon enregistré' : 'Campagne créée', 'success');
            }

            closeCampaignModal();
            await refreshCampaigns();
            showLoading(false);
        } catch (e) {
            showLoading(false);
            showToast(e.message, 'error');
        }
    }
}

function initSettingsPage() {
    document.getElementById('test-llm-btn')?.addEventListener('click', async () => {
        const resultDiv = document.getElementById('llm-test-result');
        resultDiv.classList.remove('hidden');
        resultDiv.className = 'p-4 rounded-xl text-sm bg-gray-100';
        resultDiv.textContent = 'Test en cours...';

        try {
            const result = await API.testLLM();
            if (result.connected) {
                resultDiv.className = 'p-4 rounded-xl text-sm bg-green-100 text-green-700';
                resultDiv.textContent = '✓ Connexion réussie: ' + result.model;
                updateLLMStatus(true);
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            resultDiv.className = 'p-4 rounded-xl text-sm bg-red-100 text-red-700';
            resultDiv.textContent = '✗ Erreur: ' + e.message;
            updateLLMStatus(false);
        }
    });

    document.getElementById('clear-data-btn')?.addEventListener('click', async () => {
        if (!confirm('Supprimer TOUTES les données ?')) return;
        try {
            await API.clearProspects();
            showToast('Données supprimées', 'success');
        } catch (e) {
            showToast(e.message, 'error');
        }
    });
}

// ===========================================
// Utilities
// ===========================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-gray-800' };
    toast.className = `toast ${colors[type]} text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function showLoading(show) {
    document.getElementById('loading-overlay').classList.toggle('hidden', !show);
}

function updateLLMStatus(connected) {
    const indicator = document.getElementById('llm-indicator');
    const text = document.getElementById('llm-status-text');
    if (connected) {
        indicator.className = 'w-2 h-2 rounded-full bg-green-500';
        text.textContent = 'LLM: Connecté (llama3)';
    } else {
        indicator.className = 'w-2 h-2 rounded-full bg-red-500';
        text.textContent = 'LLM: Déconnecté';
    }
}

// ===========================================
// Initialize App
// ===========================================

document.addEventListener('DOMContentLoaded', async () => {
    Router.init();

    // Check LLM status
    try {
        const result = await API.testLLM();
        updateLLMStatus(result.connected);
    } catch (e) {
        updateLLMStatus(false);
    }
});

// Global functions for onclick handlers
window.deleteProspect = deleteProspect;

// ===========================================
// Templates Management
// ===========================================

let currentTemplateFilter = 'all';
let currentTemplateSearch = '';
let selectedTemplateId = null;

async function initTemplatesPage() {
    await loadTemplates();

    // Search handler
    const searchInput = document.getElementById('template-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentTemplateSearch = e.target.value.toLowerCase();
            renderTemplates();
        });
    }

    // Channel filter handlers
    document.querySelectorAll('.channel-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTemplateFilter = btn.dataset.channel;
            // Update UI
            document.querySelectorAll('.channel-filter').forEach(b => {
                if (b.dataset.channel === currentTemplateFilter) {
                    b.className = 'channel-filter shrink-0 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium shadow-sm transition-all btn-press';
                } else {
                    b.className = 'channel-filter shrink-0 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors btn-press';
                }
            });
            renderTemplates();
        });
    });

    // Import button handler
    const importBtn = document.getElementById('import-template-btn');
    if (importBtn) {
        importBtn.addEventListener('click', showTemplateImportModal);
    }
}

// Template Import Modal
function showTemplateImportModal() {
    // Remove existing modal if present
    const existingModal = document.getElementById('template-import-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'template-import-modal';
    modal.className = 'fixed inset-0 z-50 overflow-y-auto';
    modal.innerHTML = `
        <div class="modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm" onclick="closeTemplateImportModal()"></div>
        <div class="flex min-h-full items-center justify-center p-4">
            <div class="modal-content relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in-scale">
                <!-- Header -->
                <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="p-2 rounded-lg bg-primary/10 text-primary">
                            <span class="material-symbols-outlined text-[20px]">upload_file</span>
                        </div>
                        <div>
                            <h2 class="text-lg font-semibold text-text-main">Importer un template</h2>
                            <span class="text-xs text-gray-500">À partir d'une vidéo YouTube ou d'un document</span>
                        </div>
                    </div>
                    <button onclick="closeTemplateImportModal()" class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                        <span class="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
                
                <!-- Tabs -->
                <div class="flex border-b border-gray-100">
                    <button id="import-tab-youtube" class="import-tab flex-1 py-3 text-sm font-medium text-primary border-b-2 border-primary transition-colors" data-tab="youtube">
                        <span class="material-symbols-outlined text-[18px] align-middle mr-1">play_circle</span>
                        YouTube
                    </button>
                    <button id="import-tab-document" class="import-tab flex-1 py-3 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 transition-colors" data-tab="document">
                        <span class="material-symbols-outlined text-[18px] align-middle mr-1">description</span>
                        Document
                    </button>
                </div>
                
                <!-- Content: YouTube -->
                <div id="import-content-youtube" class="import-content p-6 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-text-main mb-2">Lien YouTube</label>
                        <input id="youtube-url-input" type="url" placeholder="https://www.youtube.com/watch?v=..." class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary text-sm input-animate" />
                    </div>
                    <div class="p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800 flex gap-3">
                        <span class="material-symbols-outlined text-blue-600 text-[20px] shrink-0">info</span>
                        <p>La transcription de la vidéo sera analysée et un template sera généré automatiquement. Assurez-vous que la vidéo a des sous-titres activés.</p>
                    </div>
                </div>
                
                <!-- Content: Document -->
                <div id="import-content-document" class="import-content hidden p-6 space-y-4">
                    <div id="import-drop-zone" class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary hover:bg-blue-50/30 transition-all cursor-pointer">
                        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                            <span class="material-symbols-outlined text-gray-500 text-[24px]">cloud_upload</span>
                        </div>
                        <p class="text-sm font-medium text-text-main">Glissez un fichier ici ou cliquez pour sélectionner</p>
                        <p class="text-xs text-gray-500 mt-1">PDF, Word, TXT (max 5MB)</p>
                        <input type="file" id="import-file-input" class="hidden" accept=".pdf,.doc,.docx,.txt" />
                    </div>
                    <div id="import-file-info" class="hidden p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center gap-3">
                        <span class="material-symbols-outlined text-gray-500 text-[20px]">description</span>
                        <div class="flex-1 min-w-0">
                            <p id="import-file-name" class="text-sm font-medium text-text-main truncate">-</p>
                            <p id="import-file-size" class="text-xs text-gray-500">-</p>
                        </div>
                        <button onclick="clearImportFile()" class="p-1 text-gray-400 hover:text-red-500 transition-colors">
                            <span class="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>
                </div>
                
                <!-- Template Options -->
                <div class="px-6 pb-4 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-text-main mb-2">Nom du template</label>
                        <input id="import-template-name" type="text" placeholder="Ex: Template depuis vidéo..." class="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary text-sm" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-text-main mb-2">Canal</label>
                        <div class="flex gap-2">
                            <label class="flex-1">
                                <input type="radio" name="import-channel" value="email" checked class="peer sr-only" />
                                <div class="py-2 text-center rounded-lg border border-gray-200 text-sm text-gray-600 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary cursor-pointer transition-all">Email</div>
                            </label>
                            <label class="flex-1">
                                <input type="radio" name="import-channel" value="linkedin" class="peer sr-only" />
                                <div class="py-2 text-center rounded-lg border border-gray-200 text-sm text-gray-600 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary cursor-pointer transition-all">LinkedIn</div>
                            </label>
                            <label class="flex-1">
                                <input type="radio" name="import-channel" value="sms" class="peer sr-only" />
                                <div class="py-2 text-center rounded-lg border border-gray-200 text-sm text-gray-600 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary cursor-pointer transition-all">SMS</div>
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button onclick="closeTemplateImportModal()" class="h-10 px-4 rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors">Annuler</button>
                    <button id="import-template-submit" onclick="processTemplateImport()" class="h-10 px-5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium shadow-sm shadow-primary/20 transition-all btn-press flex items-center gap-2">
                        <span class="material-symbols-outlined text-[18px]">auto_awesome</span>
                        Importer
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Animate in
    setTimeout(() => {
        modal.querySelector('.modal-overlay').classList.add('active');
        modal.querySelector('.modal-content').classList.add('active');
    }, 10);

    // Tab switching
    modal.querySelectorAll('.import-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            modal.querySelectorAll('.import-tab').forEach(t => {
                t.classList.remove('text-primary', 'border-primary');
                t.classList.add('text-gray-500', 'border-transparent');
            });
            tab.classList.add('text-primary', 'border-primary');
            tab.classList.remove('text-gray-500', 'border-transparent');

            modal.querySelectorAll('.import-content').forEach(c => c.classList.add('hidden'));
            modal.querySelector(`#import-content-${tab.dataset.tab}`).classList.remove('hidden');
        });
    });

    // File drop zone
    const dropZone = modal.querySelector('#import-drop-zone');
    const fileInput = modal.querySelector('#import-file-input');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-primary', 'bg-blue-50/30');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-primary', 'bg-blue-50/30');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary', 'bg-blue-50/30');
        const files = e.dataTransfer.files;
        if (files.length > 0) handleImportFile(files[0]);
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleImportFile(e.target.files[0]);
    });
}

let importedFile = null;

function handleImportFile(file) {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt)$/i)) {
        showToast('Type de fichier non supporté', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast('Le fichier est trop volumineux (max 5MB)', 'error');
        return;
    }

    importedFile = file;
    document.getElementById('import-file-info').classList.remove('hidden');
    document.getElementById('import-drop-zone').classList.add('hidden');
    document.getElementById('import-file-name').textContent = file.name;
    document.getElementById('import-file-size').textContent = `${(file.size / 1024).toFixed(1)} KB`;

    // Auto-fill template name
    const nameInput = document.getElementById('import-template-name');
    if (!nameInput.value) {
        nameInput.value = file.name.replace(/\.[^/.]+$/, '');
    }
}

function clearImportFile() {
    importedFile = null;
    document.getElementById('import-file-info').classList.add('hidden');
    document.getElementById('import-drop-zone').classList.remove('hidden');
    document.getElementById('import-file-input').value = '';
}

function closeTemplateImportModal() {
    const modal = document.getElementById('template-import-modal');
    if (modal) {
        modal.querySelector('.modal-overlay')?.classList.remove('active');
        modal.querySelector('.modal-content')?.classList.remove('active');
        setTimeout(() => modal.remove(), 200);
    }
    importedFile = null;
}

async function processTemplateImport() {
    const youtubeUrl = document.getElementById('youtube-url-input')?.value.trim();
    const templateName = document.getElementById('import-template-name')?.value.trim();
    const channel = document.querySelector('input[name="import-channel"]:checked')?.value || 'email';

    // Determine which source to use
    const youtubeTab = document.getElementById('import-tab-youtube');
    const isYouTube = youtubeTab?.classList.contains('border-primary');

    if (isYouTube && !youtubeUrl) {
        showToast('Veuillez entrer une URL YouTube', 'error');
        return;
    }

    if (!isYouTube && !importedFile) {
        showToast('Veuillez sélectionner un fichier', 'error');
        return;
    }

    if (!templateName) {
        showToast('Veuillez entrer un nom pour le template', 'error');
        return;
    }

    const submitBtn = document.getElementById('import-template-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner"></div> Importation...';

    try {
        let content = '';

        if (isYouTube) {
            // Call API to extract YouTube transcript
            const result = await API.request('/api/templates/import/youtube', {
                method: 'POST',
                body: JSON.stringify({ url: youtubeUrl })
            });
            content = result.data?.content || result.data?.transcript || '';
        } else {
            // Upload document
            const formData = new FormData();
            formData.append('file', importedFile);
            const response = await fetch('/api/templates/import/document', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Erreur d\'importation');
            content = result.data?.content || '';
        }

        if (!content) {
            throw new Error('Aucun contenu extrait');
        }

        // Create the template
        await API.createTemplate({
            name: templateName,
            content: content,
            channel: channel,
            description: isYouTube ? `Importé depuis YouTube: ${youtubeUrl}` : `Importé depuis: ${importedFile?.name || 'document'}`
        });

        closeTemplateImportModal();
        showToast('Template importé avec succès!', 'success');
        await loadTemplates();

    } catch (e) {
        showToast(e.message || 'Erreur lors de l\'importation', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">auto_awesome</span> Importer';
    }
}

// Global functions
window.closeTemplateImportModal = closeTemplateImportModal;
window.processTemplateImport = processTemplateImport;
window.clearImportFile = clearImportFile;

async function loadTemplates() {
    try {
        const result = await API.getTemplates();
        AppState.templates = result.data || [];
        renderTemplates();
    } catch (e) {
        console.error('Error loading templates:', e);
        showToast('Erreur lors du chargement des templates', 'error');
    }
}

function renderTemplates() {
    const tbody = document.getElementById('templates-body');
    const empty = document.getElementById('empty-templates');
    const pagination = document.getElementById('templates-pagination');

    if (!tbody) return;

    // Filter templates
    let filtered = AppState.templates;

    if (currentTemplateFilter !== 'all') {
        filtered = filtered.filter(t => t.channel === currentTemplateFilter);
    }

    if (currentTemplateSearch) {
        filtered = filtered.filter(t =>
            t.name.toLowerCase().includes(currentTemplateSearch) ||
            t.content.toLowerCase().includes(currentTemplateSearch) ||
            (t.description && t.description.toLowerCase().includes(currentTemplateSearch))
        );
    }

    if (!filtered.length) {
        tbody.innerHTML = '';
        empty.classList.remove('hidden');
        pagination.classList.add('hidden');
        return;
    }

    empty.classList.add('hidden');
    pagination.classList.remove('hidden');
    document.getElementById('templates-count').textContent = `Affichage de ${filtered.length} résultat${filtered.length > 1 ? 's' : ''}`;

    const channelConfig = {
        email: { icon: 'mail', bg: 'bg-blue-100', text: 'text-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-100' },
        linkedin: { icon: 'work', bg: 'bg-sky-100', text: 'text-sky-600', badge: 'bg-sky-50 text-sky-700 border-sky-100' },
        sms: { icon: 'sms', bg: 'bg-purple-100', text: 'text-purple-600', badge: 'bg-purple-50 text-purple-700 border-purple-100' }
    };

    tbody.innerHTML = filtered.map((t, index) => {
        const config = channelConfig[t.channel] || channelConfig.email;
        const date = t.updatedAt ? new Date(t.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

        return `
            <tr class="group hover:bg-blue-50/30 transition-colors cursor-pointer stagger-item" style="animation-delay: ${index * 0.03}s" onclick="window.location.hash='#/templates/edit/${t.id}'">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="p-2 rounded-lg ${config.bg} ${config.text} shrink-0">
                            <span class="material-symbols-outlined" style="font-size: 20px;">${config.icon}</span>
                        </div>
                        <div>
                            <p class="text-sm font-semibold text-text-main">${escapeHtml(t.name)}</p>
                            <p class="text-xs text-gray-500">${escapeHtml(t.description || '')}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <p class="text-sm text-gray-600 line-clamp-1">${escapeHtml(t.content.substring(0, 100))}${t.content.length > 100 ? '...' : ''}</p>
                </td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.badge} border">
                        ${t.channel.charAt(0).toUpperCase() + t.channel.slice(1)}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <p class="text-sm text-gray-500">${date}</p>
                </td>
                <td class="px-6 py-4 text-right" onclick="event.stopPropagation()">
                    <button onclick="openTemplateActions('${t.id}')" class="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100">
                        <span class="material-symbols-outlined" style="font-size: 20px;">more_horiz</span>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function openTemplateActions(id) {
    selectedTemplateId = id;
    document.getElementById('template-actions-modal').classList.remove('hidden');
}

function closeTemplateActionsModal() {
    document.getElementById('template-actions-modal').classList.add('hidden');
    selectedTemplateId = null;
}

function editTemplate() {
    closeTemplateActionsModal();
    if (selectedTemplateId) {
        window.location.hash = `#/templates/edit/${selectedTemplateId}`;
    }
}

async function duplicateTemplate() {
    closeTemplateActionsModal();
    if (!selectedTemplateId) return;

    try {
        showLoading(true);
        await API.duplicateTemplate(selectedTemplateId);
        await loadTemplates();
        showLoading(false);
        showToast('Template dupliqué avec succès', 'success');
    } catch (e) {
        showLoading(false);
        showToast(e.message, 'error');
    }
}

async function deleteTemplate() {
    closeTemplateActionsModal();
    if (!selectedTemplateId) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) return;

    try {
        showLoading(true);
        await API.deleteTemplate(selectedTemplateId);
        await loadTemplates();
        showLoading(false);
        showToast('Template supprimé', 'success');
    } catch (e) {
        showLoading(false);
        showToast(e.message, 'error');
    }
}

// ===========================================
// Template Editor
// ===========================================

let editingTemplateId = null;

async function initTemplateEditor() {
    const hash = window.location.hash.slice(1);
    const isEditing = hash.startsWith('/templates/edit/');
    editingTemplateId = isEditing ? hash.replace('/templates/edit/', '') : null;

    // Load template data if editing
    if (editingTemplateId) {
        try {
            const result = await API.getTemplate(editingTemplateId);
            const template = result.data;
            if (template) {
                document.getElementById('template-name').value = template.name || '';
                document.getElementById('template-description').value = template.description || '';
                document.getElementById('template-content').value = template.content || '';

                // Set channel
                const channelRadio = document.querySelector(`input[name="channel"][value="${template.channel}"]`);
                if (channelRadio) channelRadio.checked = true;

                updateWordCount();
                document.getElementById('last-modified').textContent =
                    `Modifié le ${new Date(template.updatedAt).toLocaleDateString('fr-FR')}`;
            }
        } catch (e) {
            showToast('Erreur lors du chargement du template', 'error');
        }
    }

    // Word count update
    const contentArea = document.getElementById('template-content');
    if (contentArea) {
        contentArea.addEventListener('input', updateWordCount);
    }

    // Variable dropdown
    const varBtn = document.getElementById('insert-variable-btn');
    const varDropdown = document.getElementById('variable-dropdown');
    if (varBtn && varDropdown) {
        varBtn.addEventListener('click', () => {
            varDropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#variable-dropdown-container')) {
                varDropdown.classList.add('hidden');
            }
        });

        // Variable insertion
        document.querySelectorAll('.var-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const variable = btn.dataset.var;
                insertAtCursor(contentArea, variable);
                varDropdown.classList.add('hidden');
                updateWordCount();
            });
        });
    }

    // Save button
    const saveBtn = document.getElementById('save-template-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveTemplate);
    }

    // Preview button
    const previewBtn = document.getElementById('preview-template-btn');
    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            const content = document.getElementById('template-content')?.value || '';
            const name = document.getElementById('template-name')?.value || 'Nouveau template';
            const channel = document.querySelector('input[name="channel"]:checked')?.value || 'email';

            if (!content.trim()) {
                showToast('Veuillez saisir du contenu à prévisualiser', 'error');
                return;
            }

            // Sample data for preview
            const sampleData = {
                '{{prenom}}': 'Marie',
                '{{nom}}': 'Dupont',
                '{{entreprise}}': 'TechCorp Solutions',
                '{{poste}}': 'Directrice Marketing',
                '{{email}}': 'marie.dupont@techcorp.fr'
            };

            // Replace variables with sample data
            let previewContent = content;
            Object.keys(sampleData).forEach(variable => {
                previewContent = previewContent.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), sampleData[variable]);
            });

            // Show preview modal
            showPreviewModal(name, channel, previewContent);
        });
    }
}

function updateWordCount() {
    const content = document.getElementById('template-content')?.value || '';
    const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    const wordCountEl = document.getElementById('word-count');
    if (wordCountEl) {
        wordCountEl.textContent = `~${words} mot${words !== 1 ? 's' : ''}`;
    }
}

function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    textarea.value = value.substring(0, start) + text + value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
}

async function saveTemplate() {
    const name = document.getElementById('template-name')?.value.trim();
    const description = document.getElementById('template-description')?.value.trim();
    const content = document.getElementById('template-content')?.value.trim();
    const channel = document.querySelector('input[name="channel"]:checked')?.value || 'email';

    if (!name) {
        showToast('Veuillez saisir un nom pour le template', 'error');
        return;
    }

    if (!content) {
        showToast('Veuillez saisir le contenu du template', 'error');
        return;
    }

    const data = { name, description, content, channel };

    try {
        showLoading(true);
        if (editingTemplateId) {
            await API.updateTemplate(editingTemplateId, data);
            showToast('Template mis à jour avec succès', 'success');
        } else {
            await API.createTemplate(data);
            showToast('Template créé avec succès', 'success');
        }
        showLoading(false);
        window.location.hash = '#/templates';
    } catch (e) {
        showLoading(false);
        showToast(e.message, 'error');
    }
}

// Template Preview Modal
function showPreviewModal(name, channel, content) {
    // Channel styling
    const channelInfo = {
        'email': { icon: 'mail', color: 'primary', label: 'Email' },
        'linkedin': { icon: 'work', color: '[#0077b5]', label: 'LinkedIn' },
        'sms': { icon: 'sms', color: 'purple-600', label: 'SMS' }
    };

    const info = channelInfo[channel] || channelInfo['email'];

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'preview-modal';
    modal.className = 'fixed inset-0 z-50 overflow-y-auto';
    modal.innerHTML = `
        <div class="modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm" onclick="closePreviewModal()"></div>
        <div class="flex min-h-full items-center justify-center p-4">
            <div class="modal-content relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in-scale">
                <!-- Header -->
                <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="p-2 rounded-lg bg-${info.color === 'primary' ? 'primary' : info.color}/10 text-${info.color}">
                            <span class="material-symbols-outlined text-[20px]">${info.icon}</span>
                        </div>
                        <div>
                            <h2 class="text-lg font-semibold text-text-main">${escapeHtml(name)}</h2>
                            <span class="text-xs text-gray-500">Prévisualisation ${info.label}</span>
                        </div>
                    </div>
                    <button onclick="closePreviewModal()" class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                        <span class="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
                
                <!-- Preview Content -->
                <div class="p-6">
                    <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div class="prose prose-sm max-w-none text-text-main whitespace-pre-wrap">${escapeHtml(content)}</div>
                    </div>
                </div>
                
                <!-- Sample Data Info -->
                <div class="px-6 pb-6">
                    <div class="flex gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 text-xs">
                        <span class="material-symbols-outlined text-blue-600 text-[16px] shrink-0">info</span>
                        <p>Les variables ont été remplacées par des données d'exemple: <strong>Marie Dupont</strong>, Directrice Marketing chez <strong>TechCorp Solutions</strong></p>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button onclick="closePreviewModal()" class="bg-primary hover:bg-primary-hover text-white font-medium h-10 px-5 rounded-lg shadow-sm shadow-primary/20 transition-all btn-press">
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Animate in
    setTimeout(() => {
        modal.querySelector('.modal-overlay').classList.add('active');
        modal.querySelector('.modal-content').classList.add('active');
    }, 10);
}

function closePreviewModal() {
    const modal = document.getElementById('preview-modal');
    if (modal) {
        modal.querySelector('.modal-overlay')?.classList.remove('active');
        modal.querySelector('.modal-content')?.classList.remove('active');
        setTimeout(() => modal.remove(), 200);
    }
}

window.closePreviewModal = closePreviewModal;

// Global functions for template modal actions
window.openTemplateActions = openTemplateActions;
window.closeTemplateActionsModal = closeTemplateActionsModal;
window.editTemplate = editTemplate;
window.duplicateTemplate = duplicateTemplate;
window.deleteTemplate = deleteTemplate;

// ===========================================
// Mobile Menu Functionality
// ===========================================

function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');

    if (!menuBtn || !sidebar) return;

    // Open menu
    menuBtn.addEventListener('click', () => {
        sidebar.classList.add('mobile-open');
        overlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close menu on overlay click
    overlay?.addEventListener('click', closeMobileMenu);

    // Close menu on navigation
    sidebar.querySelectorAll('a[data-nav]').forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });
}

function closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');

    sidebar?.classList.remove('mobile-open');
    overlay?.classList.remove('active');
    document.body.style.overflow = '';
}

// Initialize mobile menu on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMenu);
} else {
    initMobileMenu();
}

window.closeMobileMenu = closeMobileMenu;

// ===========================================
// Settings Page Functionality
// ===========================================

async function initSettingsPage() {
    // Load current settings
    try {
        const result = await API.getSettings();
        AppState.settings = result.data || {};

        // Populate form with current settings
        const modelSelect = document.getElementById('setting-llm-model');
        const tempSlider = document.getElementById('setting-temperature');
        const tempValue = document.getElementById('temp-value');
        const darkModeToggle = document.getElementById('setting-dark-mode');

        if (modelSelect && AppState.settings.llm?.model) {
            modelSelect.value = AppState.settings.llm.model;
        }
        if (tempSlider && AppState.settings.llm?.temperature) {
            tempSlider.value = AppState.settings.llm.temperature;
            if (tempValue) tempValue.textContent = AppState.settings.llm.temperature;
        }
        if (darkModeToggle && AppState.settings.appearance?.darkMode) {
            darkModeToggle.checked = AppState.settings.appearance.darkMode;
        }

        // Notification preferences
        if (AppState.settings.notifications) {
            const n = AppState.settings.notifications;
            document.getElementById('setting-notif-import').checked = n.importComplete !== false;
            document.getElementById('setting-notif-messages').checked = n.messageGenerated !== false;
            document.getElementById('setting-notif-campaigns').checked = n.campaignUpdates !== false;
        }

        // Export preferences
        if (AppState.settings.export) {
            document.getElementById('setting-export-format').value = AppState.settings.export.format || 'xlsx';
            document.getElementById('setting-include-messages').checked = AppState.settings.export.includeMessages !== false;
        }
    } catch (e) {
        console.error('Error loading settings:', e);
    }

    // Temperature slider
    const tempSlider = document.getElementById('setting-temperature');
    const tempValue = document.getElementById('temp-value');
    if (tempSlider && tempValue) {
        tempSlider.addEventListener('input', () => {
            tempValue.textContent = tempSlider.value;
        });
    }

    // Test LLM button
    const testBtn = document.getElementById('test-llm-btn');
    const resultEl = document.getElementById('llm-test-result');
    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            testBtn.disabled = true;
            testBtn.innerHTML = '<span class="spinner"></span> Test en cours...';
            resultEl.classList.remove('hidden', 'bg-green-100', 'bg-red-100', 'text-green-700', 'text-red-700');

            try {
                await API.testLLM();
                resultEl.classList.add('bg-green-100', 'text-green-700');
                resultEl.innerHTML = '<span class="material-symbols-outlined text-[16px]">check_circle</span> Connexion réussie';
            } catch (e) {
                resultEl.classList.add('bg-red-100', 'text-red-700');
                resultEl.innerHTML = '<span class="material-symbols-outlined text-[16px]">error</span> Échec: ' + e.message;
            }

            resultEl.classList.remove('hidden');
            testBtn.disabled = false;
            testBtn.innerHTML = 'Tester la connexion';
        });
    }

    // Save settings button
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const settings = {
                llm: {
                    model: document.getElementById('setting-llm-model')?.value || 'llama3.2',
                    temperature: parseFloat(document.getElementById('setting-temperature')?.value || 0.7),
                    maxTokens: 1000
                },
                appearance: {
                    darkMode: document.getElementById('setting-dark-mode')?.checked || false
                },
                notifications: {
                    enabled: true,
                    importComplete: document.getElementById('setting-notif-import')?.checked,
                    messageGenerated: document.getElementById('setting-notif-messages')?.checked,
                    campaignUpdates: document.getElementById('setting-notif-campaigns')?.checked
                },
                export: {
                    format: document.getElementById('setting-export-format')?.value || 'xlsx',
                    includeMessages: document.getElementById('setting-include-messages')?.checked
                }
            };

            try {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span class="spinner"></span> Enregistrement...';
                await API.updateSettings(settings);
                AppState.settings = settings;
                showToast('Paramètres enregistrés', 'success');

                // Apply dark mode if changed
                if (settings.appearance.darkMode) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            } catch (e) {
                showToast('Erreur: ' + e.message, 'error');
            }

            saveBtn.disabled = false;
            saveBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">save</span> Enregistrer les paramètres';
        });
    }

    // Clear data button
    const clearBtn = document.getElementById('clear-data-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            if (!confirm('Êtes-vous sûr de vouloir supprimer TOUTES les données ? Cette action est irréversible.')) return;
            if (!confirm('Dernière confirmation: cette action supprimera tous vos prospects, messages, campagnes et templates.')) return;

            try {
                await API.clearProspects();
                AppState.prospects = [];
                AppState.messages = [];
                showToast('Toutes les données ont été supprimées', 'success');
            } catch (e) {
                showToast('Erreur: ' + e.message, 'error');
            }
        });
    }

    // Export all data button
    const exportAllBtn = document.getElementById('export-all-data-btn');
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', async () => {
            try {
                const blob = await API.exportExcel({ includeMessages: true });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `export_complet_${new Date().toISOString().split('T')[0]}.xlsx`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Export téléchargé', 'success');
            } catch (e) {
                showToast('Erreur: ' + e.message, 'error');
            }
        });
    }
}

// ===========================================
// Global Search Functionality
// ===========================================

let searchTimeout = null;
let searchResultsVisible = false;

function initGlobalSearch() {
    const searchInput = document.getElementById('global-search-input');
    const searchResults = document.getElementById('search-results-dropdown');

    if (!searchInput) return;

    // Toggle search on Ctrl+K
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
        // Close on Escape
        if (e.key === 'Escape' && searchResultsVisible) {
            closeSearchResults();
        }
    });

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        if (searchTimeout) clearTimeout(searchTimeout);

        if (query.length < 2) {
            closeSearchResults();
            return;
        }

        searchTimeout = setTimeout(() => performGlobalSearch(query), 300);
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length >= 2) {
            performGlobalSearch(searchInput.value.trim());
        }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#global-search-container') && searchResultsVisible) {
            closeSearchResults();
        }
    });
}

async function performGlobalSearch(query) {
    const dropdown = document.getElementById('search-results-dropdown');
    if (!dropdown) return;

    try {
        const result = await API.search(query);
        const data = result.data;

        if (data.totalResults === 0) {
            dropdown.innerHTML = `
                <div class="p-4 text-center text-sm text-gray-500">
                    Aucun résultat pour "${query}"
                </div>
            `;
        } else {
            let html = '';

            // Prospects
            if (data.prospects.length > 0) {
                html += `<div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">Prospects</div>`;
                data.prospects.forEach(p => {
                    const name = `${p.prenom || ''} ${p.nom || ''}`.trim() || p.entreprise || 'Sans nom';
                    html += `
                        <a href="#/prospects/${p.id}" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer" onclick="closeSearchResults()">
                            <span class="material-symbols-outlined text-gray-400">person</span>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-text-main truncate">${escapeHtml(name)}</p>
                                <p class="text-xs text-gray-500 truncate">${escapeHtml(p.entreprise || p.email || '')}</p>
                            </div>
                        </a>
                    `;
                });
            }

            // Campaigns
            if (data.campaigns.length > 0) {
                html += `<div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 border-t border-gray-100">Campagnes</div>`;
                data.campaigns.forEach(c => {
                    html += `
                        <a href="#/campaigns" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer" onclick="closeSearchResults()">
                            <span class="material-symbols-outlined text-purple-500">campaign</span>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-text-main truncate">${escapeHtml(c.name)}</p>
                                <p class="text-xs text-gray-500">${c.status}</p>
                            </div>
                        </a>
                    `;
                });
            }

            // Templates
            if (data.templates.length > 0) {
                html += `<div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 border-t border-gray-100">Templates</div>`;
                data.templates.forEach(t => {
                    html += `
                        <a href="#/templates/edit/${t.id}" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer" onclick="closeSearchResults()">
                            <span class="material-symbols-outlined text-blue-500">description</span>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-text-main truncate">${escapeHtml(t.name)}</p>
                                <p class="text-xs text-gray-500">${t.channel}</p>
                            </div>
                        </a>
                    `;
                });
            }

            dropdown.innerHTML = html;
        }

        dropdown.classList.remove('hidden');
        searchResultsVisible = true;

    } catch (e) {
        console.error('Search error:', e);
    }
}

function closeSearchResults() {
    const dropdown = document.getElementById('search-results-dropdown');
    if (dropdown) {
        dropdown.classList.add('hidden');
    }
    searchResultsVisible = false;
}

window.closeSearchResults = closeSearchResults;

// ===========================================
// Notification System
// ===========================================

let notificationPollInterval = null;

async function loadNotifications() {
    try {
        const result = await API.getNotifications();
        AppState.notifications = result.data || [];
        AppState.unreadNotifications = result.unreadCount || 0;
        updateNotificationBadge();
    } catch (e) {
        console.error('Error loading notifications:', e);
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (badge) {
        if (AppState.unreadNotifications > 0) {
            badge.textContent = AppState.unreadNotifications > 99 ? '99+' : AppState.unreadNotifications;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

function renderNotifications() {
    const list = document.getElementById('notification-list');
    if (!list) return;

    if (AppState.notifications.length === 0) {
        list.innerHTML = `
            <div class="p-6 text-center">
                <span class="material-symbols-outlined text-gray-300 text-4xl">notifications_off</span>
                <p class="text-sm text-gray-500 mt-2">Aucune notification</p>
            </div>
        `;
        return;
    }

    const typeIcons = {
        'info': 'info',
        'success': 'check_circle',
        'warning': 'warning',
        'error': 'error'
    };

    const typeColors = {
        'info': 'text-blue-500',
        'success': 'text-green-500',
        'warning': 'text-amber-500',
        'error': 'text-red-500'
    };

    list.innerHTML = AppState.notifications.slice(0, 10).map(n => `
        <div class="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 ${n.read ? 'opacity-60' : ''}" data-id="${n.id}">
            <div class="flex gap-3">
                <span class="material-symbols-outlined ${typeColors[n.type] || 'text-gray-400'} text-[20px] shrink-0 mt-0.5">${typeIcons[n.type] || 'info'}</span>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-text-main">${escapeHtml(n.title)}</p>
                    <p class="text-xs text-gray-500 truncate">${escapeHtml(n.message)}</p>
                    <p class="text-xs text-gray-400 mt-1">${formatRelativeTime(n.createdAt)}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    return `Il y a ${Math.floor(diff / 86400)} j`;
}

function startNotificationPolling() {
    loadNotifications();
    notificationPollInterval = setInterval(loadNotifications, 30000); // Poll every 30 seconds
}

function stopNotificationPolling() {
    if (notificationPollInterval) {
        clearInterval(notificationPollInterval);
    }
}

// ===========================================
// Enhanced Dashboard with Real Stats
// ===========================================

async function initDashboardStats() {
    try {
        const result = await API.getStats();
        const stats = result.data;

        // Update stat cards
        const prospectStat = document.getElementById('stat-prospects');
        const messageStat = document.getElementById('stat-messages');
        const campaignStat = document.getElementById('stat-campaigns');

        if (prospectStat) prospectStat.textContent = stats.prospects.total;
        if (messageStat) messageStat.textContent = stats.messages.total;
        if (campaignStat) campaignStat.textContent = stats.campaigns.active;

    } catch (e) {
        console.error('Error loading dashboard stats:', e);
    }
}

// ===========================================
// Bulk Actions for Prospects
// ===========================================

async function bulkDeleteSelectedProspects() {
    const selected = Array.from(AppState.selectedProspects);
    if (selected.length === 0) {
        showToast('Aucun prospect sélectionné', 'error');
        return;
    }

    if (!confirm(`Supprimer ${selected.length} prospect(s) ?`)) return;

    try {
        await API.bulkDeleteProspects(selected);
        AppState.prospects = AppState.prospects.filter(p => !selected.includes(p.id));
        AppState.selectedProspects.clear();
        renderProspects();
        showToast(`${selected.length} prospect(s) supprimé(s)`, 'success');
    } catch (e) {
        showToast('Erreur: ' + e.message, 'error');
    }
}

async function showBulkAssignModal() {
    const selected = Array.from(AppState.selectedProspects);
    if (selected.length === 0) {
        showToast('Aucun prospect sélectionné', 'error');
        return;
    }

    // Create modal for campaign selection
    const modal = document.createElement('div');
    modal.id = 'bulk-assign-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';

    const campaigns = AppState.campaigns.filter(c => c.status !== 'completed');

    modal.innerHTML = `
        <div class="modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm" onclick="closeBulkAssignModal()"></div>
        <div class="modal-content relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-scale">
            <div class="px-6 py-4 border-b border-gray-100">
                <h3 class="text-lg font-semibold text-text-main">Assigner à une campagne</h3>
                <p class="text-sm text-gray-500">${selected.length} prospect(s) sélectionné(s)</p>
            </div>
            <div class="p-6">
                <select id="bulk-assign-campaign" class="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm">
                    <option value="">Choisir une campagne...</option>
                    ${campaigns.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
                </select>
            </div>
            <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800" onclick="closeBulkAssignModal()">Annuler</button>
                <button class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover" onclick="confirmBulkAssign()">Assigner</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    setTimeout(() => {
        modal.querySelector('.modal-overlay').classList.add('active');
        modal.querySelector('.modal-content').classList.add('active');
    }, 10);
}

function closeBulkAssignModal() {
    const modal = document.getElementById('bulk-assign-modal');
    if (modal) {
        modal.querySelector('.modal-overlay').classList.remove('active');
        modal.querySelector('.modal-content').classList.remove('active');
        setTimeout(() => modal.remove(), 200);
    }
}

async function confirmBulkAssign() {
    const campaignId = document.getElementById('bulk-assign-campaign')?.value;
    if (!campaignId) {
        showToast('Veuillez sélectionner une campagne', 'error');
        return;
    }

    const selected = Array.from(AppState.selectedProspects);

    try {
        await API.bulkAssignToCampaign(selected, campaignId);
        closeBulkAssignModal();
        AppState.selectedProspects.clear();
        showToast(`${selected.length} prospect(s) assigné(s)`, 'success');

        // Reload campaigns to update counts
        const result = await API.getCampaigns();
        AppState.campaigns = result.data || [];
    } catch (e) {
        showToast('Erreur: ' + e.message, 'error');
    }
}

window.closeBulkAssignModal = closeBulkAssignModal;
window.confirmBulkAssign = confirmBulkAssign;
window.bulkDeleteSelectedProspects = bulkDeleteSelectedProspects;
window.showBulkAssignModal = showBulkAssignModal;

// ===========================================
// Duplicate Detection
// ===========================================

async function showDuplicatesModal() {
    showLoading(true);

    try {
        const result = await API.getDuplicates();
        showLoading(false);

        if (result.data.length === 0) {
            showToast('Aucun doublon détecté', 'success');
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'duplicates-modal';
        modal.className = 'fixed inset-0 z-50 overflow-y-auto';

        modal.innerHTML = `
            <div class="modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm" onclick="closeDuplicatesModal()"></div>
            <div class="flex min-h-full items-center justify-center p-4">
                <div class="modal-content relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in-scale">
                    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 class="text-lg font-semibold text-text-main">Doublons détectés</h3>
                            <p class="text-sm text-gray-500">${result.totalDuplicates} doublon(s) trouvé(s) dans ${result.data.length} groupe(s)</p>
                        </div>
                        <button onclick="closeDuplicatesModal()" class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div class="max-h-[60vh] overflow-y-auto p-6 space-y-4">
                        ${result.data.map((group, gi) => `
                            <div class="border border-gray-200 rounded-xl p-4">
                                <p class="text-xs font-semibold text-gray-500 uppercase mb-3">Groupe ${gi + 1}</p>
                                <div class="space-y-2">
                                    ${group.map((p, pi) => `
                                        <div class="flex items-center gap-3 p-2 rounded-lg ${pi === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}">
                                            <input type="radio" name="keep-${gi}" value="${p.id}" ${pi === 0 ? 'checked' : ''} class="text-primary focus:ring-primary/20"/>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-sm font-medium text-text-main">${escapeHtml(`${p.prenom || ''} ${p.nom || ''}`.trim() || p.entreprise || 'Sans nom')}</p>
                                                <p class="text-xs text-gray-500">${escapeHtml(p.email || '')} · ${escapeHtml(p.entreprise || '')}</p>
                                            </div>
                                            ${p.duplicateReason ? `<span class="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">${p.duplicateReason}</span>` : '<span class="text-xs text-green-600">Original</span>'}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between">
                        <button onclick="closeDuplicatesModal()" class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Annuler</button>
                        <button onclick="mergeAllDuplicates()" class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover flex items-center gap-2">
                            <span class="material-symbols-outlined text-[18px]">merge</span>
                            Fusionner les doublons
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        setTimeout(() => {
            modal.querySelector('.modal-overlay').classList.add('active');
            modal.querySelector('.modal-content').classList.add('active');
        }, 10);

    } catch (e) {
        showLoading(false);
        showToast('Erreur: ' + e.message, 'error');
    }
}

function closeDuplicatesModal() {
    const modal = document.getElementById('duplicates-modal');
    if (modal) {
        modal.querySelector('.modal-overlay').classList.remove('active');
        modal.querySelector('.modal-content').classList.remove('active');
        setTimeout(() => modal.remove(), 200);
    }
}

async function mergeAllDuplicates() {
    // This is a simplified version - in production you'd process each group
    showToast('Fusion des doublons en cours...', 'info');
    closeDuplicatesModal();

    try {
        const result = await API.getDuplicates();
        let mergedCount = 0;

        for (const group of result.data) {
            const keepId = group[0].id;
            const mergeIds = group.slice(1).map(p => p.id);

            if (mergeIds.length > 0) {
                await API.mergeProspects(keepId, mergeIds);
                mergedCount += mergeIds.length;
            }
        }

        // Reload prospects
        const prospectsResult = await API.getProspects();
        AppState.prospects = prospectsResult.data || [];

        showToast(`${mergedCount} doublon(s) fusionné(s)`, 'success');

        // Re-render if on prospects page
        if (AppState.currentPage === 'prospects') {
            renderProspects();
        }
    } catch (e) {
        showToast('Erreur: ' + e.message, 'error');
    }
}

window.closeDuplicatesModal = closeDuplicatesModal;
window.mergeAllDuplicates = mergeAllDuplicates;
window.showDuplicatesModal = showDuplicatesModal;

// ===========================================
// Initialize on App Load
// ===========================================

// Start notification polling when app loads
document.addEventListener('DOMContentLoaded', () => {
    startNotificationPolling();
    initGlobalSearch();
});

// ===========================================
// Notification UI Functions
// ===========================================

function toggleNotifications() {
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
            renderNotifications();
        }
    }
}

async function markAllNotificationsReadUI() {
    try {
        await API.markAllNotificationsRead();
        AppState.notifications = AppState.notifications.map(n => ({ ...n, read: true }));
        AppState.unreadNotifications = 0;
        updateNotificationBadge();
        renderNotifications();
        showToast('Notifications marquées comme lues', 'success');
    } catch (e) {
        showToast('Erreur: ' + e.message, 'error');
    }
}

async function clearAllNotificationsUI() {
    try {
        await API.clearNotifications();
        AppState.notifications = [];
        AppState.unreadNotifications = 0;
        updateNotificationBadge();
        renderNotifications();
        toggleNotifications();
        showToast('Notifications effacées', 'success');
    } catch (e) {
        showToast('Erreur: ' + e.message, 'error');
    }
}

// Close notification dropdown when clicking outside
document.addEventListener('click', (e) => {
    const container = document.getElementById('notification-container');
    const dropdown = document.getElementById('notification-dropdown');
    if (container && dropdown && !container.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

window.toggleNotifications = toggleNotifications;
window.markAllNotificationsReadUI = markAllNotificationsReadUI;
window.clearAllNotificationsUI = clearAllNotificationsUI;

// ===========================================
// Page Initialization Hooks
// ===========================================

// Override the router's renderPage to call page-specific init functions
const originalRenderPage = Router.renderPage.bind(Router);
Router.renderPage = function (page) {
    originalRenderPage(page);

    // Call page-specific init after render
    setTimeout(() => {
        switch (page) {
            case 'dashboard':
                initDashboardStats();
                break;
            case 'settings':
                initSettingsPage();
                break;
        }
    }, 200);
};
