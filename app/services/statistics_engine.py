# File: app/services/statistics_engine.py
# Deskripsi: Adapter Layer untuk menghubungkan Workflow API dengan utilitas statistik internal

import logging
from app.utils import stats_utils
from app.utils.data_engine import OnThesisDataset

logger = logging.getLogger(__name__)

class StatEngine:
    _instance = None
    
    def __init__(self):
        self.dataset = None
        self.reload_data()
        
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = StatEngine()
        else:
            # Always reload data to ensure freshness
            cls._instance.reload_data()
        return cls._instance
    
    def reload_data(self):
        """Reload data from storage (assuming default user for single-user desktop app)"""
        try:
            # Load default project for guest/default user
            # Adjust user_id if authentication is fully implemented
            self.dataset = OnThesisDataset.load(user_id="guest", project_id="default")
        except Exception as e:
            logger.warning(f"StatEngine: Failed to load dataset ({str(e)}). Initializing empty.")
            self.dataset = OnThesisDataset(user_id="guest")

    @property
    def df(self):
        return self.dataset.df if self.dataset else None

    # --- WRAPPERS FOR STATS UTILS ---

    def descriptive_analysis(self, columns: list = None):
        """Run descriptive statistics"""
        if columns:
            return stats_utils.run_descriptive_analysis(self.dataset, {'variables': columns})
        # If no columns specified, use numerical columns
        return stats_utils.run_descriptive_analysis(self.dataset, {})

    def correlation_analysis(self, variables: list, method='pearson'):
        """Run correlation analysis"""
        params = {
            'variables': variables,
            'method': method
        }
        return stats_utils.run_correlation(self.dataset, params)

    def run_ttest(self, var1, var2, test_type='independent'):
        """Run T-Test (Independent or Paired)"""
        if test_type == 'independent':
            # expects var1=test_variable, var2=grouping_variable
            params = {
                'test_variable': var1,
                'group_variable': var2
            }
            return stats_utils.run_independent_ttest(self.dataset, params)
        else:
            # Paired
            params = {
                'variable1': var1,
                'variable2': var2
            }
            return stats_utils.run_paired_ttest(self.dataset, params)

    def run_anova(self, dep_var, group_var):
        """Run One-Way ANOVA"""
        params = {
            'dependent_variable': dep_var,
            'factor_variable': group_var
        }
        return stats_utils.run_oneway_anova(self.dataset, params)

    def chi_square_test(self, var1, var2):
        """Run Chi-Square Test"""
        params = {
            'row_variable': var1,
            'col_variable': var2
        }
        return stats_utils.run_chi_square(self.dataset, params)

    def linear_regression(self, dep_var, indep_vars: list):
        """Run Linear Regression"""
        params = {
            'dependent_variable': dep_var,
            'independent_variables': indep_vars
        }
        return stats_utils.run_linear_regression(self.dataset, params)

    def reliability_analysis(self, items: list):
        """Run Reliability Analysis (Cronbach's Alpha)"""
        params = {
            'items': items
        }
        return stats_utils.run_reliability_analysis(self.dataset, params)
