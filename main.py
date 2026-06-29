import os
import time
from dotenv import load_dotenv

# Load environment variables at the very beginning
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from google import genai
from google.genai import types
from google.genai.errors import APIError

# Initialize the Gemini API client using client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

app = FastAPI()

# Configure CORS middleware to allow all origins ("*"), credentials, methods, and headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define SolutionRequest request body model
class SolutionRequest(BaseModel):
    user_prompt: str
    solution_number: int
    previous_solutions: List[str]

def call_gemini_with_retry(client, contents, system_instruction, primary_model="gemini-2.0-flash", backup_model="gemini-1.5-flash"):
    models_to_try = [primary_model, backup_model, "gemini-2.5-flash"]
    last_exception = None
    for model in models_to_try:
        delay = 2.0
        for attempt in range(3):
            try:
                print(f"Calling Gemini API with model={model} (attempt {attempt+1})...")
                response = client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                    ),
                )
                return response
            except Exception as e:
                last_exception = e
                is_retryable = False
                if isinstance(e, APIError):
                    code = getattr(e, 'code', None)
                    if code in (429, 503):
                        is_retryable = True
                
                err_str = str(e).lower()
                if "429" in err_str or "503" in err_str or "quota" in err_str or "exhausted" in err_str or "unavailable" in err_str or "overloaded" in err_str:
                    is_retryable = True
                
                if is_retryable and (attempt < 2):
                    print(f"Gemini API error ({e}) on model {model}. Retrying in {delay} seconds...")
                    time.sleep(delay)
                    delay *= 2.0
                else:
                    print(f"Gemini API error on model {model}: {e}")
                    break
    if last_exception:
        raise last_exception
    raise Exception("All attempted Gemini models and retries failed.")

def clean_mermaid_code(raw_code: str) -> str:
    # Standardize line endings and strip
    raw_code = raw_code.replace("\r\n", "\n").strip()
    
    # Locate where 'graph LR' or other graph types start (case-insensitive)
    lower_code = raw_code.lower()
    start_idx = lower_code.find("graph lr")
    if start_idx == -1:
        start_idx = lower_code.find("graph td")
    if start_idx == -1:
        start_idx = lower_code.find("graph")
        
    if start_idx != -1:
        raw_code = raw_code[start_idx:]
    
    # If there are markdown closing backticks in the text, split and take the first part
    if "```" in raw_code:
        raw_code = raw_code.split("```")[0]
        
    # Process line-by-line to remove any trailing text
    lines = raw_code.split("\n")
    cleaned_lines = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        
        # If we see obvious trailing conversational lines, stop adding lines
        lower_stripped = stripped.lower()
        if (lower_stripped.startswith("note:") or 
            lower_stripped.startswith("explanation:") or 
            lower_stripped.startswith("here is") or 
            lower_stripped.startswith("this diagram") or 
            lower_stripped.startswith("hope this") or
            lower_stripped.startswith("```")):
            break
            
        cleaned_lines.append(line)
        
    return "\n".join(cleaned_lines).strip()

# Async POST endpoint at /api/generate-flowchart
@app.post("/api/generate-flowchart")
async def generate_flowchart(request: SolutionRequest):
    try:
        # Format the user prompt and context
        prompt_content = f"User Request: {request.user_prompt}\n\n"
        if request.previous_solutions:
            prompt_content += "Here are the previous solution flowcharts that you must avoid duplicating. Design a completely different structural layout, logic, or approach:\n"
            for idx, prev in enumerate(request.previous_solutions, 1):
                prompt_content += f"--- Previous Solution {idx} ---\n{prev}\n\n"
        else:
            prompt_content += "This is the first solution. Design a primary logical architecture flowchart.\n"
        
        prompt_content += f"Generate Solution {request.solution_number} as a Mermaid.js flowchart starting with 'graph LR':"

        # Strict system instruction
        system_instruction = (
            "You are an expert systems architect.\n"
            "You must output ONLY valid, raw structural Mermaid.js flowchart syntax starting with 'graph LR'.\n"
            "Do NOT include any markdown code block wrappers (like ```mermaid or ```), style variables, style declarations, class definitions, layout node coloring, or background definitions.\n"
            "Do NOT include any notes, explanations, or conversational text. Output ONLY the raw structural graph nodes and connections.\n"
            "Syntax Rules:\n"
            "- Node IDs must be plain alphanumeric (e.g., node1).\n"
            "- Enclose any node labels containing spaces, punctuation, or special characters in double quotes (e.g., A[\"Step Name\"]).\n"
            "Design a structural flowchart layout that is completely different in logic or approach compared to the alternatives in 'previous_solutions'."
        )

        # Call Gemini model with fallback and retry logic
        response = call_gemini_with_retry(
            client=client,
            contents=prompt_content,
            system_instruction=system_instruction,
            primary_model="gemini-2.0-flash",
            backup_model="gemini-1.5-flash"
        )

        graph_code = response.text
        if not graph_code:
            raise Exception("Gemini API returned empty response text.")

        # Clean and sanitize the Mermaid code
        graph_code_cleaned = clean_mermaid_code(graph_code)
        print(f"--- Cleaned Mermaid Code (Solution {request.solution_number}) ---\n{graph_code_cleaned}\n--------------------------------------------")

        title = f"Solution {request.solution_number}"

        return {
            "title": title,
            "graph_code": graph_code_cleaned
        }

    except Exception as e:
        # Proper try/except block to raise HTTP 500 error if API call fails
        print(f"Gemini API Error: {e}")
        raise HTTPException(status_code=500, detail=f"API call failed: {str(e)}")
