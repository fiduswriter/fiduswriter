from django.http import JsonResponse
from django.views.decorators.http import require_POST

from base.decorators import ajax_required
from feedback.models import (
    FEEDBACK_MAX_LENGTH,
    Feedback,
    clean_feedback_message,
)


@require_POST
@ajax_required
def feedback(request):
    response = {}
    status = 200
    feedback_message = request.JSON.get("message")
    if not isinstance(feedback_message, str) or not feedback_message.strip():
        response["error"] = "No message"
        return JsonResponse(response, status=400)
    if len(feedback_message) > FEEDBACK_MAX_LENGTH:
        response["error"] = "Message too long"
        return JsonResponse(response, status=400)
    feedback_message = clean_feedback_message(feedback_message)
    new_feedback = Feedback()
    new_feedback.message = feedback_message
    if request.user.is_authenticated:
        new_feedback.owner = request.user
    new_feedback.save()

    return JsonResponse(response, status=status)
