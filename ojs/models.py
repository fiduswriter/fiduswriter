from django.db import models
from django.contrib.sessions.models import Session

def sessionend_handler(sender, **kwargs):
    # cleanup session (temp) data
    sess_instance = kwargs.get('instance')
    print "session %s ended" % sess_instance.session_key
    print "session_data is %s" % sess_instance.get_decoded()
    #for key in sess_instance.keys() :
    #    print "Key: {1}, Value: {2}".format([key, sess_instance[key]]) 

models.signals.pre_delete.connect(sessionend_handler, sender=Session)
