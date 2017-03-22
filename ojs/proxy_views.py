from tornado.web import RequestHandler, asynchronous, HTTPError
from tornado.httpclient import AsyncHTTPClient
from tornado.httpclient import HTTPRequest
from tornado.httputil import url_concat
from tornado.escape import json_decode
from base.django_handler_mixin import DjangoHandlerMixin
from urllib import urlencode
from .models import Journal, Submission, SubmissionRevision
from django.core.files.base import ContentFile
from document.models import Document


class OJSProxy(DjangoHandlerMixin, RequestHandler):
    @asynchronous
    def get(self, relative_url):
        user = self.get_current_user()
        if not user.is_authenticated():
            self.set_status(401)
            return
        if relative_url == 'journals':
            base_url = self.get_argument('url')
            key = self.get_argument('key')
        else:
            return
        plugin_path = '/index.php/index/gateway/plugin/RestApiGatewayPlugin/'
        url = base_url + plugin_path + relative_url
        http = AsyncHTTPClient()
        http.fetch(
            HTTPRequest(
                url_concat(url, {'key': key}),
                'GET'
            ),
            callback=self.on_get_response
        )

    # The response is asynchronous so that the getting of the data from the OJS
    # server doesn't block the FW server connection.
    def on_get_response(self, response):
        if response.error:
            raise HTTPError(500)
        self.write(response.body)
        self.finish()

    @asynchronous
    def post(self, relative_url):
        user = self.get_current_user()
        if not user.is_authenticated():
            self.set_status(401)
            self.finish()
            return
        plugin_path = '/index.php/index/gateway/plugin/RestApiGatewayPlugin/'
        if relative_url == 'submit':
            # Submitting a new submission revision.
            journal_id = self.get_argument('journal_id')
            journal = Journal.objects.get(id=journal_id)
            submission_id = self.get_argument('submission_id', -1)
            if submission_id < 0:
                self.submission = Submission()
                self.submission.submitter = user
                self.submission.journal = journal
                self.submission.save()
                submission_id = self.submission.id
            else:
                self.submission = Submission.objects.get(id=submission_id)
                if self.submission.submitter != user:
                    # Trying to submit revision for submission of other user
                    self.set_status(401)
                    self.finish()
                    return
            version = self.get_argument('version', -1)
            if version > -1:
                # Make sure there is a revision with the current version number
                SubmissionRevision.objects.get(
                    submission_id=submission_id,
                    version=version
                )
            version = version + 1
            self.s_revision = SubmissionRevision()
            self.s_revision.submission = self.submission
            self.s_revision.version = version
            # Save the attached file as the revision file, transforming it
            # from the python file_object format Tornado provides it in to the
            # format used by Django.
            file_object = self.request.files['file'][0]
            self.s_revision.file_object.save(
                file_object.filename,
                ContentFile(file_object.body),
                save=False
            )
            # Connect a new, empty document (version==0) to the submission.
            document = Document()
            document.owner = journal.editor
            document.save()
            self.s_revision.document = document
            self.s_revision.save()
            article_url = '{protocol}://{host}/ojs/revision/{rev_id}'.format(
                protocol=self.request.protocol,
                host=self.request.host,
                rev_id=self.s_revision.id
            )
            title = journal_id = self.get_argument('title')
            post_data = {
                'username': user.username,
                'title': title,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'affiliation': 'some affiliation',
                'author_url': 'some author_url',
                'journal_id': journal.ojs_jid,
                'file_name': file_object.filename,
                'article_url': article_url
            }

            if version > 0:
                post_data['version_id'] = version
                post_data['submission_id'] = self.submission.ojs_jid
            body = urlencode(post_data)
            key = journal.ojs_key
            base_url = journal.ojs_url
            url = base_url + plugin_path + 'articles'
            http = AsyncHTTPClient()
            http.fetch(
                HTTPRequest(
                    url_concat(url, {'key': key}),
                    'POST',
                    None,
                    body
                ),
                callback=self.on_submission_response
            )
        else:
            self.set_status(401)
            self.finish()
            return

    # The response is asynchronous so that the getting of the data from the OJS
    # server doesn't block the FW server connection.
    def on_submission_response(self, response):
        if response.error:
            raise HTTPError(500)
        # If this is the first revision (version==0), then set the submission
        # ID from the response from the OJS server.
        if self.s_revision.version == 0:
            json = json_decode(response.body)
            self.submission.ojs_jid = json['submission_id']
            self.submission.save()
        self.write(response.body)
        self.finish()
