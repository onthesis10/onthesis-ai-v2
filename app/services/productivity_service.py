from app import firestore_db
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class ProductivityService:
    @staticmethod
    def log_session(user_id, duration_seconds):
        """
        Mencatat sesi produktivitas ke Firestore.
        Disimpan di collection: users/{user_id}/productivity_logs
        """
        try:
            log_ref = firestore_db.collection('users').document(user_id).collection('productivity_logs').document()
            log_data = {
                'duration_seconds': duration_seconds,
                'created_at': datetime.utcnow(),
                'timestamp': firestore_db.server_timestamp() # Server time for accuracy
            }
            log_ref.set(log_data)
            
            # Update aggregate stats di user document untuk performa
            ProductivityService._update_user_aggregates(user_id, duration_seconds)
            
            return True, "Session logged successfully"
        except Exception as e:
            logger.error(f"Error logging session: {e}")
            return False, str(e)

    @staticmethod
    def _update_user_aggregates(user_id, duration_seconds):
        """
        Update total seconds and update level if necessary.
        """
        try:
            user_ref = firestore_db.collection('users').document(user_id)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                return

            data = user_doc.to_dict()
            current_total = data.get('total_productivity_seconds', 0)
            new_total = current_total + duration_seconds
            
            # Update metrics
            updates = {
                'total_productivity_seconds': new_total,
                'last_active': datetime.utcnow()
            }
            
            user_ref.update(updates)
        except Exception as e:
            logger.error(f"Error updating aggregates: {e}")

    @staticmethod
    def get_stats(user_id):
        """
        Mengambil statistik lengkap untuk user:
        - Total Waktu
        - Level Saat Ini
        - Progress ke Level Berikutnya
        - Streak (Hitung manual dari logs jika belum di-cache, atau cache daily)
        """
        try:
            user_ref = firestore_db.collection('users').document(user_id)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                return None
                
            data = user_doc.to_dict()
            total_seconds = data.get('total_productivity_seconds', 0)
            
            # Calculate Level
            level_info = ProductivityService._calculate_level(total_seconds)
            
            # Calculate Streak
            streak_info = ProductivityService._calculate_streak(user_id)
            
            return {
                'total_seconds': total_seconds,
                'level': level_info,
                'streak': streak_info
            }
        except Exception as e:
            logger.error(f"Error fetching stats: {e}")
            return None

    @staticmethod
    def _calculate_level(total_seconds):
        # Konversi ke jam
        total_hours = total_seconds / 3600
        
        levels = [
            {'name': 'Researcher', 'min_hours': 0, 'max_hours': 20, 'icon': '🥉'},
            {'name': 'Analyst', 'min_hours': 20, 'max_hours': 50, 'icon': '🥈'},
            {'name': 'Scholar', 'min_hours': 50, 'max_hours': 100, 'icon': '🥇'},
            {'name': 'Thesis Master', 'min_hours': 100, 'max_hours': float('inf'), 'icon': '🎓'}
        ]
        
        current_level = levels[0]
        next_level = levels[1]
        
        for i, lvl in enumerate(levels):
            if total_hours >= lvl['min_hours']:
                current_level = lvl
                if i + 1 < len(levels):
                    next_level = levels[i + 1]
                else:
                    next_level = None
        
        # Calculate progress to next level
        progress = 0
        if next_level:
            hours_in_level = total_hours - current_level['min_hours']
            level_span = next_level['min_hours'] - current_level['min_hours']
            progress = (hours_in_level / level_span) * 100
            progress = min(100, max(0, progress))
        else:
            progress = 100 # Max level reached

        return {
            'current_level': current_level['name'],
            'icon': current_level['icon'],
            'total_hours': round(total_hours, 1),
            'progress_percent': round(progress, 1),
            'next_level': next_level['name'] if next_level else None,
            'hours_to_next': round(next_level['min_hours'] - total_hours, 1) if next_level else 0
        }

    @staticmethod
    def _calculate_streak(user_id):
        # Sederhana: Ambil logs 30 hari terakhir, kelompokkan per hari.
        # Untuk performa yang lebih baik di production, sebaiknya streak disimpan di user doc dan diupdate tiap log.
        # Implementasi ini membaca logs, which is expensive for heavy users, but okay for MVP.
        
        try:
            # Ambil logs
            logs_ref = firestore_db.collection('users').document(user_id).collection('productivity_logs')
            # Query last 30 days
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            logs = logs_ref.where('created_at', '>=', thirty_days_ago).stream()
            
            active_dates = set()
            for log in logs:
                data = log.to_dict()
                created_at = data.get('created_at')
                if created_at:
                    # Convert to date string YYYY-MM-DD
                    date_str = created_at.date().isoformat()
                    active_dates.add(date_str)
            
            # Hitung streak mundur dari hari ini (atau kemarin jika hari ini belum log)
            streak = 0
            today = datetime.utcnow().date()
            
            # Check today
            if today.isoformat() in active_dates:
                streak += 1
                check_date = today - timedelta(days=1)
            else:
                # If not today, check yesterday. If yesterday active, streak is valid.
                # If neither today nor yesterday, streak is broken.
                if (today - timedelta(days=1)).isoformat() in active_dates:
                    check_date = today - timedelta(days=1)
                else:
                    return {'current_streak': 0, 'active_dates': list(active_dates)}

            while True:
                if check_date.isoformat() in active_dates:
                    streak += 1
                    check_date -= timedelta(days=1)
                else:
                    break
                    
            return {'current_streak': streak, 'active_dates': list(active_dates)}

        except Exception as e:
            logger.error(f"Error calculating streak: {e}")
            return {'current_streak': 0, 'active_dates': []}

    @staticmethod
    def get_heatmap(user_id):
        """
        Mengembalikan data untuk GitHub-style heatmap.
        Format: { '2023-10-01': 5, '2023-10-02': 12 ... } 
        Value bisa berupa jumlah jam (rounded) atau intensitas (1-4).
        """
        try:
            # Reuse logic from streak or separate query for longer duration (e.g. 1 year)
            logs_ref = firestore_db.collection('users').document(user_id).collection('productivity_logs')
            one_year_ago = datetime.utcnow() - timedelta(days=365)
            logs = logs_ref.where('created_at', '>=', one_year_ago).stream()
            
            heatmap_data = {}
            for log in logs:
                data = log.to_dict()
                created_at = data.get('created_at') # datetime w/ timezone info usually, but we stripped it in model
                duration = data.get('duration_seconds', 0)
                
                if created_at:
                    date_str = created_at.strftime('%Y-%m-%d')
                    if date_str in heatmap_data:
                        heatmap_data[date_str] += duration
                    else:
                        heatmap_data[date_str] = duration
            
            # Convert seconds to meaningful value for UI (e.g. minutes)
            final_data = []
            for date_str, seconds in heatmap_data.items():
                final_data.append({
                    'date': date_str,
                    'count': round(seconds / 60) # minutes
                })
                
            return final_data
            
        except Exception as e:
            logger.error(f"Error getting heatmap: {e}")
            return []
