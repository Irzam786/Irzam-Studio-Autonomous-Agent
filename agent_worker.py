import os
import requests
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Supabase se FreeLLMAPI Key securely fetch karna
config_res = supabase.table("system_config").select("*").execute().data
config = config_res[0] if config_res else {}
freellm_key = config.get("freellmapi_key")

def ask_qwen_agent(task_type, lead_data):
    if not freellm_key:
        print("FreeLLMAPI Key missing in system_config!")
        return None

    url = "https://api.freellmapi.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {freellm_key}",
        "Content-Type": "application/json"
    }

    if task_type == "email":
        prompt = f"Write a short, personalized cold email for {lead_data.get('business_name')} in {lead_data.get('city', 'your area')} offering a free demo website. Keep it under 150 words."
    elif task_type == "website_code":
        prompt = f"Generate a single-file HTML/Tailwind CSS code for a 3-page demo website for a {lead_data.get('city')} business named '{lead_data.get('business_name')}'. Include hero, services, contact form."
    else:
        prompt = f"Create a short pitch for {lead_data.get('business_name')}."

    # Speed aur clean response ke liye System Instruction
    payload = {
        "model": "qwen-2.5-72b-instruct",
        "messages": [
            {
                "role": "system",
                "content": "You are an expert sales agent and developer. Respond ONLY in clean, plain text without any markdown asterisks (**), bolding, or decorative stars. Direct response only."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.7
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        res_data = response.json()
        if "choices" in res_data:
            return res_data["choices"][0]["message"]["content"].strip()
        else:
            print(f"API Error Response: {res_data}")
            return None
    except Exception as e:
        print(f"Error calling FreeLLMAPI: {e}")
        return None

def main_loop():
    print("Checking pending tasks in Supabase...")
    response = supabase.table("leads").select("*").eq("status", "pending").limit(1).execute()
    
    if response.data:
        task = response.data[0]
        print(f"Processing lead: {task.get('business_name')}")
        
        # Step 1: Cold Email Generation
        email_content = ask_qwen_agent("email", task)
        if email_content:
            supabase.table("leads").update({
                "draft_email": email_content, 
                "status": "email_ready"
            }).eq("id", task['id']).execute()
            print("Email generated cleanly via FreeLLMAPI and saved!")
    else:
        print("No pending tasks found.")

if __name__ == "__main__":
    main_loop()
