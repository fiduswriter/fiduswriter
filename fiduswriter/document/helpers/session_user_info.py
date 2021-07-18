from typing import Tuple

from document.models import AccessRight, Document, DocumentTemplate


class SessionUserInfo:
    """
    Class for string information about users in session
    author: akorovin
    """

    def __init__(self, current_user):
        self.user = current_user
        self.is_owner = False
        self.access_rights = "read"
        self.document_id = 0
        self.access_rights = dict()
        self.path = ""
        self.path_object = None

    def create_doc(self, template_id):
        template = DocumentTemplate.objects.filter(id=int(template_id)).first()
        if template:
            document = Document.objects.create(
                owner_id=self.user.id, template=template
            )
        else:
            document = Document.objects.create(owner_id=self.user.id)
        return document

    def init_access(self, document_id) -> Tuple[Document, bool]:
        """
        Initializes access to document by id,
        :param document_id:
        :type document_id:
        :param current_user:
        :type current_user:
        :return: Returns document and bool value that user can access
        :rtype: tuple
        """
        can_access = False
        document = Document.objects.filter(id=int(document_id)).first()
        if document is None:
            return (False, False)
        else:
            self.document_id = document.id
            if document.owner == self.user:
                self.access_rights = "write"
                self.is_owner = True
                self.path = document.path
                self.path_object = document
                can_access = True
            else:
                self.is_owner = False
                access_right = AccessRight.objects.filter(
                    document=document, user=self.user
                ).first()
                if access_right:
                    self.access_rights = access_right.rights
                    self.path = access_right.path
                    self.path_object = access_right
                    can_access = True
        return (document, can_access)
