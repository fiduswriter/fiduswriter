"""Structured security event logging helpers."""

import logging

from ..models import AuditLog

logger = logging.getLogger(__name__)


def log_security_event(
    action,
    target_type,
    target_id="",
    actor=None,
    outcome=AuditLog.OUTCOME_SUCCESS,
    old_state=None,
    new_state=None,
    actor_label="",
    actor_is_capability=False,
):
    """Append a security event to the audit log.

    ``actor`` may be an (possibly anonymous) user instance; anonymous users
    are recorded with ``actor=None`` and the given ``actor_label``.
    Must never receive secrets (token values, passwords, key material).
    """
    try:
        actor_id = None
        if actor is not None and getattr(actor, "is_authenticated", False):
            actor_id = actor.pk
        AuditLog.objects.create(
            actor_id=actor_id,
            actor_label=actor_label
            or (getattr(actor, "username", "") if actor_id else ""),
            actor_is_capability=actor_is_capability,
            target_type=target_type,
            target_id=str(target_id or ""),
            action=action,
            outcome=outcome,
            old_state=old_state,
            new_state=new_state,
        )
    except Exception:  # auditing must never break the audited operation
        logger.exception("Failed to write audit log entry (%s)", action)
