# Projet — Application complète de prospection email

## Vision
Construire une application de prospection complète pour Uprising Studio, pensée d'abord pour la prospection par email ultra-personnalisée, puis extensible vers une plateforme de sales outreach plus large incluant collaboration d'équipe, analytics, CRM, et plus tard appels/co-calls.

Le produit doit permettre de trouver des prospects dans une niche précise, enrichir automatiquement les entreprises et les contacts, identifier les décideurs, générer des emails hautement personnalisés avec une IA locale via Ollama, envoyer et suivre les campagnes, puis mesurer la qualité réelle des messages et les résultats commerciaux. Cette direction est cohérente avec le projet de prospection déjà envisagé par l'utilisateur autour d'un backend Python, d'une logique Google Maps/Apify et d'un CRM relié au cycle d'acquisition de l'agence. [cite:1][cite:2][cite:3][cite:5]

## Objectifs produit
- Trouver automatiquement des entreprises correspondant à la niche ciblée.
- Identifier ou estimer les bons décideurs dans chaque entreprise.
- Générer des emails réellement personnalisés, spécifiques au prospect.
- Centraliser le suivi dans un CRM interne.
- Mesurer la performance des campagnes, des messages, des utilisateurs et des workflows.
- Permettre la collaboration d'équipe avec rôles, tâches, commentaires et audit trail.
- Préparer une extension future vers une prospection multicanale incluant appels et co-calls. [cite:3][cite:7]

## Problème à résoudre
Les outils existants séparent souvent sourcing, enrichissement, rédaction, envoi, suivi CRM et analytics. Le besoin ici est de réunir tout le cycle dans une seule interface pensée pour une agence locale qui veut prospecter intelligemment des PME, tester ses angles, et améliorer en continu ses résultats. [cite:1][cite:3][cite:5]

## Utilisateurs cibles
### 1. Fondateur / closer
- Définit les niches ciblées.
- Revoit les leads chauds.
- Valide les campagnes.
- Analyse les résultats globaux.

### 2. SDR / prospecteur
- Recherche ou importe des leads.
- Vérifie les contacts.
- Lance les campagnes.
- Gère les follow-ups.

### 3. Rédacteur / opérateur IA
- Ajuste les prompts.
- Vérifie la qualité des emails générés.
- Compare les variantes.
- Corrige les outputs faibles.

### 4. Manager
- Surveille les performances d'équipe.
- Assigne les leads.
- Suit les tâches et les KPI.
- Contrôle la qualité opérationnelle. [cite:7]

## Proposition de valeur
Une plateforme orientée agence qui transforme une liste brute d'entreprises en pipeline exploitable grâce à :
- la recherche de prospects,
- l'enrichissement automatisé,
- l'identification des décideurs,
- la génération d'emails personnalisés via IA locale,
- l'envoi et le tracking,
- le scoring qualité et business,
- la collaboration interne.

Le différenciateur principal ne doit pas être l'envoi d'emails, mais la qualité du raisonnement commercial et de la personnalisation. [web:11][web:15]

## Périmètre MVP
### Module 1 — Sourcing de prospects
Fonctionnalités :
- Import via Google Maps / Apify / CSV.
- Création de listes par niche et par région.
- Déduplication entreprises et contacts.
- Tagging par campagne, source, territoire et segment. [cite:1][cite:4][cite:5]

### Module 2 — Enrichissement entreprise
Fonctionnalités :
- Récupération du site web, catégorie, localisation, téléphone, présence sociale.
- Analyse du site pour comprendre l'offre, la maturité marketing et les opportunités.
- Extraction d'indices business pour personnalisation. [cite:5]

### Module 3 — Identification des décideurs
Fonctionnalités :
- Recherche de contacts internes pertinents.
- Score de confiance sur le rôle trouvé.
- Historique des sources et champs de vérification.
- Suggestions de contact principal et contact secondaire.

### Module 4 — Génération IA des emails
Fonctionnalités :
- Résumé entreprise.
- Pain points probables.
- Angle d'approche.
- Objet d'email.
- Corps d'email.
- CTA.
- Variantes A/B.
- Auto-évaluation de la personnalisation.

L'IA doit tourner avec Ollama et produire des sorties structurées en JSON afin de rendre le pipeline fiable côté backend. [web:11]

### Module 5 — Campaign engine
Fonctionnalités :
- Envoi d'email.
- Gestion de séquences.
- Follow-up automatique.
- Scheduling.
- Journal de statut des messages.
- Réception des événements de livraison et réponse.

Resend peut servir de couche initiale d'envoi et de récupération des événements d'emails envoyés. [web:12][web:15][web:17]

### Module 6 — CRM intégré
Fonctionnalités :
- Vue pipeline.
- Statuts des leads.
- Notes.
- Tâches.
- Historique d'interactions.
- Vue entreprise, vue contact, vue campagne.
- Dashboard résultats. [cite:7]

### Module 7 — Collaboration
Fonctionnalités :
- Rôles et permissions.
- Attribution des leads.
- Commentaires internes.
- Journal d'activité.
- Suivi par membre d'équipe.
- Scoreboard collaboratif. [cite:7]

## Fonctionnalités futures
- Classification automatique des réponses.
- Suggestions du meilleur next step.
- Multicanal : LinkedIn, SMS, appels.
- Module d'appel assisté.
- Co-call avec script dynamique.
- Agent IA de préparation avant rendez-vous.
- Analyse complète du pipeline de conversion par segment. [cite:3]

## KPIs à suivre
### KPIs sourcing
- Leads trouvés par source.
- Taux de doublons.
- Taux de leads exploitables.

### KPIs enrichissement
- Taux de complétion des données.
- Taux d'identification d'un décideur.
- Score moyen de confiance contact.

### KPIs email
- Taux de génération valide.
- Taux d'acceptation manuelle.
- Open rate.
- Reply rate.
- Positive reply rate.
- Meeting booked rate.
- Bounce rate. [web:15][web:20]

### KPIs qualité
- Score moyen de personnalisation.
- Score moyen de pertinence.
- Score moyen par modèle Ollama.
- Score moyen par prompt.
- Score moyen par membre d'équipe.

### KPIs CRM / business
- Leads par statut.
- Temps moyen avant première action.
- Taux de qualification.
- Taux de passage vers rendez-vous.
- Taux de closing indirect si connecté au reste du workflow agence.

## Scoring recommandé
Le produit doit séparer les scores pour éviter de fausses conclusions.

### 1. Fit score
À quel point l'entreprise entre dans la niche recherchée.

### 2. Contact confidence score
À quel point le contact trouvé semble être le bon décideur.

### 3. Personalization quality score
À quel point l'email semble spécifique, crédible et contextualisé.

### 4. Outcome score
À quel point le message génère un résultat business réel.

Un email joli mais sans réponse ne doit pas être considéré comme performant. À l'inverse, un email moins élégant mais qui génère un rendez-vous doit remonter comme modèle performant. [web:15][web:20]

## Stack recommandée
- Frontend : Next.js + shadcn/ui.
- Backend : FastAPI en Python.
- Base de données : Supabase Postgres.
- Auth : Supabase Auth.
- Realtime : Supabase Realtime.
- Permissions : Supabase Row Level Security.
- IA : Ollama.
- Envoi email : Resend au départ.
- Jobs asynchrones : Celery, RQ ou Dramatiq.
- Sourcing : Apify + imports CSV + connecteurs maison. [cite:2][cite:5][cite:7][web:11][web:15][web:16]

## Architecture applicative
### Frontend
- Dashboard web app.
- Vues : Companies, Contacts, Leads, Campaigns, Inbox, Tasks, Analytics, Settings.
- UI orientée productivité.

### Backend
- API REST ou hybride REST + tâches async.
- Services spécialisés pour sourcing, enrichment, AI generation, campaign delivery, analytics.

### Data layer
- Multi-tenant dès le départ.
- Tables séparées par organisation.
- RLS obligatoire sur les entités sensibles afin de gérer correctement les accès équipe. Supabase nécessite une activation explicite du RLS sur les tables concernées. [web:16]

## Entités principales
- organizations
- users
- roles
- permissions
- companies
- contacts
- leads
- campaigns
- campaign_steps
- messages
- message_events
- tasks
- notes
- ai_generations
- quality_reviews
- activity_logs [cite:7]

## Workflow principal
1. L'utilisateur définit une niche.
2. Le système importe ou récupère des entreprises.
3. Le système enrichit les entreprises.
4. Le système trouve ou suggère un décideur.
5. L'IA génère un brief prospect.
6. L'IA génère plusieurs variantes d'emails.
7. L'utilisateur valide ou édite.
8. Le système envoie la campagne.
9. Les événements sont synchronisés dans le CRM.
10. L'équipe suit les réponses, les tâches et les résultats.
11. Le système calcule les scores et améliore les campagnes futures. [cite:5][web:11][web:15]

## Contraintes produit
- Priorité à la qualité de personnalisation, pas au volume aveugle.
- Architecture modulaire pour ajouter d'autres canaux plus tard.
- Historique complet pour audit et optimisation.
- Collaboration native.
- Coût d'exploitation raisonnable grâce à Ollama et à des outils orientés développeurs. [cite:3][web:11]

## Roadmap
### Phase 1
- Sourcing.
- Companies / contacts.
- Enrichissement simple.
- Génération IA structurée.
- Envoi email.
- Pipeline CRM minimal.

### Phase 2
- Séquences avancées.
- Notes, tâches, assignation.
- Dashboard analytics.
- Scoring qualité.
- Collaboration équipe.

### Phase 3
- Classification des réponses.
- Suggestions automatiques.
- Playbooks par niche.
- Multi-workspace plus mature.

### Phase 4
- Prospection multicanale.
- Appels assistés.
- Co-call.
- Préparation meeting automatisée. [cite:3][cite:7]

## Résultat attendu
Le projet doit aboutir à un logiciel interne capable d'augmenter la qualité de prospection de l'agence, standardiser les bonnes pratiques, suivre finement les résultats, et devenir potentiellement un produit plus large si l'usage interne valide fortement la valeur.
