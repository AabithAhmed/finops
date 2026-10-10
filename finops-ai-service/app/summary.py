"""
LLM-generated root-cause narrative.
"""

import os
from typing import Any


LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "openai").lower()
LLM_API_KEY = os.environ.get("LLM_API_KEY", "")


SYSTEM_PROMPT = """You are a payment operations incident reporting assistant.
Your only job is to write a clear, concise incident summary based on the
structured evidence provided to you.

Rules:
1. Only describe facts present in the JSON evidence provided. Do NOT invent, infer,
   or speculate beyond what the data says.
2. Do NOT include confidence percentages or scores in your summary — those are
   displayed separately by the application.
3. Write in plain English, 2-4 sentences. Use specific numbers from the evidence.
4. Format: "During [time window], [what happened] was detected. [Metric A] rose to
   [value] vs a baseline of [baseline] ([deviation]% deviation). [Metric B] similarly..."
5. End with: "This event was automatically correlated into incident [code]."
"""


def build_user_prompt(incident_code: str, evidence: list[dict[str, Any]], timeline: list[str]) -> str:
    """
    Build the user-facing prompt that gets sent to the LLM.
    Only contains structured data — no free-form text.
    """
    evidence_lines = "\n".join(
        f"- {item.get('metric_name', 'unknown')}: "
        f"value={item.get('metric_value')}, "
        f"baseline={item.get('baseline_value')}, "
        f"deviation={item.get('deviation_pct')}%"
        for item in evidence
    )
    timeline_lines = "\n".join(f"- {t}" for t in timeline)

    return f"""Incident: {incident_code}

Evidence (pre-computed metrics, deviation from baseline):
{evidence_lines}

Timeline:
{timeline_lines}

Write the incident summary now."""


async def generate_summary(
    incident_code: str,
    evidence: list[dict[str, Any]],
    timeline: list[str],
) -> str:
    """
    Call the configured LLM provider to generate a root-cause narrative.
    Returns the summary string, or a fallback message if the call fails.
    """
    user_prompt = build_user_prompt(incident_code, evidence, timeline)

    try:
        if LLM_PROVIDER == "anthropic":
            return await _call_anthropic(user_prompt)
        else:
            return await _call_openai(user_prompt)
    except Exception as e:
        # Graceful degradation: if the LLM call fails, return a stub rather than
        # crashing. The incident still exists with evidence; just no narrative yet.
        return f"[Summary unavailable — LLM call failed: {type(e).__name__}]"


async def _call_openai(user_prompt: str) -> str:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=LLM_API_KEY)
    response = await client.chat.completions.create(
        model="gpt-4o-mini",  # cheap, fast, good enough for summarization
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=300,
        temperature=0.2,  # low temperature = less creativity = more factual
    )
    return response.choices[0].message.content.strip()


async def _call_anthropic(user_prompt: str) -> str:
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=LLM_API_KEY)
    message = await client.messages.create(
        model="claude-3-haiku-20240307",  # fast and cheap for summarization
        max_tokens=300,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return message.content[0].text.strip()
