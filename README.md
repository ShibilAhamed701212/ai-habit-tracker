<div align="center">

# ✨ AI Habit Tracker

**Build habits that stick — with an AI coach that actually knows your data.**

A full-stack MERN habit tracker with AI-powered weekly reports, streak recovery coaching, personalised habit suggestions, and a conversational AI chat — all grounded in your real habit history.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-ES_Modules-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Gemini](https://img.shields.io/badge/Gemini_2.5-Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

</div>

---

## 🚀 Features

| Feature | Description |
|---------|-------------|
| ✅ **Daily habit tracking** | One-click check-offs with progress rings, streaks, and confetti celebrations |
| 📊 **Rich statistics** | Weekly/monthly bar charts, category pie charts, 90-day heatmap, per-habit breakdowns |
| 🤖 **AI Weekly Report** | Personalised markdown report analysing what worked, what slipped, and actionable next steps |
| 💬 **AI Chat** | Ask questions about your habits — *"Which day am I most consistent?"* — and get data-grounded answers |
| 💡 **AI Habit Suggestions** | Answer 3 questions and get 3 personalised habit ideas with reasons |
| ❤️ **Streak Recovery Coach** | When a long streak breaks, AI generates a gentle 3-day comeback plan |
| 🌅 **Morning Motivation** | Optional AI-generated morning message on your dashboard |
| 📅 **Weekly grid view** | Navigate week-by-week with habit × day matrix |
| 🔄 **Drag-to-reorder** | Reorder habits via drag-and-drop |
| 🗂️ **Archive system** | Archive habits without losing history |
| 🌙 **Dark/Light mode** | System-aware theme with manual toggle |
| 📱 **Fully responsive** | Desktop sidebar + mobile bottom nav |

## 🛠️ Tech Stack

### Frontend
- **React 19** with Vite 8
- **Tailwind CSS 4** for styling
- **Recharts** for charts and visualisations
- **React Router 6** for navigation
- **Axios** for API calls
- **Lucide React** for icons
- **Canvas Confetti** for celebrations
- **@dnd-kit** for drag-and-drop reordering

### Backend
- **Node.js** with Express 4 (ES Modules)
- **MongoDB** with Mongoose 8
- **JWT** authentication (bcryptjs + jsonwebtoken)
- **Helmet** + rate limiting for security
- **Gemini 2.5 Flash** (primary AI provider)
- **OpenRouter** (optional fallback AI provider)

## 📁 Project Structure

```
ai-habit-tracker/
├── back-end/                # Express REST API
│   ├── config/              # Database & environment config
│   ├── controllers/         # Route handlers (auth, habits, logs, AI)
│   ├── middleware/           # Auth, validation, error handling, security
│   ├── models/              # Mongoose schemas (User, Habit, HabitLog)
│   ├── routes/              # Express route definitions
│   ├── utils/               # Helpers (AppError, asyncHandler, dates)
│   └── server.js            # Entry point
├── front-end/               # React + Vite SPA
│   └── src/
│       ├── api/             # Axios instance with interceptors
│       ├── components/      # 23 reusable components
│       ├── context/         # Auth & Theme providers
│       ├── pages/           # 8 page components
│       └── utils/           # Date helpers, constants, confetti
├── bruno/                   # Bruno API test collection
└── README.md
```

## ⚡ Quick Start

### Prerequisites

- **Node.js** 18+ 
- **MongoDB** — local install or [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier works)
- **Gemini API key** — get one free at [Google AI Studio](https://aistudio.google.com/apikey)

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/ai-habit-tracker.git
cd ai-habit-tracker
```

### 2. Set up the backend

```bash
cd back-end
cp .env.example .env
```

Edit `back-end/.env` and fill in your values:

```env
MONGO_URI=mongodb+srv://...          # Your MongoDB connection string
JWT_SECRET=your_random_secret_here   # Any long random string
GEMINI_API_KEY=your_gemini_key       # From Google AI Studio
```

Then install and run:

```bash
npm install
npm run dev
```

The API starts at `http://localhost:8000`.

### 3. Set up the frontend

```bash
cd front-end
cp .env.example .env
npm install
npm run dev
```

The app opens at `http://localhost:5173`.

### 4. Start using it

1. Open `http://localhost:5173` in your browser
2. Create an account
3. Add your first habit
4. Check it off and watch the confetti! 🎉

## 🔑 Environment Variables

### Backend (`back-end/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: `8000`) |
| `NODE_ENV` | No | `development` or `production` |
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | No | Token expiry (default: `30d`) |
| `CLIENT_URL` | No | Frontend URL for CORS (default: allows localhost) |
| `GEMINI_API_KEY` | Recommended | Google Gemini API key |
| `GEMINI_MODEL` | No | Gemini model (default: `models/gemini-2.5-flash`) |
| `OPENROUTER_API_KEY` | No | OpenRouter API key (fallback) |
| `OPENROUTER_MODEL` | No | OpenRouter model name |

### Frontend (`front-end/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend API URL (default: `http://localhost:8000/api`) |

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update name / morning motivation setting |

### Habits (🔒 auth required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/habits` | List all habits |
| POST | `/api/habits` | Create habit |
| PUT | `/api/habits/:id` | Update habit |
| DELETE | `/api/habits/:id` | Delete habit + logs |
| PUT | `/api/habits/:id/archive` | Toggle archive |
| PUT | `/api/habits/reorder` | Reorder habits |

### Logs (🔒 auth required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/logs` | Mark habit complete |
| DELETE | `/api/logs` | Unmark habit |
| GET | `/api/logs/today` | Get today's completions |
| GET | `/api/logs/range` | Get logs between dates |
| GET | `/api/logs/heatmap` | 90-day heatmap data |
| GET | `/api/logs/stats` | All habit stats (30d) |
| GET | `/api/logs/stats/:habitId` | Single habit stats |

### AI (🔒 auth required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai/morning` | Morning motivation message |
| POST | `/api/ai/weekly-report` | AI weekly report |
| POST | `/api/ai/suggest-habits` | AI habit suggestions |
| POST | `/api/ai/recovery-plan` | Streak recovery plan |
| POST | `/api/ai/chat` | Chat with your habit data |

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

---

<div align="center">

**Built with the MERN stack + Gemini AI** · If you found this useful, give it a ⭐

</div>
