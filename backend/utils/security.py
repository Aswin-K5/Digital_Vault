import os
import bcrypt
from datetime import datetime, timedelta
from jose import JWTError, jwt
from cryptography.fernet import Fernet
import base64
import hashlib

SECRET_KEY = os.getenv("SECRET_KEY", "your-generated-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# ── Fernet encryption key ─────────────────────────
def _get_fernet_key():
    key_bytes = hashlib.sha256(SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(key_bytes)

_fernet = Fernet(_get_fernet_key())

# ── Password hashing (pure bcrypt, no passlib) ────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

# ── JWT ───────────────────────────────────────────
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

# ── Note encryption ───────────────────────────────
def encrypt_content(content: str) -> str:
    return _fernet.encrypt(content.encode()).decode()

def decrypt_content(encrypted: str) -> str:
    return _fernet.decrypt(encrypted.encode()).decode()