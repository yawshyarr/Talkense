<div align="center">

<br/>

```
████████╗ █████╗ ██╗     ██╗  ██╗███████╗███╗   ██╗███████╗███████╗
╚══██╔══╝██╔══██╗██║     ██║ ██╔╝██╔════╝████╗  ██║██╔════╝██╔════╝
   ██║   ███████║██║     █████╔╝ ███████╗██╔██╗ ██║███████╗█████╗  
   ██║   ██╔══██║██║     ██╔═██╗ ╚════██║██║╚██╗██║╚════██║██╔══╝  
   ██║   ██║  ██║███████╗██║  ██╗███████║██║ ╚████║███████║███████╗
   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝
```

### 🎙️ Real-Time AI-Powered Speech Analyzer & Communication Coach

<br/>

![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Anthropic](https://img.shields.io/badge/Claude_AI-Anthropic-CC785C?style=for-the-badge&logo=anthropic&logoColor=white)
![Deepgram](https://img.shields.io/badge/Deepgram-Nova--2-FF6B35?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)

<br/>

> **Talkense** listens to you speak, analyzes your delivery in real time, and gives you AI-powered feedback — so you can become a more confident, clear, and impactful communicator.

<br/>

---

</div>

## ✨ Features

| Feature | Description |
|---|---|
| 🎤 **Live Speech Analysis** | Real-time transcription using Deepgram Nova-2 with WPM, pitch, and volume tracking |
| 🧠 **AI Sentiment Detection** | Powered by Claude — detects Confident, Nervous, Stressed, Focused, or Neutral states |
| 📊 **Analytics Dashboard** | Visual breakdowns of your speaking patterns across sessions |
| 🏋️ **Speech Lab** | Structured drills — Clarity, Pace Control, Filler Cleanse, and more |
| 📝 **Session Reports** | Detailed post-session reports with scores and improvement tips |
| 📚 **Vocabulary Tracker** | Tracks your vocabulary richness and suggests power words |
| 🤖 **AI Coach** | Personalized coaching advice based on your speech history |
| ⚙️ **Custom Settings** | Configure target WPM, filler words, noise suppression, and analysis mode |

---

## 🛠️ Tech Stack

```
┌─────────────────────────────────────────────────────┐
│                     FRONTEND                         │
│   React (JSX) · Tailwind CSS · Framer Motion        │
│   Deepgram Nova-2 (Real-time STT)                   │
├─────────────────────────────────────────────────────┤
│                      BACKEND                         │
│   FastAPI · SQLAlchemy · SQLite · Python 3.9+       │
│   Anthropic Claude API · JWT Auth                   │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- Node.js (for serving frontend, optional)
- An [Anthropic API Key](https://console.anthropic.com/)
- A [Deepgram API Key](https://console.deepgram.com/) *(for live transcription)*

---

### 1. Clone the Repository

```bash
git clone https://github.com/yawshyarr/Talkense.git
cd Talkense
```

---

### 2. Backend Setup

```bash
cd talksense/backend

# Create virtual environment
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file inside `talksense/backend/`:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
SECRET_KEY=your_secret_key_here
```

Start the backend server:

```bash
uvicorn main:app --reload --port 8000
```

> API will be live at `http://localhost:8000`  
> Swagger docs at `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
cd talksense/frontend
```

Open `index.html` directly in your browser, **or** serve it locally:

```bash
# Using Python
python -m http.server 3001

# Using Node.js
npx serve . -p 3001
```

> Frontend will be live at `http://localhost:3001`

---

## 📁 Project Structure

```
Talkense/
└── talksense/
    ├── frontend/
    │   ├── index.html
    │   ├── app.jsx
    │   ├── styles/
    │   │   └── index.css
    │   ├── components/
    │   │   └── Navbar.jsx
    │   └── pages/
    │       ├── LiveSpeechPage.jsx      ← Real-time speech analysis
    │       ├── SpeechLabPage.jsx       ← Practice drills
    │       ├── DashboardPage.jsx       ← Session overview
    │       ├── AnalyticsPage.jsx       ← Speech analytics
    │       ├── ReportPage.jsx          ← Session reports
    │       ├── VocabPage.jsx           ← Vocabulary tracker
    │       ├── AICoachPage.jsx         ← AI coaching
    │       ├── SettingsPage.jsx        ← Configuration
    │       └── AuthPages.jsx           ← Login / Register
    │
    └── backend/
        ├── main.py                     ← FastAPI app + sentiment endpoint
        ├── requirements.txt
        ├── app/
        │   ├── database.py
        │   ├── models/
        │   ├── schemas/
        │   ├── core/
        │   │   └── security.py
        │   └── api/endpoints/
        │       ├── auth.py
        │       ├── sessions.py
        │       ├── analyze.py
        │       ├── coach.py
        │       └── vocab.py
```

---

## 🧠 How the AI Works

Talkense uses **Claude (claude-3-haiku)** to analyze 5-second speech bursts in real time.

Each burst includes:

| Signal | What It Measures |
|---|---|
| `transcript_chunk` | Actual words spoken |
| `avg_pitch` | Voice pitch in Hz |
| `avg_volume` | Volume level (dB) |
| `words_per_minute` | Speaking pace |
| `filler_word_count` | Um, uh, like, basically... |
| `pause_count` | Silent gaps detected |

Claude maps these signals to one of 5 emotional states:

```
Confident  →  High volume · Steady pitch · 130–160 WPM · Low fillers
Focused    →  Balanced pace · Moderate volume · Very few fillers
Nervous    →  Low volume · High pitch · Many fillers/pauses
Stressed   →  Very fast (180+ WPM) · High volume · Sharp pitch shifts
Neutral    →  Average across all metrics
```

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ Yes | Your Claude API key |
| `SECRET_KEY` | ✅ Yes | JWT token signing secret |

> 💡 Copy `.env.example` and fill in your values — never commit your `.env` file!

---

## 🙌 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ by **yawshyarr**

⭐ Star this repo if you find it useful!

</div>
