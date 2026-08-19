import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from app.models.session import ActiveSession

def run_migration():
    # Create only the active_sessions table
    ActiveSession.__table__.create(engine, checkfirst=True)
    print("Migration successful: created active_sessions table if it didn't exist.")

if __name__ == "__main__":
    run_migration()
