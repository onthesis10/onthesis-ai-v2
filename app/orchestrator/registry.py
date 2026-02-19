from typing import Dict, Type, TYPE_CHECKING
if TYPE_CHECKING:
    from app.orchestrator.modes.base import BaseMode

import logging

logger = logging.getLogger(__name__)

class ModeRegistry:
    """
    Singleton Registry for all Academic Modes.
    """
    _modes: Dict[str, "BaseMode"] = {}

    @classmethod
    def register(cls, name: str):
        """Decorator to register a mode class."""
        def decorator(mode_cls: Type["BaseMode"]):
            instance = mode_cls()
            cls._modes[name] = instance
            logger.info(f"✅ Registered Mode: {name}")
            return mode_cls
        return decorator

    @classmethod
    def get_mode(cls, name: str) -> "BaseMode":
        """Retrieves a mode instance by name."""
        mode = cls._modes.get(name)
        if not mode:
            logger.warning(f"⚠️ Mode '{name}' not found. Falling back to default.")
            # Fallback logic could be added here, or raise Error
            # For now, return None to let caller handle it
            return None 
        return mode

    @classmethod
    def list_modes(cls):
        return list(cls._modes.keys())
