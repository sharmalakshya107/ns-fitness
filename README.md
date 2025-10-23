# 🏋️ NS Fitness - Gym Management System

Modern, secure gym management system for NS Fitness, Alwar.

## 🚀 Features

- ✅ Member Management (Add, Edit, Track)
- ✅ Payment Processing & Receipt Generation
- ✅ Digital Attendance Tracking
- ✅ Batch & Trainer Management
- ✅ Role-based Access (Admin & Sub-Admins)
- ✅ Analytics Dashboard
- ✅ Public Member Registration
- ✅ Membership Freeze/Unfreeze
- ✅ Export Reports (PDF/Print)
- ✅ Responsive Design

## 🛠️ Tech Stack

**Frontend:** React, TailwindCSS, Chart.js  
**Backend:** Node.js, Express, Sequelize  
**Database:** PostgreSQL (Neon DB)  
**Hosting:** Vercel (Frontend) + Render (Backend)

## 📦 Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Backend Setup
```bash
cd backend
npm install
cp env.example .env
# Edit .env with your database credentials
node src/utils/init-db.js
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## 🚀 Deployment

See `DEPLOYMENT_GUIDE_COMPLETE.md` for step-by-step deployment to Render & Vercel.

## 🔒 Security

- ✅ JWT Authentication
- ✅ Password Hashing (bcrypt)
- ✅ Environment Variables Protected
- ✅ CORS Configured
- ✅ SQL Injection Prevention
- ✅ Role-based Access Control

## 📞 Support

For issues or questions, contact the development team.

---

**Built for NS Fitness, Alwar, Rajasthan** 🇮🇳
