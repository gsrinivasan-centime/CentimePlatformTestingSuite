# Centime QA Portal

A comprehensive Test Management System for QA teams to manage test cases, track releases, integrate with JIRA, and leverage AI for intelligent test case management.

## ✨ Key Features

- **Test Case Management** - Hierarchical organization with modules, sub-modules, and features
- **Test Design Studio** - BDD/Gherkin editor with Monaco IDE and step catalog
- **Release Management** - Track releases, execution progress, and approvals
- **AI-Powered Search** - Semantic similarity search and duplicate detection
- **JIRA Integration** - Story import, bug tracking, and sync
- **Confluence Integration** - Feature file storage and publishing

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 16+
- PostgreSQL 12+ (or use Supabase cloud)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/gsrinivasan-centime/CentimePlatformTestingSuite.git
   cd CentimePlatformTestingSuite
   ```

2. **Configure environment**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your database URL and API keys
   
   # Frontend
   cp frontend/.env.example frontend/.env
   ```

3. **Start the application**
   ```bash
   # Option 1: Using deployment script
   ./deploy_app.sh dev
   
   # Option 2: Manual start
   ./start_backend.sh   # Terminal 1
   ./start_frontend.sh  # Terminal 2
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/docs
   - Login: `admin@centime.com` / `Admin123!`

### Production Deployment

```bash
# Deploy to EC2 (pulls from git)
./deploy_app.sh prod

# Deploy specific branch
./deploy_app.sh prod --branch main

# Backend only
./deploy_app.sh prod --backend-only

# With database migrations
./deploy_app.sh prod --migrate
```

See `./deploy_app.sh --help` for all options.

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Material-UI, Monaco Editor, Recharts |
| **Backend** | FastAPI, Python 3.13, SQLAlchemy, Alembic |
| **Database** | PostgreSQL, pgvector (AI embeddings) |
| **AI/ML** | Sentence Transformers (all-MiniLM-L6-v2) |
| **Integrations** | JIRA Cloud, Confluence |

## 📁 Project Structure

```
CentimePlatformTestingSuite/
├── backend/                 # FastAPI backend
│   ├── alembic/            # Database migrations
│   ├── app/                # Application code
│   │   ├── api/           # API endpoints
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── services/      # Business logic
│   └── requirements.txt
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   └── services/      # API clients
│   └── package.json
├── docs/                   # Documentation
├── deploy_app.sh          # Unified deployment script
├── start_backend.sh       # Backend startup
└── start_frontend.sh      # Frontend startup
```

## 👥 Default Users

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@centime.com | Admin123! |
| Tester | tester@centime.com | Tester123! |

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL status
brew services list | grep postgres

# Start PostgreSQL
brew services start postgresql@16
```

### Backend Won't Start

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend Won't Start

```bash
cd frontend
npm install
```

## 📚 Documentation

For detailed technical documentation including architecture, database schema, AI features, and deployment details:

**➡️ [Architecture & Features Guide](docs/ARCHITECTURE_AND_FEATURES.md)**

Additional guides:
- **[API Documentation](http://localhost:8000/docs)** - Interactive API docs (when backend is running)
- **[BDD Feature Guide](docs/BDD_FEATURE_UPLOAD_GUIDE.md)** - Guide for writing Gherkin feature files
- **[Bulk Upload Guide](docs/BULK_UPLOAD_GUIDE.md)** - Bulk import test cases via CSV

## 📄 License

Internal use only - Centime Inc.
