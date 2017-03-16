import json

from django.shortcuts import render
from django.http import JsonResponse, HttpRequest
from django.utils import timezone
from django.contrib.auth.decorators import login_required
from django.template.context_processors import csrf
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.models import User
from django.utils.translation import ugettext as _
from django.conf import settings
from django.core.mail import send_mail

from book.models import Book, BookAccessRight, Chapter
from book.forms import BookForm

from document.models import AccessRight
from document.views import documents_list

from avatar.utils import get_primary_avatar, get_default_avatar_url
from avatar.templatetags.avatar_tags import avatar_url

from django.core.serializers.python import Serializer

from django.db.models import Q
import dateutil.parser


class SimpleSerializer(Serializer):

    def end_object(self, obj):
        self._current['id'] = obj._get_pk_val()
        self.objects.append(self._current)
serializer = SimpleSerializer()


def get_accessrights(ars):
    ret = []
    for ar in ars:
        the_avatar = get_primary_avatar(ar.user, 80)
        if the_avatar:
            the_avatar = the_avatar.avatar_url(80)
        else:
            the_avatar = get_default_avatar_url()
        ret.append({
            'book_id': ar.book.id,
            'user_id': ar.user.id,
            'user_name': ar.user.readable_name,
            'rights': ar.rights,
            'avatar': the_avatar
        })
    return ret


@login_required
def index(request):
    response = {}
    response.update(csrf(request))
    return render(request, 'book/index.html',
                  response)


@login_required
def print_book(request):
    response = {}
    response.update(csrf(request))
    return render(request, 'book/print.html',
                  response)


@login_required
def get_book_js(request):
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        book_id = json.loads(request.POST['id'])
        book = Book.objects.filter(id=book_id).filter(
            Q(owner=request.user) | Q(bookaccessright__user=request.user))
        # TODO: Is it really enough to check if the number of chapters
        # owned by or with access rights by the current user is smaller
        # than the total number of chapters of a book?
        if len(book) == 0 or len(
            book[0].chapters.filter(
                Q(owner=request.user) | Q(accessright__user=request.user)
            )
        ) < len(book[0].chapters.all()):
            response['error'] = 'insufficient rights'
        else:
            book = book[0]
            response['book'] = {
                'title': book.title,
                'settings': book.settings,
                'metadata': book.metadata,
                'chapters': []
            }
            for chapter in book.chapter_set.all().order_by('number'):
                response['book']['chapters'].append({
                    'title': chapter.text.title,
                    'contents': chapter.text.contents,
                    'part': chapter.part,
                    'settings': chapter.text.settings,
                    'metadata': chapter.text.metadata,
                    'owner': chapter.text.owner.id
                })
            status = 200

    return JsonResponse(
        response,
        status=status
    )


@login_required
def get_booklist_js(request):
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        status = 200
        response['documents'] = documents_list(request)
        books = Book.objects.filter(
            Q(owner=request.user) |
            Q(bookaccessright__user=request.user)
        ).distinct().order_by('-updated')
        response['books'] = []
        for book in books:
            if book.owner == request.user:
                access_right = 'write'
            else:
                access_right = BookAccessRight.objects.get(
                    user=request.user,
                    book=book
                ).rights
            date_format = '%d/%m/%Y'
            date_obj = dateutil.parser.parse(str(book.added))
            added = date_obj.strftime(date_format)
            date_obj = dateutil.parser.parse(str(book.updated))
            updated = date_obj.strftime(date_format)
            is_owner = False
            if book.owner == request.user:
                is_owner = True
            chapters = []
            for chapter in book.chapter_set.all():
                chapters.append({'text': chapter.text_id,
                                 'number': chapter.number,
                                 'part': chapter.part,
                                 'title': chapter.text.title})
            book_data = {
                'id': book.id,
                'title': book.title,
                'is_owner': is_owner,
                'owner': book.owner.id,
                'owner_name': book.owner.readable_name,
                'owner_avatar': avatar_url(book.owner, 80),
                'added': added,
                'updated': updated,
                'rights': access_right,
                'chapters': chapters,
                'metadata': book.metadata,
                'settings': book.settings
            }
            if book.cover_image:
                book_data['cover_image'] = book.cover_image.id
            response['books'].append(book_data)
        response['team_members'] = []
        for team_member in request.user.leader.all():
            tm_object = {}
            tm_object['id'] = team_member.member.id
            tm_object['name'] = team_member.member.readable_name
            tm_object['avatar'] = avatar_url(team_member.member, 80)
            response['team_members'].append(tm_object)
        response['user'] = {}
        response['user']['id'] = request.user.id
        response['user']['name'] = request.user.readable_name
        response['user']['avatar'] = avatar_url(request.user, 80)
        response['access_rights'] = get_accessrights(
            BookAccessRight.objects.filter(book__owner=request.user))
    return JsonResponse(
        response,
        status=status
    )


def add_chapters(book_instance, chapters, status, this_user):
    for chapter in chapters:
        new_chapter = Chapter(
            book=book_instance,
            text_id=chapter['text'],
            number=chapter['number'],
            part=chapter['part'])
        new_chapter.save()
        # If the current user is the owner of the chapter-document, make sure
        # that everyone with access to the book gets at least read access.
        if this_user == new_chapter.text.owner:
            for bar in BookAccessRight.objects.filter(book=book_instance):
                if len(
                    new_chapter.text.accessright_set.filter(
                        user=bar.user)) == 0:
                    AccessRight.objects.create(
                        document_id=new_chapter.text.id,
                        user_id=bar.user.id,
                        rights='read',
                    )
            if this_user != book_instance.owner and len(
                new_chapter.text.accessright_set.filter(
                    user=book_instance.owner)) == 0:
                AccessRight.objects.create(
                    document_id=new_chapter.text.id,
                    user_id=book_instance.owner.id,
                    rights='read',
                )
    return status


@login_required
def save_js(request):
    date_format = '%d/%m/%Y'
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        the_book = json.loads(request.POST['the_book'])
        the_chapters = the_book.pop('chapters')
        # if the_book['cover_image']==False:
        #     the_book.pop('cover_image')
        the_book['metadata'] = json.dumps(the_book['metadata'])
        the_book['settings'] = json.dumps(the_book['settings'])
        if the_book['id'] == 0:
            # We are dealing with a new book that still has not obtained an
            # ID.
            the_book['owner'] = request.user.pk

            # Now we check the augmented form against the modelform
            form = BookForm(the_book)
            if form.is_valid():
                # The form was valid, so we save the instance in the database,
                # and return the id that was assigned back to the client.
                form.save()
                status = 201
                the_book['id'] = form.instance.id
                response['id'] = the_book['id']
                date_obj = dateutil.parser.parse(str(form.instance.added))
                response['added'] = date_obj.strftime(date_format)
                date_obj = dateutil.parser.parse(str(form.instance.updated))
                response['updated'] = date_obj.strftime(date_format)
                status = add_chapters(
                    form.instance, the_chapters, status, request.user)
            else:
                response['errors'] = form.errors

        else:
            book = Book.objects.get(pk=the_book['id'])
            the_book['owner'] = book.owner.id
            the_book['updated'] = timezone.now()
            if book.owner == request.user:
                form = BookForm(the_book, instance=book)
                if form.is_valid():
                    form.save()
                    status = 200
                    date_obj = dateutil.parser.parse(
                        str(form.instance.updated))
                    response['updated'] = date_obj.strftime(date_format)
                    form.instance.chapter_set.all().delete()
                    status = add_chapters(
                        form.instance, the_chapters, status, request.user)
                else:
                    response['errors'] = form.errors
                    status = 422
            else:
                # We are not dealing with the owner, so we need to check if the
                # current user has the right to save the book
                if len(
                    book.bookaccessright_set.filter(
                        user=request.user,
                        rights=u'write')) > 0:
                    form = BookForm(the_book, instance=book)
                    if form.is_valid():
                        form.save()
                        date_obj = dateutil.parser.parse(
                            str(form.instance.updated))
                        response['updated'] = date_obj.strftime(date_format)
                        status = 200
                        form.instance.chapter_set.all().delete()
                        status = add_chapters(
                            form.instance, the_chapters, status, request.user)
                    else:
                        status = 422
                else:
                    status = 403

    return JsonResponse(
        response,
        status=status
    )


@login_required
def delete_js(request):
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        book_id = int(request.POST['id'])
        book = Book.objects.get(pk=book_id, owner=request.user)
        book.delete()
        status = 200
    return JsonResponse(
        response,
        status=status
    )


def send_share_notification(request, book_id, collaborator_id, right):
    owner = request.user.readable_name
    book = Book.objects.get(id=book_id)
    collaborator = User.objects.get(id=collaborator_id)
    collaborator_name = collaborator.readable_name
    collaborator_email = collaborator.email
    book_title = book.title
    if len(book_title) == 0:
        book_title = _('Untitled')
    link = HttpRequest.build_absolute_uri(request, '/book/')
    message_body = _(
        (
            'Hey %(collaborator_name)s,\n%(owner)s has shared the book '
            '\'%(book)s\' on Fidus Writer with you and given you %(right)s '
            'access rights.\nFind the book in your book overview: %(link)s'
        )
    ) % {
        'owner': owner,
        'right': right,
        'collaborator_name': collaborator_name,
        'link': link,
        'book': book_title
    }
    send_mail(
        _('Book shared:') +
        ' ' +
        book_title,
        message_body,
        settings.DEFAULT_FROM_EMAIL,
        [collaborator_email],
        fail_silently=True)


def send_share_upgrade_notification(request, book_id, collaborator_id):
    owner = request.user.readable_name
    book = Book.objects.get(id=book_id)
    collaborator = User.objects.get(id=collaborator_id)
    collaborator_name = collaborator.readable_name
    collaborator_email = collaborator.email
    link = HttpRequest.build_absolute_uri(request, '/book/')
    message_body = _(
        (
            'Hey %(collaborator_name)s,\n%(owner)s has given you write access '
            'rights to the book \'%(book)s\' on Fidus Writer.\nFind the book '
            'in your book overview: %(link)s'
        )
    ) % {
        'owner': owner,
        'collaborator_name': collaborator_name,
        'link': link,
        'book': book.title
    }
    send_mail(
        _('Fidus Writer book write access'),
        message_body,
        settings.DEFAULT_FROM_EMAIL,
        [collaborator_email],
        fail_silently=True)


@login_required
@transaction.atomic
def access_right_save_js(request):
    status = 405
    response = {}
    if request.is_ajax() and request.method == 'POST':
        tgt_books = request.POST.getlist('books[]')
        tgt_users = request.POST.getlist('collaborators[]')
        tgt_rights = request.POST.getlist('rights[]')
        for tgt_book in tgt_books:
            book_id = int(tgt_book)
            try:
                the_book = Book.objects.get(pk=book_id, owner=request.user)
            except ObjectDoesNotExist:
                continue
            x = 0
            for tgt_user in tgt_users:
                collaborator_id = int(tgt_user)
                try:
                    tgt_right = tgt_rights[x]
                except IndexError:
                    tgt_right = 'read'
                if tgt_right == 'delete':
                    # Status 'delete' means the access right is marked for
                    # deletion.
                    try:
                        access_right = BookAccessRight.objects.get(
                            book_id=book_id, user_id=collaborator_id)
                        access_right.delete()
                    except:
                        pass
                else:
                    try:
                        access_right = BookAccessRight.objects.get(
                            book_id=book_id, user_id=collaborator_id)
                        if access_right.rights != tgt_right:
                            access_right.rights = tgt_right
                            if tgt_right == 'write':
                                send_share_upgrade_notification(
                                    request, book_id, collaborator_id)
                    except ObjectDoesNotExist:
                        access_right = BookAccessRight.objects.create(
                            book_id=book_id,
                            user_id=collaborator_id,
                            rights=tgt_right,
                        )
                        send_share_notification(
                            request, book_id, collaborator_id, tgt_right)
                    access_right.save()
                    for text in the_book.chapters.all():
                        # If one shares a book with another user and that user
                        # has no access rights on the chapters that belong to
                        # the current user, give read access to the chapter
                        # documents to the collaborator.
                        if text.owner == request.user and len(
                            text.accessright_set.filter(
                                user_id=collaborator_id
                            )
                        ) == 0:
                            AccessRight.objects.create(
                                document_id=text.id,
                                user_id=collaborator_id,
                                rights='read',
                            )
                x += 1
        response['access_rights'] = get_accessrights(
            BookAccessRight.objects.filter(book__owner=request.user))
        status = 201
    return JsonResponse(
        response,
        status=status
    )
