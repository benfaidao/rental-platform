# Déploiement sur Railway

Railway ne lance pas directement `docker-compose.yml` — chaque service est déployé
séparément, mais avec un **déploiement automatique intégré** : il suffit de connecter
le repo GitHub, Railway rebuild et redéploie à chaque `push` sur `main`. **Pas besoin
de GitHub Actions.**

## Architecture sur Railway

| Service Railway | Source | Rôle |
|---|---|---|
| `postgres` | Plugin managé Railway | Base de données (remplace le conteneur `postgres`) |
| `backend` | `./backend` (Dockerfile) | API Node/Express + Prisma, avec un **Volume** sur `/app/uploads` |
| `frontend` | `./frontend` (Dockerfile) | Build React/Vite servi par nginx (interne, pas de domaine public) |
| `gateway` | `./gateway` (Dockerfile, nouveau) | nginx faisant le lien entre `backend`/`frontend` — **seul service avec un domaine public** |

> Le conteneur `minio` du `docker-compose.yml` n'est **pas utilisé par le code**
> (vérifié : aucune référence à MinIO/S3 dans `backend/src`, les fichiers sont stockés
> sur disque via `multer.diskStorage` puis servis par `express.static`). Il est donc
> normal de ne pas le recréer sur Railway — un **Volume Railway** monté sur
> `/app/uploads` du service `backend` suffit pour la persistance des fichiers.

Le service `gateway` reproduit exactement le `nginx.conf` actuel (routage `/api`,
`/uploads`, `/socket.io` vers le backend, le reste vers le frontend), mais avec les
noms d'hôtes internes Railway au lieu des noms de service docker-compose — donc
**aucun changement de code** n'est nécessaire côté frontend/backend.

## 1. Créer le projet et connecter GitHub

1. [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
2. Sélectionnez votre repo `rental-platform`
3. Railway crée un premier service — supprimez-le, on va créer les 4 services manuellement avec le bon "Root Directory" pour chacun

## 2. Ajouter la base de données

**New → Database → Add PostgreSQL**. Railway fournit automatiquement une variable
`DATABASE_URL` — notez le nom de la référence (`${{Postgres.DATABASE_URL}}`), on s'en sert plus bas.

## 3. Service `backend`

**New → GitHub Repo** (même repo) :
- **Settings → Root Directory** : `backend`
- **Settings → Volumes** : ajouter un volume monté sur `/app/uploads`
- **Variables** :
  ```
  DATABASE_URL=${{Postgres.DATABASE_URL}}
  JWT_SECRET=<générez une longue chaîne aléatoire>
  ADMIN_EMAIL=admin@rental.ma
  ADMIN_PASSWORD=<changez ce mot de passe>
  NODE_ENV=production
  PORT=3001
  APP_URL=https://<domaine-public-du-gateway>.up.railway.app
  ```
  (les variables `SMTP_*` sont optionnelles — à ajouter si vous utilisez l'envoi d'e-mails)
- **Settings → Networking** : laissez "Public Networking" désactivé — seul le `gateway` doit être exposé. Le réseau privé Railway expose automatiquement ce service sous `backend.railway.internal`.

## 4. Service `frontend`

**New → GitHub Repo** :
- **Root Directory** : `frontend`
- **Variables** :
  ```
  VITE_API_URL=/api
  ```
  (chemin relatif — c'est le `gateway` qui route `/api` vers le backend, exactement comme avec nginx en local)
- Pas de domaine public ici non plus — accessible en interne via `frontend.railway.internal`.

## 5. Service `gateway`

**New → GitHub Repo** :
- **Root Directory** : `gateway`
- **Variables** :
  ```
  BACKEND_HOST=backend.railway.internal
  BACKEND_PORT=3001
  FRONTEND_HOST=frontend.railway.internal
  FRONTEND_PORT=80
  ```
- **Settings → Networking → Generate Domain** — c'est ce domaine qui sera l'URL publique de l'application (et la valeur à reporter dans `APP_URL` du backend, étape 3).
- Le gateway écoute sur le port fourni dynamiquement par Railway via la variable `$PORT` (substitué dans la config nginx au démarrage par `docker-entrypoint.sh`) — rien à configurer manuellement côté port.

## 6. Premier déploiement

```bash
git remote add origin git@github.com:<votre_user>/rental-platform.git
git push -u origin main
```

Railway construit et démarre les 4 services. Suivez les logs de build/déploiement
dans le dashboard de chaque service. Une fois `backend` démarré, il crée
automatiquement le compte super admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) au premier lancement.

## 7. Déploiements suivants

Rien à faire : chaque `git push` sur `main` déclenche un rebuild + redéploiement
automatique de tous les services dont les fichiers ont changé.

## Notes

- **Schéma de base de données** : le `Dockerfile` du backend ne lance plus
  `prisma db push --accept-data-loss` au démarrage (corrigé suite à un incident de
  perte de données — voir l'historique du projet). Les changements de schéma Prisma
  doivent être appliqués manuellement, par exemple en se connectant au service
  `postgres` via `railway connect postgres` puis en exécutant les `ALTER TABLE`
  nécessaires, ou via `railway run --service backend npx prisma migrate deploy` si
  vous mettez en place des migrations versionnées.
- **Volume `/app/uploads`** : assurez-vous qu'il est bien attaché avant le premier
  déploiement en production — sans lui, les fichiers uploadés seraient perdus à
  chaque redéploiement (système de fichiers éphémère sur Railway).
