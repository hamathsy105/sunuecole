# SunuÉcole

Première plateforme de gestion des écoles au Sénégal : élèves, paiements, présences, reçus PDF et rappels WhatsApp.

- **Prix** : 10 000 FCFA / mois, 15 jours d'essai gratuit
- **Paiement abonnement** : Wave **77 912 44 34** (Hamath Sy)
- **Support** : Wave / WhatsApp **77 912 44 34**

## Installation

```sh
npm install
npm run dev
```

L'app démarre sur http://localhost:8080.

## Configuration

Copiez `.env.example` vers `.env` et renseignez les clés de votre backend (Supabase / Lovable Cloud) :

```sh
cp .env.example .env
```

| Variable | Rôle |
| --- | --- |
| `VITE_SUPABASE_URL` | URL du backend (navigateur) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé publique (navigateur) |
| `VITE_SUPABASE_PROJECT_ID` | Identifiant du projet backend |
| `SUPABASE_URL` | URL du backend (côté serveur) |
| `SUPABASE_PUBLISHABLE_KEY` | Clé publique (côté serveur) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé privée serveur — ne jamais exposer au navigateur |

Le numéro Wave de paiement (77 912 44 34) est une information publique affichée dans l'app, pas un secret.

## Stack

- TanStack Start (React 19 + Vite)
- TypeScript
- Tailwind CSS v4
- Lovable Cloud (base de données, authentification, stockage des preuves de paiement)
- PWA installable (iPhone, Android, PC)

## Fonctionnalités

- Tableau de bord : élèves, impayés du mois, recettes du mois, présents du jour
- Encaissement des mensualités (Espèces / Wave) avec reçu PDF professionnel automatique
- Historique des paiements : reçus consultables, téléchargeables, partageables par WhatsApp
- Rappels WhatsApp pré-remplis aux tuteurs
- Abonnement : essai 15 jours, blocage automatique à expiration, validation admin 30 jours
- Page admin réservée (liste des écoles, preuves Wave, approbation)
- Isolation des données : chaque école ne voit que ses propres élèves et paiements (RLS)

## Hébergement

Le code est standard et portable : `npm run build` produit un build déployable sur tout hébergeur compatible Node/edge. Les données restent dans le backend cloud ; prévoyez les variables d'environnement ci-dessus sur votre hébergeur.
