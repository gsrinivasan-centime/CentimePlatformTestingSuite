# Centime Test Management - Frontend

React-based frontend for the Centime Test Management System.

## Features

- 🔐 User Authentication (Login/Register)
- 📊 Dashboard with Statistics
- 📝 Test Case Management (CRUD)
- ▶️ Test Execution Interface
- 📈 Reports and Analytics
- 👥 User Management (Admin)
- 🎨 Material UI Design

## Prerequisites

- Node.js 16+ and npm
- Backend API running on http://localhost:8000

## Quick Start

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm start
```

The application will open at http://localhost:3000

## Available Scripts

### `npm start`
Runs the app in development mode at http://localhost:3000

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder

## Environment Variables

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_APP_NAME=Centime Test Management
REACT_APP_ALLOWED_EMAIL_DOMAIN=centime.com
```

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── Layout.js       # Main layout with sidebar
│   └── ProtectedRoute.js  # Route guards
├── context/            # React Context
│   └── AuthContext.js  # Authentication state
├── pages/              # Page components
│   ├── Login.js        # Login page
│   ├── Register.js     # Registration page
│   ├── Dashboard.js    # Dashboard with statistics
│   ├── TestCases.js    # Test case management (CRUD)
│   ├── Executions.js   # Test execution interface
│   ├── Reports.js      # PDF reports and analytics
│   ├── Modules.js      # Module management (Admin)
│   ├── Releases.js     # Release management
│   └── Users.js        # User management (Admin)
├── services/           # API services
│   └── api.js          # Axios API client
├── App.js              # Main app component
└── index.js            # Entry point
```

## Default Credentials

After backend initialization:
- **Admin**: admin@centime.com / Admin123!
- **Tester**: tester@centime.com / Tester123!

## Technologies Used

- React 18
- Material-UI 5
- React Router 6
- Axios
- Recharts (for charts)

## API Integration

The frontend connects to the FastAPI backend at `http://localhost:8000/api`

Ensure the backend is running before starting the frontend.

## Pages Overview

### 🔐 Authentication
- **Login**: User authentication with demo credentials display
- **Register**: New user registration with @centime.com email validation

### 📊 Dashboard
- Overview statistics (test cases, modules, releases)
- Pass/fail rates and trends
- Recent test executions

### 📝 Test Cases
- Create, read, update, delete test cases
- Filter by module and test type
- View test case details
- Table with pagination

### ▶️ Executions
- Execute tests with selected release
- View execution history
- Real-time execution status
- Detailed execution logs and error messages
- Statistics cards for pass/fail/pending

### 📈 Reports
- Generate test execution reports
- Filter by release and module
- Download PDF reports
- Module-wise summary tables
- Failed test details
- Pass rate calculations

### 🗂️ Modules (Admin Only)
- Create and edit modules
- Module descriptions
- Delete modules
- View all modules in table format

### 🚀 Releases
- Create and manage releases
- Version and release date tracking
- Release progress indicators
- Status tracking (Released/Scheduled/In Progress)
- Release descriptions

### 👥 Users (Admin Only)
- Create and edit users
- Role management (Admin/Tester)
- Email validation (@centime.com)
- User statistics
- Delete users

## Features

### Implemented ✅
- User authentication (login/register)
- Dashboard with statistics
- Complete test case management
- Test execution interface
- PDF report generation
- Module management (Admin)
- Release management
- User management (Admin)
- Role-based access control
- Responsive Material UI design
- Test case management (CRUD)
- Protected routes
- Material UI design

### Planned ⏳
- Test execution interface
- Reports and PDF download
- Module management
- Release management
- User management (admin)
- Charts and visualizations

## Development

The frontend is configured to proxy API requests to the backend during development.

CORS is handled by the backend (FastAPI) configuration.

## Production Build

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

Deploy the contents of the `build` folder to your hosting service (Vercel, Netlify, S3, etc.)

## Support

For issues or questions, refer to the main project documentation or contact qa@centime.com
