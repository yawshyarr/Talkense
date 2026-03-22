from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import auth, sessions, analyze
from app.database import engine, Base, init_db

# Create DB tables
init_db()

app = FastAPI(title="TalkSense API")

# Setup CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(analyze.router, prefix="/api", tags=["analysis"])

@app.get("/")
def root():
    return {"message": "Welcome to TalkSense API. Visit /docs for Swagger UI."}
