# 🎯 Prospecting App

Application de prospection commerciale moderne avec pipeline Kanban, séquences multicanales et automatisations.

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-cyan?logo=tailwindcss)

## ✨ Fonctionnalités

### 📊 Dashboard

- Vue d'ensemble des KPIs
- Actions rapides du jour
- Activité récente

### 👥 Gestion des Prospects

- Import CSV (Google Maps, LinkedIn, etc.)
- Recherche Google Maps intégrée
- Enrichissement automatique
- Score ICP (Ideal Customer Profile)

### 🎯 Pipeline Kanban

- 7 colonnes personnalisables
- Drag & Drop
- Stats en temps réel (Win Rate, etc.)

### ⚡ Séquences Multicanales

- Éditeur visuel timeline
- Types: Email, Appel, LinkedIn, SMS, Tâches
- Suivi des prospects inscrits

### 🤖 Automatisations (IF-THEN)

- Triggers: Nouveau prospect, changement de stage, enrichissement
- Actions: Ajouter à séquence, changer statut, déplacer pipeline

### 📧 Messages & Templates

- Génération IA (Gemini)
- Templates réutilisables
- Variables dynamiques

## 🚀 Installation

```bash
# Cloner le repo
git clone https://github.com/Endsi3g/prospecting-app.git
cd prospecting-app

# Installer les dépendances backend
npm install

# Installer les dépendances frontend
cd client
npm install
cd ..
```

## ⚙️ Configuration

Créez un fichier `.env` à la racine:

```env
GEMINI_API_KEY=votre_clé_gemini
PORT=3000
```

## 🏃 Lancement

```bash
# Terminal 1 - Backend (port 3000)
node server.js

# Terminal 2 - Frontend (port 5173)
cd client
npm run dev
```

Ouvrez <http://localhost:5173>

## 🏗️ Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS 4 + shadcn/ui |
| Backend | Node.js + Express |
| IA | Google Gemini API |
| Data | JSON (fichiers locaux) |

## 📁 Structure

```
prospecting-app/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Pages de l'app
│   │   ├── components/    # Composants UI
│   │   ├── layouts/       # Layouts
│   │   └── api/           # Client API
├── server.js              # Backend Express
├── services/              # Services (CSV, Playwright, etc.)
└── data/                  # Données JSON
```

## 📝 API Endpoints

| Route | Description |
|-------|-------------|
| `/api/prospects` | CRUD prospects |
| `/api/sequences` | Séquences multicanales |
| `/api/pipeline` | Pipeline Kanban |
| `/api/automations` | Automatisations |
| `/api/messages` | Messages générés |
| `/api/templates` | Templates |

## 📜 Licence

MIT
