from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from database import get_db
from utils.security import hash_password, verify_password, create_access_token

router = APIRouter()

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/register")
def register(data: RegisterRequest):
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (data.email,)).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed = hash_password(data.password)
        cursor = conn.execute(
            "INSERT INTO users (name, email, hashed_password) VALUES (?, ?, ?)",
            (data.name, data.email, hashed)
        )
        user_id = cursor.lastrowid
    
    token = create_access_token({"sub": str(user_id)})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user_id, "name": data.name, "email": data.email}}

@router.post("/login")
def login(data: LoginRequest):
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (data.email,)).fetchone()
    
    if not user or not verify_password(data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": str(user["id"])})
    return {
        "access_token": token, 
        "token_type": "bearer",
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]}
    }

@router.get("/me")
def get_me(current_user: dict = __import__('fastapi').Depends(__import__('utils.auth_deps', fromlist=['get_current_user']).get_current_user)):
    return {"id": current_user["id"], "name": current_user["name"], "email": current_user["email"]}