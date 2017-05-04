from time import mktime
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.template.context_processors import csrf
from document.models import AccessRight
from style.models import DocumentStyle
from django.http import JsonResponse
from django.db.models import Q


@login_required
def index(request):
    response = {}
    response.update(csrf(request))
    return render(request, 'style/index.html', response)


# returns list of styles
@login_required
def stylelist_js(request):
    response = {}
    status = 403
    if request.is_ajax() and request.method == 'POST':
        user_id = request.POST['owner_id']
        if len(user_id.split(',')) > 1:
            user_ids = user_id.split(',')
            status = 200
            for user_id in user_ids:
                if check_access_rights(user_id, request.user) is False:
                    status = 403
            if status == 200:
                if request.POST['Default_List']:
                    styles = DocumentStyle.objects.filter(
                        Q(owner__in=user_ids) |
                        Q(owner__isnull=True)
                    )
                else:
                    styles = DocumentStyle.objects.filter(owner__in=user_ids)
        else:
            if check_access_rights(user_id, request.user):
                if int(user_id) == 0:
                    user_id = request.user.id
                if request.POST['Default_List'] == 'true':
                    styles = DocumentStyle.objects.filter(
                        Q(owner=user_id) |
                        Q(owner__isnull=True)
                    )
                else:
                    styles = DocumentStyle.objects.filter(Q(owner=user_id))
                status = 200
        if status == 200:
            response['styles'] = []
            for style in styles:
                if style.css:
                    css = style.css.url
                else:
                    css = 'Undefined'
                if style.latexcls:
                    latexcls = style.latexcls.url
                else:
                    latexcls = 'Undefined'
                if style.docx:
                    docx = style.docx.url
                else:
                    docx = 'Undefined'
                field_obj = {
                    'pk': style.pk,
                    'filename': style.filename,
                    'title': style.title,
                    # 'fonts': style.fonts,
                    'css': css,
                    'latexcls': latexcls,
                    'docx': docx

                    }

                response['styles'].append(field_obj)
    return JsonResponse(
        response,
        status=status
    )


# save changes or create a new style
@login_required
def save_js(request):
    response = {}
    response['errormsg'] = {}
    status = 403
    if request.is_ajax() and request.method == 'POST':
        the_id = int(request.POST['styleid'])
        if 'owner_id' in request.POST:
            owner_id = int(request.POST['owner_id'])
            if owner_id != request.user.id:
                if not check_access_rights(owner_id, request.user):
                    return False
        else:
            owner_id = request.user.id

        # We only allow owners to change their images.
        style = DocumentStyle.objects.filter(pk=the_id, owner=request.user)
        if style.exists():
            style = style[0]
            status = 200
        else:
            style = DocumentStyle()
            style.uploader = request.user
            style.owner_id = owner_id
            status = 201

        style.title = request.POST['title']
        response['values'] = {}
        if 'css' in request.FILES:
            style.css = request.FILES['css']
            style.filename = style.css.name.split('.')[0]
            response['values']['css'] = style.css.url
        if 'latexcls' in request.FILES:
            style.latexcls = request.FILES['latexcls']
            response['values']['latexcls'] = style.latexcls.url
        if 'docx' in request.FILES:
            style.docx = request.FILES['docx']
            response['values']['docx'] = style.docx.url
        style.save()
        response['values']['pk'] = style.pk
        response['values']['title'] = style.title
        response['values']['added'] = mktime(style.added.timetuple()) * 1000

    return JsonResponse(
        response,
        status=status
    )


# delete a style
@login_required
def delete_js(request):
    status = 405
    response = {}
    if request.is_ajax() and request.method == 'POST':
        status = 201
        ids = request.POST.getlist('ids[]')
        DocumentStyle.objects.filter(pk__in=ids, owner=request.user).delete()
    return JsonResponse(
        response,
        status=status
    )


def check_access_rights(other_user_id, this_user):
    other_user_id = int(other_user_id)
    has_access = False
    if other_user_id == 0:
        has_access = True
    elif other_user_id == this_user.id:
        has_access = True
    elif AccessRight.objects.filter(
        document__owner=other_user_id,
        user=this_user
    ).count() > 0:
        has_access = True
    return has_access
