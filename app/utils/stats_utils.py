import pandas as pd
import numpy as np
import pingouin as pg
import statsmodels.api as sm
from scipy import stats
import traceback

# ==========================================
# 1. HELPER FUNCTIONS
# ==========================================

def _check_normality_guard(df, dep_col, group_col=None):
    """
    Memeriksa normalitas data. 
    Jika group_col ada, ia akan mengecek per kelompok (syarat T-Test/ANOVA).
    """
    try:
        results = []
        is_all_normal = True
        
        if group_col:
            groups = df[group_col].unique()
            for g in groups:
                group_data = df[df[group_col] == g][dep_col].dropna()
                # Shapiro-Wilk Test
                if len(group_data) < 3: # Syarat minimum Shapiro
                    results.append({"group": str(g), "p": None, "normal": False, "msg": "Data terlalu sedikit"})
                    is_all_normal = False
                    continue
                    
                norm = pg.normality(group_data)
                p_val = float(norm['p'].values[0])
                is_normal = bool(norm['normal'].values[0])
                
                results.append({
                    "group": str(g),
                    "p": _format_p_value(p_val),
                    "normal": is_normal
                })
                if not is_normal: is_all_normal = False
        else:
            # Uji tunggal (untuk regresi/korelasi)
            norm = pg.normality(df[dep_col].dropna())
            p_val = float(norm['p'].values[0])
            is_all_normal = bool(norm['normal'].values[0])
            results.append({"p": _format_p_value(p_val), "normal": is_all_normal})

        return is_all_normal, results
    except Exception as e:
        return False, [{"error": str(e)}]

def _clean_for_json(data):
    """Membersihkan data agar aman dikirim ke Frontend."""
    if isinstance(data, dict):
        return {k: _clean_for_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [_clean_for_json(v) for v in data]
    elif isinstance(data, (np.integer, int)):
        return int(data)
    elif isinstance(data, (np.floating, float)):
        val = float(data)
        if np.isnan(val) or np.isinf(val): return None
        return round(val, 3) 
    elif isinstance(data, (np.bool_, bool)):
        return bool(data)
    elif isinstance(data, np.ndarray):
        return _clean_for_json(data.tolist())
    else:
        return data

def _format_p_value(p):
    if p < 0.001: return "< 0.001"
    return f"{p:.3f}"

# ==========================================
# NARASI STATISTIK AKADEMIK (RULE-BASED)
# ==========================================
class StatisticalNarrative:
    @staticmethod
    def normality(p_value, variable):
        sig_text = "< 0.001" if p_value < 0.001 else f"{p_value:.3f}"
        if p_value > 0.05:
            return (f"Hasil uji normalitas untuk variabel '{variable}' menunjukkan nilai signifikansi p = {sig_text} (p > 0.05). "
                    "Dengan demikian, data berdistribusi NORMAL dan asumsi normalitas terpenuhi.")
        else:
            return (f"Hasil uji normalitas untuk variabel '{variable}' menunjukkan nilai signifikansi p = {sig_text} (p ≤ 0.05). "
                    "Data TIDAK berdistribusi normal, sehingga disarankan menggunakan uji non-parametrik.")

    @staticmethod
    def comparative(test_name, p_value, group_col=None, context="antar kelompok"):
        sig_text = "< 0.001" if p_value < 0.001 else f"{p_value:.3f}"
        if p_value <= 0.05:
            return (f"Hasil analisis {test_name} menunjukkan nilai signifikansi p = {sig_text} (p ≤ 0.05). "
                    f"Kesimpulan: Terdapat perbedaan yang SIGNIFIKAN secara statistik pada variabel yang diuji {context}.")
        else:
            return (f"Hasil analisis {test_name} menunjukkan nilai signifikansi p = {sig_text} (p > 0.05). "
                    f"Kesimpulan: TIDAK terdapat perbedaan yang signifikan secara statistik {context}.")

    @staticmethod
    def correlation(r_value, p_value, v1, v2):
        sig_text = "< 0.001" if p_value < 0.001 else f"{p_value:.3f}"
        r_abs = abs(r_value)
        direction = "POSITIF" if r_value > 0 else "NEGATIF"
        
        strength = "Sangat Lemah"
        if r_abs >= 0.8: strength = "Sangat Kuat"
        elif r_abs >= 0.6: strength = "Kuat"
        elif r_abs >= 0.4: strength = "Sedang"
        elif r_abs >= 0.2: strength = "Lemah"
        
        if p_value <= 0.05:
            return (f"Hasil analisis korelasi Pearson menunjukkan nilai r = {r_value:.3f} ({direction}) "
                    f"dengan signifikansi p = {sig_text} (p ≤ 0.05). "
                    f"Kesimpulan: Terdapat hubungan yang SIGNIFIKAN dan {strength.upper()} antara '{v1}' dan '{v2}'.")
        else:
            return (f"Hasil analisis korelasi menunjukkan nilai r = {r_value:.3f} dengan signifikansi p = {sig_text} (p > 0.05). "
                    f"Kesimpulan: TIDAK terdapat hubungan yang signifikan antara '{v1}' dan '{v2}'.")

    @staticmethod
    def reliability(alpha, n_items):
        level = "Rendah"
        if alpha >= 0.9: level = "Sangat Tinggi"
        elif alpha >= 0.8: level = "Tinggi"
        elif alpha >= 0.7: level = "Cukup"
        
        status = "RELIABEL" if alpha >= 0.6 else "TIDAK RELIABEL"
        
        return (f"Hasil uji reliabilitas Cronbach's Alpha pada {n_items} item adalah {alpha:.3f}. "
                f"Nilai ini masuk dalam kategori {level}, sehingga instrumen dinyatakan {status} dan konsisten.")

    @staticmethod
    def chi_square(p, v1, v2):
        sig_text = "< 0.001" if p < 0.001 else f"{p:.3f}"
        if p <= 0.05:
            return (f"Hasil uji Chi-Square menunjukkan nilai signifikansi p = {sig_text} (p ≤ 0.05). "
                    f"Kesimpulan: Terdapat hubungan yang SIGNIFIKAN antara kategori '{v1}' dan '{v2}'.")
        else:
            return (f"Hasil uji Chi-Square menunjukkan nilai p = {sig_text} (p > 0.05). "
                    f"Kesimpulan: TIDAK terdapat hubungan yang signifikan antara '{v1}' dan '{v2}'.")

# --- CHART HELPERS (ACADEMIC STANDARD) ---

def _create_histogram_data(df, col_name, bins=15):
    """Histogram dengan opsi data normal curve overlay nanti."""
    try:
        data = df[col_name].dropna()
        if len(data) == 0: return None
        
        # Calculate optimal bins if needed, or stick to fixed
        counts, bin_edges = np.histogram(data, bins=bins, density=False)
        
        # Calculate Normal Curve (Density scaled to Frequency)
        mu, std = stats.norm.fit(data)
        x_norm = np.linspace(data.min(), data.max(), 100)
        p_norm = stats.norm.pdf(x_norm, mu, std)
        # Scale PDF to Frequency: PDF * Total Count * Bin Width
        bin_width = bin_edges[1] - bin_edges[0]
        y_norm = p_norm * len(data) * bin_width
        
        hist_data = []
        for i in range(len(counts)):
            label = f"{bin_edges[i]:.2f}-{bin_edges[i+1]:.2f}"
            hist_data.append({"name": label, "count": int(counts[i]), "mean_x": (bin_edges[i] + bin_edges[i+1])/2})
            
        curve_data = [{"x": float(x), "y": float(y)} for x, y in zip(x_norm, y_norm)]

        return {
            "histogram": hist_data,
            "normal_curve": curve_data
        }
    except Exception as e:
        print(f"❌ [ERROR] Histogram Failed for {col_name}: {e}")
        traceback.print_exc()
        return None

def _create_frequency_data(df, col_name):
    try:
        data = df[col_name].dropna()
        if len(data) == 0: return None
        counts = data.value_counts().head(15) # Top 15 categories
        chart_data = []
        for label, count in counts.items():
            chart_data.append({"name": str(label), "count": int(count)})
        return chart_data
    except Exception:
        return None

def _create_boxplot_data(df, col_name, group_col=None):
    """Sediakan data Boxplot lengkap (Min, Q1, Med, Q3, Max) + Outliers."""
    try:
        charts = []
        
        # Jika tidak ada grup (Descriptive Analysis)
        if group_col is None:
            groups = [("All Data", df[col_name].dropna())]
        else:
            # Grouping
            groups = [(str(g), df[df[group_col] == g][col_name].dropna()) for g in df[group_col].dropna().unique()]
        
        box_data = []
        outliers_data = []
        categories = []

        for name, data in groups:
            if len(data) == 0: continue
            categories.append(name)
            
            # Calculate Quartiles
            q1 = np.percentile(data, 25)
            q3 = np.percentile(data, 75)
            iqr = q3 - q1
            med = np.median(data)
            
            # Whiskers (1.5 IQR)
            lower_whisker = data[data >= q1 - 1.5 * iqr].min()
            upper_whisker = data[data <= q3 + 1.5 * iqr].max()
            
            # Outliers
            outliers = data[(data < lower_whisker) | (data > upper_whisker)].tolist()
            
            box_data.append([float(lower_whisker), float(q1), float(med), float(q3), float(upper_whisker)])
            
            for out in outliers:
                outliers_data.append([name, float(out)]) # Store group name for frontend mapping

        return {
            "categories": categories,
            "values": box_data, # [[min, q1, med, q3, max], ...]
            "outliers": outliers_data
        }
    except Exception as e:
        print(f"❌ [ERROR] Boxplot Failed: {e}")
        return None

def _create_scatter_with_regression(df, x_col, y_col):
    """Scatter + Regression Line + CI Band (simplified line for now)."""
    try:
        clean = df[[x_col, y_col]].dropna()
        x = clean[x_col].astype(float)
        y = clean[y_col].astype(float)
        
        # Scatter Data
        scatter_points = [{"x": float(r[x_col]), "y": float(r[y_col])} for i, r in clean.iterrows()]
        
        # Regression Line
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
        
        min_x, max_x = x.min(), x.max()
        x_line = np.linspace(min_x, max_x, 100)
        y_line = slope * x_line + intercept
        
        line_points = [{"x": float(xv), "y": float(yv)} for xv, yv in zip(x_line, y_line)]
        
        return {
            "scatter": scatter_points,
            "line": line_points,
            "r_squared": r_value**2,
            "equation": f"Y = {slope:.2f}X + {intercept:.2f}"
        }
    except Exception as e:
        print(f"❌ [ERROR] Scatter Reg Failed: {e}")
        return None

def _create_qq_plot_data(data):
    """Generate Theoretical Quantiles vs Sample Quantiles for Normal Probability Plot."""
    try:
        # Sort data
        sorted_data = np.sort(data)
        n = len(data)
        # Generate theoretical quantiles (normal distribution)
        theoretical_quantiles = stats.norm.ppf(np.linspace(0.01, 0.99, n))
        
        # Downsample if too large
        step = max(1, n // 200)
        
        return [{"x": float(t), "y": float(s)} for t, s in zip(theoretical_quantiles[::step], sorted_data[::step])]
    except: return None

def _create_qq_plot_data(data):
    """Generate Theoretical Quantiles vs Sample Quantiles"""
    try:
        # Sort data
        sorted_data = np.sort(data)
        n = len(data)
        # Generate theoretical quantiles (normal distribution)
        theoretical_quantiles = stats.norm.ppf(np.linspace(0.01, 0.99, n))
        
        # Downsample for chart performance if needed
        step = max(1, n // 100)
        
        return [{"x": float(t), "y": float(s)} for t, s in zip(theoretical_quantiles[::step], sorted_data[::step])]
    except: return None

# Helper Baru untuk Menangani Parameter yang Fleksibel (List vs Dict)
def _get_vars(params):
    if isinstance(params, dict):
        return params.get('variables', [])
    elif isinstance(params, list):
        return params
    return []

# Helper untuk mendapatkan DataFrame dari objek dataset apapun bentuknya
def _get_df(dataset, variables=None):
    if hasattr(dataset, 'get_analysis_dataframe'):
        return dataset.get_analysis_dataframe(variables)
    elif hasattr(dataset, 'df'): # Jika dataset adalah object OnThesisDataset tapi method tidak ketemu
        df = dataset.df.copy()
        if variables:
            available_cols = df.columns.tolist()
            valid_vars = [v for v in variables if v in available_cols]
            if valid_vars:
                return df[valid_vars].dropna()
        return df
    elif isinstance(dataset, pd.DataFrame): # Jika dataset langsung berupa DataFrame
        df = dataset.copy()
        if variables:
            valid_vars = [v for v in variables if v in df.columns]
            if valid_vars:
                return df[valid_vars].dropna()
        return df
    else:
        raise ValueError(f"Invalid dataset format: {type(dataset)}")

# ==========================================
# 2. CORE STATISTICAL FUNCTIONS
# ==========================================

# 1. DESCRIPTIVE
def run_descriptive_analysis(dataset, variables):
    try:
        vars_to_process = _get_vars(variables)
        df = _get_df(dataset, vars_to_process)
        
        results = []
        charts = {}
        
        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = [c for c in vars_to_process if c not in num_cols]

        # Numeric Output: Table + Histogram
        if num_cols:
            df_num = df[num_cols]
            desc = df_num.describe().T
            desc['skewness'] = df_num.skew()
            desc['kurtosis'] = df_num.kurt()
            
            for idx, row in desc.iterrows():
                # Table Row
                row_dict = {
                    'Variable': idx, 'N': int(row['count']), 'Mean': row['mean'], 
                    'Median': df_num[idx].median(), 'Std_Dev': row['std'], 
                    'Min': row['min'], 'Max': row['max']
                }
                results.append(row_dict)
                
                # Chart 1: Histogram + Boxplot (Combined in FE or Tabs)
                # Akademik: Histogram untuk distribusi, Boxplot untuk outliers
                hist_data = _create_histogram_data(df, idx)
                box_data = _create_boxplot_data(df, idx, group_col=None)
                
                charts[f"{idx}_dist"] = {
                    "type": "histogram_combined", 
                    "title": f"Distribusi: {idx}", 
                    "data": hist_data, # contains bins & normal curve
                    "color": "#4F46E5"
                }
                
                charts[f"{idx}_boxplot"] = {
                    "type": "boxplot", 
                    "title": f"Boxplot: {idx}", 
                    "data": box_data, # contains categories, values, outliers
                    "color": "#6366F1"
                }

         # Categorical Output: Table + Bar Chart
        if cat_cols:
            for col in cat_cols:
                series = df[col].astype(str)
                desc_stats = series.describe()
                
                # Check top counts for "Other" grouping if too many
                row_dict = {
                    'Variable': col, 'type': 'Categorical',
                    'N': int(desc_stats['count']), 
                    'Unique': int(desc_stats['unique']), 'Mode': desc_stats['top']
                }
                results.append(row_dict)
                
                # Chart: Bar Chart
                charts[f"{col}_bar"] = {
                    "type": "bar_categorical", 
                    "title": f"Frekuensi: {col}", 
                    "data": _create_frequency_data(df, col),
                    "color": "#10B981" 
                }

        return _clean_for_json({
            "summary_table": results, 
            "charts": charts, 
            "statistical_insight": f"Analisis deskriptif menunjukkan profil data dari {len(df)} responden. Lihat tabel dan grafik untuk detail distribusi."
        })
    except Exception as e:
        traceback.print_exc()
        raise ValueError(f"Descriptive Error: {str(e)}")

# 2. NORMALITY
def run_normality_test(dataset, params):
    try:
        vars = _get_vars(params)
        df = _get_df(dataset, vars)
        results = []
        num_cols = df.select_dtypes(include=[np.number]).columns
        charts = {}

        all_normal = True

        for col in num_cols:
            data = df[col].dropna()
            if len(data) < 3: continue 

            stat, p = stats.shapiro(data)
            is_normal = p > 0.05
            if not is_normal: all_normal = False

            # Simpan RAW p-value untuk narasi
            results.append({
                "Variable": col, "W_Statistic": stat, "p_value": _format_p_value(p), 
                "w_p_val_raw": p, # Internal use
                "Status": "Normal" if is_normal else "Tidak Normal"
            })
            
            # Chart 1: Histogram with Normal Curve
            hist_res = _create_histogram_data(df, col)
            charts[f"{col}_norm_dist"] = {
                "type": "normality_hist", 
                "title": f"Normality: {col}", 
                "data": hist_res, # contains 'histogram' and 'normal_curve'
                "color": "#6366F1"
            }
            
            # Chart 2: Q-Q Plot
            qq_data = _create_qq_plot_data(data)
            charts[f"{col}_qq"] = {
                "type": "qq_plot",
                "title": f"Q-Q Plot: {col}",
                "data": qq_data,
                "xLabel": "Theoretical Quantiles",
                "yLabel": f"Sample Quantiles ({col})",
                "color": "#EC4899"
            }

        if not is_normal: all_normal = False
        
        narrative = [StatisticalNarrative.normality(p, col) for col, p in zip(num_cols, [res['p_value'] for res in results] if isinstance(results[0]['p_value'], float) else [])] 
        # Fix logic complex list comp above is risky, do distinct loop
        
        narratives = []
        for res in results:
             # Re-parsing p-value string is annoying, better store float first or use raw P
             pass

        # Simple Logic for Single Variable typical
        insight = StatisticalNarrative.normality(p_values_raw[-1], num_cols[-1]) if 'p_values_raw' in locals() else "Analisis selesai."
        # Proper Loop
        insight_text = "\n\n".join([StatisticalNarrative.normality(r['w_p_val_raw'], r['Variable']) for r in results])

        return _clean_for_json({
            "summary_table": results, 
            "charts": charts,
            "validity_status": 'valid' if all_normal else 'warning',
            "statistical_insight": insight_text
        })
    except Exception as e: raise ValueError(str(e))

# 3. INDEPENDENT T-TEST
def run_independent_ttest(dataset, params):
    try:
        vars = _get_vars(params)
        df = _get_df(dataset, vars)
        group_col, dep_col = vars[0], vars[1]
        
        # 1. CEK NORMALITAS (The Guard)
        is_normal, normality_details = _check_normality_guard(df, dep_col, group_col)
        
        # 2. CEK HOMOGENITAS
        levene = pg.homoscedasticity(data=df, dv=dep_col, group=group_col)
        is_homogeneous = bool(levene['equal_var'].values[0])

        # 3. RUN T-TEST
        res = pg.ttest(
            df[df[group_col] == df[group_col].unique()[0]][dep_col],
            df[df[group_col] == df[group_col].unique()[1]][dep_col],
            correction=not is_homogeneous
        )

        return _clean_for_json({
            "summary_table": [{
                "Test": "Welch's T-Test" if not is_homogeneous else "Student's T-Test",
                "T": res['T'].values[0],
                "df": res['dof'].values[0],
                "p": _format_p_value(res['p-val'].values[0]),
                "Cohen_d": res['cohen-d'].values[0]
            }],
            "assumptions": {
                "normality": {
                    "name": "Uji Normalitas (Shapiro-Wilk)",
                    "passed": is_normal,
                    "details": normality_details
                },
                "homogeneity": {
                    "name": "Uji Homogenitas (Levene)",
                    "passed": is_homogeneous,
                    "stat": levene['W'].values[0]
                }
            },
            "charts": {
                "group_comparison": {
                    "type": "boxplot", # Akademik wajib boxplot 2 grup
                    "title": f"Perbandingan: {group_col}",
                    "data": _create_boxplot_data(df, dep_col, group_col),
                    "color": "#2563EB"
                }
            },
            "warnings": [] if is_normal else ["Data tidak terdistribusi normal. Hasil T-Test mungkin bias, disarankan menggunakan Mann-Whitney U."],
            "statistical_insight": StatisticalNarrative.comparative("Independent T-Test", res['p-val'].values[0], context=f"antara grup dalam '{group_col}'")
        })
    except Exception as e:
        raise ValueError(f"T-Test Error: {str(e)}")
        
# 4. PAIRED T-TEST
def run_paired_ttest(dataset, params):
    try:
        vars = _get_vars(params)
        if len(vars) < 2: raise ValueError("Pilih 2 variabel numerik (Pre & Post).")
        df = _get_df(dataset, vars)
        v1, v2 = df[vars[0]], df[vars[1]]
        
        stat, p = stats.ttest_rel(v1, v2)
        diff = v1 - v2
        d = pg.compute_effsize(v1, v2, paired=True, eftype='cohen')

        chart_data = [{"name": f"S{i+1}", "value": val} for i, val in enumerate(diff[:20])]

        return _clean_for_json({
            "test_statistics": {
                "t_value": stat, "df": len(df)-1, "p_value": _format_p_value(p),
                "Mean_Difference": diff.mean()
            },
            "effect_size": [{"Measure": "Cohen's d", "Value": d}],
            "charts": {
                "diff_plot": {
                    "type": "line", 
                    "title": "Selisih Perubahan", 
                    "data": chart_data,
                    "color": "#8B5CF6"
                },
                # Paired Analysis juga bagus dikasih Boxplot difference atau Boxplot Pre vs Post side-by-side
                # Disini kita bisa hack sedikit pakai helper boxplot tapi harus restructure dataframe 'melted'
            },
            "statistical_insight": StatisticalNarrative.comparative("Paired T-Test", p, context="(Pre vs Post)")
        })
    except Exception as e: raise ValueError(str(e))

# 5. ANOVA
def run_oneway_anova(dataset, params):
    try:
        vars = _get_vars(params) # [group_var, dependent_var]
        df = _get_df(dataset, vars)
        group_col, dep_col = vars[0], vars[1]

        # 1. CEK NORMALITAS & HOMOGENITAS (The Guards)
        is_normal, normality_details = _check_normality_guard(df, dep_col, group_col)
        levene = pg.homoscedasticity(data=df, dv=dep_col, group=group_col)
        is_homogeneous = bool(levene['equal_var'].values[0])

        # 2. EKSEKUSI ANOVA (Standard vs Welch)
        posthoc_data = None
        if is_homogeneous:
            res = pg.anova(data=df, dv=dep_col, between=group_col)
            f_val = res['F'].values[0]
            p_val = res['p-unc'].values[0]
            ef_size = res['np2'].values[0] # Partial Eta Squared
            test_name = "One-Way ANOVA"
            
            # 3. POST-HOC: Tukey jika p-val signifikan (< 0.05)
            if p_val < 0.05:
                posthoc_res = pg.pairwise_tukey(data=df, dv=dep_col, between=group_col)
                posthoc_data = posthoc_res[['A', 'B', 'diff', 'p-tukey']].to_dict(orient='records')
                posthoc_name = "Tukey HSD"
        else:
            res = pg.welch_anova(data=df, dv=dep_col, group=group_col)
            f_val = res['F'].values[0]
            p_val = res['p-unc'].values[0]
            ef_size = res['np2'].values[0]
            test_name = "Welch's ANOVA"
            
            # 3. POST-HOC: Games-Howell jika signifikan
            if p_val < 0.05:
                posthoc_res = pg.pairwise_gameshowell(data=df, dv=dep_col, between=group_col)
                posthoc_data = posthoc_res[['A', 'B', 'diff', 'pval']].rename(columns={'pval': 'p-tukey'}).to_dict(orient='records')
                posthoc_name = "Games-Howell"

        # 4. OUTPUT JSON YANG POWERFUL
        return _clean_for_json({
            "summary_table": [{
                "Source": group_col,
                "Test": test_name,
                "F": f_val,
                "p": _format_p_value(p_val),
                "Partial_Eta_Sq": ef_size
            }],
            "assumptions": {
                "normality": {"passed": is_normal, "details": normality_details},
                "homogeneity": {"passed": is_homogeneous, "stat": levene['W'].values[0]}
            },
            "post_hoc": {
                "test_name": posthoc_name if posthoc_data else None,
                "results": posthoc_data # Berisi perbandingan antar grup (A vs B)
            } if posthoc_data else None,
            "charts": { # Chart ANOVA wajib Boxplot Group + (Optional: Error Bar)
                "anova_boxplot": {
                    "type": "boxplot",
                    "title": f"Distribusi per Grup: {group_col}",
                    "data": _create_boxplot_data(df, dep_col, group_col),
                    "color": "#8B5CF6"
                }
            },
            "warnings": [] if is_normal else ["Data tidak normal. Pertimbangkan Kruskal-Wallis."],
            "statistical_insight": StatisticalNarrative.comparative(test_name, p_val, group_col=group_col)
        })
    except Exception as e:
        raise ValueError(f"ANOVA Error: {str(e)}")
        
# 6. MANN-WHITNEY U
def run_mann_whitney(dataset, params):
    try:
        vars = _get_vars(params)
        group, val = vars[0], vars[1]
        df = _get_df(dataset, [group, val])
        cats = df[group].dropna().unique()
        if len(cats) != 2: raise ValueError(f"Group harus 2 kategori.")
        
        g1 = df[df[group] == cats[0]][val]
        g2 = df[df[group] == cats[1]][val]
        
        rank_table = [
            {"Group": str(cats[0]), "N": len(g1), "Median": g1.median()},
            {"Group": str(cats[1]), "N": len(g2), "Median": g2.median()}
        ]

        stat, p = stats.mannwhitneyu(g1, g2)
        mwu = pg.mwu(g1, g2)
        r_eff = mwu['RBC'][0] 

        chart_data = [
            {"name": str(cats[0]), "count": g1.median()},
            {"name": str(cats[1]), "count": g2.median()}
        ]

        return _clean_for_json({
            "summary_table": rank_table,
            "test_statistics": {"U_Value": stat, "p_value": _format_p_value(p)},
            "effect_size": [{"Measure": "Rank-Biserial", "Value": r_eff}],
            "charts": {
                "median_comparison": {
                    "type": "boxplot", # Mann Whitney akademik pakai Boxplot 
                    "title": f"Perbandingan Median (Non-Param)", 
                    "data": _create_boxplot_data(df, val, group), # Reused boxplot helper
                    "color": "#14B8A6"
                }
            },
            "statistical_insight": StatisticalNarrative.comparative("Mann-Whitney U Test", p, context="antar kelompok (Non-Parametrik)")
        })
    except Exception as e: raise ValueError(str(e))

# 7. KRUSKAL-WALLIS
def run_kruskal_wallis(dataset, params):
    try:
        vars = _get_vars(params)
        group, val = vars[0], vars[1]
        df = _get_df(dataset, [group, val])
        groups = [group[val].dropna() for name, group in df.groupby(group)]
        
        stat, p = stats.kruskal(*groups)
        
        rank_table = df.groupby(group)[val].median().reset_index().rename(columns={val: 'Median', group: 'Group'}).to_dict(orient='records')

        post_hoc = []
        if p < 0.05:
            dunn_proxy = pg.pairwise_ttest(data=df, dv=val, between=group, parametric=False, padjust='bonf')
            post_hoc = dunn_proxy[['A', 'B', 'p-unc', 'p-corr', 'Hedges']].to_dict(orient='records')

        return _clean_for_json({
            "summary_table": rank_table,
            "test_statistics": {"H_Statistic": stat, "df": len(groups)-1, "p_value": _format_p_value(p)},
            "post_hoc": post_hoc,
            "charts": {
                "kw_boxplot": {
                   "type": "boxplot",
                   "title": f"Kruskal-Wallis Comparison",
                   "data": _create_boxplot_data(df, val, group),
                   "color": "#F59E0B"
                }
            },
            "statistical_insight": StatisticalNarrative.comparative("Kruskal-Wallis", p, context="antar kelompok (Non-Parametrik)")
        })
    except Exception as e: raise ValueError(str(e))

# 8. CORRELATION
def run_correlation(dataset, params):
    try:
        vars = _get_vars(params)
        if len(vars) < 2: raise ValueError("Pilih minimal 2 variabel.")
        
        df = _get_df(dataset, vars)
        
        # Validasi Numerik
        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        non_num = [v for v in vars if v not in num_cols]
        if non_num:
            raise ValueError(f"Variabel berikut bukan angka: {', '.join(non_num)}. Korelasi Pearson memerlukan data numerik.")
        
        corr = pg.pairwise_corr(df, columns=vars, method='pearson')
        table_rows = corr[['X', 'Y', 'n', 'r', 'p-unc', 'CI95%']].to_dict(orient='records')

        v1, v2 = vars[0], vars[1]
        reg_data = _create_scatter_with_regression(df, v1, v2)

        return _clean_for_json({
            "summary_table": table_rows,
            "charts": {
                "scatter_corr": {
                    "type": "scatter_regression", 
                    "title": f"Korelasi: {v1} vs {v2}", 
                    "data": reg_data, # contains scatter + line equation
                    "xLabel": v1,
                    "yLabel": v2,
                    "color": "#8B5CF6"
                }
            },
            "statistical_insight": StatisticalNarrative.correlation(corr['r'].values[0], corr['p-unc'].values[0], v1, v2)
        })
    except Exception as e: raise ValueError(f"Correlation Error: {str(e)}")

# 9. REGRESSION
def run_linear_regression(dataset, params):
    try:
        vars = _get_vars(params)
        if len(vars) < 2: raise ValueError("Minimal 1 Independent & 1 Dependent.")
        y_var = vars[-1]
        x_vars = vars[:-1]
        
        df = _get_df(dataset, vars)
        X = sm.add_constant(df[x_vars])
        model = sm.OLS(df[y_var], X).fit()
        
        model_summary = [{
            "R": np.sqrt(model.rsquared), "R_Square": model.rsquared, 
            "Adj_R_Square": model.rsquared_adj, "Std_Error_Est": np.sqrt(model.mse_resid)
        }]

        anova_table = [{
            "F_Change": model.fvalue, "df1": model.df_model, "df2": model.df_resid, "Sig_F": _format_p_value(model.f_pvalue)
        }]

        coeffs = []
        for term in model.params.index:
            coeffs.append({
                "Predictor": term, 
                "B": model.params[term], 
                "Std_Error": model.bse[term], 
                "t": model.tvalues[term], 
                "Sig": _format_p_value(model.pvalues[term])
            })

        charts = {}
        if len(x_vars) == 1:
            reg_res = _create_scatter_with_regression(df, x_vars[0], y_var)
            charts["regression_fit"] = {
                "type": "scatter_regression", 
                "title": f"Linear Regression: {x_vars[0]} -> {y_var}", 
                "data": reg_res,
                "xLabel": x_vars[0],
                "yLabel": y_var,
                "color": "#F43F5E"
            }
            
            # Add Residual Plot if needed later (Fitur Pro?)
            # Untuk sekarang Scatter + Line sudah cukup akademik untuk S1/S2 simple.

        return _clean_for_json({
            "summary_table": model_summary,
            "test_statistics": anova_table[0],
            "summary_table_coefficients": coeffs,
            "charts": charts,
            "statistical_insight": (f"Model Regresi {'SIGNIFIKAN' if model.f_pvalue <= 0.05 else 'TIDAK SIGNIFIKAN'} (p = {_format_p_value(model.f_pvalue)}). "
                                    f"Nilai R-Square = {model.rsquared:.3f}, artinya variabel independen menjelaskan {model.rsquared*100:.1f}% varians dari variabel dependen.")
        })
    except Exception as e: raise ValueError(str(e))

# 10. CHI-SQUARE
def run_chi_square(dataset, params):
    try:
        vars = _get_vars(params)
        if len(vars) < 2: raise ValueError("Pilih 2 variabel kategorik.")
        df = _get_df(dataset, vars)
        
        expected, observed, stats_res = pg.chi2_independence(df, x=vars[0], y=vars[1])
        
        chi2 = stats_res.loc[stats_res['test'] == 'pearson', 'chi2'].values[0]
        p = stats_res.loc[stats_res['test'] == 'pearson', 'pval'].values[0]
        cramer = stats_res.loc[stats_res['test'] == 'pearson', 'cramer'].values[0]

        chart_data = [] 
        counts = df[vars[0]].value_counts().to_dict()
        for k, v in counts.items():
            chart_data.append({"name": str(k), "count": int(v)})

        return _clean_for_json({
            "summary_table": [{"Chi_Square": chi2, "df": stats_res.loc[stats_res['test']=='pearson','dof'].values[0], "p_value": _format_p_value(p)}],
            "effect_size": [{"Measure": "Cramer's V", "Value": cramer}],
            "charts": {
                "bar_count": {
                    "type": "bar", 
                    "title": f"Frekuensi: {vars[0]}", 
                    "data": chart_data,
                    "color": "#06B6D4"
                }
            },
            "statistical_insight": StatisticalNarrative.chi_square(p, vars[0], vars[1])
        })
    except Exception as e: raise ValueError(str(e))

# 11. RELIABILITY
def run_reliability_analysis(dataset, params):
    try:
        # 1. Ambil Variabel (Multi-select)
        vars = _get_vars(params)
        df = _get_df(dataset, vars)
        
        # Pastikan data numerik
        df_numeric = df.select_dtypes(include=[np.number]).dropna()
        if df_numeric.shape[1] < 2:
            raise ValueError("Reliabilitas memerlukan minimal 2 variabel item (numerik).")

        # 2. Hitung Cronbach's Alpha Global
        # ci=.95 artinya Confidence Interval 95%
        alpha_res = pg.cronbach_alpha(data=df_numeric, ci=.95) 
        alpha_val = alpha_res[0]
        ci_lower = alpha_res[1][0]
        ci_upper = alpha_res[1][1]

        # Interpretasi Global
        status = "Sangat Reliabel" if alpha_val > 0.8 else \
                 "Reliabel" if alpha_val > 0.6 else \
                 "Kurang Reliabel" if alpha_val > 0.4 else "Tidak Reliabel"

        # 3. Item-Total Statistics ("Cronbach if Item Deleted")
        # Ini fitur mahal! Kita hitung simulasi jika item dibuang.
        item_stats = []
        total_score = df_numeric.sum(axis=1)

        for col in df_numeric.columns:
            # Korelasi Item-Total (Corrected)
            # Menghitung korelasi item ini dgn total skor (minus item ini sendiri)
            other_cols = [c for c in df_numeric.columns if c != col]
            sub_total = df_numeric[other_cols].sum(axis=1)
            r_it, _ = stats.pearsonr(df_numeric[col], sub_total)

            # Cronbach jika item ini dibuang
            if len(other_cols) >= 2:
                alpha_drop = pg.cronbach_alpha(data=df_numeric[other_cols])[0]
            else:
                alpha_drop = 0.0 # Tidak bisa hitung alpha cuma 1 item

            item_stats.append({
                "Item": col,
                "Mean": round(df_numeric[col].mean(), 3),
                "SD": round(df_numeric[col].std(), 3),
                "Corrected_Item_Total_Correlation": round(r_it, 3),
                "Cronbach_Alpha_if_Deleted": round(alpha_drop, 3),
                "Action": "Pertahankan" if r_it > 0.3 else "Pertimbangkan Hapus" # Rule of thumb umum
            })

        # 4. Buat Chart Data (Bar chart validitas item)
        chart_data = [{"name": r["Item"], "value": r["Corrected_Item_Total_Correlation"]} for r in item_stats]

        # 5. Susun Narasi AI
        narrative = (
            f"Hasil uji reliabilitas menunjukkan nilai Cronbach's Alpha sebesar {alpha_val:.3f}, "
            f"yang dikategorikan sebagai '{status}'. "
            f"Analisis melibatkan {df_numeric.shape[1]} item dengan {df_numeric.shape[0]} responden. "
        )
        if any(x['Action'] == "Pertimbangkan Hapus" for x in item_stats):
            bad_items = [x['Item'] for x in item_stats if x['Action'] == "Pertimbangkan Hapus"]
            narrative += f" Perhatian: Item berikut memiliki korelasi rendah (< 0.3) dan mungkin perlu direvisi atau dibuang: {', '.join(bad_items)}."
        else:
            narrative += " Seluruh item tampak konsisten (valid) memberikan kontribusi terhadap skala pengukuran."

        return _clean_for_json({
            "summary_table": [{
                "Cronbach_Alpha": alpha_val,
                "Status": status,
                "N_Items": df_numeric.shape[1],
                "N_Sample": df_numeric.shape[0],
                "CI_95_Lower": ci_lower,
                "CI_95_Upper": ci_upper
            }],
            "summary_table_coefficients": item_stats, # Tabel detail per item
            "charts": {
                "item_validity_plot": {
                    "type": "bar",
                    "title": "Korelasi Item-Total (Validitas)",
                    "data": chart_data,
                    "color": "#F784C5", # Brave Pink
                    "yLabel": "Korelasi Pearson"
                }
            },
            "statistical_insight": narrative
        })

    except Exception as e:
        traceback.print_exc()
        raise ValueError(f"Reliability Error: {str(e)}")
    
# 12. VALIDITY
def run_validity_analysis(dataset, params):
    try:
        items = _get_vars(params)
        if len(items) < 2: raise ValueError("Pilih minimal 2 item.")
        df = _get_df(dataset, items)
        
        total_score = df.sum(axis=1)
        results = []
        r_tabel = 0.3 # Placeholder
        
        for col in items:
            r_hitung, p = stats.pearsonr(df[col], total_score)
            results.append({
                "Item": col, 
                "r_Hitung": r_hitung, 
                "r_Tabel": f"> {r_tabel}", 
                "Sig": _format_p_value(p), 
                "Status": "VALID" if r_hitung > r_tabel and p < 0.05 else "TIDAK VALID"
            })
            
        chart_data = [{"name": r["Item"], "count": r["r_Hitung"]} for r in results]

        return _clean_for_json({
            "summary_table": results,
            "charts": {
                "validity_plot": {
                    "type": "bar", 
                    "title": "Validitas Item (r-hitung)", 
                    "data": chart_data,
                    "color": "#8B5CF6"
                }
            },
            "statistical_insight": f"Uji Validitas: {len([r for r in results if r['Status']=='VALID'])} item VALID, {len([r for r in results if r['Status']!='VALID'])} item TIDAK VALID. (Syarat: r-hitung > r-tabel & p < 0.05)"
        })
    except Exception as e: raise ValueError(f"Validity Error: {str(e)}")

# 13. WILCOXON
def run_wilcoxon(dataset, params):
    try:
        vars = _get_vars(params)
        df = _get_df(dataset, vars)
        stat, p = stats.wilcoxon(df[vars[0]], df[vars[1]])
        return _clean_for_json({
            "summary_table": [{"pair": f"{vars[0]} - {vars[1]}", "stat": stat, "sig": _format_p_value(p)}],
            "test_statistics": {"W_stat": stat, "p_value": p},
            "statistical_insight": StatisticalNarrative.comparative("Uji Wilcoxon Signed-Rank", p, context="(Pre vs Post)")
        })
    except Exception as e: raise ValueError(str(e))