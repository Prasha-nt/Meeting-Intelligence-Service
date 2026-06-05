# AI Integration & Grounding Approach

This document explains the strategy, prompt design, and grounding methods used to extract insights and action items from transcripts.

## 1. Prompt Design

The system sends the structured meeting details and transcript to the model:

```
You are a meeting assistant. Analyze this transcript for the meeting titled "{title}".
    
Transcript:
[00:05] Alice: We should begin developing the service.
[00:15] Bob: I will write the test cases by tomorrow.

Generate:
1. Summary: Key discussion points.
2. Action Items: Action items with the assignee's name and a suggested due date.
3. Decisions: Key decisions made.
4. Follow-up Suggestions: Next steps.

CRITICAL RULES:
- Grounding: Only extract details directly mentioned in the transcript. Do NOT invent or assume any tasks, attendees, decisions, or follow-ups.
- Citations: For every single generated item, you MUST include the exact transcript timestamp(s) from which the item was derived.
```

## 2. Enforcing JSON Schema (Structured Outputs)

To guarantee that the LLM response is structured correctly and contains all necessary fields, we leverage Gemini's **Structured Outputs** (`responseSchema`) with `responseMimeType: 'application/json'`.

This schema dictates that:
- Every summary item must have a `text` and `citations` array.
- Every action item must have a `task`, `assignee`, and `citations` array.
- Citations are strictly defined as objects containing `timestamp` strings matching the pattern.

If the model attempts to return a malformed structure or omit citations, the Gemini API gateway will fail validation before the response is returned to our application.

## 3. Grounding & Hallucination Prevention

To prevent hallucinated data (such as inventing action items, attendees, or decisions not in the meeting), we apply a multi-tier strategy:

1. **Explicit Restrictive Prompts**: The model is explicitly told: *"Only extract details directly mentioned in the transcript. Do NOT invent or assume...".*
2. **Citation-by-Timestamp Requirement**: By forcing the model to cite the timestamp for *every* decision or task, the model's attention is focused on specific segments of the input transcript, significantly reducing hallucinations.
3. **Deterministic Mock Fallback**: When running locally without a real `GEMINI_API_KEY`, the service falls back to a regex-based keyword parser that extracts tasks and decisions *only* from actual transcript lines (e.g. matching "I will", "should handle", "agreed") and links them directly to the corresponding speaker and timestamp. This ensures that the mock service is also 100% grounded.
