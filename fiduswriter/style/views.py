from django.http import JsonResponse
from django.core.exceptions import ValidationError
from django.contrib.auth.decorators import login_required
from document.helpers.serializers import PythonWithURLSerializer
from django.utils.translation import ugettext as _

from .models import DocumentStyle, DocumentStyleFile, ExportTemplate
from document.models import DocumentTemplate


@login_required
def delete_document_style(request):
    response = {}
    if not request.is_ajax() or request.method != 'POST':
        return JsonResponse(
            response,
            status=405
        )
    id = int(request.POST['id'])
    if request.user.is_staff:
        document_style = DocumentStyle.objects.filter(id=id).first()
    else:
        document_style = DocumentStyle.objects.filter(
            id=id,
            document_template__user=request.user
        ).first()
    if not document_style:
        return JsonResponse(
            response,
            status=405
        )
    if document_style.document_template.documentstyle_set.all().count() < 2:
        # We do not the style if there is only one left for this template
        response['errors'] = {
            'template': _('The template needs at least 1 document style')
        }
        return JsonResponse(
            response,
            status=400
        )
    document_style.delete()
    status = 200
    return JsonResponse(
        response,
        status=status
    )


@login_required
def save_document_style(request):
    response = {}
    if not request.is_ajax() or request.method != 'POST':
        return JsonResponse(
            response,
            status=405
        )
    template_id = int(request.POST['template_id'])
    if request.user.is_staff:
        template = DocumentTemplate.objects.filter(id=template_id).first()
    else:
        template = DocumentTemplate.objects.filter(
            id=template_id,
            user=request.user
        ).first()
    if not template:
        return JsonResponse(
            response,
            status=405
        )
    id = int(request.POST['id'])
    if id > 0:
        document_style = DocumentStyle.objects.filter(
            id=id,
            document_template=template
        ).first()
        status = 200
    else:
        document_style = DocumentStyle()
        document_style.document_template = template
        status = 201
    if not document_style:
        return JsonResponse(
            response,
            status=405
        )
    document_style.title = request.POST['title']
    document_style.slug = request.POST['slug']
    document_style.contents = request.POST['contents']
    try:
        document_style.full_clean()
        document_style.save()
    except ValidationError as e:
        response['errors'] = e.message_dict
        return JsonResponse(
            response,
            status=400
        )
    deleted_files = request.POST.getlist('deleted_files[]')
    added_files = request.FILES.getlist('added_files[]')
    for file in added_files:
        dsf = DocumentStyleFile()
        dsf.file = file
        dsf.style = document_style
        dsf.save()
    for file in deleted_files:
        dsf = DocumentStyleFile.objects.filter(
            style=document_style,
            filename=file
        ).first()
        if dsf:
            dsf.delete()
    serializer = PythonWithURLSerializer()
    response['doc_style'] = serializer.serialize(
        [document_style],
        use_natural_foreign_keys=True,
        fields=['title', 'slug', 'contents', 'documentstylefile_set']
    )
    return JsonResponse(
        response,
        status=status
    )


@login_required
def delete_export_template(request):
    response = {}
    if not request.is_ajax() or request.method != 'POST':
        return JsonResponse(
            response,
            status=405
        )
    id = int(request.POST['id'])
    if request.user.is_staff:
        export_template = ExportTemplate.objects.filter(id=id).first()
    else:
        export_template = ExportTemplate.objects.filter(
            id=id,
            document_template__user=request.user
        ).first()
    if not export_template:
        return JsonResponse(
            response,
            status=405
        )
    export_template.delete()
    status = 200
    return JsonResponse(
        response,
        status=status
    )


@login_required
def save_export_template(request):
    response = {}
    if not request.is_ajax() or request.method != 'POST':
        return JsonResponse(
            response,
            status=405
        )
    template_id = int(request.POST['template_id'])
    if request.user.is_staff:
        template = DocumentTemplate.objects.filter(id=template_id).first()
    else:
        template = DocumentTemplate.objects.filter(
            id=template_id,
            user=request.user
        ).first()
    if not template:
        return JsonResponse(
            response,
            status=405
        )
    id = int(request.POST['id'])
    if id > 0:
        export_template = ExportTemplate.objects.filter(
            id=id,
            document_template=template
        ).first()
        status = 200
    else:
        export_template = ExportTemplate()
        export_template.document_template = template
        status = 201
    if not export_template:
        return JsonResponse(
            response,
            status=405
        )
    export_template.template_file = request.FILES['added_file']
    export_template.file_type = request.POST['added_file_type']
    try:
        export_template.full_clean()
        export_template.save()
    except ValidationError as e:
        response['errors'] = e.message_dict
        return JsonResponse(
            response,
            status=400
        )
    serializer = PythonWithURLSerializer()
    response['export_template'] = serializer.serialize(
        [export_template],
        fields=['file_type', 'template_file', 'title']
    )
    return JsonResponse(
        response,
        status=status
    )
