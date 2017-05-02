import os
import json
import shutil
import commentjson
from django.core.management.base import BaseCommand
from django.apps import apps as django_apps
from fiduswriter.settings import PROJECT_PATH


def deep_merge_dicts(old_dict, merge_dict):
    for key in merge_dict:
        if key in old_dict:
            if (
                isinstance(old_dict[key], dict) and
                isinstance(merge_dict[key], dict)
            ):
                deep_merge_dicts(old_dict[key], merge_dict[key])
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
                    data = commentjson.load(data_file)
            except IOError:
                continue
            deep_merge_dicts(package, data)
        with open('package.json', 'w') as outfile:
            json.dump(package, outfile)
