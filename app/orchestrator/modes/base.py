from abc import ABC, abstractmethod
from typing import Dict, Any, Generator, Union
from app.orchestrator.schema import RequestContext, ExecutionPlan, Step

class BaseMode(ABC):
    """
    Abstract Base Class for all Academic Modes.
    Enforces the structure: Prepare -> Plan -> Execute.
    """

    def __init__(self):
        self.mode_name = "base"

    @abstractmethod
    def prepare_context(self, context: RequestContext) -> Dict[str, Any]:
        """
        Enriches the request context with necessary data (e.g., from DB or Vector Store).
        """
        pass

    @abstractmethod
    def generate_plan(self, context: RequestContext) -> ExecutionPlan:
        """
        Creates a structured execution plan based on the request.
        """
        pass

    @abstractmethod
    def execute_step(self, step: Step, context: RequestContext) -> Union[str, Generator, Dict]:
        """
        Executes a single step from the plan. 
        Can return a string, a generator (for streaming), or a dictionary.
        """
        pass
