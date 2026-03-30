# Agents — Système d'agents IA pour l'application de prospection

## But
Définir les agents IA qui orchestrent la recherche, l'enrichissement, l'analyse, la génération d'emails, le scoring et l'assistance commerciale dans l'application de prospection.

L'objectif n'est pas d'avoir un agent unique qui fait tout, mais un ensemble d'agents spécialisés, chacun avec un rôle clair, des entrées et sorties structurées, et une responsabilité mesurable. Cette approche rend le système plus stable, plus testable et plus facile à améliorer avec Ollama. [web:11]

## Principes d'architecture
- Un agent = une responsabilité.
- Sorties JSON structurées quand possible.
- Traçabilité complète des inputs, outputs et scores.
- Possibilité de re-jouer un agent sur un prospect donné.
- Validation humaine sur les étapes critiques.
- Séparation entre agents d'analyse, agents de génération et agents d'évaluation. [web:11]

## Stack agentique recommandée
- Modèle local principal via Ollama.
- Orchestrateur backend en Python (FastAPI + workers).
- File de jobs async pour traitements longs.
- Stockage des outputs d'agents en base pour comparaison, audit et scoring. [cite:2][web:11]

## Vue d'ensemble des agents
1. Prospect Sourcing Agent
2. Company Research Agent
3. Contact Finder Agent
4. Prospect Brief Agent
5. Personalization Strategy Agent
6. Email Writer Agent
7. Email Reviewer Agent
8. Reply Classifier Agent
9. CRM Copilot Agent
10. Sales Call Prep Agent

Tous ne sont pas nécessaires au jour 1, mais la structure doit être pensée dès le départ pour les accueillir. [cite:5][cite:7]

## 1. Prospect Sourcing Agent
### Rôle
Transformer une niche, un territoire et des critères business en une liste exploitable d'entreprises.

### Entrées
- niche
- localisation
- taille estimée
- mots-clés
- exclusions
- sources autorisées

### Sorties
- liste d'entreprises candidates
- score de pertinence initial
- source de provenance
- doublons potentiels

### Responsabilités
- Interpréter l'intention de ciblage.
- Préparer les requêtes de sourcing.
- Uniformiser les résultats bruts venant de Google Maps, Apify ou imports. [cite:1][cite:4][cite:5]

## 2. Company Research Agent
### Rôle
Comprendre rapidement l'entreprise prospectée.

### Entrées
- company_id
- site web
- description brute
- métadonnées disponibles

### Sorties
- résumé de l'entreprise
- offre estimée
- positionnement
- signaux business
- opportunités de personnalisation
- zones d'incertitude

### Responsabilités
- Lire le site de l'entreprise.
- Déduire les services, la maturité, les faiblesses visibles et les leviers potentiels.
- Préparer un contexte exploitable pour les agents suivants.

## 3. Contact Finder Agent
### Rôle
Identifier les personnes pertinentes dans l'entreprise et estimer la probabilité que ce soit le bon décideur.

### Entrées
- company profile
- signaux publics
- données de contacts trouvées

### Sorties
- contact principal suggéré
- contacts secondaires
- rôle estimé
- score de confiance
- justification courte

### Responsabilités
- Prioriser fondateur, propriétaire, direction marketing ou opérations selon la niche.
- Expliquer pourquoi un contact est jugé pertinent.
- Lever un drapeau quand la confiance est faible.

## 4. Prospect Brief Agent
### Rôle
Créer une fiche de synthèse exploitable par le système de rédaction.

### Entrées
- résumé entreprise
- contact retenu
- niche ciblée
- offre de l'agence

### Sorties
- business_summary
- probable_pain_points
- personalization_hooks
- recommended_angle
- objections_probables
- confidence

### Responsabilités
- Transformer des données dispersées en brief commercial clair.
- Préparer une base structurée pour la rédaction d'email. [web:11]

## 5. Personalization Strategy Agent
### Rôle
Choisir le meilleur angle d'attaque commercial avant l'écriture.

### Entrées
- prospect brief
- type d'offre proposée
- ton de marque
- objectif de campagne

### Sorties
- angle primaire
- angle secondaire
- promesse
- CTA recommandé
- éléments à mentionner
- éléments à éviter

### Responsabilités
- Décider si l'email doit être orienté résultat, crédibilité, problème visible, opportunité manquée, audit ou étude de cas.
- Réduire les emails génériques.

## 6. Email Writer Agent
### Rôle
Rédiger les emails personnalisés.

### Entrées
- prospect brief
- stratégie de personnalisation
- contraintes de ton
- longueur visée
- langue

### Sorties
- subject_line
- preview_text
- email_body
- CTA
- variantes
- version courte / version standard

### Responsabilités
- Générer des emails spécifiques, crédibles, naturels et non robotiques.
- Produire un JSON stable pour intégration pipeline avec Ollama structured outputs. [web:11]

## 7. Email Reviewer Agent
### Rôle
Évaluer la qualité du message généré avant envoi.

### Entrées
- email generated
- prospect brief
- stratégie choisie

### Sorties
- personalization_score
- clarity_score
- relevance_score
- risk_flags
- rewrite_suggestions
- accept_or_retry

### Responsabilités
- Vérifier si l'email contient une vraie personnalisation.
- Détecter les formulations génériques, les hallucinations ou les CTA faibles.
- Bloquer ou renvoyer en réécriture si nécessaire.

## 8. Reply Classifier Agent
### Rôle
Classer automatiquement les réponses reçues.

### Entrées
- contenu de réponse email
- historique du thread
- contexte campagne

### Sorties
- catégorie de réponse
- sentiment commercial
- next_step conseillé
- priorité

### Catégories possibles
- positive
- interested_later
- not_interested
- wrong_contact
- out_of_office
- unsubscribe
- meeting_request

### Responsabilités
- Aider le CRM à bouger automatiquement le lead dans le pipeline.
- Générer des tâches ou alertes selon le cas.

## 9. CRM Copilot Agent
### Rôle
Assister l'utilisateur dans l'usage quotidien du CRM.

### Entrées
- contexte utilisateur
- données prospect
- historique campagne
- tâches en cours

### Sorties
- résumé du compte
- prochaine meilleure action
- tâches proposées
- rappel des priorités

### Responsabilités
- Dire quoi faire ensuite.
- Résumer les comptes chauds.
- Aider les membres d'équipe à rester disciplinés.

## 10. Sales Call Prep Agent
### Rôle
Préparer les appels et futurs co-calls.

### Entrées
- historique prospect
- réponses reçues
- résumé entreprise
- objectif du call

### Sorties
- brief pré-call
- points à explorer
- objections probables
- script d'ouverture
- questions à poser
- CTA de fin d'appel

### Responsabilités
- Préparer la transition de l'email vers l'appel.
- Alimenter la future couche de prospection plus complète voulue pour l'après-MVP. [cite:3]

## Ordre d'exécution recommandé
### Workflow principal MVP
1. Prospect Sourcing Agent
2. Company Research Agent
3. Contact Finder Agent
4. Prospect Brief Agent
5. Personalization Strategy Agent
6. Email Writer Agent
7. Email Reviewer Agent
8. Envoi
9. CRM update
10. Analytics update

### Workflow post-réponse
1. Reply Classifier Agent
2. CRM Copilot Agent
3. Création de tâche / changement de statut
4. Préparation call si nécessaire

## Règles de sortie structurée
Chaque agent doit retourner :
- `status`
- `confidence`
- `input_summary`
- `output`
- `risk_flags`
- `requires_human_review`
- `model`
- `prompt_version`
- `latency_ms`

Les agents de génération doivent retourner du JSON déterministe autant que possible afin d'éviter les cassures dans le pipeline backend. Ollama supporte cette approche via les structured outputs. [web:11]

## Règles de sécurité métier
- Ne jamais inventer un fait spécifique non vérifié sur un prospect.
- Marquer explicitement les hypothèses.
- Interdire les claims trop agressifs ou trompeurs.
- Forcer une revue humaine quand le score de confiance est faible.
- Journaliser les décisions importantes des agents.

## Boucle d'amélioration
Le système d'agents doit apprendre opérationnellement, même sans fine-tuning au départ.

### Données à conserver
- prompt utilisé
- version du modèle
- output agent
- modifications humaines
- résultat commercial obtenu
- score qualité donné par l'utilisateur

### Objectif
Identifier quels prompts, quels angles et quelles structures de messages donnent les meilleurs résultats réels, pas seulement les plus beaux textes. [web:15][web:20]

## Indicateurs par agent
### Prospect Sourcing Agent
- taux de leads valides
- taux de doublons
- précision du ciblage

### Contact Finder Agent
- taux de bons contacts
- taux de corrections humaines

### Email Writer Agent
- taux d'acceptation sans modification
- taux de réécriture
- score moyen de personnalisation

### Email Reviewer Agent
- corrélation entre score interne et résultats réels

### Reply Classifier Agent
- précision de classification
- temps gagné pour l'équipe

### CRM Copilot Agent
- adoption utilisateur
- impact sur vitesse de suivi

## Mode de déploiement conseillé
### MVP
- Peu d'agents mais bien définis.
- Beaucoup de validation humaine.
- Logs complets.
- Possibilité de relancer un agent manuellement.

### Version mature
- Orchestration plus autonome.
- Suggestions automatiques.
- Actions CRM semi-automatiques.
- Préparation d'appels et co-calls.

## Conclusion opérationnelle
La meilleure manière de construire ce système est de considérer les agents comme une chaîne de production commerciale : recherche, compréhension, décision, rédaction, contrôle qualité, suivi, puis assistance commerciale. Cette approche colle au besoin de l'application : une prospection email hautement personnalisée, mesurable, collaborative et extensible. [cite:3][cite:5][cite:7]
