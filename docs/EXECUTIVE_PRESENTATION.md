# Centime QA Portal - Executive Presentation

**For: Head of Engineering**  
**Date:** November 27, 2025  
**Prepared by:** QA Engineering Team

---

## 📋 Executive Summary

The **Centime QA Portal** is an in-house, enterprise-grade test management platform designed to centralize and streamline all QA activities across the organization. It replaces fragmented tools (spreadsheets, manual tracking) with a unified system that integrates directly with JIRA and supports both manual and automated testing workflows.

### Key Value Propositions
- **Centralized Test Repository** - Single source of truth for all test cases
- **JIRA Integration** - Seamless story-to-test-case traceability
- **Release Management** - Complete visibility into release readiness
- **Cost Savings** - Eliminates need for expensive third-party tools (TestRail, Zephyr, etc.)
- **Customization** - Built for Centime's specific workflows

---

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                               │
│         React 18 + Material-UI (Deployed: qa-portal.ddns.net)       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Dashboard │ │Test Cases│ │Releases  │ │Reports   │ │JIRA      │  │
│  │          │ │          │ │          │ │          │ │Stories   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ REST API (HTTPS)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND LAYER                                │
│              FastAPI + Python 3.13 (AWS EC2: Port 8000)             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │JWT Auth  │ │CRUD APIs │ │JIRA      │ │PDF       │ │BDD       │  │
│  │& RBAC    │ │          │ │Service   │ │Generator │ │Parser    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ SQLAlchemy ORM
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER                               │
│                    Supabase (Cloud PostgreSQL)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Users     │ │Test Cases│ │Releases  │ │Executions│ │JIRA      │  │
│  │& Roles   │ │& Modules │ │          │ │          │ │Stories   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL INTEGRATIONS                           │
│           JIRA Cloud API  •  Confluence (Planned)  •  Slack         │
└─────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18, Material-UI 5.x | Modern responsive SPA |
| **Backend** | FastAPI, Python 3.13 | High-performance async API |
| **Database** | PostgreSQL (Supabase) | Cloud-hosted, scalable |
| **Auth** | JWT + bcrypt | Secure token-based auth |
| **Hosting** | AWS EC2 (t2.micro) | Production deployment |
| **CI/CD** | GitHub + Manual Deploy | Version controlled |

---

## 🎯 Core Features & Use Cases

### 1. Test Case Management

**Problem Solved:** Scattered test cases in spreadsheets, no version control, difficult to maintain.

**Solution:**
- Hierarchical organization: **Module → Sub-Module → Feature → Test Case**
- Auto-generated Test IDs (TC_UI_001, TC_API_001, TC_HYBRID_001)
- Inline editing for quick updates
- **Bulk update** - Select multiple test cases and update fields at once
- Rich metadata: Type, Tags, Status, JIRA links, Preconditions, Steps, Expected Results
- BDD/Gherkin support with Scenario Examples (data-driven testing)

**Tags System:**
| Tag | Purpose |
|-----|---------|
| `smoke` | Critical path tests |
| `regression` | Full regression suite |
| `sanity` | Quick sanity checks |
| `prod` | Production-only tests |
| `e2e` | End-to-end flows |
| `performance` | Performance tests |

---

### 2. Release Management

**Problem Solved:** No visibility into what's tested per release, manual tracking of execution status.

**Solution:**
- Create releases with target dates
- Add test cases to releases (individual or bulk)
- Track execution status: Not Started → In Progress → Pass/Fail/Blocked
- Approval workflow (QA Lead, Dev Lead, Product)
- PDF report generation with charts and metrics

**Release Dashboard View:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Release: R 2.90                                    Status: Active │
├─────────────────────────────────────────────────────────────────┤
│  Total Test Cases: 245  │  Passed: 180  │  Failed: 15  │ Blocked: 5 │
│  Progress: ████████████████████░░░░ 82%                          │
├─────────────────────────────────────────────────────────────────┤
│  By Module:                                                       │
│  • Account Payable: 45/50 (90%)                                  │
│  • Payments: 38/45 (84%)                                         │
│  • Invoices: 52/60 (87%)                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. JIRA Integration

**Problem Solved:** Disconnected test cases from user stories, no traceability.

**Solution:**
- Import JIRA stories directly into the portal
- Link test cases to stories (many-to-many)
- View test coverage per story
- Sync story status from JIRA
- Track by Epic for sprint planning

**Traceability Matrix:**
```
Story CTP-1234 ──► Test Cases: TC_UI_001, TC_UI_002, TC_API_015
Story CTP-1235 ──► Test Cases: TC_UI_003, TC_API_016, TC_API_017
Epic CTP-100   ──► 5 Stories ──► 23 Test Cases
```

---

### 4. Bug/Issue Tracking

**Problem Solved:** Bugs reported via Slack/email without context.

**Solution:**
- Create issues with screenshots/screen recordings
- Link to failed test executions
- Track status: Open → In Progress → Resolved → Verified
- Priority and severity classification
- Media attachments (images, videos)

---

### 5. Reports & Analytics

**Features:**
- Release-wise execution summary
- Module-wise test coverage
- Pass/Fail trends over time
- PDF export for stakeholder sharing
- Story-to-test-case coverage reports

---

## 📊 Database Schema (Simplified)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Users     │     │   Modules    │     │  Releases    │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │     │ id           │     │ id           │
│ email        │     │ name         │     │ version      │
│ role (admin, │     │ description  │     │ name         │
│   qa, viewer)│     └──────┬───────┘     │ release_date │
└──────────────┘            │             │ status       │
                            │ 1:N         └──────────────┘
                            ▼
                    ┌──────────────┐
                    │  Test Cases  │
                    ├──────────────┤
                    │ id           │
                    │ test_id      │──────┐
                    │ title        │      │
                    │ module_id    │      │
                    │ sub_module   │      │
                    │ feature      │      │
                    │ test_type    │      │ N:1
                    │ tag          │      │
                    │ tags         │      ▼
                    │ jira_story_id│ ┌──────────────┐
                    │ automation_  │ │ JIRA Stories │
                    │   status     │ ├──────────────┤
                    └──────┬───────┘ │ story_id     │
                           │         │ title        │
                           │ 1:N     │ epic_id      │
                           ▼         └──────────────┘
                    ┌──────────────┐
                    │ Executions   │
                    ├──────────────┤
                    │ test_case_id │
                    │ release_id   │
                    │ status       │
                    │ executed_by  │
                    │ executed_at  │
                    └──────────────┘
```

---

## 🔌 API Architecture

### API Endpoints Summary

| Resource | Endpoints | Purpose |
|----------|-----------|---------|
| `/api/auth` | login, register, refresh | Authentication |
| `/api/users` | CRUD + role management | User management |
| `/api/modules` | CRUD | Module organization |
| `/api/test-cases` | CRUD + bulk-update, bulk-upload | Test case management |
| `/api/releases` | CRUD + test-case linking | Release management |
| `/api/jira-stories` | Import, sync, link | JIRA integration |
| `/api/executions` | Create, update status | Execution tracking |
| `/api/reports` | Generate PDF, analytics | Reporting |
| `/api/issues` | CRUD + media upload | Bug tracking |

### Authentication Flow

```
User Login ──► Validate Credentials ──► Generate JWT Token
                                              │
                                              ▼
                                    Token includes:
                                    • user_id
                                    • email
                                    • role
                                    • expiry (30 min)
                                              │
                                              ▼
                            All API calls include: Authorization: Bearer <token>
```

---

## 🚀 Deployment Architecture

### Current Production Setup

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS EC2 (t2.micro)                       │
│                   IP: 18.217.46.229                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Nginx (Reverse Proxy)                                  ││
│  │  • Port 80 → Frontend (React static files)              ││
│  │  • Port 443 (HTTPS via Let's Encrypt)                   ││
│  │  • /api/* → Backend (localhost:8000)                    ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Backend Service (systemd)                              ││
│  │  uvicorn app.main:app --host 0.0.0.0 --port 8000       ││
│  │  Workers: 2                                             ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase (Cloud PostgreSQL)                     │
│              Region: US East                                 │
│              Connection Pooling: Enabled                     │
└─────────────────────────────────────────────────────────────┘
```

### Access URLs
- **Production:** https://qa-portal.ddns.net
- **API Docs:** https://qa-portal.ddns.net/api/docs

---

## 📈 Current Usage & Metrics

| Metric | Count |
|--------|-------|
| **Total Test Cases** | ~300+ |
| **Modules** | 8 |
| **JIRA Stories Linked** | 50+ |
| **Active Releases** | 2 |
| **Registered Users** | 5 |

---

## 🗺️ Roadmap & Future Enhancements

### Phase 1 (Completed ✅)
- [x] Core test case management
- [x] JIRA integration
- [x] Release management
- [x] PDF reports
- [x] User authentication & roles
- [x] Cloud PostgreSQL migration

### Phase 2 (In Progress 🔄)
- [x] Bulk update functionality
- [ ] Confluence integration (export test cases)
- [ ] Slack notifications
- [ ] Test execution scheduling

### Phase 3 (Planned 📋)
- [ ] CI/CD integration (Jenkins/GitHub Actions)
- [ ] Automated test result import
- [ ] Test case versioning & history
- [ ] Advanced analytics dashboard
- [ ] Mobile-responsive improvements

---

## 💰 Cost Analysis

### Current Monthly Costs

| Service | Cost |
|---------|------|
| AWS EC2 (t2.micro) | ~$10/month |
| Supabase (Free tier) | $0 |
| Domain (DDNS) | $0 |
| **Total** | **~$10/month** |

### Comparison with Commercial Tools

| Tool | Monthly Cost (5 users) |
|------|------------------------|
| TestRail | $36/user = $180/month |
| Zephyr Scale | $10/user = $50/month |
| qTest | Custom pricing (~$200+) |
| **Centime QA Portal** | **~$10/month** |

**Annual Savings: ~$2,000 - $3,000+**

---

## 🔐 Security Features

- **JWT Authentication** with configurable expiry
- **bcrypt Password Hashing** (industry standard)
- **Role-Based Access Control** (Admin, QA, Viewer)
- **HTTPS Encryption** (Let's Encrypt SSL)
- **Domain-restricted Registration** (@centime.com only)
- **CORS Protection** for API endpoints

---

## 🎓 Training & Onboarding

- Self-service user registration
- Intuitive Material-UI interface
- In-app tooltips and guidance
- Comprehensive API documentation (Swagger)
- Technical documentation in `/docs` folder

---

## 📞 Support & Maintenance

- **GitHub Repository:** Private repo with version control
- **Deployment:** Manual via rsync + systemd restart
- **Monitoring:** systemd service status
- **Backup:** Supabase automatic backups

---

## 🎯 Summary

The Centime QA Portal is a **cost-effective, custom-built solution** that provides:

1. **Centralized test management** with hierarchical organization
2. **Seamless JIRA integration** for complete traceability
3. **Release tracking** with approval workflows
4. **Scalable architecture** on cloud infrastructure
5. **Significant cost savings** vs. commercial alternatives

**The platform is production-ready and actively used by the QA team for daily test management activities.**

---

## Questions?

For technical deep-dives or demos, please contact:
- **QA Team Lead:** gsrinivasan@centime.com
- **Repository:** github.com/gsrinivasan-centime/CentimePlatformTestingSuite

---

*Document Version: 1.1 | Last Updated: November 27, 2025*
