from django.shortcuts import render
from django.contrib.auth.decorators import login_required


# @login_required
def app(request):
    """
    Load a page controlled by the JavaScript app.
    Used all user facing pages after login.
    """
    return render(request, 'app.html')


# view is shown only in admin interface, so authentication is taken care of
def admin_console(request):
    """
    Load the admin console page.
    """
    return render(request, 'admin/console.html')
