BATCH_SCORE_PROMPT_TEMPLATE = """你是一个专业的求职顾问，请根据以下招聘信息和求职者背景，评估匹配度。

求职者背景：
{resume_profile}

---

招聘信息：
公司：{company_name}
岗位：{position}
城市：{city}
公司规模：{company_size}
薪资范围：{salary_range}
JD详情：
{jd_text}

---

请以 JSON 格式返回以下字段：
1. match_score（整数，0-100）：综合评估匹配度。参考标准：
   - 90-100：岗位与背景高度契合，核心技能/行业/职级完全匹配
   - 70-89：主要方向匹配，有1-2项次要差距可弥补
   - 50-69：方向基本对口，但存在明显的技能或经验缺口
   - 30-49：相关性较弱，需要较大转型成本
   - 0-29：方向不匹配或要求差距过大

2. match_reason（字符串，30字以内）：一句话说明评分理由，聚焦核心优势或主要差距

请严格返回 JSON，格式如下：
{{"match_score": 75, "match_reason": "AI产品经验契合，缺乏B端SaaS行业背景"}}
"""

DEFAULT_RESUME_PROFILE = "有 3 年经验的 AI 产品经理，熟悉大模型、产品设计、数据分析"


def build_batch_score_prompt(
    company_name: str,
    position: str,
    city: str | None,
    company_size: str | None,
    salary_range: str | None,
    jd_text: str | None,
    resume_profile: str | None,
) -> str:
    """构建批量评分 prompt，自动处理空字段"""
    profile = resume_profile or DEFAULT_RESUME_PROFILE
    return BATCH_SCORE_PROMPT_TEMPLATE.format(
        resume_profile=profile,
        company_name=company_name or "未知",
        position=position or "未知",
        city=city or "未知",
        company_size=company_size or "未知",
        salary_range=salary_range or "未知",
        jd_text=jd_text or "（无详细JD描述，请根据公司名称和岗位名称综合判断）",
    )
