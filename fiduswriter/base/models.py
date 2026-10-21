from django.db import models
from django.conf import settings
from django.utils import timezone


class Presence(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    server_url = models.URLField()
    timestamp = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.server_url} - {self.timestamp}"

    @classmethod
    def prune(cls):
        # Remove all presences that haven't been updated for 5 minutos
        cls.objects.filter(
            timestamp__lt=timezone.now() - timezone.timedelta(minutes=5)
        ).delete()


class AuditLog(models.Model):
    """Structured record of a security-relevant event.

    Never store secrets: no share-token values, passwords, or key
    material. Guest/capability actors are recorded via opaque ids.
    """

    OUTCOME_SUCCESS = "success"
    OUTCOME_DENIED = "denied"
    OUTCOME_ERROR = "error"

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_entries",
    )
    # Non-secret identity when the actor is not a normal account
    # (deterministic guest participant id) or the account is gone.
    actor_label = models.CharField(max_length=255, blank=True, default="")
    # True when the actor acted through a capability (share token) rather
    # than an authenticated account session.
    actor_is_capability = models.BooleanField(default=False)
    target_type = models.CharField(max_length=64)
    target_id = models.CharField(max_length=64, blank=True, default="")
    action = models.CharField(max_length=64)
    outcome = models.CharField(
        max_length=16,
        default=OUTCOME_SUCCESS,
        choices=[
            (OUTCOME_SUCCESS, OUTCOME_SUCCESS),
            (OUTCOME_DENIED, OUTCOME_DENIED),
            (OUTCOME_ERROR, OUTCOME_ERROR),
        ],
    )
    old_state = models.JSONField(null=True, blank=True)
    new_state = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["target_type", "target_id"]),
            models.Index(fields=["action"]),
        ]

    def __str__(self):
        actor = self.actor_id or self.actor_label or "anonymous"
        return f"{self.timestamp} {actor} {self.action} {self.target_type}:{self.target_id} {self.outcome}"
