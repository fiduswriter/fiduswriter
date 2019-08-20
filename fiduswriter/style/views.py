from django.http import JsonResponse
from django.core.exceptions import ValidationError
from django.contrib.auth.decorators import login_required
from document.helpers.serializers import PythonWithURLSerializer

from .models import DocumentStyle, DocumentStyleFile
from document.models import DocumentTemplate


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
