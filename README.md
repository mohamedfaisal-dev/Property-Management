# 🏠 Système de Gestion Immobilière

## 📖 Vue d'Ensemble

Système complet de gestion immobilière avec génération automatique de factures, suivi des paiements, gestion des propriétés et des locataires.

---

## 🚀 Démarrage Rapide

### 1. Installation

```bash
# Backend
cd backend
npm install

# Frontend
cd ..
npm install
```

### 2. Configuration

```bash
cd backend
cp env.example .env
# Éditer .env avec vos paramètres de base de données
```

### 3. Migrations de la Base de Données

```bash
cd backend
node scripts/createProfitsTable.js
node scripts/addBillPaymentColumns.js
```

### 4. Lancement

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd ..
npm run dev
```

Ouvrir : http://localhost:5173

---

## ✨ Fonctionnalités

### 🏢 Gestion des Propriétés
- Ajout/Modification/Suppression de propriétés
- Upload de photos
- Détails complets (adresse, loyer, charges)

### 👥 Gestion des Locataires
- Profils complets des locataires
- Historique des paiements
- Statut actif/inactif

### 💰 Facturation Automatique
- **Génération automatique** le 1er de chaque mois à 9h00
- Génération manuelle via interface ou scripts
- Format PDF français "QUITTANCE DE LOYER"
- Calcul automatique : Loyer + Charges = Total

### 📄 PDFs
- Génération rapide (~50ms)
- Format français standard
- Téléchargement depuis l'interface
- Téléchargement multiple

### 📊 Dashboard & Analytics
- Vue d'ensemble des revenus
- Statistiques des propriétés
- Suivi des paiements
- Profits en temps réel

---

## 🧪 Tests

### Test Rapide (5 minutes)

```bash
cd backend

# Test du système
node scripts/testBillPDF.js

# Test de génération de factures
node scripts/generateBillsNow.js
```

### Tests Complets

Voir : **[START_HERE.md](START_HERE.md)** pour le guide complet de test.

---

## 📚 Documentation

### Guides Principaux

| Fichier | Description |
|---------|-------------|
| **[START_HERE.md](START_HERE.md)** | 👈 Point de départ recommandé |
| **[LANCEMENT_RAPIDE.md](LANCEMENT_RAPIDE.md)** | Installation et configuration |
| **[GUIDE_GENERATION_AUTOMATIQUE.md](GUIDE_GENERATION_AUTOMATIQUE.md)** | Génération automatique de factures |
| **[PDF_FIXED_AND_TESTED.md](PDF_FIXED_AND_TESTED.md)** | Système de génération PDF |

### Guides de Test

| Fichier | Description |
|---------|-------------|
| **[TEST_SIMPLE.md](TEST_SIMPLE.md)** | Test rapide en 3 commandes |
| **[RUN_ALL_TESTS.md](RUN_ALL_TESTS.md)** | Tests complets + dépannage |

### Corrections et Historique

| Fichier | Description |
|---------|-------------|
| **[ERREUR_CORRIGEE.md](ERREUR_CORRIGEE.md)** | Correction des colonnes manquantes |
| **[CORRECTION_ERREUR_500.md](CORRECTION_ERREUR_500.md)** | Correction de l'erreur 500 |
| **[FACTURES_AUTOMATIQUES_READY.md](FACTURES_AUTOMATIQUES_READY.md)** | Système de génération automatique |

---

## 🛠️ Scripts Utiles

### Génération de Factures

```bash
cd backend

# Mois en cours
node scripts/generateBillsNow.js

# Mois spécifique
node scripts/generateBillsForMonth.js 2025-12
```

### Tests

```bash
cd backend

# Test du système complet
node scripts/testBillPDF.js

# Test de téléchargement PDF
node scripts/testPDFDownload.js
```

### Migrations

```bash
cd backend

# Créer la table profits
node scripts/createProfitsTable.js

# Ajouter les colonnes de paiement
node scripts/addBillPaymentColumns.js
```

---

## 🏗️ Architecture

### Backend (Node.js + Express)
```
backend/
├── config/          # Configuration base de données
├── controllers/     # Logique métier
├── models/          # Modèles Sequelize
├── routes/          # Routes API
├── services/        # Services (PDF, Email, Scheduler)
├── scripts/         # Scripts utilitaires
└── uploads/         # Fichiers uploadés
```

### Frontend (React + TypeScript)
```
src/
├── components/      # Composants réutilisables
├── pages/          # Pages principales
├── api.js          # Client API
└── main.tsx        # Point d'entrée
```

---

## 🔧 Technologies

### Backend
- Node.js 18+
- Express.js
- Sequelize ORM
- MariaDB/MySQL
- PDFKit (génération PDF)
- node-cron (planification)

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- Axios

---

## 📋 Checklist de Déploiement

### Backend
- [ ] ✅ MariaDB installé et démarré
- [ ] ✅ Variables d'environnement (.env) configurées
- [ ] ✅ Migrations exécutées
- [ ] ✅ Backend démarré (port 4002)
- [ ] ✅ Scheduler activé

### Frontend
- [ ] ✅ Dépendances installées
- [ ] ✅ Variables d'environnement configurées
- [ ] ✅ Frontend démarré (port 5173)

### Tests
- [ ] ✅ Login fonctionne
- [ ] ✅ Création de facture OK
- [ ] ✅ Téléchargement PDF OK
- [ ] ✅ Génération automatique configurée

---

## 🎯 Statut du Système

| Composant | Statut |
|-----------|--------|
| Base de données | ✅ Opérationnel |
| Backend API | ✅ Opérationnel |
| Frontend | ✅ Opérationnel |
| Génération de factures | ✅ Opérationnel |
| PDFs | ✅ Opérationnel |
| Scheduler automatique | ✅ Activé |
| Tests | ✅ Tous passés |

**→ Système 100% Opérationnel ! 🎉**

---

## 🐛 Dépannage

### Erreur: "Column 'rent_amount' not found"
```bash
cd backend
node scripts/addBillPaymentColumns.js
```

### Erreur: "Table 'profits' doesn't exist"
```bash
cd backend
node scripts/createProfitsTable.js
```

### Erreur: "ECONNREFUSED"
- Vérifier que MariaDB est démarré
- Vérifier les paramètres dans `.env`

### Consulter la Documentation
Voir **[RUN_ALL_TESTS.md](RUN_ALL_TESTS.md)** section "Dépannage"

---

## 📞 Support

Pour plus d'aide, consultez :
- **[START_HERE.md](START_HERE.md)** - Par où commencer
- **[TEST_SIMPLE.md](TEST_SIMPLE.md)** - Tests rapides
- **[RUN_ALL_TESTS.md](RUN_ALL_TESTS.md)** - Dépannage détaillé

---

## 📄 Licence

Système propriétaire de gestion immobilière.

---

## 👥 Équipe

Développé pour la gestion immobilière avec facturation automatique en français.

---

**Version:** 1.0.0  
**Date:** Octobre 2025  
**Statut:** ✅ Production Ready

