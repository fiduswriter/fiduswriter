import inspect
from django.utils.html import strip_tags
from django.utils.encoding import force_unicode

def process_docstring(app, what, name, obj, options, lines):
    # This causes import errors if left outside the function
    from django.db import models
    #from django.apps import apps

    # Make sure we have loaded models, otherwise related fields may end up
    # as strings
    models.get_models()
    #apps.get_models()

    # Only look at objects that inherit from Django's base model class
    if inspect.isclass(obj) and issubclass(obj, models.Model):
        # Grab the field list from the meta class
        #fields = obj._meta.get_fields()
        fields = obj._meta.fields
        latelines = []
        for field in fields:
            if not hasattr(field, 'attname') or isinstance(field, models.ForeignKey):
                field.attname = field.name
            # Decode and strip any html out of the field's help text
            try:
                help_text = strip_tags(force_unicode(field.help_text))
            except:
                help_text = ''

            # Decode and capitalize the verbose name, for use if there isn't
            # any help text
            try:
                verbose_name = force_unicode(field.verbose_name).capitalize()
            except:
                verbose_name = ''

            if help_text:
                # Add the model field to the end of the docstring as a param
                # using the help text as the description
                lines.append(u':param %s: %s' % (field.attname, help_text))
            elif verbose_name:
                # Add the model field to the end of the docstring as a param
                # using the verbose name as the description
                lines.append(u':param %s: %s' % (field.attname, verbose_name))

            # Add the field's type to the docstring
            if isinstance(field, models.ForeignKey):
                to = field.rel.to
                lines.append(u':type %s: %s to :class:`%s.%s`' % (field.attname, type(field).__name__, to.__module__, to.__name__))
            elif isinstance(field, models.ManyToManyField):
                to = field.rel.to
                lines.append(u':type %s: %s to :class:`%s.%s`' % (field.attname, type(field).__name__, to.__module__, to.__name__))
            elif isinstance(field, models.ManyToOneRel):
                to = field.related_model
                latelines.append(u'.. attribute:: %s' % (field.related_name or field.name + '_set'))
                latelines.append('')
                latelines.append(u'   %s to :class:`%s.%s`' % (type(field).__name__, to.__module__, to.__name__))
                latelines.append('')
            else:
                lines.append(u':type %s: %s' % (field.attname, type(field).__name__))
        lines.append('')
        lines += latelines
    # Return the extended docstring
    return lines