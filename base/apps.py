# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.apps import AppConfig
from django.core.management import call_command

from npm_mjs.signals import post_npm_install


def bundle_katex(sender, **kwargs):
    call_command("bundle_katex")


class BaseConfig(AppConfig):
    name = 'base'

    def ready(self):
        post_npm_install.connect(bundle_katex)
