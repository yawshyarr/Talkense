from app.database import init_db
import os

if __name__ == "__main__":
    print("Initializing database...")
    try:
        init_db()
        print("Database initialized successfully.")
        if os.path.exists("talksense.db"):
            print(f"Database file exists: {os.path.abspath('talksense.db')}")
        else:
            print("ERROR: Database file was not created!")
    except Exception as e:
        print(f"FAILED to initialize database: {e}")
