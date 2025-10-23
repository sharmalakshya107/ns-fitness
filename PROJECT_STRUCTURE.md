# 📁 NS Fitness - Project Structure

```
nsFitness/
│
├── backend/                      # Node.js Express API
│   ├── src/
│   │   ├── middleware/          # Auth & validation
│   │   ├── models/              # Database models (Sequelize)
│   │   ├── routes/              # API endpoints
│   │   ├── services/            # WhatsApp, PDF services
│   │   ├── utils/               # Helper functions
│   │   └── server.js            # Entry point
│   ├── config/                  # Database config
│   ├── package.json
│   └── env.example              # Environment template
│
├── frontend/                     # React Application
│   ├── src/
│   │   ├── components/          # Reusable components
│   │   ├── pages/               # Main pages
│   │   ├── services/            # API calls
│   │   └── styles/              # TailwindCSS
│   ├── public/
│   ├── package.json
│   └── tailwind.config.js
│
├── deployment/                   # Deployment configs
│   ├── vercel.json              # Vercel config
│   └── render-config.yaml       # Render config
│
├── .gitignore                   # Git ignore rules
├── README.md                    # Project overview
└── DEPLOYMENT_GUIDE_COMPLETE.md # Deployment steps

```

## 🎯 Key Files

| File | Purpose |
|------|---------|
| `backend/src/server.js` | Main backend entry point |
| `backend/src/utils/init-db.js` | Database initialization |
| `backend/env.example` | Environment variables template |
| `frontend/src/App.js` | React app entry point |
| `frontend/src/pages/Dashboard.js` | Main dashboard |
| `.gitignore` | Protects sensitive files |

## 🔐 Security

**Protected Files (Never Commit):**
- `backend/.env` - Database credentials, JWT secret
- `node_modules/` - Dependencies (auto-install)

**Public Files:**
- Frontend source code (React)
- Backend API structure
- Configuration templates

---

**Clean, Professional, Production-Ready!** ✅


