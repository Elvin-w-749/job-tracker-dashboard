from sqlalchemy import Column, Integer, String, Date, DateTime, Text, PrimaryKeyConstraint
from sqlalchemy.sql import func
from database import Base


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, default="default", index=True)
    company_name = Column(String, nullable=False)
    position = Column(String, nullable=False)
    city = Column(String, nullable=True)
    company_size = Column(String, nullable=True)
    company_tier = Column(String, nullable=True)
    jd_text = Column(Text, nullable=True)
    apply_date = Column(Date, nullable=True)
    status = Column(String, nullable=True, default="已投递")
    channel = Column(String, nullable=True)
    salary_range = Column(String, nullable=True)
    education = Column(String, nullable=True)
    experience = Column(String, nullable=True)
    skills = Column(String, nullable=True)
    match_score = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class UserConfig(Base):
    __tablename__ = "user_config"

    user_id = Column(String, nullable=False, default="default")
    key = Column(String, nullable=False)
    value = Column(String, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        PrimaryKeyConstraint("user_id", "key"),
    )


class BatchTask(Base):
    __tablename__ = "batch_tasks"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, default="default", index=True)
    total = Column(Integer, nullable=False)
    completed = Column(Integer, default=0)
    failed = Column(Integer, default=0)
    status = Column(String, default="pending")
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)


class BatchResult(Base):
    __tablename__ = "batch_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, default="default", index=True)
    task_id = Column(String, nullable=False)
    image_index = Column(Integer, nullable=False)
    status = Column(String, default="pending")
    error_message = Column(Text, nullable=True)
    application_id = Column(Integer, nullable=True)
    result_data = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
