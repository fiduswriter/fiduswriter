from django.shortcuts import render
from django.contrib.auth.decorators import login_required


@login_required
def app(request):
    """
    Load a page controlled by the JavaScript app.
    Used all user facing pages after login.
    """
    return render(request, 'app.html')
