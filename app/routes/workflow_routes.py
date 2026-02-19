# File: app/routes/workflow_routes.py
# Deskripsi: Route handler untuk Guided Analysis Workflow
# Status: New - Handles workflow API endpoints for the guided analysis feature

from flask import request, jsonify
from . import analysis_bp
from app.services.statistics_engine import StatEngine
import logging
import pandas as pd
import numpy as np
from datetime import datetime

logger = logging.getLogger(__name__)

# ==========================================
# API: WORKFLOW - DATA PARSING
# ==========================================

@analysis_bp.route('/api/workflow/parse-file', methods=['POST'])
def workflow_parse_file():
    """
    Parse uploaded file and return structured data preview.
    This is used by DataInputStep to preview data before validation.
    """
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file uploaded'
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # Read file based on extension
        filename = file.filename.lower()
        df = None
        
        try:
            if filename.endswith('.csv'):
                df = pd.read_csv(file)
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file)
            elif filename.endswith('.sav'):
                # SPSS file - needs pyreadstat
                try:
                    import pyreadstat
                    df, meta = pyreadstat.read_sav(file)
                except ImportError:
                    return jsonify({
                        'success': False,
                        'error': 'SPSS file support requires pyreadstat package'
                    }), 400
            else:
                return jsonify({
                    'success': False,
                    'error': f'Unsupported file format: {filename}'
                }), 400
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Failed to parse file: {str(e)}'
            }), 400
        
        # Build preview response
        columns = []
        for col in df.columns:
            dtype = str(df[col].dtype)
            scale = 'interval'  # Default
            
            if dtype == 'object':
                scale = 'nominal'
            elif 'int' in dtype:
                unique_count = df[col].nunique()
                if unique_count <= 10:
                    scale = 'ordinal'
                else:
                    scale = 'interval'
            elif 'float' in dtype:
                scale = 'ratio'
            
            columns.append({
                'name': col,
                'type': dtype,
                'scale': scale,
                'missing': int(df[col].isna().sum()),
                'unique': int(df[col].nunique())
            })
        
        # Get preview rows (first 10)
        preview_data = df.head(10).replace({np.nan: None}).to_dict('records')
        
        return jsonify({
            'success': True,
            'data': {
                'rows': len(df),
                'columns': len(df.columns),
                'columnInfo': columns,
                'preview': preview_data,
                'filename': file.filename
            }
        })
        
    except Exception as e:
        logger.error(f"Error parsing file: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==========================================
# API: WORKFLOW - DATA VALIDATION
# ==========================================

@analysis_bp.route('/api/workflow/validate-data', methods=['POST'])
def workflow_validate_data():
    """
    Validate data quality and return validation report.
    This is used by ValidationStep to show data issues and recommendations.
    """
    try:
        data = request.get_json()
        
        # Get engine instance
        engine = StatEngine.get_instance()
        df = engine.df
        
        if df is None or df.empty:
            return jsonify({
                'success': False,
                'error': 'No data loaded. Please upload data first.'
            }), 400
        
        # Perform validation analysis
        validation_result = {
            'summary': {
                'totalRows': len(df),
                'totalColumns': len(df.columns),
                'missingCells': int(df.isna().sum().sum()),
                'missingPercent': round(df.isna().sum().sum() / (len(df) * len(df.columns)) * 100, 2),
                'duplicateRows': int(df.duplicated().sum())
            },
            'columns': [],
            'issues': [],
            'recommendations': []
        }
        
        # Analyze each column
        for col in df.columns:
            col_data = df[col]
            dtype = str(col_data.dtype)
            
            # Detect scale
            scale = 'interval'
            if dtype == 'object':
                scale = 'nominal'
            elif 'int' in dtype:
                unique_count = col_data.nunique()
                if unique_count <= 5:
                    scale = 'ordinal'
                elif unique_count <= 10:
                    scale = 'ordinal'
                else:
                    scale = 'interval'
            elif 'float' in dtype:
                scale = 'ratio'
            
            col_info = {
                'name': col,
                'type': dtype,
                'scale': scale,
                'missing': int(col_data.isna().sum()),
                'missingPercent': round(col_data.isna().sum() / len(df) * 100, 2),
                'unique': int(col_data.nunique()),
                'valid': int(col_data.notna().sum())
            }
            
            # Add stats for numeric columns
            if col_data.dtype in ['int64', 'float64']:
                col_info['mean'] = round(col_data.mean(), 2) if col_data.notna().any() else None
                col_info['std'] = round(col_data.std(), 2) if col_data.notna().any() else None
                col_info['min'] = round(col_data.min(), 2) if col_data.notna().any() else None
                col_info['max'] = round(col_data.max(), 2) if col_data.notna().any() else None
                
                # Detect outliers using IQR method
                Q1 = col_data.quantile(0.25)
                Q3 = col_data.quantile(0.75)
                IQR = Q3 - Q1
                outliers = ((col_data < Q1 - 1.5 * IQR) | (col_data > Q3 + 1.5 * IQR)).sum()
                col_info['outliers'] = int(outliers)
                
                if outliers > 0:
                    validation_result['issues'].append({
                        'type': 'outlier',
                        'severity': 'warning',
                        'column': col,
                        'message': f'Ditemukan {outliers} outlier pada kolom {col}'
                    })
            
            validation_result['columns'].append(col_info)
            
            # Check for missing values
            if col_data.isna().sum() > 0:
                missing_pct = col_data.isna().sum() / len(df) * 100
                severity = 'info' if missing_pct < 5 else 'warning' if missing_pct < 20 else 'error'
                validation_result['issues'].append({
                    'type': 'missing',
                    'severity': severity,
                    'column': col,
                    'message': f'{col_data.isna().sum()} nilai hilang ({missing_pct:.1f}%) pada kolom {col}'
                })
        
        # Generate recommendations
        if validation_result['summary']['missingCells'] > 0:
            validation_result['recommendations'].append({
                'type': 'missing_data',
                'priority': 'high',
                'message': 'Tangani nilai yang hilang sebelum analisis (hapus baris atau imputasi)',
                'action': 'handle_missing'
            })
        
        if validation_result['summary']['duplicateRows'] > 0:
            validation_result['recommendations'].append({
                'type': 'duplicates',
                'priority': 'medium',
                'message': f'Terdapat {validation_result["summary"]["duplicateRows"]} baris duplikat',
                'action': 'remove_duplicates'
            })
        
        # Check if data is ready for analysis
        validation_result['isValid'] = (
            len([i for i in validation_result['issues'] if i['severity'] == 'error']) == 0
        )
        
        return jsonify({
            'success': True,
            'validation': validation_result
        })
        
    except Exception as e:
        logger.error(f"Error validating data: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==========================================
# API: WORKFLOW - METHOD RECOMMENDATION
# ==========================================

@analysis_bp.route('/api/workflow/recommend-methods', methods=['POST'])
def workflow_recommend_methods():
    """
    Recommend analysis methods based on data characteristics and research goal.
    This is used by MethodSelectionStep to show AI-powered recommendations.
    """
    try:
        data = request.get_json() or {}
        research_goal = data.get('goal', 'exploratory')
        selected_columns = data.get('columns', [])
        
        # Get engine instance
        engine = StatEngine.get_instance()
        df = engine.df
        
        if df is None or df.empty:
            return jsonify({
                'success': False,
                'error': 'No data loaded. Please upload data first.'
            }), 400
        
        # Analyze data characteristics
        numeric_cols = df.select_dtypes(include=['int64', 'float64']).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        
        recommendations = []
        
        # Always recommend descriptive statistics
        recommendations.append({
            'id': 'descriptive',
            'name': 'Descriptive Statistics',
            'nameIndonesian': 'Statistik Deskriptif',
            'category': 'descriptive',
            'confidence': 95,
            'description': 'Menghitung mean, median, standar deviasi, dan ukuran pemusatan lainnya.',
            'justification': 'Analisis deskriptif adalah langkah dasar yang selalu direkomendasikan untuk memahami karakteristik data.',
            'requirements': ['Minimal 1 variabel numerik'],
            'requirementsMet': len(numeric_cols) >= 1,
            'academicReference': 'Field, A. (2018). Discovering Statistics Using IBM SPSS Statistics (5th ed.)'
        })
        
        # Recommend based on data structure
        if len(numeric_cols) >= 2:
            # Correlation analysis
            recommendations.append({
                'id': 'correlation',
                'name': 'Pearson Correlation',
                'nameIndonesian': 'Korelasi Pearson',
                'category': 'correlation',
                'confidence': 88,
                'description': 'Mengukur hubungan linear antara dua variabel numerik.',
                'justification': f'Data memiliki {len(numeric_cols)} variabel numerik yang dapat diuji korelasinya.',
                'requirements': ['2 variabel numerik', 'Data berdistribusi normal'],
                'requirementsMet': True,
                'academicReference': 'Cohen, J. (1988). Statistical Power Analysis for the Behavioral Sciences (2nd ed.)'
            })
            
            # Linear regression
            recommendations.append({
                'id': 'linear-regression',
                'name': 'Linear Regression',
                'nameIndonesian': 'Regresi Linear',
                'category': 'correlation',
                'confidence': 82,
                'description': 'Memprediksi variabel dependen berdasarkan variabel independen.',
                'justification': 'Cocok untuk menguji pengaruh satu variabel terhadap variabel lain.',
                'requirements': ['1 variabel dependen numerik', '1+ variabel independen'],
                'requirementsMet': len(numeric_cols) >= 2,
                'academicReference': 'Tabachnick, B.G. & Fidell, L.S. (2019). Using Multivariate Statistics (7th ed.)'
            })
        
        if len(categorical_cols) >= 1 and len(numeric_cols) >= 1:
            unique_cats = df[categorical_cols[0]].nunique() if categorical_cols else 0
            
            if unique_cats == 2:
                # Independent t-test
                recommendations.append({
                    'id': 'independent-t-test',
                    'name': 'Independent Samples T-Test',
                    'nameIndonesian': 'Uji T Independen',
                    'category': 'comparison',
                    'confidence': 90,
                    'description': 'Membandingkan rata-rata dua kelompok independen.',
                    'justification': f'Data memiliki variabel kategorik dengan 2 kelompok, cocok untuk uji beda.',
                    'requirements': ['1 variabel kategorik (2 grup)', '1 variabel numerik', 'Distribusi normal'],
                    'requirementsMet': True,
                    'academicReference': 'Student (1908). The Probable Error of a Mean. Biometrika, 6(1), 1-25.'
                })
            elif unique_cats > 2:
                # One-way ANOVA
                recommendations.append({
                    'id': 'one-way-anova',
                    'name': 'One-Way ANOVA',
                    'nameIndonesian': 'ANOVA Satu Jalur',
                    'category': 'comparison',
                    'confidence': 85,
                    'description': 'Membandingkan rata-rata tiga atau lebih kelompok.',
                    'justification': f'Data memiliki variabel kategorik dengan {unique_cats} kelompok.',
                    'requirements': ['1 variabel kategorik (3+ grup)', '1 variabel numerik', 'Homogenitas varians'],
                    'requirementsMet': True,
                    'academicReference': 'Fisher, R.A. (1925). Statistical Methods for Research Workers.'
                })
        
        if len(categorical_cols) >= 2:
            # Chi-square
            recommendations.append({
                'id': 'chi-square',
                'name': 'Chi-Square Test',
                'nameIndonesian': 'Uji Chi-Square',
                'category': 'proportion',
                'confidence': 87,
                'description': 'Menguji hubungan antara dua variabel kategorik.',
                'justification': 'Tersedia variabel kategorik untuk diuji hubungannya.',
                'requirements': ['2 variabel kategorik', 'Expected frequency > 5'],
                'requirementsMet': True,
                'academicReference': 'Pearson, K. (1900). On the criterion that a given system of deviations...'
            })
        
        # Add reliability analysis if many numeric columns (likely questionnaire)
        if len(numeric_cols) >= 5:
            recommendations.append({
                'id': 'reliability',
                'name': 'Reliability Analysis',
                'nameIndonesian': 'Analisis Reliabilitas',
                'category': 'advanced',
                'confidence': 80,
                'description': 'Menghitung Cronbach\'s Alpha untuk mengukur konsistensi internal.',
                'justification': f'Data memiliki {len(numeric_cols)} item numerik, kemungkinan kuesioner.',
                'requirements': ['Minimal 3 item numerik', 'Skala Likert'],
                'requirementsMet': True,
                'academicReference': 'Cronbach, L.J. (1951). Coefficient alpha and the internal structure of tests.'
            })
        
        # Sort by confidence
        recommendations.sort(key=lambda x: x['confidence'], reverse=True)
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'dataInfo': {
                'numericColumns': numeric_cols,
                'categoricalColumns': categorical_cols,
                'totalRows': len(df),
                'totalColumns': len(df.columns)
            }
        })
        
    except Exception as e:
        logger.error(f"Error recommending methods: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==========================================
# API: WORKFLOW - EXECUTE ANALYSIS
# ==========================================

@analysis_bp.route('/api/workflow/execute', methods=['POST'])
def workflow_execute_analysis():
    """
    Execute the selected analysis method.
    This is used by ExecutionStep to run the analysis.
    """
    try:
        data = request.get_json()
        method_id = data.get('methodId')
        config = data.get('config', {})
        
        if not method_id:
            return jsonify({
                'success': False,
                'error': 'No analysis method specified'
            }), 400
        
        # Get engine instance
        engine = StatEngine.get_instance()
        
        # Route to appropriate analysis
        result = None
        
        if method_id == 'descriptive':
            result = engine.descriptive_analysis(config.get('columns', []))
        elif method_id == 'correlation':
            result = engine.correlation_analysis(
                config.get('variables', []),
                config.get('method', 'pearson')
            )
        elif method_id == 'independent-t-test':
            result = engine.run_ttest(
                config.get('testVariable'),
                config.get('groupVariable'),
                test_type='independent'
            )
        elif method_id == 'paired-t-test':
            result = engine.run_ttest(
                config.get('variable1'),
                config.get('variable2'),
                test_type='paired'
            )
        elif method_id == 'one-way-anova':
            result = engine.run_anova(
                config.get('dependentVariable'),
                config.get('groupVariable')
            )
        elif method_id == 'chi-square':
            result = engine.chi_square_test(
                config.get('variable1'),
                config.get('variable2')
            )
        elif method_id == 'linear-regression':
            result = engine.linear_regression(
                config.get('dependent'),
                config.get('independents', [])
            )
        elif method_id == 'reliability':
            result = engine.reliability_analysis(
                config.get('items', [])
            )
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown analysis method: {method_id}'
            }), 400
        
        return jsonify({
            'success': True,
            'result': result
        })
        
    except Exception as e:
        logger.error(f"Error executing analysis: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==========================================
# API: WORKFLOW - GENERATE NARRATIVE
# ==========================================

@analysis_bp.route('/api/workflow/generate-narrative', methods=['POST'])
def workflow_generate_narrative():
    """
    Generate APA-style narrative for analysis results.
    This is used by NarrativeStep to create academic text.
    """
    try:
        data = request.get_json()
        result = data.get('result', {})
        method_id = data.get('methodId')
        style = data.get('style', 'formal')  # formal or semiformal
        
        # For now, return a template-based narrative
        # In production, this would use AI service
        
        narrative = generate_template_narrative(method_id, result, style)
        
        return jsonify({
            'success': True,
            'narrative': narrative,
            'generatedAt': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error generating narrative: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def generate_template_narrative(method_id: str, result: dict, style: str) -> str:
    """Generate template-based narrative for analysis results."""
    
    # Basic templates - in production, use AI
    templates = {
        'descriptive': """
Hasil analisis statistik deskriptif menunjukkan bahwa data penelitian memiliki karakteristik 
sebagai berikut. Berdasarkan hasil perhitungan, dapat dilihat gambaran umum tentang 
sebaran dan tendensi sentral dari variabel-variabel yang dianalisis.

Analisis ini dilakukan menggunakan software statistik dengan pendekatan eksploratori 
untuk memahami karakteristik dasar dari data sebelum melanjutkan ke analisis inferensial.
        """,
        'correlation': """
Hasil uji korelasi Pearson menunjukkan hubungan antara variabel-variabel yang diuji. 
Koefisien korelasi (r) digunakan untuk mengukur kekuatan dan arah hubungan linear 
antara dua variabel kontinu.

Interpretasi nilai r mengikuti pedoman Cohen (1988): r < 0.3 = lemah, 
0.3 ≤ r < 0.5 = sedang, r ≥ 0.5 = kuat.
        """,
        'independent-t-test': """
Uji Independent Samples T-Test dilakukan untuk membandingkan rata-rata dua kelompok 
yang independen. Sebelum melakukan uji-t, dilakukan pemeriksaan asumsi normalitas 
dan homogenitas varians.

Hasil uji menunjukkan perbandingan statistik antara kedua kelompok dengan tingkat 
signifikansi yang telah ditentukan (α = 0.05).
        """,
        'one-way-anova': """
Analisis One-Way ANOVA dilakukan untuk menguji perbedaan rata-rata antara tiga 
atau lebih kelompok. Uji ini mengasumsikan bahwa data berdistribusi normal dan 
varians antar kelompok homogen.

Jika hasil ANOVA signifikan, dilanjutkan dengan uji post-hoc untuk menentukan 
kelompok mana yang berbeda secara signifikan.
        """,
        'chi-square': """
Uji Chi-Square dilakukan untuk menguji hubungan antara dua variabel kategorik. 
Analisis ini menggunakan tabel kontingensi untuk menghitung frekuensi yang 
diharapkan dan membandingkannya dengan frekuensi yang diamati.

Hasil uji menunjukkan apakah terdapat hubungan yang signifikan antara 
kedua variabel kategorik yang diuji.
        """
    }
    
    return templates.get(method_id, """
Hasil analisis statistik telah selesai dilakukan. Interpretasi hasil 
harus mempertimbangkan konteks penelitian dan asumsi yang mendasari 
metode analisis yang digunakan.
    """).strip()
