from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib.sites.shortcuts import get_current_site
from django.contrib.flatpages.models import FlatPage
from django.http import JsonResponse


@ensure_csrf_cookie
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


def flatpage(request):
    """
    Models: `flatpages.flatpages`
    Context:
        flatpage
            `flatpages.flatpages` object
    """
    response = {}
    status = 404
    if request.is_ajax() and request.method == 'POST':
        url = request.POST['url']
        site_id = get_current_site(request).id
        flatpage = FlatPage.objects.filter(url=url, sites=site_id).first()
        if flatpage:
            status = 200
            response['title'] = flatpage.title
            response['content'] = flatpage.content
    return JsonResponse(
        response,
        status=status
    )
