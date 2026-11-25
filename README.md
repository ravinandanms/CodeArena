# CodeArena – Online Coding Competition Platform

**CodeArena** is a full-featured, responsive web application designed for conducting college-level Code Sprint competitions. It allows dynamic team registrations, real-time code execution with Monaco Editor across 5 major programming languages, server-authoritative judging, and live leaderboard rankings powered by WebSockets.

---

## 🌟 Key Highlights & Architecture

- **Zero Hardcoded Teams**: Teams register dynamically with shared credentials. No predefined five-team limitations.
- **Dynamic Administrator Control**: Start, configure, or terminate competitions, manage registered teams, edit/create problems, and monitor live submissions.
- **5 Supported Programming Languages**:
  - Python 3.14 (`python-3.14`)
  - C++ (`g++-15`)
  - C (`gcc-15`)
  - Java (`openjdk-25`)
  - JavaScript (`nodejs-24`)
- **Real-Time Leaderboard & Updates**: Powered by Socket.IO for instant standings sync and solve alerts.
- **Anti-Cheat & Strict Security**:
  - Hidden test cases are never exposed to the frontend client.
  - Scores are calculated and awarded atomically in PostgreSQL transactions with unique constraints on `[userId, problemId]` to guarantee zero duplicate points.
  - Submissions are strictly locked outside active competition windows.
  - OnlineCompiler API keys remain server-side only.

---

## 🛠 Tech Stack

### Frontend
- **React.js 18** with **Vite**
- **Tailwind CSS** (Custom dark arena theme)
- **Monaco Editor** (`@monaco-editor/react`)
- **React Router DOM 6**
- **Axios** (JWT interceptors & automatic session management)
- **Socket.IO Client**
- **Lucide Icons** & **Canvas Confetti**

### Backend
- **Node.js** & **Express.js**
- **Prisma ORM** with **PostgreSQL** (Hosted on **Neon**)
- **Socket.IO** (Real-time broadcasting)
- **JWT Authentication** & **bcryptjs**
- **OnlineCompiler.io API** for sandboxed code execution

---

## 📁 Project Directory Structure

```text
CodeArena/
├── Backend/
│   ├── config/
│   │   └── database.js              # Prisma Client instance
│   ├── controllers/
│   │   ├── authController.js        # Dynamic team registration & universal login
│   │   ├── problemController.js     # Public problem view & admin problem CRUD
│   │   ├── submissionController.js  # Run playground & judging against hidden test cases
│   │   ├── teamController.js        # Admin team management (edit, toggle, reset, delete)
│   │   ├── competitionController.js # Authoritative timer, start & end controls
│   │   └── leaderboardController.js  # Dynamic leaderboard calculations
│   ├── middleware/
│   │   ├── authMiddleware.js        # JWT verification & active account checks
│   │   └── roleMiddleware.js        # RBAC (requireAdmin, requireTeam)
│   ├── prisma/
│   │   ├── schema.prisma            # Models: User, Competition, Problem, TestCase, Submission, ProblemSolve
│   │   └── seed.js                  # Initial admin, active competition, 5 problem sets
│   ├── routes/                      # Modular Express route handlers
│   ├── services/
│   │   ├── onlineCompilerService.js # OnlineCompiler.io client & language mapping
│   │   ├── scoringService.js        # Atomic solve transaction & leaderboard ranking
│   │   └── competitionService.js    # Server-authoritative countdown & status evaluation
│   ├── utils/
│   │   └── response.js              # Standardized API response format
│   ├── server.js                    # Express + HTTP + Socket.IO server entry
│   └── test_e2e.js                  # Automated 32-check end-to-end test suite
│
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Responsive brand bar with role badge & timer
│   │   │   ├── ProblemCard.jsx      # Problem list card with difficulty pills & solve badge
│   │   │   └── Timer.jsx            # Live countdown timer synced with server
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Authentication & state management
│   │   ├── pages/
│   │   │   ├── Login.jsx            # Dual-tab login (Team / Admin)
│   │   │   ├── Register.jsx         # Dynamic team registration
│   │   │   ├── TeamDashboard.jsx    # Problem browser, stats, and recent submissions
│   │   │   ├── ProblemPage.jsx      # Split-screen IDE: Monaco Editor, Run & Submit, Console
│   │   │   ├── LeaderboardPage.jsx  # Live Socket.IO podium and team ranking table
│   │   │   ├── AdminDashboard.jsx   # Metrics, competition controls, live monitor
│   │   │   ├── ManageTeams.jsx      # Admin dynamic team CRUD & password resets
│   │   │   └── ManageProblems.jsx   # Admin problem editor with sample & hidden test cases
│   │   ├── services/
│   │   │   ├── api.js               # Axios instance with auth interceptors
│   │   │   └── socket.js            # Socket.IO client singleton
│   │   ├── App.jsx                  # Route definitions & RBAC guards
│   │   └── main.jsx                 # Vite application mount
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── render.yaml                      # One-click Render Blueprint specification
└── README.md
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Node.js (v18+ or v22+)
- PostgreSQL connection string (e.g. from Neon)
- OnlineCompiler.io API Key

### 2. Backend Setup

```bash
cd Backend
npm install

# Push database schema to PostgreSQL
npx prisma db push

# Seed initial admin, competition, and problem bank
npm run seed

# Run the backend server
npm run dev
```

*Administrator Credentials:*
- **Username**: `admin`
- **Password**: Configured via `ADMIN_PASSWORD` environment variable or `Backend/prisma/seed.js`

### 3. Frontend Setup

```bash
cd Frontend
npm install

# Start Vite dev server
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🧪 Automated Testing

CodeArena includes an automated end-to-end test suite covering 32 validation checks:

```bash
cd Backend
node -e "
const { spawn } = require('child_process');
const server = spawn('node', ['server.js'], { stdio: 'inherit' });
setTimeout(() => {
  const tester = spawn('node', ['test_e2e.js'], { stdio: 'inherit' });
  tester.on('exit', (code) => { server.kill(); process.exit(code); });
}, 3000);"
```

---

## 🌐 Production Deployment on Render

This repository includes a `render.yaml` blueprint:
1. Connect your GitHub repository to [Render](https://render.com).
2. Choose **Blueprints** and point to `render.yaml`.
3. Set the required Environment Variables in Render:
   - `DATABASE_URL`: Your Neon PostgreSQL pooler connection URL
   - `ONLINECOMPILER_API_KEY`: OnlineCompiler API key
   - `JWT_SECRET`: Secret key for signing tokens
   - `CLIENT_URL`: Your deployed frontend URL (e.g. `https://codearena-frontend.onrender.com`)
   - `VITE_API_URL`: Your deployed backend URL (e.g. `https://codearena-backend.onrender.com`)
