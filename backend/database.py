from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///./job_tracker.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_add_user_id():
    """为现有表添加 user_id 列（兼容已有数据库）"""
    inspector = inspect(engine)
    tables = ["applications", "user_config", "batch_tasks", "batch_results"]
    for table in tables:
        if not inspector.has_table(table):
            continue
        columns = [c["name"] for c in inspector.get_columns(table)]
        if "user_id" not in columns:
            with engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN user_id VARCHAR DEFAULT 'default'"))
                conn.commit()
                print(f"[migrate] Added user_id column to {table}")
