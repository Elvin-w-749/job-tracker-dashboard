JD_TEXT_EXTRACT_PROMPT_TEMPLATE = """你是一个专业的 HR 助手，请从以下 JD（岗位描述）文本中提取以下信息，以 JSON 格式返回。

求职者背景：{resume_profile}

请提取以下字段：
1. company_name（公司名称）：招聘公司的全称，如果文本中未提及则填 null
2. position（岗位名称）：职位名称
3. city（工作城市）：工作所在城市
4. company_size（公司规模）：如 "10000人以上"、"1000-9999人"、"500-999人"、"100-499人"、"100人以下"，无法判断则填 null
5. jd_text（完整 JD 文本）：尽可能保留原始岗位描述内容
6. salary_range（薪资范围）：如 "30k-50k"、"15k-25k·14薪"，无法判断则填 "面议"
7. education（学历要求）：如 "本科"、"硕士"、"大专"、"不限"，无法判断则填 null
8. experience（工作年限）：如 "3-5年"、"5年以上"、"1-3年"、"不限"，无法判断则填 null
9. skills（技能标签）：提取 JD 中提到的关键技能，以 JSON 数组格式返回，如 ["Python", "SQL", "数据分析"]
10. match_score（匹配度评分）：假设求职者的背景是「{resume_profile}」，请根据 JD 要求评估匹配度，给出 0-100 的整数评分

请严格以 JSON 格式返回，包含以上所有字段。如果某个字段无法识别，对应值填 null。

---

JD 文本内容：
{jd_text}
"""

DEFAULT_RESUME_PROFILE = "有 3 年经验的 AI 产品经理，熟悉大模型、产品设计、数据分析"


def build_jd_text_extract_prompt(jd_text: str, resume_profile: str | None = None) -> str:
    """根据 JD 文本和简历背景构建提取 prompt"""
    profile = resume_profile or DEFAULT_RESUME_PROFILE
    return JD_TEXT_EXTRACT_PROMPT_TEMPLATE.format(
        resume_profile=profile,
        jd_text=jd_text
    )
