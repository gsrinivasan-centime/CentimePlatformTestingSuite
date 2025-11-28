# Centime Test Management System

Quality Assurance portal for managing test cases, releases, and JIRA integration.

## 🚨 Important: PostgreSQL Migration

**This application now uses PostgreSQL instead of SQLite.**

If you're seeing database errors, follow the Quick Start guide below.

## 🚀 Quick Start

### First Time Setup

1. **Install PostgreSQL**
   ```bash
   ./setup_postgresql_macos.sh
   ```

2. **Setup Backend**
   ```bash
   cd backend
   ./migrate_to_postgresql.sh
   ```

3. **Start Application**
   ```bash
   # Terminal 1 - Backend
   ./start_backend.sh
   
   # Terminal 2 - Frontend
   ./start_frontend.sh
   ```

4. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/docs
   - Login: admin@centime.com / Admin123!

### Already Setup?

Just start the servers:
```bash
./start_backend.sh  # Terminal 1
./start_frontend.sh # Terminal 2
```

## 📚 Documentation

- **[Quick Start Guide](QUICKSTART_POSTGRESQL.md)** - Get running in 5 minutes
- **[Migration Checklist](MIGRATION_CHECKLIST.md)** - Step-by-step migration guide
- **[PostgreSQL Setup](docs/POSTGRESQL_SETUP.md)** - Detailed PostgreSQL instructions
- **[Backend README](backend/README.md)** - Backend documentation
- **[Setup Guide](docs/SETUP_GUIDE.md)** - Complete setup instructions

## 🗂️ Project Structure

```
CentimePlatformTestingSuite/
├── backend/                 # FastAPI backend
│   ├── alembic/            # Database migrations
│   ├── app/                # Application code
│   ├── init_db_postgres.py # Database initialization
│   └── migrate_to_postgresql.sh
├── frontend/               # React frontend
│   ├── src/
│   └── package.json
├── docs/                   # Documentation
├── test_suite/            # Automated tests
└── setup_postgresql_macos.sh
```

## 🛠️ Tech Stack

- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, Alembic
- **Frontend**: React 18, Material-UI
- **Database**: PostgreSQL 12+
- **Testing**: Pytest, Selenium
- **Integrations**: JIRA, Confluence

## 📋 Features

- ✅ Test case management with hierarchy
- ✅ Release management and tracking
- ✅ JIRA story integration
- ✅ Bug/issue tracking with media attachments
- ✅ Execution status tracking
- ✅ BDD/Gherkin support
- ✅ Step catalog
- ✅ Test automation integration
- ✅ Reports and analytics

## 🔧 Requirements

- Python 3.9+
- Node.js 16+
- PostgreSQL 12+
- npm or yarn

## 🐛 Troubleshooting

### "Can't connect to database"

1. Check PostgreSQL is running:
   ```bash
   brew services list
   ```

2. Start PostgreSQL if needed:
   ```bash
   brew services start postgresql@16
   ```

3. Verify database exists:
   ```bash
   psql -U $(whoami) postgres -l | grep test_management
   ```

### "Migration errors"

1. Check DATABASE_URL in backend/.env
2. Reset database:
   ```bash
   cd backend
   psql -U $(whoami) postgres -c "DROP DATABASE test_management;"
   psql -U $(whoami) postgres -c "CREATE DATABASE test_management;"
   alembic upgrade head
   python init_db_postgres.py
   ```

### "Module not found"

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

## 📖 Additional Resources

- [API Documentation](http://localhost:8000/docs) (when backend is running)
- [JIRA Integration Setup](docs/JIRA_INTEGRATION_SETUP.md)
- [Bulk Upload Guide](docs/BULK_UPLOAD_GUIDE.md)
- [BDD Feature Guide](docs/BDD_FEATURE_UPLOAD_GUIDE.md)

## 👥 Default Users

After initialization:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@centime.com | Admin123! |
| Tester | tester@centime.com | Tester123! |

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Create migrations if needed: `alembic revision --autogenerate -m "description"`
4. Test your changes
5. Submit a pull request

## 📄 License

Internal Centime Project

---

**Need Help?** Check [QUICKSTART_POSTGRESQL.md](QUICKSTART_POSTGRESQL.md) for immediate assistance.
