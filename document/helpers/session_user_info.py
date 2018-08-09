from __future__ import unicode_literals
from document.models import AccessRight, Document


class SessionUserInfo():
    """
    Class for string information about users in session
    author: akorovin
    """
    def __init__(self):
        self.user = None
        self.is_owner = False
        self.access_rights = 'read'
        self.document_id = 0
        self.access_rights = dict()

    def init_access(self, document_id, current_user):
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
        self.user = current_user
        if int(document_id) == 0:
            can_access = True
            self.is_owner = True
            self.access_rights = 'write'
            document = Document.objects.create(owner_id=self.user.id)
            self.document_id = document.id
        else:
            document = Document.objects.filter(id=int(document_id)).first()
            if document is None:
                return (False, False)
            else:
                self.document_id = document.id
                if document.owner == self.user:
                    self.access_rights = 'write'
                    self.is_owner = True
                    can_access = True
                else:
                    self.is_owner = False
                    access_rights = AccessRight.objects.filter(
                        document=document,
                        user=self.user
                    ).first()
                    if access_rights:
                        self.access_rights = access_rights.rights
                        can_access = True
        return (document, can_access)
