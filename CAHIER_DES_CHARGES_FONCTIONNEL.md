# Cahier des Charges Fonctionnel — Mobiliscar

**Plateforme de gestion de location de véhicules**
Version : 1.0 — Juin 2026

---

## 1. Présentation générale

Mobiliscar est une application web SaaS multi-agences destinée aux agences de location de véhicules. Elle couvre l'intégralité du cycle opérationnel : gestion de flotte, contrats, clients, finance, maintenance, sinistres et collaboration inter-agences. L'interface est entièrement responsive (desktop et mobile).

---

## 2. Rôles et permissions

| Rôle | Périmètre |
|------|-----------|
| **Super Admin** | Accès total à la plateforme : gestion des agences, utilisateurs, facturation, paramètres globaux |
| **Agency Admin** | Accès complet à son agence : toutes les fonctionnalités y compris finances, statistiques et soldes |
| **Agency User** | Accès restreint : création de contrats, consultation — ne voit pas les soldes ni certaines données financières |

---

## 3. Architecture technique

- **Frontend** : React + Tailwind CSS, Vite, React Query, React Router
- **Backend** : Node.js / Express, Prisma ORM, PostgreSQL
- **Auth** : JWT (access token), réinitialisation de mot de passe par email
- **Fichiers** : upload local (CIN, permis, photos réparations, sinistres, documents véhicules)
- **PDF** : génération serveur via PDFKit (contrats et factures)
- **QR Code** : qrcode npm, intégré dans le PDF contrat
- **CI/CD** : GitHub Actions → build Docker → déploiement VPS via SSH
- **Reverse proxy** : nginx avec réécriture `/api/` → backend

---

## 4. Modules fonctionnels

### 4.1 Authentification

**Fonctionnalités :**
- Connexion par email / mot de passe
- Token JWT stocké côté client
- Réinitialisation de mot de passe par lien email (expiration 1 h)
- Changement d'email avec code de confirmation
- Redirection automatique selon le rôle après connexion

**Règles :**
- Un utilisateur peut appartenir à plusieurs agences
- Un compte désactivé (`isActive = false`) ne peut pas se connecter

---

### 4.2 Tableau de bord agence

**Fonctionnalités :**
- Statistiques en temps réel : contrats actifs, réservations, véhicules disponibles / loués / en maintenance
- Alertes automatiques : assurances expirées ou expirant dans 30 jours, contrôles techniques, autorisations de circulation, pièces d'identité et permis clients
- Alerte de facturation plateforme (facture en retard ou échéant dans 7 jours)
- Gantt de disponibilité de la flotte : visualisation des périodes de location par véhicule sur une fenêtre glissante
- Indicateurs financiers : encaissement du mois, solde espèces (admin uniquement)
- Filtre par période pour les indicateurs financiers

**Règles :**
- Les indicateurs financiers (solde espèces, solde banque) sont visibles uniquement par l'admin agence
- L'alerte facturation est masquée si aucune facture active n'existe

---

### 4.3 Véhicules (Flotte)

**Fonctionnalités :**
- Fiche complète par véhicule : marque, modèle, année, couleur, carburant, transmission, plaque WW / définitive, kilométrage, prix d'achat, date d'achat, prix de location TTC
- Gestion des dates légales : date d'autorisation, fin assurance, dernier / prochain contrôle technique, expiration autorisation de circulation
- Statut : Disponible / Loué / Maintenance / Inactif
- Upload de documents attachés (PDF, images) par véhicule avec nom/type personnalisable
- Gestion des indisponibilités manuelles (périodes bloquées avec raison)
- Calendrier de disponibilité : vue mensuelle par véhicule avec filtrage par date
- Sinistres liés au véhicule (voir module 4.9)
- Maintenance liée au véhicule (voir module 4.8)
- Recherche et filtres : par marque/modèle, statut, plaque

**Règles :**
- Un véhicule avec un contrat ACTIVE ne peut pas être marqué Disponible manuellement
- Les documents sont accessibles via lien signé (`/files/:agencyId/...`)

---

### 4.4 Contrats de location

**Fonctionnalités :**

**Création / Édition :**
- Sélection du véhicule et du client (existant ou nouveau)
- Dates et heures de départ / retour
- Lieu de prise en charge et de retour
- Montant total TTC, acompte, montant encaissé, caution, devise
- Conducteur secondaire (prénom, nom, CIN, expiration CIN et permis)
- Kilométrage départ / retour
- Notes libres
- Statuts : En attente → Réservation → Réservation confirmée → Actif → Terminé / Annulé

**Paiements périodiques :**
- Ajout de versements partiels sur un contrat (période, montant, date de paiement, notes)
- Calcul automatique du reste à payer

**Génération PDF :**
- Contrat PDF complet avec : en-tête agence (logo, coordonnées), numéro de contrat, informations client (CIN, permis), véhicule, période, montants, caution, conducteur secondaire, signature client (zone à signer), QR code de vérification
- Téléchargement immédiat depuis l'interface

**Génération Facture PDF :**
- Facture numérotée `F-{contractNumber}` avec en-tête agence en bleu marine
- Tableau des prestations, récapitulatif financier (montant, TTC, encaissé, reste)
- Option de signature électronique client via canvas (SignatureCanvas)
- Deux versions : avec ou sans signature

**Page publique de vérification :**
- URL : `https://www.mobiliscar.com/contract/:contractNumber`
- Accessible sans authentification via QR code scanné depuis le PDF
- Affiche toutes les informations du contrat : agence, véhicule, client, période, montants, paiements périodiques

**Historique :**
- Liste de tous les contrats avec filtres : statut, date de début/fin, véhicule, client
- Vue historique par client (montant total, encaissé)

**Demandes de réservation inter-agences :**
- Réception de demandes de location d'agences partenaires
- Possibilité de proposer un véhicule avec prix et notes
- Conversion directe d'une offre acceptée en contrat

**Règles :**
- Le numéro de contrat est généré automatiquement et unique
- Un contrat ACTIVE met le véhicule en statut Loué
- La suppression d'un contrat est définitive

---

### 4.5 Clients

**Fonctionnalités :**
- Fiche client : particulier ou entreprise
- Particulier : prénom, nom, téléphone, email, adresse
- Entreprise : raison sociale, ICE, contact / représentant
- Pièce d'identité : type (CIN / Passeport / Carte de séjour / Autre), numéro, date d'expiration, upload photo/PDF
- Permis de conduire : numéro, date d'expiration, upload photo/PDF (masqué pour les entreprises)
- Alertes visuelles si CIN ou permis expiré ou expirant dans 60 jours
- Lien direct vers le fichier CIN / permis (nouvel onglet)
- Historique complet : tous les contrats du client avec statuts, montants, encaissements
- Recherche par nom, téléphone, numéro de pièce

**Règles :**
- Un client peut avoir des contrats sur plusieurs agences (si accès partagé)
- La suppression d'un client est définitive

---

### 4.6 Finance & Comptabilité

#### 4.6.1 Transactions (Recettes & Dépenses)

**Fonctionnalités :**
- Enregistrement de transactions avec types : Recette, Dépense espèces, Dépense banque, Transfert espèces, Bénéfices espèces, Bénéfices banque, Versement compte, Cotisation
- Champs : description, montant, devise (MAD / EUR / USD), date, catégorie, encaissé par (associé existant ou nom libre), notes
- Filtrage par année
- Suppression d'une transaction

**Indicateurs (admin uniquement) :**
- Total recettes, dépenses espèces, dépenses banque, versements compte, bénéfices retirés
- Solde espèces avec détail par associé/encaisseur
- Solde de banque
- Locations encaissées vs montant total des contrats

**Indicateur non-admin :**
- Mon encaissement : somme des transactions INCOME/CASH_TRANSFER associées à l'utilisateur connecté

#### 4.6.2 Cotisations

**Fonctionnalités :**
- Enregistrement de cotisations liées à un associé : montant, date, période, notes
- Filtrage par année
- Total des cotisations de la période

#### 4.6.3 Associés / Employés

**Fonctionnalités :**
- Fiche par personne : nom, email, téléphone, rôle (Associé / Employé), part (%)
- Modification et désactivation (soft delete)

#### 4.6.4 Chèques

**Fonctionnalités :**

*Chèques émis :*
- Numéro, à l'ordre de, montant, date d'émission, date d'encaissement demandée, situation (Payé / Non exploité / Annulé / —), raison, commentaire

*Chèques reçus :*
- Numéro, à l'ordre de, montant, date, situation, raison, commentaire

- Totaux par onglet : total montant, total non exploités
- Modification et suppression

---

### 4.7 Historique

**Fonctionnalités :**
- Vue centralisée de tous les contrats de l'agence
- Filtres combinables : date de début, date de fin
- Affichage tabulaire avec statut, véhicule, client, période, montants
- Accessible depuis la navigation principale

---

### 4.8 Maintenance

#### 4.8.1 Vidanges

- Date, kilométrage, type d'huile, filtre changé (oui/non), coût, notes
- Prochaine vidange : km ou date
- Filtrage par véhicule
- Modification et suppression

#### 4.8.2 Pneus

- Date, kilométrage, position (AV-GAUCHE, AV-DROIT, AR-GAUCHE, AR-DROIT, ROUE-DE-SECOURS, TOUS), marque pneu, taille, coût
- Filtrage par véhicule
- Modification et suppression

#### 4.8.3 Réparations

- Description, date, kilométrage, coût, garage, prochaine réparation (description + date)
- Upload de photos (images)
- Galerie photos miniatures avec suppression individuelle
- Filtrage par véhicule
- Modification et suppression

---

### 4.9 Sinistres

**Fonctionnalités :**
- Déclaration liée à un véhicule et optionnellement à un contrat
- Titre, description libre, statut (Ouvert / Résolu)
- Montant encaissé et date d'encaissement
- Upload de photos (galerie avec suppression individuelle)
- Accessible depuis la fiche véhicule ou depuis un contrat
- Modification, suppression

**Règles :**
- Un sinistre peut exister indépendamment d'un contrat
- Le montant encaissé crée automatiquement une transaction financière de type INCOME

---

### 4.10 Partenaires

**Fonctionnalités :**
- Annuaire de partenaires : nom, type (Fournisseur / Garage / Assureur / Autre), adresse, téléphone, email, site web, notes
- Contacts multiples par partenaire : nom, rôle, téléphone, email, notes
- Recherche par nom
- Modification et suppression des partenaires et contacts

---

### 4.11 Accès inter-agences

**Fonctionnalités :**
- Un admin plateforme configure quelles agences ont accès à la flotte d'une autre agence
- L'agence propriétaire choisit le niveau d'accès pour chaque agence autorisée :
  - **Toutes les voitures** : y compris celles ajoutées à l'avenir
  - **Voitures spécifiques** : sélection manuelle des véhicules partagés
  - **Accès bloqué** : révocation temporaire
- Vue des accès reçus (lecture seule)
- Une agence avec accès peut voir les véhicules disponibles de l'agence partenaire et les réserver (créer un contrat au nom de son propre client)

---

### 4.12 Demandes de location

**Fonctionnalités :**
- Création d'une demande : nom client, téléphone, dates souhaitées, type de véhicule, budget, notes
- Les agences partenaires ayant accès reçoivent les demandes et peuvent proposer un véhicule avec prix
- Suivi du statut des offres (En attente / Accepté / Refusé)
- Conversion d'une offre acceptée en contrat

---

### 4.13 Chat inter-agences

**Fonctionnalités :**
- Messagerie en temps réel entre utilisateurs d'agences différentes (polling)
- Mode public (visible par tous) ou privé (conversation directe)
- Masquage d'une conversation
- Indicateur de messages non lus

---

### 4.14 Calendrier

**Fonctionnalités :**
- Vue calendrier mensuelle de la flotte
- Visualisation des périodes de location par véhicule
- Indisponibilités manuelles affichées
- Navigation mois par mois

---

### 4.15 Paramètres agence

**Fonctionnalités :**
- Informations légales : nom, adresse, téléphone, email, ICE, IC, RC
- Upload de logo (affiché dans l'interface et sur les PDF)
- Gestion des membres de l'agence : liste, modification du rôle (Admin / Utilisateur)
- Changement de mot de passe personnel
- Changement d'email avec confirmation par code

---

## 5. Administration plateforme (Super Admin)

### 5.1 Gestion des agences

- Création d'agences avec informations complètes
- Activation / désactivation / suspension
- Configuration du contrat d'abonnement (montant, périodicité, dates)
- Toggle : accepte les demandes de location inter-agences
- Paramétrage des accès inter-agences (qui peut voir la flotte de qui)

### 5.2 Facturation

- Création de factures liées à un contrat d'abonnement agence
- Statuts : En attente / Payé / En retard
- Marquage comme payé avec date de paiement et mode de règlement
- Vue par agence avec totaux

### 5.3 Contrats admin

- Vue de tous les contrats de toutes les agences
- Création directe d'un contrat pour n'importe quelle agence

### 5.4 Utilisateurs

- Création de comptes utilisateurs
- Attribution à une agence avec rôle
- Désactivation de compte

### 5.5 Paramètres plateforme

- Nom de la société plateforme, adresse, ICE, IC, RC
- Ces données apparaissent sur les documents générés côté admin

---

## 6. Génération de documents PDF

### 6.1 Contrat de location

Généré côté serveur (Node.js / PDFKit) à la demande :
- En-tête : logo agence + coordonnées (nom, adresse, téléphone, ICE)
- Informations contrat : numéro, statut, dates, lieux
- Informations véhicule : marque, modèle, plaque, couleur, carburant
- Informations client : nom, CIN/Passeport (numéro + expiration), permis (numéro + expiration)
- Conducteur secondaire si présent
- Tableau financier : loyer TTC, acompte, caution, encaissé, reste
- Zone de signature client
- QR code pointant vers `https://www.mobiliscar.com/contract/:contractNumber`

### 6.2 Facture

Générée côté serveur à la demande :
- Référence `F-{contractNumber}`
- En-tête agence en bleu marine
- Informations client
- Tableau des prestations
- Récapitulatif : montant HT, TTC, encaissé, reste à payer
- Clause d'accusé de réception
- Zone de signature client (optionnelle — dessinée en canvas côté frontend, envoyée en base64)
- Deux variantes : sans signature (GET) et avec signature électronique (POST)

---

## 7. Page publique de vérification contrat

- URL : `/contract/:contractNumber` (sans authentification)
- Alimentée par l'endpoint `GET /api/public/contracts/:contractNumber`
- Affiche : numéro + statut, agence, véhicule, client, période + heures, kilométrages, montants, paiements périodiques, notes
- Destinée à être scannée via le QR code du PDF

---

## 8. Interface et ergonomie

### 8.1 Responsive mobile-first

Toutes les pages sont adaptées pour écrans mobiles (≥ 320 px) :
- Navigation latérale collapsible sur mobile
- Listes converties en cartes empilées sur mobile, tableaux sur desktop (`sm:hidden` / `hidden sm:block`)
- Boutons d'action pleine largeur sur mobile (`w-full sm:w-fit`)
- Filtres et formulaires en colonne sur mobile, en ligne sur desktop
- Champs date/time légèrement agrandis globalement (min-height 2.75 rem, py 0.625 rem)

### 8.2 Navigation agence

Menu latéral avec sections :
- Tableau de bord
- Véhicules
- Contrats
- Clients
- Finances (Recettes & Dépenses, Cotisations, Associés, Chèques)
- Maintenance (Vidanges, Pneus, Réparations)
- Partenaires
- Accès inter-agences
- Demandes de location
- Chat
- Calendrier
- Paramètres

### 8.3 Notifications

- Toasts (react-hot-toast) pour les actions : succès, erreur
- Indicateur visuel sur les alertes d'expiration (rouge = expiré, orange = bientôt)

---

## 9. Sécurité

- Authentification JWT obligatoire sur toutes les routes protégées
- Vérification que l'utilisateur appartient bien à l'agence ciblée (`AgencyGuard`)
- Séparation stricte Admin / User pour les données sensibles (soldes, suppressions)
- Les fichiers uploadés sont accessibles uniquement via un endpoint authentifié avec vérification d'appartenance à l'agence
- La page publique `/contract/:contractNumber` ne révèle pas de données financières complètes (pas de solde agence)

---

## 10. Contraintes et règles globales

- Toutes les données sont isolées par agence (multi-tenant)
- La suppression est irréversible (pas de corbeille)
- Les montants sont en MAD par défaut, avec support EUR et USD pour les transactions
- Les dates sont stockées en UTC, affichées en format `dd/MM/yyyy` (locale `fr`)
- Les uploads sont limités aux formats image (JPEG, PNG, WebP) et PDF
