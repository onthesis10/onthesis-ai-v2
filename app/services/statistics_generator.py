import numpy as np
import pandas as pd
from scipy.stats import pearsonr, shapiro
from typing import List, Dict, Any, Tuple

class StatisticsGenerator:
    """
    Advanced Statistical Data Generator for Research.
    Uses covariance matrices to ensure relationships between variables are preserved.
    """

    @staticmethod
    def generate_dataset(
        sample_size: int,
        variables: List[Dict[str, Any]],
        relationships: List[Dict[str, Any]] = []
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Main entry point to generate a dataset.
        
        Args:
            sample_size: Number of rows
            variables: List of variable definitions
                { id, name, type: (numeric|likert|nominal|binary|text|date), params: {...} }
            relationships: List of explicit correlations
                { var1: 'id_x', var2: 'id_y', correlation: 0.5 }
                
        Returns:
            (records, meta_report)
        """
        data = {}
        meta_report = {
            "validity": [],
            "reliability": [],
            "normality": []
        }

        # 1. Separate Independent (base) and Dependent (derived) variables
        # Ideally we use multivariate normal for all correlated numeric/likert variables together.
        
        numeric_likert_vars = [v for v in variables if v['type'] in ['numeric', 'likert', 'ordinal', 'integer', 'float']]
        other_vars = [v for v in variables if v['type'] not in ['numeric', 'likert', 'ordinal', 'integer', 'float']]
        
        # Map var IDs to indices for covariance matrix
        var_id_map = {v['id']: i for i, v in enumerate(numeric_likert_vars)}
        n_vars = len(numeric_likert_vars)
        
        if n_vars > 0:
            # 2. Build Covariance Matrix
            # Start with Identity matrix (uncorrelated)
            cov_matrix = np.eye(n_vars)
            
            # Apply user-defined correlations
            for rel in relationships:
                id1 = rel.get('var1_id')
                id2 = rel.get('var2_id')
                corr = float(rel.get('correlation', 0.0))
                
                if id1 in var_id_map and id2 in var_id_map:
                    idx1 = var_id_map[id1]
                    idx2 = var_id_map[id2]
                    # Set correlation (symmetric)
                    cov_matrix[idx1, idx2] = corr
                    cov_matrix[idx2, idx1] = corr
            
            # Ensure positive semi-definite (fix if user inputs impossible correlations)
            # Simple fix: finding nearest correlation matrix is complex, so we'll try basic generation
            # and fallback if it fails.
            
            # 3. Generate Multivariate Normal Data (Z-scores first)
            means = np.zeros(n_vars)
            try:
                # raw_z shape (sample_size, n_vars)
                raw_z = np.random.multivariate_normal(means, cov_matrix, sample_size)
            except np.linalg.LinAlgError:
                # Validation fallback: reduce correlations if matrix is not positive definite
                cov_matrix = np.eye(n_vars) # Fallback to independent
                raw_z = np.random.multivariate_normal(means, cov_matrix, sample_size)
                meta_report['warnings'] = ["Correlations too complex/conflicting. Reset to independent."]

            # 4. Transform Z-scores to Target Distributions
            for i, var in enumerate(numeric_likert_vars):
                var_name = var['name']
                z_col = raw_z[:, i]
                
                if var['type'] == 'likert':
                    params = var.get('params', {})
                    scale = int(params.get('scale', 5)) # 1-5 or 1-7
                    # Transform Z to Uniform(0,1) via CDF then to Likert bins
                    # Better approach for Likert: Rescale Z to items range
                    # But we want to preserve correlation.
                    # Simple discrete binning of the normal distribution.
                    
                    # Assume Likert is roughly normal centered at (min+max)/2
                    min_val = 1
                    max_val = scale
                    center = (min_val + max_val) / 2
                    # standard deviation for likert? usually around 1.0 for 5-point
                    target_std = (scale - 1) / 4 # Rule of thumb
                    
                    scaled = z_col * target_std + center
                    clipped = np.clip(np.round(scaled), min_val, max_val)
                    data[var_name] = clipped.astype(int)
                    
                    # Calculate Cronbach's Alpha logic if this variable is a composite sum
                    # (Not simulated here since we generate the final score directly or single items)
                    
                elif var['type'] in ['numeric', 'float']:
                    params = var.get('params', {})
                    mean = float(params.get('mean', 75))
                    std = float(params.get('std', 10))
                    min_v = params.get('min')
                    max_v = params.get('max')
                    
                    val = z_col * std + mean
                    if min_v is not None: val = np.maximum(val, min_v)
                    if max_v is not None: val = np.minimum(val, max_v)
                    
                    data[var_name] = np.round(val, 2)
                    
                elif var['type'] in ['integer', 'age']:
                    params = var.get('params', {})
                    mean = float(params.get('mean', 20))
                    std = float(params.get('std', 2))
                    
                    val = z_col * std + mean
                    data[var_name] = np.round(val).astype(int)

        # 5. Generate Other Types (Nominal, Text, Boolean) - Independent for now
        for var in other_vars:
            var_name = var['name']
            v_type = var['type']
            params = var.get('params', {})
            
            if v_type == 'nominal' or v_type == 'categorical':
                options = params.get('options', ['A', 'B'])
                probs = params.get('probabilities') # Optional [0.6, 0.4]
                data[var_name] = np.random.choice(options, sample_size, p=probs)
                
            elif v_type == 'binary' or v_type == 'boolean':
                labels = params.get('labels', [0, 1])
                prob_true = float(params.get('prob_true', 0.5))
                data[var_name] = np.random.choice(labels, sample_size, p=[1-prob_true, prob_true])
                
            elif v_type == 'text':
                # Simple placeholder generation
                # In real app, use pool of academic responses
                prefix = params.get('prefix', 'Respon')
                data[var_name] = [f"{prefix} {i+1}" for i in range(sample_size)]
        
        # 6. Post-Calculation (Derived Variables)
        # e.g. Total Score = Sum of Items
        # This is handled if user defines explicit computed vars, skipped for MVP
            
        # 7. Quality Report
        df = pd.DataFrame(data)
        
        # Normality Check (Shapiro-Wilk) - Random sample if N > 5000
        for col in df.select_dtypes(include=[np.number]).columns:
            try:
                stat, p = shapiro(df[col])
                meta_report['normality'].append({
                    "variable": col,
                    "statistic": round(float(stat), 3),
                    "p_value": round(float(p), 3),
                    "is_normal": bool(p > 0.05)
                })
            except:
                pass
                
        # Internal Reliability Check (Simulated)
        # Since we generate "Totals" directly often, we might not have items. 
        # If we did generate items, we would calc Alpha here.
        # For generated data, we can "fake" a high alpha report if requested,
        # but better to be honest.
        
        # 8. Final Formatting
        records = df.to_dict(orient='records')
        
        return records, meta_report

    @staticmethod
    def calculate_cronbach(df: pd.DataFrame) -> float:
        """Helper to reliability check"""
        item_scores = df.values
        item_vars = item_scores.var(axis=0, ddof=1).sum()
        total_scores = item_scores.sum(axis=1)
        total_var = total_scores.var(ddof=1)
        n_items = df.shape[1]
        
        if total_var == 0: return 0.0
        
        return (n_items / (n_items - 1)) * (1 - (item_vars / total_var))
