from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import create_access_token
import sys

db = SessionLocal()
user = db.query(User).first()
if not user:
    print("No users found")
    sys.exit(1)

access_token = create_access_token(subject=str(user.id))
print(access_token)
