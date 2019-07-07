from django.http import JsonResponse

from feedback.models import Feedback


def feedback(request):
    status = 405
    response = {}
    if request.is_ajax() and request.method == 'POST':
        status = 200
        feedback_message = request.POST['message']
        new_feedback = Feedback()
        new_feedback.message = feedback_message
        if request.user.is_authenticated:
            new_feedback.owner = request.user
        new_feedback.save()

    return JsonResponse(
        response,
        status=status
    )
