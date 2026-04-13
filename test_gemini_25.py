from dotenv import load_dotenv
import os
import litellm
import traceback

load_dotenv()

fallback_api_key = os.environ.get("GEMINI_API_KEY")

def test_model(model_name):
    print(f"\nTesting model: {model_name}")
    try:
        response = litellm.completion(
            model=model_name,
            messages=[{"role": "user", "content": "Hi"}],
            api_key=fallback_api_key
        )
        print("Success:", response.choices[0].message.content)
    except Exception as e:
        print(f"Error: {e}")

test_model("gemini/gemini-2.5-flash")
test_model("gemini/gemini-1.5-flash")
