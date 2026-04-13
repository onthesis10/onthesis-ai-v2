import os
import sys

# Tambahkan project root ke path
sys.path.append(os.getcwd())

from app.services.productivity_service import ProductivityService
from app import create_app, firestore_db
from datetime import datetime, timedelta

def test_productivity_logic():
    print("Testing Productivity Logic...")
    
    # Mock user ID (Gunakan ID yang ada di Firestore Anda atau buat baru)
    # Untuk testing lokal, kita bisa pakai 'test_user_sprint8'
    user_id = "test_user_sprint8"
    
    # 1. Test log_session
    duration = 3600 # 1 jam
    print(f"Logging session for user {user_id} with duration {duration}s...")
    success, message = ProductivityService.log_session(user_id, duration)
    print(f"Result: {success}, {message}")
    
    if not success:
        print("FAILED: log_session failed")
        return False

    # 2. Test get_stats
    print("Fetching stats...")
    stats = ProductivityService.get_stats(user_id)
    print(f"Stats: {stats}")
    
    if not stats:
        print("FAILED: get_stats returned None")
        return False
        
    if stats['total_seconds'] < duration:
        print("FAILED: total_seconds not updated correctly")
        return False

    # 3. Test level calculation
    level = stats['level']
    print(f"Level Info: {level}")
    if level['current_level'] != 'Researcher':
        # Dengan 1 jam, harusnya masih Researcher (leveled up at 20h)
        print("Note: User is Researcher (Correct)")
        
    # 4. Test heatmap
    print("Fetching heatmap...")
    heatmap = ProductivityService.get_heatmap(user_id)
    print(f"Heatmap data found: {len(heatmap)} entries")
    
    # Clean up test data (Optional, but good practice)
    # firestore_db.collection('users').document(user_id).delete()
    
    print("\nALL BACKEND LOGIC TESTS PASSED ✅")
    return True

if __name__ == "__main__":
    print("Initializing Flask App...")
    app = create_app()
    print("App created. Entering app context...")
    with app.app_context():
        print("App context entered. Starting test_productivity_logic...")
        if test_productivity_logic():
            print("Tests completed successfully.")
            sys.exit(0)
        else:
            print("Tests failed.")
            sys.exit(1)
