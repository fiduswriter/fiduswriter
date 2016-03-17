from document.models import RIGHTS_CHOICES
from django.conf import settings

def filter_comments_by_role(comments, access_rights, cur_phase, user_info):
    access_right = user_info.access_rights
    rights = dict((x, y) for x, y in RIGHTS_CHOICES)
    right_name = rights[access_right]

    visibility_role_dict = settings.VISIBILITY[right_name]
    access_rights_dict = dict((x['user_id'], x) for x in access_rights)
    #comments_dict = json.loads(comments)
    comments_dict = comments

    filtered_comments = dict()
    #TODO: return all comments without filtering if owner????
    if user_info.is_owner == True:
        return comments

    own_user_rights_code = access_rights_dict[user_info.user.id]['rights']
    own_user_rights = rights[own_user_rights_code]
    own_user_visibility = visibility_role_dict[own_user_rights]

    #1) get from comment the role of user (rolename)
    #2) get from visibility dict instructions what to do. if always - add to filtered comments
    for comment_id, comment in comments_dict.iteritems():
        user_id = comment['user']

        #own user always can see his own comment
        if user_info.user.id == user_id:
            filtered_comments[comment_id] = comment
            continue

            #TODO: no info about owner in AccessRights table => exception. remove this when resolve
        try:
            user_rights_dict = access_rights_dict[user_id]
            user_rights_code = user_rights_dict['rights']
            user_rights_str = rights[user_rights_code]
        except:
            filtered_comments[comment_id] = comment
            continue

        # if comment of reader role and current phase publication - add to filtered comments.
        # readers can leave comments in publication phase
        if user_rights_str == 'reader':
            if cur_phase == 'publication':
                filtered_comments[comment_id] = comment
            continue

        user_instructions = visibility_role_dict[user_rights_str]
        if 'always' in user_instructions or cur_phase in user_instructions:
            filtered_comments[comment_id] = comment

    return filtered_comments
