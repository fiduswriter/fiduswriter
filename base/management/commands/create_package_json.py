import os
import json
import shutil
from json_minify import json_minify
from tornado.escape import json_decode
from django.core.management.base import BaseCommand
from django.apps import apps as django_apps
from fiduswriter.settings import PROJECT_PATH


def deep_merge_dicts(old_dict, merge_dict, scripts=False):
    for key in merge_dict:
        if key in old_dict:
            if (
                isinstance(old_dict[key], dict) and
                isinstance(merge_dict[key], dict)
            ):
                if key == 'scripts':
                    deep_merge_dicts(old_dict[key], merge_dict[key], True)
                else:
                    deep_merge_dicts(old_dict[key], merge_dict[key])
            else:
                # In the scripts section, allow adding to hooks such as
                # "preinstall" and "postinstall"
                if scripts and key in old_dict:
                    old_dict[key] += ' & %s' % merge_dict[key]
                else:
                    old_dict[key] = merge_dict[key]
        else:
            old_dict[key] = merge_dict[key]


class Command(BaseCommand):
    help = 'Join package.json files from apps into common package.json'

    def handle(self, *args, **options):
        shutil.os.chdir(PROJECT_PATH)
        package = {}
        configs = django_apps.get_app_configs()
        for config in configs:
            package_path = os.path.join(config.path, 'package.json')
            try:
                with open(package_path) as data_file:
                    data = json_decode(json_minify(data_file.read()))
            except IOError:
                continue
            deep_merge_dicts(package, data)
        with open('package.json', 'w') as outfile:
            json.dump(package, outfile)
