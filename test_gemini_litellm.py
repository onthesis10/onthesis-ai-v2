from dotenv import load_dotenv
import os
import litellm

load_dotenv()

fallback_api_key = os.environ.get("GEMINI_API_KEY")
print("API KEY:", fallback_api_key[:10] + "..." if fallback_api_key else "None")

try:
    response = litellm.completion(
        model="gemini/gemini-pro",
        messages=[{"role": "user", "content": "Hi"}],
        api_key=fallback_api_key
    )
    print("Success:", response.choices[0].message.content)
except Exception as e:
    import traceback
    traceback.print_exc()
