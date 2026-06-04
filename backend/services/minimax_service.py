import json
import re
import base64
import httpx
from prompts.jd_extract import build_jd_extract_prompt
from prompts.jd_text_extract import build_jd_text_extract_prompt
from prompts.resume_extract import build_resume_extract_prompt
from prompts.batch_score import build_batch_score_prompt

REQUIRED_FIELDS = ["company_name", "position"]


def _extract_json_from_text(text: str) -> dict:
    """从 API 返回文本中提取 JSON，兼容 markdown 代码块包裹的情况"""
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    if text.startswith("```"):
        match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
        if match:
            text = match.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        brace_start = text.find("{")
        brace_end = text.rfind("}")
        if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
            try:
                return json.loads(text[brace_start:brace_end + 1])
            except json.JSONDecodeError:
                pass
    raise ValueError(f"API 返回内容不是有效 JSON: {text[:200]}")

_MIME_MAP = {
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
    "bmp": "image/bmp",
}

# Python 3.13+ 移除了 imghdr，自己实现图片格式检测
_IMG_SIGNATURES = [
    (b"\xff\xd8\xff", "jpeg"),
    (b"\x89PNG\r\n\x1a\n", "png"),
    (b"GIF87a", "gif"),
    (b"GIF89a", "gif"),
    (b"RIFF", "webp"),   # WebP starts with RIFF....WEBP
    (b"BM", "bmp"),
]


def _detect_image_format(data: bytes) -> str | None:
    for sig, fmt in _IMG_SIGNATURES:
        if data.startswith(sig):
            if fmt == "webp":
                if len(data) >= 12 and data[8:12] == b"WEBP":
                    return "webp"
                continue
            return fmt
    return None


class MiniMaxService:
    def __init__(self, api_key: str, resume_profile: str | None = None, model_name: str | None = None):
        self.api_key = api_key
        self.base_url = "https://api.minimaxi.com/v1/chat/completions"
        self.model = model_name or "MiniMax-Text-01"
        self.resume_profile = resume_profile

    async def analyze_jd_image(self, image_data: bytes, content_type: str | None = None) -> dict:
        # 自动检测图片真实格式，避免硬编码 MIME 导致解析失败
        detected = _detect_image_format(image_data)
        if detected and detected in _MIME_MAP:
            mime = _MIME_MAP[detected]
        elif content_type and content_type.startswith("image/"):
            mime = content_type
        else:
            mime = "image/jpeg"
        image_base64 = base64.b64encode(image_data).decode("utf-8")
        prompt = build_jd_extract_prompt(self.resume_profile)

        headers = {
            "Authorization": "Bearer " + self.api_key,
            "Content-Type": "application/json"
        }

        url = "https://api.minimaxi.com/v1/coding_plan/vlm"
        payload = {
            "prompt": prompt,
            "image_url": f"data:{mime};base64,{image_base64}"
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            result = response.json()

        content = result.get("content", "")
        if not content:
            raise ValueError("API 返回数据格式异常: content 为空")

        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            parsed = _extract_json_from_text(content)

        for field in REQUIRED_FIELDS:
            if field not in parsed or not parsed[field]:
                parsed[field] = None

        return parsed

    async def analyze_resume_image(self, image_data: bytes, content_type: str | None = None) -> str:
        """上传简历图片，AI 提取求职者背景摘要"""
        detected = _detect_image_format(image_data)
        if detected and detected in _MIME_MAP:
            mime = _MIME_MAP[detected]
        elif content_type and content_type.startswith("image/"):
            mime = content_type
        else:
            mime = "image/jpeg"
        image_base64 = base64.b64encode(image_data).decode("utf-8")

        prompt = "请从这份简历图片中提取求职者的核心背景信息，用一段50-120字的中文流畅描述，包含：工作年限、岗位方向、核心技能、行业经验、学历背景。直接返回描述文本，不要JSON。"

        headers = {
            "Authorization": "Bearer " + self.api_key,
            "Content-Type": "application/json"
        }

        url = "https://api.minimaxi.com/v1/coding_plan/vlm"
        payload = {
            "prompt": prompt,
            "image_url": f"data:{mime};base64,{image_base64}"
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            result = response.json()

        content = result.get("content", "")
        if not content:
            raise ValueError("API 返回数据格式异常: content 为空")

        content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL)
        return content.strip()

    async def analyze_resume_text(self, resume_text: str) -> str:
        """从文本简历中 AI 提取求职者背景摘要"""
        prompt = build_resume_extract_prompt(resume_text)

        headers = {
            "Authorization": "Bearer " + self.api_key,
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                self.base_url,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            result = response.json()

        choices = result.get("choices", [])
        if not choices:
            raise ValueError("API 返回数据格式异常: choices 为空")

        message = choices[0].get("message", {})
        content = message.get("content")
        if not content:
            raise ValueError("API 返回数据格式异常: content 为空")

        content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL)
        return content.strip()

    async def analyze_jd_text(self, jd_text: str) -> dict:
        """分析纯文本 JD，返回结构化数据"""
        prompt = build_jd_text_extract_prompt(jd_text, self.resume_profile)

        headers = {
            "Authorization": "Bearer " + self.api_key,
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "response_format": {"type": "json_object"}
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                self.base_url,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            result = response.json()

        choices = result.get("choices", [])
        if not choices:
            raise ValueError("API 返回数据格式异常: choices 为空")

        message = choices[0].get("message", {})
        content = message.get("content")
        if not content:
            raise ValueError("API 返回数据格式异常: content 为空")

        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            parsed = _extract_json_from_text(content)

        for field in REQUIRED_FIELDS:
            if field not in parsed or not parsed[field]:
                parsed[field] = None

        return parsed

    async def score_single_application(
        self,
        company_name: str,
        position: str,
        city: str | None = None,
        company_size: str | None = None,
        salary_range: str | None = None,
        jd_text: str | None = None,
    ) -> dict:
        """为单条投递记录计算匹配度评分，返回 {match_score: int, match_reason: str}"""
        prompt = build_batch_score_prompt(
            company_name=company_name,
            position=position,
            city=city,
            company_size=company_size,
            salary_range=salary_range,
            jd_text=jd_text,
            resume_profile=self.resume_profile,
        )

        headers = {
            "Authorization": "Bearer " + self.api_key,
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "response_format": {"type": "json_object"}
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.base_url,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            result = response.json()

        choices = result.get("choices", [])
        if not choices:
            raise ValueError("API 返回数据格式异常: choices 为空")

        message = choices[0].get("message", {})
        content = message.get("content")
        if not content:
            raise ValueError("API 返回数据格式异常: content 为空")

        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            parsed = _extract_json_from_text(content)

        score = parsed.get("match_score")
        reason = parsed.get("match_reason", "")

        # 确保 score 是合法整数
        if score is not None:
            try:
                score = max(0, min(100, int(score)))
            except (ValueError, TypeError):
                score = None

        return {"match_score": score, "match_reason": reason}
