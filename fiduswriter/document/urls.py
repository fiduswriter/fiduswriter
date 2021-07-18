from django.conf.urls import url

from . import views

urlpatterns = [
    url("^documentlist/$", views.get_documentlist, name="get_documentlist"),
    url(
        "^documentlist/extra/$",
        views.get_documentlist_extra,
        name="get_documentlist_extra",
    ),
    url("^delete/$", views.delete, name="delete"),
    url("^move/$", views.move, name="move"),
    url("^create_doc/$", views.create_doc, name="create_doc"),
    url("^import/create/$", views.import_create, name="import_create"),
    url("^import/image/$", views.import_image, name="import_image"),
    url("^import/$", views.import_doc, name="import_doc"),
    url("^upload/$", views.upload_revision, name="upload_revision"),
    url(
        "^get_revision/(?P<revision_id>[0-9]+)/$",
        views.get_revision,
        name="get_revision",
    ),
    url("^delete_revision/$", views.delete_revision, name="delete_revision"),
    url(
        "^get_access_rights/$",
        views.get_access_rights,
        name="get_access_rights",
    ),
    url(
        "^save_access_rights/$",
        views.save_access_rights,
        name="save_access_rights",
    ),
    url("^comment_notify/$", views.comment_notify, name="comment_notify"),
    url(
        "^admin/get_template/$",
        views.get_template_admin,
        name="get_template_admin",
    ),
    url(
        "^get_template_for_doc/$",
        views.get_template_for_doc,
        name="get_template_for_doc",
    ),
    url(
        "^admin/create_template/$",
        views.create_template_admin,
        name="create_template_admin",
    ),
    url(
        "^admin/get_template/(?P<type>base|extras)/$",
        views.get_template_admin,
        name="get_template_admin",
    ),
    url(
        "^admin/get_all_old/$", views.get_all_old_docs, name="get_all_old_docs"
    ),
    url("^admin/save_doc/$", views.save_doc, name="save_doc"),
    url(
        "^admin/add_images_to_doc/$",
        views.add_images_to_doc,
        name="add_images_to_doc",
    ),
    url(
        "^admin/get_all_revision_ids/$",
        views.get_all_revision_ids,
        name="get_all_revision_ids",
    ),
    url(
        "^admin/get_all_template_ids/$",
        views.get_all_template_ids,
        name="get_all_template_ids",
    ),
    url("^admin/save_template/$", views.save_template, name="save_template"),
    url(
        "^admin/get_user_biblist/$",
        views.get_user_biblist,
        name="get_user_biblist",
    ),
    url(
        "^admin/update_revision/$",
        views.update_revision,
        name="update_revision",
    ),
]
