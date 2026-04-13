import os
import logging
from app.agent.supervisor import SupervisorAgent
from dotenv import load_dotenv

load_dotenv()

# Set logging to INFO
logging.basicConfig(level=logging.INFO)

def run_final_test():
    print("\n" + "="*50)
    print("FINAL INTEGRATION TEST: RESEARCH + QDRANT + LITERATURE REVIEW")
    print("="*50)
    
    supervisor = SupervisorAgent()
    user_id = "final_test_user"
    
    # 1. Step: Search Papers (should save to Qdrant)
    message1 = "carikan saya 3 paper tentang machine learning in education"
    print(f"\n[USER]: {message1}")
    response1 = supervisor.process_request(user_id, message1)
    print(f"\n[SUPERVISOR]: {response1[:200]}...")
    
    # 2. Step: Generate Literature Review (should pull from Qdrant)
    message2 = "bagus, sekarang buatkan literature review singkat berdasarkan paper tersebut. sebutkan author dan tahunnya."
    print(f"\n[USER]: {message2}")
    response2 = supervisor.process_request(user_id, message2)
    print(f"\n[SUPERVISOR]:\n{response2}")
    
    print("\n" + "="*50)
    print("FINAL TEST COMPLETED")
    print("="*50)

if __name__ == "__main__":
    run_final_test()
