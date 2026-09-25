from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.session import init_db
from app.api.v1.router import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables on startup
    init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Build. Annotate. Benchmark. Optimize. Deploy Medical AI. Research prototype — not for clinical use.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_clinical_disclaimer_header(request: Request, call_next):
    response = await call_next(request)
    # Use ASCII hyphen in HTTP headers to comply with ASCII/latin-1 header standard
    response.headers["X-Clinical-Disclaimer"] = "Research prototype - not for clinical use."
    return response

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def root():
    return {
        "message": "Welcome to MedAI Studio API",
        "tagline": "Build. Annotate. Benchmark. Optimize. Deploy Medical AI.",
        "disclaimer": "Research prototype — not for clinical use.",
        "docs": "/docs"
    }
