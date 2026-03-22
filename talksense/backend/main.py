from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import auth, sessions, analyze, coach, vocab
from app.database import engine, Base, init_db

# Create DB tables
init_db()

app = FastAPI(title="TalkSense API")

# Setup CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://0.0.0.0:3001",
        "http://0.0.0.0:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(analyze.router, prefix="/api", tags=["analysis"])
app.include_router(coach.router, prefix="/api/coach", tags=["coach"])
app.include_router(vocab.router, prefix="/api/vocab", tags=["vocabulary"])

@app.get("/")
def root():
    return {"message": "Welcome to TalkSense API. Visit /docs for Swagger UI."}
