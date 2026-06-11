# Cahier des Charges — Plateforme de Gestion de Location de Véhicules

**Projet :** mobiliscar.com  
**Date :** Juin 2026  
**Version :** 1.0

---

## 1. Présentation générale

### 1.1 Contexte

La plateforme est un système de gestion multi-agences dédié à la location de véhicules. Elle permet à des agences de location indépendantes de gérer l'intégralité de leur activité depuis une interface web : véhicules, contrats, clients, finances, maintenance, sinistres et communication inter-agences.

### 1.2 Objectifs

- Centraliser la gestion opérationnelle d'une ou plusieurs agences de location
- Fournir une visibilité en temps réel sur la flotte, les revenus et les alertes
- Faciliter la relation client grâce à des contrats PDF générés automatiquement
- Permettre la coopération entre agences (partage de flotte, demandes de location)
- Offrir une interface utilisable sur mobile comme sur ordinateur

### 1.3 Domaine de déploiement

L'application est hébergée sur `https://www.mobiliscar.com` (VPS dédié, stack Docker).

---

## 2. Utilisateurs et rôles

### 2.1 Super Administrateur (`SUPER_ADMIN`)

Accès complet à l'ensemble de la plateforme :
- Gestion des agences (création, activation, suspension)
- Gestion des utilisateurs de la plateforme
- Gestion des contrats-cadres agence/plateforme
- Gestion de la facturation des agences
- Paramétrage de la plateforme (informations société)
- Tableau de bord global

### 2.2 Administrateur d'agence (`AGENCY_ADMIN`)

Accès complet à son agence :
- Toutes les fonctionnalités opérationnelles
- Gestion des membres de l'agence (ajout, modification des rôles)
- Paramétrage de l'agence (logo, coordonnées, ICE, RC, IC)

### 2.3 Utilisateur d'agence (`AGENCY_USER`)

Accès opérationnel à son agence :
- Consultation et gestion des contrats, clients, véhicules
- Accès aux finances et à la maintenance
- Pas d'accès à la gestion des membres ni aux paramètres

### 2.4 Visiteur public (sans compte)

Accès en lecture seule à la page de visualisation d'un contrat via QR code (`/contract/:contractNumber`) — sans authentification.

---

## 3. Architecture technique

### 3.1 Stack

| Composant | Technologie |
|---|---|
| Frontend | React 18, Tailwind CSS, React Query, React Router |
| Backend | Node.js, Express.js |
| Base de données | PostgreSQL via Prisma ORM |
| Temps réel | Socket.io |
| PDF | PDFKit |
| QR Code | `qrcode` npm |
| Authentification | JWT (JSON Web Tokens) |
| Fichiers | Upload local servi par Express |
| Reverse proxy | Nginx |
| Conteneurisation | Docker Compose |
| CI/CD | GitHub Actions → déploiement SSH sur VPS |
| TLS | Let's Encrypt (Certbot, renouvellement automatique) |

### 3.2 Infrastructure

- **VPS** : 213.32.22.144
- **Domaine** : mobiliscar.com + www.mobiliscar.com (HTTPS)
- **Services Docker** : `frontend`, `backend`, `postgres`, `nginx`
- **CI/CD** : push sur `main` → build images Docker → push GHCR → déploiement automatique

### 3.3 Sécurité

- Authentification par JWT stocké en `localStorage`
- Toutes les routes backend (sauf `/auth` et `/public`) requièrent un token valide
- Vérification que l'utilisateur appartient à l'agence qu'il tente d'accéder
- HTTPS obligatoire en production
- Helmet.js activé (headers de sécurité HTTP)
- Réinitialisation de mot de passe par email avec token à usage unique

---

## 4. Modules fonctionnels

### 4.1 Authentification

- **Connexion** : email + mot de passe, retourne un JWT
- **Mot de passe oublié** : envoi d'un lien de réinitialisation par email
- **Réinitialisation de mot de passe** : via token sécurisé à usage unique
- **Changement de mot de passe** : depuis les paramètres de profil
- **Changement d'email** : demande + confirmation par code

---

### 4.2 Tableau de bord (Dashboard)

Accessible par chaque agence, affiche en temps réel :

**Statistiques clés (4 indicateurs)**
- Véhicules disponibles aujourd'hui / total
- Véhicules en location
- Contrats actifs (+ en attente)
- Solde en espèces / revenus totaux

**Statistiques partenaires** (si applicables)
- Véhicules partenaires disponibles / total
- Véhicules partenaires loués par l'agence

**Alertes opérationnelles**
- Départs dans les 7 jours (contrats en réservation)
- Retours attendus dans les 3 jours
- Contrats se terminant bientôt
- Contrôles techniques à renouveler dans les 30 jours
- Assurances expirant dans les 30 jours
- Vidanges à prévoir (par date et par kilométrage)
- Réparations planifiées

**Outils intégrés**
- Recherche de disponibilité véhicules sur une période (propres véhicules + partenaires)
- Gantt mensuel de disponibilité des véhicules avec navigation mois par mois
- Alertes chèques non exploités (émis / reçus)
- Alerte facturation plateforme en retard

---

### 4.3 Gestion des véhicules (Flotte)

**Informations par véhicule**
- Identité : marque, modèle, année, couleur, carburant, boîte de vitesses
- Immatriculations : plaque WW (provisoire) + plaque définitive
- Dates clés : contrôle technique (dernier/prochain), assurance, autorisation de circulation, date d'achat
- Financier : prix d'achat, prix de location TTC
- Kilométrage actuel, notes libres
- Statut : Disponible / En location / Maintenance / Inactif
- QR Code unique par véhicule (pour scan rapide lors de la création de contrat)

**Gestion de la flotte**
- Ajout, modification, désactivation de véhicules
- Vue liste avec filtres (statut, recherche texte)

**Onglets détail par véhicule**

| Onglet | Contenu |
|---|---|
| Contrats | Liste des contrats liés au véhicule |
| Maintenance | Vidanges, réparations, pneumatiques |
| Documents | Upload de documents (carte grise, assurance, etc.) |
| Indisponibilités | Périodes bloquées manuellement (hors location) |

**Maintenance**
- Vidanges : date, kilométrage, type d'huile, filtre changé, coût, prochaine date/km
- Configuration de l'intervalle de vidange (km + mois) par véhicule
- Réparations : date, description, kilométrage, coût, garage, prochaine réparation planifiée, photos
- Pneumatiques : date, position, marque, taille, coût

---

### 4.4 Gestion des contrats

**Création d'un contrat**
- Sélection du véhicule (recherche texte + scan QR code)
- Remplissage des informations client :
  - Recherche d'un client existant (auto-complétion)
  - Nom complet, CIN/Passeport (numéro + date d'expiration), permis de conduire (numéro + date d'expiration)
  - Téléphone, email, adresse
  - Type de client : Particulier ou Entreprise (ICE + raison sociale)
- 2ème conducteur optionnel (nom, CIN, permis)
- Dates et heures de départ/retour
- Lieux de prise en charge et de restitution
- Kilométrage de départ
- Montant de location, devise (MAD/EUR/USD)
- Montant encaissé + encaissé par (membre de l'agence ou nom libre) + date d'encaissement
- Caution encaissée (espèces)
- Chèque de garantie (montant + numéro de chèque)
- Type de location : Standard ou Périodique (semaine/mois)
- Intervalle : Fermé (date fixe) ou Ouvert (date estimée)
- Dépassement kilométrique : autorisé ou non
- Sous-location avec nom du loueur
- Statut (Réservation / Réservation confirmée / En cours / Terminé / Annulé)
- Notes libres

**Numérotation automatique** des contrats (format unique par agence)

**Statuts du contrat**

| Statut | Description |
|---|---|
| En attente | Statut initial (conservé pour rétrocompatibilité) |
| Réservation | Client intéressé, pas encore confirmé |
| Réservation confirmée | Réservation validée |
| En cours | Véhicule sorti |
| Terminé | Véhicule rendu |
| Annulé | Contrat annulé |

**Actions sur un contrat**
- Télécharger le PDF du contrat
- Signer le contrat en ligne (signatures client, 2ème conducteur, agence) et télécharger le PDF signé
- Upload manuel d'un contrat signé (scan papier/PDF)
- Ajouter des photos de l'état du véhicule (début / fin de location)
- Gérer les paiements périodiques (pour locations longue durée)
- Déclarer un sinistre lié au contrat
- Modifier ou supprimer le contrat

**Paiements périodiques** (contrats périodiques)
- Ajout de périodes de paiement (début, fin, montant, date de paiement, notes)
- Marquage payé/non payé
- Récapitulatif : total, payé, restant

**Filtres et recherche**
- Filtres par statut
- Recherche par numéro de contrat ou nom de client
- Scan QR code pour retrouver un contrat
- Historique avec filtres avancés (client, véhicule, statut, période, texte libre)
- Historique par client (avec statistiques : nombre de locations, montant total, encaissé)

---

### 4.5 Contrat PDF

Le contrat PDF généré contient :

**En-tête**
- QR code renvoyant vers `https://www.mobiliscar.com/contract/<numéro>` (page de visualisation publique)
- Numéro de contrat sous le QR code
- Nom et coordonnées de l'agence (nom, adresse, téléphone, email, ICE)

**Sections**
- Informations véhicule (marque, modèle, immatriculation, kilométrage)
- Informations client (nom, CIN/Passeport + expiration, permis + expiration, téléphone, email, adresse)
- 2ème conducteur (si présent)
- Période de location (date/heure départ → retour, lieux)
- Informations financières : montant, TTC, encaissé, garantie encaissée, caution chèque (montant + numéro)
- Dépassement kilométrique autorisé ou non
- Notes
- Tableau récapitulatif des paiements périodiques (si applicable)
- Zone de signatures (client, 2ème conducteur si applicable, agence)

---

### 4.6 Visualisation publique d'un contrat

URL : `https://www.mobiliscar.com/contract/:contractNumber`

Page accessible sans authentification (via QR code du PDF) affichant :
- Numéro de contrat et statut
- Informations agence
- Informations véhicule
- Informations locataire (documents d'identité, permis)
- Période de location avec heures et lieux
- Kilométrages
- Informations financières (montants, garanties, chèques)
- Échéancier de paiement (si périodique)
- Notes

---

### 4.7 Gestion des clients

**Fiche client**
- Type : Particulier ou Entreprise
- Particulier : nom, prénom, téléphone, email, adresse
- Entreprise : raison sociale, ICE, nom du représentant
- Pièce d'identité : type (CIN/Passeport), numéro, date d'expiration, fichier joint
- Permis de conduire : numéro, date d'expiration, fichier joint
- Historique complet des locations

**Fonctionnalités**
- Création, modification, suppression
- Upload de documents (photo CIN, permis)
- Recherche par nom, téléphone, numéro de pièce
- Auto-complétion lors de la création de contrat

---

### 4.8 Gestion financière

**Onglet Recettes & Dépenses**

Enregistrement de toutes les transactions financières :

| Type | Description |
|---|---|
| Recette | Entrée d'argent |
| Dépense | Sortie d'argent |
| Cotisation | Apport d'un associé |
| Règlement de compte | Paiement entre associés |
| Frais bancaires | Frais de la banque |
| Retrait de bénéfices | Retrait en espèces |
| Retrait de bénéfices (banque) | Retrait bancaire |
| Virement de caisse | Transfert entre caisses |

Pour chaque transaction : montant, devise, description, date, catégorie, associé lié (optionnel), notes

Récapitulatif : total recettes / dépenses / solde sur la période filtrée

**Onglet Cotisations**

Suivi des apports des associés par période (semaine/mois/année) :
- Associé, montant, date, période, notes
- Récapitulatif des cotisations par associé

**Onglet Associés / Employés**

Gestion des membres financiers de l'agence :
- Nom, email, téléphone, rôle, pourcentage de parts
- Activation/désactivation

**Onglet Chèques**

Deux sous-onglets : Chèques émis / Chèques reçus

Pour chaque chèque :
- Numéro de chèque, bénéficiaire, montant, date, date d'encaissement
- Statut : Payé / Non exploité / Annulé
- Motif, commentaire

Alertes chèques non exploités sur le tableau de bord.

---

### 4.9 Sinistres

Gestion des incidents liés aux véhicules :

- Titre, description, véhicule concerné, contrat associé (optionnel)
- Statut : Ouvert / Résolu
- Montant perçu en indemnisation + date de perception
- Lien automatique à une transaction financière lors de l'encaissement
- Upload de photos du sinistre
- Accessible depuis la page Sinistres (liste globale) ou depuis un contrat spécifique

---

### 4.10 Accès inter-agences

Mécanisme permettant à une agence de partager sa flotte avec une autre :

- Agence A accorde l'accès à agence B (tout ou partie de la flotte)
- Agence B peut voir et réserver les véhicules de A
- Accès de type : Tous les véhicules ou liste sélective de véhicules
- Les réservations faites par B apparaissent dans les contrats de A avec la mention de l'agence réservatrice

---

### 4.11 Demandes de location (inter-agences)

Permet à une agence de publier une demande de location pour un client et de recevoir des offres d'autres agences :

- Création d'une demande (nom client, téléphone, dates, type de voiture, budget, notes)
- Réception d'offres des agences partenaires (véhicule, prix, notes)
- Acceptation ou refus d'une offre
- Paramétrage : activation/désactivation des demandes entrantes par agence

---

### 4.12 Partenaires

Annuaire des partenaires commerciaux de l'agence :
- Informations : nom, type, adresse, téléphone, email, site web, notes
- Contacts multiples par partenaire (nom, rôle, téléphone, email)

---

### 4.13 Chat

Messagerie interne entre utilisateurs de la plateforme :

- **Canal public** : visible par tous les utilisateurs de toutes les agences
- **Messagerie privée** : entre deux utilisateurs
- Notifications de nouveaux messages en temps réel (Socket.io)
- Badge compteur de messages non lus
- Suppression de conversations

---

### 4.14 Paramètres de l'agence

- Informations légales : nom, adresse, téléphone, email, ICE, IC, RC
- Logo de l'agence (utilisé dans les PDF)
- Profil personnel (nom, prénom, téléphone, email)
- Changement de mot de passe
- Changement d'email (avec confirmation par code)

---

### 4.15 Gestion des membres de l'agence (Admin)

- Ajout d'un membre existant à l'agence (par email)
- Création d'un nouveau compte utilisateur depuis l'agence
- Modification du rôle (Admin / Utilisateur)
- Retrait d'un membre

---

## 5. Module d'administration plateforme

### 5.1 Tableau de bord admin

Vue globale sur l'activité de la plateforme :
- Nombre total d'agences, d'utilisateurs, de contrats
- Statistiques de facturation

### 5.2 Gestion des agences

- Création, modification, activation/suspension d'agences
- Affichage des membres de chaque agence

### 5.3 Gestion des utilisateurs

- Liste des utilisateurs de la plateforme
- Création, modification, suppression
- Attribution de rôles (SUPER_ADMIN, AGENCY_ADMIN, AGENCY_USER)

### 5.4 Contrats-cadres (plateforme/agence)

Contrats d'abonnement entre la plateforme et les agences :
- Date de début/fin, montant TTC, périodicité
- Statut : Actif / Terminé

### 5.5 Facturation des agences

- Génération de factures d'abonnement
- Suivi des paiements (En attente / Payé / En retard)
- Génération de PDF de facture
- Alertes sur le tableau de bord agence si facture en retard

### 5.6 Paramètres plateforme

- Informations de la société opératrice (nom, adresse, ICE, IC, RC)

---

## 6. Interface utilisateur

### 6.1 Design

- Interface en français
- Palette bleu/gris professionnelle
- Composants réutilisables : `card`, `badge`, `btn-primary`, `btn-secondary`, `input`, `label`
- Icônes Lucide React

### 6.2 Responsive / Mobile

L'ensemble de l'application est adapté aux écrans mobiles (320px et plus) :

| Page | Adaptation |
|---|---|
| Dashboard | 2 colonnes de stats sur mobile, cartes compactes |
| Véhicules | Tabs scrollables, cartes mobiles |
| Contrats | Cartes mobiles avec actions, formulaire en 1 colonne |
| Clients | Cartes avec actions en bas séparées |
| Finances | Cartes mobiles pour transactions et cotisations |
| Chèques | Cartes mobiles avec toutes les informations |
| Sinistres | Formulaire en 1 colonne sur mobile |
| Historique | Cartes de contrats sur mobile |

Stratégie : vue cartes sur mobile (`sm:hidden`) + tableau sur desktop (`hidden sm:block`), formulaires en `grid-cols-1 md:grid-cols-2`.

### 6.3 Navigation

- Sidebar latérale sur desktop
- Navigation adaptée sur mobile
- Redirection automatique vers la première agence de l'utilisateur à la connexion

---

## 7. Contraintes et exigences non-fonctionnelles

### 7.1 Performance

- Chargement des données via React Query avec mise en cache
- Génération PDF côté serveur (pas de rendu client)
- Upload de fichiers limité à 10 Mo par requête

### 7.2 Disponibilité

- Déploiement continu via GitHub Actions (zéro downtime avec `docker compose up -d`)
- HTTPS avec renouvellement automatique des certificats Let's Encrypt

### 7.3 Données

- Base PostgreSQL avec relations intégrales (clés étrangères, cascades)
- Migrations de schéma via Prisma
- Sauvegarde des fichiers uploadés dans un volume Docker persistant

### 7.4 Internationalisation

- Interface entièrement en français
- Formats de date en français (`dd/MM/yyyy`)
- Devise principale : MAD, avec support EUR et USD

---

## 8. Récapitulatif des entités métier

| Entité | Description |
|---|---|
| Agency | Agence de location |
| User | Utilisateur de la plateforme |
| Car | Véhicule de la flotte |
| Client | Client locataire |
| RentalContract | Contrat de location |
| PeriodicPayment | Paiement d'une période (contrat périodique) |
| ContractPhoto | Photo de l'état du véhicule |
| ContractDocument | Document joint au contrat (contrat signé) |
| OilChange | Vidange |
| Repair | Réparation |
| TireRecord | Changement de pneumatique |
| CarDocument | Document lié au véhicule |
| CarUnavailability | Période d'indisponibilité manuelle |
| Sinistre | Déclaration de sinistre |
| CheckIssued | Chèque émis |
| CheckReceived | Chèque reçu |
| FinancialTransaction | Transaction financière |
| Associate | Associé / employé |
| Contribution | Cotisation d'un associé |
| Partner | Partenaire commercial |
| AgencyAccess | Accès inter-agences |
| RentalRequest | Demande de location inter-agences |
| RentalOffer | Offre en réponse à une demande |
| AgencyContract | Contrat-cadre plateforme/agence |
| AgencyBilling | Facture d'abonnement |
| ChatMessage | Message du chat |
