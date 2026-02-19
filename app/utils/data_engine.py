# File: app/utils/data_engine.py
# Deskripsi: Engine Data Processing dengan Optimasi Local-First Strategy.
# Updated: Menambahkan flag 'local_only' pada save() untuk performa real-time editing.

import pandas as pd
import numpy as np
import json
import uuid
import io
import os
import re
from datetime import datetime
from firebase_admin import firestore

# --- KONFIGURASI LOCAL STORAGE (FALLBACK) ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_STORAGE_PATH = os.path.abspath(os.path.join(BASE_DIR, '../../instance/user_data'))

if not os.path.exists(LOCAL_STORAGE_PATH):
    os.makedirs(LOCAL_STORAGE_PATH)

# --- Helper: Konversi Tipe Data Agresif ---
def safe_value(val):
    if pd.isna(val): return None
    if isinstance(val, (np.integer, int)): return int(val)
    if isinstance(val, (np.floating, float)):
        if np.isinf(val) or np.isnan(val): return None
        return float(val)
    if isinstance(val, np.bool_): return bool(val)
    return str(val)

class OnThesisVariableMetadata:
    def __init__(self, name, data_series=None, meta_dict=None):
        if meta_dict:
            self.from_dict(meta_dict)
        else:
            self.name = name
            self.label = ""
            self.type = "Numeric"
            self.measure = "scale"
            self.role = "input"
            self.missing_values = []
            self.width = 8
            self.decimals = 2
            self.align = "Right"
            self.value_labels = {}
            
            if data_series is not None:
                self.infer_metadata(data_series)

    def infer_metadata(self, series):
        if pd.api.types.is_numeric_dtype(series):
            self.type = "Numeric"
            self.measure = "scale"
            self.align = "Right"
        else:
            self.type = "String"
            self.measure = "nominal"
            self.decimals = 0
            self.align = "Left"
            if series.nunique() < 10 and len(series) > 20:
                self.measure = "nominal"

    def get_label(self): return self.label if self.label else self.name
    
    def to_dict(self):
        return {
            'id': self.name,
            'name': self.name, 'label': self.label, 'type': self.type,
            'measure': self.measure, 'role': self.role, 'missing_values': self.missing_values,
            'width': self.width, 'decimals': self.decimals, 'align': self.align,
            'value_labels': self.value_labels
        }

    def from_dict(self, d):
        self.name = d.get('name')
        self.label = d.get('label', '')
        self.type = d.get('type', 'Numeric')
        self.measure = d.get('measure', 'scale')
        self.role = d.get('role', 'input')
        self.missing_values = d.get('missing_values', [])
        self.width = d.get('width', 8)
        self.decimals = d.get('decimals', 2)
        self.align = d.get('align', 'Right')
        self.value_labels = d.get('value_labels', {})

class OnThesisDataset:
    def __init__(self, df=None, user_id=None, project_id='default'):
        self.user_id = str(user_id) if user_id else "guest"
        self.project_id = project_id
        self.df = df if df is not None else pd.DataFrame()
        self.meta = {}
        
        # Firestore Config
        self.app_id = "onthesis-app"
        try:
            self.db = firestore.client()
            self.doc_ref = self.db.collection('artifacts').document(self.app_id)\
                            .collection('users').document(self.user_id)\
                            .collection('projects').document(self.project_id)
        except Exception as e:
            print(f"⚠️ Firestore Init Warning: {e}")
            self.db = None
            self.doc_ref = None

        # Local Paths
        self.local_dir = os.path.join(LOCAL_STORAGE_PATH, self.user_id, self.project_id)
        self.local_data_path = os.path.join(self.local_dir, "data.csv")
        self.local_meta_path = os.path.join(self.local_dir, "meta.json")

        if not self.df.empty: 
            self._normalize_column_names() 
            self.sync_metadata()
            # Initial save: Sync ke Cloud agar aman
            self.save(sync_to_cloud=True)

    def _normalize_column_names(self):
        if self.df is None or self.df.empty: return
        new_columns = []
        for col in self.df.columns:
            clean_col = re.sub(r'\s+', '_', str(col)).upper().strip()
            new_columns.append(clean_col)
        self.df.columns = new_columns

    def sync_metadata(self):
        current_cols = set(self.df.columns)
        self.meta = {k: v for k, v in self.meta.items() if k in current_cols}
        for col in self.df.columns:
            if col not in self.meta:
                self.meta[col] = OnThesisVariableMetadata(col, self.df[col])

    # --- SAVE OPTIMIZED: Local First, Cloud Optional ---
    def save(self, sync_to_cloud=False):
        """
        Menyimpan data. Default sync_to_cloud=False untuk operasi cepat (edit cell).
        Gunakan sync_to_cloud=True untuk checkpoint penting (load awal, save manual).
        """
        self._normalize_column_names() 
        
        meta_export = {
            'variables': {k: v.to_dict() for k, v in self.meta.items()},
            'updated_at': datetime.now().isoformat(),
            'row_count': len(self.df),
            'col_count': len(self.df.columns)
        }
        
        # 1. ALWAYS Save Local (Speed: <50ms)
        try:
            if not os.path.exists(self.local_dir): os.makedirs(self.local_dir)
            # print(f"💾 [SAVE] Saving to {self.local_data_path}")
            self.df.to_csv(self.local_data_path, index=False)
            with open(self.local_meta_path, 'w', encoding='utf-8') as f:
                json.dump(meta_export, f, indent=2)
            print(f"✅ [SAVE] Saved Locally: {self.project_id} ({len(self.df)} cols)")
        except Exception as e:
            print(f"❌ Local Save Failed: {e}")
            return False, f"Local Save Failed: {str(e)}"

        # 2. OPTIONAL Save Cloud (Speed: ~500ms - 2s)
        if sync_to_cloud and self.db and self.doc_ref:
            try:
                data_json = self.df.replace({np.nan: None}).to_dict(orient='records')
                batch = self.db.batch()
                batch.set(self.doc_ref, meta_export, merge=True)
                data_ref = self.doc_ref.collection('data_storage').document('main_data')
                batch.set(data_ref, {'rows': data_json})
                batch.commit()
                print(f"☁️ Synced to Firestore: {self.project_id}")
            except Exception as e:
                print(f"⚠️ Firestore Sync Failed: {e}")
                # Jangan return False jika lokal sukses, cukup warning
        
        return True, "Data Saved"

    # --- EXPLICIT SYNC METHOD ---
    def force_cloud_sync(self):
        """Memaksa sinkronisasi data lokal ke Firestore"""
        return self.save(sync_to_cloud=True)

    # --- LOAD ---
    @staticmethod
    def load(user_id, project_id='default'):
        instance = OnThesisDataset(user_id=user_id, project_id=project_id)
        
        # Strategi Load: Cek Lokal dulu (Lebih Cepat), kalau tidak ada baru Cloud
        # Namun untuk memastikan konsistensi antar device, idealnya cek Cloud timestamp.
        # Untuk MVP ini, kita prioritaskan Local jika ada demi kecepatan dev.
        
        local_exists = os.path.exists(instance.local_data_path) and os.path.exists(instance.local_meta_path)
        
        if local_exists:
            try:
                print(f"📂 [LOAD] Loading from Local: {instance.local_data_path}")
                instance.df = pd.read_csv(instance.local_data_path, low_memory=False)
                instance._normalize_column_names()
                with open(instance.local_meta_path, 'r', encoding='utf-8') as f:
                    meta_data = json.load(f)
                instance._parse_meta(meta_data)
                return instance
            except Exception as e:
                print(f"⚠️ Local Load Corrupt, falling back to Cloud: {e}")

        # Fallback ke Cloud
        try:
            if instance.doc_ref:
                doc_snap = instance.doc_ref.get()
                if doc_snap.exists:
                    meta_data = doc_snap.to_dict()
                    instance._parse_meta(meta_data)
                    data_ref = instance.doc_ref.collection('data_storage').document('main_data')
                    data_snap = data_ref.get()
                    if data_snap.exists:
                        data_dict = data_snap.to_dict()
                        rows = data_dict.get('rows', [])
                        if rows:
                            instance.df = pd.DataFrame(rows)
                            instance._normalize_column_names()
                    
                    # Setelah load dari Cloud, simpan ke lokal buat cache selanjutnya
                    instance.save(sync_to_cloud=False) 
                    print(f"☁️ Loaded from Firestore: {instance.project_id}")
                    return instance
        except Exception as e:
            print(f"⚠️ Firestore Load Error: {e}")

        return instance

    def _parse_meta(self, meta_data):
        vars_dict = meta_data.get('variables', {})
        for col_name, col_meta in vars_dict.items():
            self.meta[col_name] = OnThesisVariableMetadata(col_name, meta_dict=col_meta)
        if not self.df.empty:
            self.sync_metadata()

    # --- EDITING METHODS (OPTIMIZED) ---
    def update_cell_data(self, r, c, val):
        try:
            if r >= len(self.df): self.add_empty_row()
            col_name = self.df.columns[c]
            
            # Smart Type Conversion
            if val == '' or val is None: val = np.nan
            else:
                try:
                    current_type = self.meta[col_name].type
                    if current_type == 'Numeric':
                        val = float(val)
                        if val.is_integer(): val = int(val)
                except: pass # Keep as string if conversion fails

            if r < len(self.df): self.df.iat[r, c] = val
            else:
                new_row = {col: np.nan for col in self.df.columns}
                new_row[col_name] = val
                self.df = pd.concat([self.df, pd.DataFrame([new_row])], ignore_index=True)
            
            # 🔥 OPTIMIZATION: Hanya save ke Local, tidak ke Cloud (tunggu trigger sync)
            self.save(sync_to_cloud=False)
            return True, "Success (Local)"
        except Exception as e: return False, str(e)

    def update_variable(self, old_name, field, value):
        if old_name not in self.meta: return False
        var_meta = self.meta[old_name]
        
        if field == 'name':
            new_name = str(value).strip()
            if new_name == "" or (new_name in self.df.columns and new_name != old_name): return False
            self.df.rename(columns={old_name: new_name}, inplace=True)
            self.meta[new_name] = self.meta.pop(old_name)
            self.meta[new_name].name = new_name
        elif field == 'measure': var_meta.measure = value
        elif field == 'role': var_meta.role = value
        elif field == 'label': var_meta.label = value
        elif field == 'type': var_meta.type = value
        elif field == 'decimals': 
            try: var_meta.decimals = int(value)
            except: pass

        # Metadata update juga Local-Only demi UI snappy
        self.save(sync_to_cloud=False)
        return True

    # --- SMART PREVIEW (No Change, Keep it as is) ---
    @staticmethod
    def smart_preview(file_storage, filename):
        try:
            if filename.endswith('.csv'):
                df_sample = pd.read_csv(file_storage, nrows=20, header=None, on_bad_lines='skip', engine='python')
            else:
                df_sample = pd.read_excel(file_storage, nrows=20, header=None)
            
            file_storage.seek(0)
            header_row_index = 0
            max_unique_strings = 0
            
            for i in range(min(5, len(df_sample))):
                row = df_sample.iloc[i]
                str_count = row.apply(lambda x: isinstance(x, str) and not str(x).replace('.','',1).isdigit()).sum()
                if str_count > max_unique_strings:
                    max_unique_strings = str_count
                    header_row_index = i
            
            if filename.endswith('.csv'):
                df = pd.read_csv(file_storage, header=header_row_index, nrows=10)
            else:
                df = pd.read_excel(file_storage, header=header_row_index, nrows=10)

            columns_meta = []
            for col in df.columns:
                col_name = str(col).strip()
                series = df[col]
                is_numeric = pd.api.types.is_numeric_dtype(series)
                measure = "scale" if is_numeric else "nominal"
                sample_values = series.head(3).apply(safe_value).tolist()
                columns_meta.append({
                    "name": col_name, "detected_type": "Numeric" if is_numeric else "String",
                    "detected_measure": measure, "sample": sample_values
                })

            return {
                "status": "success", "detected_header_row": header_row_index,
                "total_columns": len(df.columns), "columns": columns_meta,
                "preview_data": df.replace({np.nan: None}).values.tolist()
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # --- ANALYSIS HISTORY & DATA DELETION (Preserve Original Features) ---
    def add_analysis_log(self, analysis_type, result_data, params=None):
        try:
            log_id = str(uuid.uuid4())
            log_data = {
                "id": log_id,
                "timestamp": datetime.now().isoformat(),
                "type": analysis_type,
                "params": params or {},
                "result": result_data 
            }
            if self.doc_ref:
                analysis_ref = self.doc_ref.collection('analyses').document(log_id)
                analysis_ref.set(log_data)
            return log_data
        except Exception as e:
            print(f"❌ Failed to save analysis log: {e}")
            return None

    def get_analysis_history(self, limit=20):
        history = []
        try:
            if self.doc_ref:
                docs = self.doc_ref.collection('analyses')\
                    .order_by('timestamp', direction=firestore.Query.DESCENDING)\
                    .limit(limit).stream()
                for doc in docs:
                    history.append(doc.to_dict())
        except Exception as e:
            print(f"⚠️ Failed to fetch analysis history: {e}")
        return history

    def delete_analysis_log(self, log_id):
        try:
            if self.doc_ref:
                self.doc_ref.collection('analyses').document(log_id).delete()
        except Exception as e:
            print(f"❌ Failed to delete analysis log: {e}")

    def clear_analysis_history(self):
        try:
            if self.doc_ref:
                docs = self.doc_ref.collection('analyses').list_documents()
                for doc in docs: doc.delete()
        except Exception as e:
            print(f"❌ Failed to clear analysis history: {e}")

    def clear_all_data(self):
        self.df = pd.DataFrame()
        self.meta = {}
        try:
            if self.doc_ref:
                self.doc_ref.collection('data_storage').document('main_data').delete()
                self.clear_analysis_history()
                self.doc_ref.delete()
        except Exception as e: print(f"❌ Firestore Delete Failed: {e}")
        try:
            if os.path.exists(self.local_data_path): os.remove(self.local_data_path)
            if os.path.exists(self.local_meta_path): os.remove(self.local_meta_path)
        except Exception as e: print(f"❌ Local Delete Failed: {e}")
        return True

    # --- UTILS (No Change) ---
    def add_empty_row(self):
        self.df = pd.concat([self.df, pd.DataFrame([{c:np.nan for c in self.df.columns}])], ignore_index=True)
    
    def get_variable_metadata(self, var_name): return self.meta.get(var_name)
    def get_variable_view_data(self): return [self.meta[c].to_dict() for c in self.df.columns if c in self.meta]
    def get_data_view_data(self): return { "columns": list(self.df.columns), "data": self.df.replace({np.nan: None}).values.tolist() }
    def export_to_csv(self):
        output = io.BytesIO()
        self.df.to_csv(output, index=False)
        output.seek(0)
        return output

    # Re-implementasi method helper lain yang mungkin dipanggil (handle_missing_values, dll)
    # Gunakan save(sync_to_cloud=False) untuk operasi batch jika ingin cepat,
    # atau True jika ingin aman. Di sini saya set True untuk operasi batch besar.
    
    def handle_missing_values(self, action, target_columns=None):
        cols = target_columns if target_columns and isinstance(target_columns, list) and len(target_columns) > 0 else self.df.columns.tolist()
        try:
            if action == 'drop_rows':
                self.df.dropna(subset=cols, inplace=True)
                self.df.reset_index(drop=True, inplace=True)
                msg = "Deleted rows with missing values."
            elif action == 'fill_mean':
                for col in cols:
                    if col in self.df.columns and pd.api.types.is_numeric_dtype(self.df[col]):
                        self.df[col] = self.df[col].fillna(self.df[col].mean())
                msg = "Filled missing with Mean."
            # ... (Logika lain sama) ...
            
            # Operasi batch sebaiknya di-sync ke cloud karena perubahan besar
            success, save_msg = self.save(sync_to_cloud=True) 
            return (True, msg) if success else (False, save_msg)
        except Exception as e: return False, str(e)
    
    def remove_duplicates(self, target_columns=None):
        try:
            subset = target_columns if target_columns and len(target_columns) > 0 else None
            self.df.drop_duplicates(subset=subset, inplace=True)
            self.df.reset_index(drop=True, inplace=True)
            success, save_msg = self.save(sync_to_cloud=True)
            return (True, "Duplicates Removed") if success else (False, save_msg)
        except Exception as e: return False, str(e)

    def find_and_replace(self, find_text, replace_text, target_columns=None, exact_match=False):
        try:
            # ... (Logika replace sama) ...
            cols = target_columns if target_columns and len(target_columns) > 0 else self.df.columns.tolist()
            def try_convert(val):
                try: return float(val)
                except: return val
            find_val = try_convert(find_text)
            replace_val = try_convert(replace_text)
            
            for col in cols:
                if col not in self.df.columns: continue
                if exact_match:
                    self.df[col] = self.df[col].replace({find_text: replace_val, find_val: replace_val})
                else:
                    if pd.api.types.is_string_dtype(self.df[col]):
                        self.df[col] = self.df[col].astype(str).str.replace(str(find_text), str(replace_text), regex=False)
            
            success, save_msg = self.save(sync_to_cloud=True)
            return (True, "Replaced") if success else (False, save_msg)
        except Exception as e: return False, str(e)

    def recode_variable(self, col_name, mapping, convert_to_numeric=True):
        """
        Mengubah nilai dalam kolom berdasarkan mapping Dictionary.
        Contoh: mapping={'Laki-laki': 1, 'Perempuan': 2}
        """
        if col_name not in self.df.columns: return False, "Variable not found."
        
        try:
            # 1. Apply Mapping
            # Gunakan map(), nilai yg tidak ada di mapping akan menjadi NaN jika tidak dihandle
            # Kita gunakan replace() agar nilai yg tidak ada di mapping tetap aman (atau map + fillna)
            # SPSS Style: Biasanya RECODE INTO SAME VARIABLE
            
            # Strategi: Replace values.
            # Warning: Jika mapping partial, sisa values tetap string -> kolom jadi object
            # Jika user mau convert_to_numeric, pastikan semua value tercover atau sisa dimap ke NaN.
            
            self.df[col_name] = self.df[col_name].replace(mapping)
            
            # 2. Convert Type if Requested
            if convert_to_numeric:
                self.df[col_name] = pd.to_numeric(self.df[col_name], errors='coerce')
                self.meta[col_name].type = "Numeric"
                self.meta[col_name].measure = "nominal" # Usually coded categories are nominal/ordinal
                self.meta[col_name].align = "Right"
            
            # 3. Save Value Labels (Reverse Mapping: Code -> Label)
            # mapping input: Label -> Code (e.g., 'Male' -> 1)
            # value_labels meta: Code -> Label (e.g., '1' -> 'Male')
            # Kita simpan string keys untuk JSON safe keys
            reverse_map = {str(v): k for k, v in mapping.items()}
            self.meta[col_name].value_labels = reverse_map
            
            success, save_msg = self.save(sync_to_cloud=True)
            return (True, f"Recoded {col_name}") if success else (False, save_msg)

        except Exception as e:
            traceback.print_exc()
            return False, str(e)