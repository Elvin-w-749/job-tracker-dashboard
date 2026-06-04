from pydantic import BaseModel
from typing import Optional
from datetime import date


class JDAnalysisResult(BaseModel):
    company_name: str
    position: str
    city: Optional[str] = None
    company_size: Optional[str] = None
    jd_text: Optional[str] = None
    salary_range: Optional[str] = None
    education: Optional[str] = None
    experience: Optional[str] = None
    skills: Optional[list[str]] = None
    match_score: Optional[int] = None


class ApplicationCreate(BaseModel):
    company_name: str
    position: str
    city: Optional[str] = None
    company_size: Optional[str] = None
    company_tier: Optional[str] = None
    jd_text: Optional[str] = None
    apply_date: Optional[date] = None
    status: str = "已投递"
    channel: Optional[str] = None
    salary_range: Optional[str] = None
    education: Optional[str] = None
    experience: Optional[str] = None
    skills: Optional[list[str]] = None
    match_score: Optional[int] = None


class APIResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None


class APIKeyRequest(BaseModel):
    api_key: str
    model_name: Optional[str] = None
