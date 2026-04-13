import os
import logging
from app.agent.supervisor import SupervisorAgent

# Set logging level to INFO to see our markers
logging.basicConfig(level=logging.INFO)

def test_caching():
    print("\n" + "="*50)
    print("TESTING QDRANT CACHING LOGIC")
    print("="*50)
    
    # Initialize Supervisor
    supervisor = SupervisorAgent()
    
    user_id = "test_user_cache"
    query = "impact of artificial intelligence on healthcare"
    
    # RUN 1: Should hit API (FROM API)
    print(f"\n[RUN 1] Querying: {query}")
    print("Expected: [API] FROM API (might take a few seconds)")
    response1 = supervisor.process_request(user_id, query)
    
    # RUN 2: Should hit Cache (FROM CACHE)
    print(f"\n[RUN 2] Querying: {query} (Same query)")
    print("Expected: [MEMORY] FROM CACHE (should be faster)")
    response2 = supervisor.process_request(user_id, query)
    
    print("\n" + "="*50)
    print("TEST COMPLETED")
    print("="*50)

if __name__ == "__main__":
    test_caching()
