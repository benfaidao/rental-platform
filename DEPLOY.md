# Démarrage rapide

## Prérequis
- Docker Engine 24+
- Docker Compose v2

## Lancement

```bash
cd rental-platform

# Copier et adapter les variables d'environnement
cp .env.example .env

# Lancer tous les services
docker compose up -d --build

# Suivre les logs du backend
docker compose logs -f backend
```

L'application est disponible sur **http://localhost**

## Identifiants par défaut

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@rental.ma | Admin123! | Super Admin |

Modifiables dans `.env` via `ADMIN_EMAIL` et `ADMIN_PASSWORD`.

## Services Docker

| Service | Description | Port exposé |
|---------|-------------|-------------|
| nginx | Reverse proxy | **80** |
| frontend | React (Vite + Tailwind) | interne 80 |
| backend | Node.js + Express + Prisma | interne 3001 |
| postgres | Base de données PostgreSQL | interne 5432 |
| minio | Stockage fichiers (S3) | **9001** (console) |

La console MinIO est disponible sur **http://localhost:9001** (minioadmin / minioadmin123).

## Workflow typique

1. Se connecter en tant que Super Admin
2. **Admin > Agences** : créer une agence et ajouter des utilisateurs
3. Se connecter avec un compte agence
4. **Véhicules** : ajouter les voitures avec leurs dates de documents
5. **Contrats** : créer des contrats et télécharger les PDF générés
6. **Maintenance** : enregistrer vidanges, pneus, réparations
7. **Chèques** : suivre les chèques émis et reçus
8. **Finances** : gérer les recettes, dépenses, cotisations

## Arrêt & nettoyage

```bash
# Arrêter
docker compose down

# Arrêter et supprimer les données (⚠️ irréversible)
docker compose down -v
```
