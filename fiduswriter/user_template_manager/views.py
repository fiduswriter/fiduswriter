import json

from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.views.decorators.http import require_POST

from base.decorators import ajax_required
from document.models import DocumentTemplate
from document.helpers.serializers import PythonWithURLSerializer


@login_required
@ajax_required
@require_POST
def list(request):
    response = {}
    status = 200
    doc_templates = DocumentTemplate.objects.filter(
        Q(user=request.user) | Q(user=None)
    )
    date_format = '%Y-%m-%d'
    response['document_templates'] = [
        {
            'id': obj.id,
            'title': obj.title,
            'is_owner': (obj.user is not None),
            'added': obj.added.strftime(date_format),
            'updated': obj.updated.strftime(date_format)
        } for obj in doc_templates
    ]
    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def get(request):
    id = int(request.POST['id'])
    if id == 0:
        doc_template = DocumentTemplate()
        doc_template.user = request.user
        doc_template.save()
        status = 201
    else:
        doc_template = DocumentTemplate.objects.filter(
            id=id,
            user=request.user
        ).first()
        status = 200
    if doc_template is None:
        return JsonResponse({}, status=405)
    serializer = PythonWithURLSerializer()
    export_templates = serializer.serialize(
        doc_template.exporttemplate_set.all()
    )
    document_styles = serializer.serialize(
        doc_template.documentstyle_set.all(),
        use_natural_foreign_keys=True,
        fields=['title', 'slug', 'contents', 'documentstylefile_set']
    )
    response = {
        'template': {
            'id': doc_template.id,
            'title': doc_template.title,
            'content': doc_template.content,
            'export_templates': export_templates,
            'document_styles': document_styles
        },
    }
    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def save(request):
    id = request.POST['id']
    doc_template = DocumentTemplate.objects.filter(
        id=id,
        user=request.user
    ).first()
    if doc_template is None:
        return JsonResponse({}, status=405)
    response = {}
    status = 200
    doc_template.content = json.loads(request.POST['value'])
    doc_template.title = request.POST['title']
    doc_template.import_id = request.POST['import_id']
    doc_template.save()
    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def copy(request):
    id = request.POST['id']
    doc_template = DocumentTemplate.objects.filter(
        Q(id=id),
        Q(user=request.user) | Q(user=None)
    ).first()
    if doc_template is None:
        return JsonResponse({}, status=405)
    response = {}
    status = 201
    document_styles = [style for style in doc_template.documentstyle_set.all()]
    export_templates = [
        template for template in doc_template.exporttemplate_set.all()
    ]
    doc_template.pk = None
    doc_template.user = request.user
    doc_template.save()
    for ds in document_styles:
        style_files = [file for file in ds.documentstylefile_set.all()]
        ds.pk = None
        ds.document_template = doc_template
        ds.save()
        for sf in style_files:
            sf.pk = None
            sf.style = ds
            sf.save()
    for et in export_templates:
        et.pk = None
        et.document_template = doc_template
        et.save()
    response['new_id'] = doc_template.id
    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def delete(request):
    response = {}
    status = 405
    id = int(request.POST['id'])
    doc_template = DocumentTemplate.objects.filter(
        pk=id,
        user=request.user
    ).first()
    if doc_template:
        status = 200
        if doc_template.is_deletable():
            doc_template.delete()
            response['done'] = True
        else:
            response['done'] = False
    return JsonResponse(
        response,
        status=status
    )
