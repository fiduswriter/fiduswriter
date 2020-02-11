import unittest
import os
import multiprocessing
import time
import shutil
import subprocess
import urllib.request

from pathlib import Path
from tempfile import mkdtemp

from django.conf import settings


class ManageTest(unittest.TestCase):

    def setUp(self):
        self.temp_dir = mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_startserver(self):
        os.chdir(settings.PROJECT_PATH)
        p1 = multiprocessing.Process(
            target=self.start_fidus,
            args=(self.temp_dir,)
        )
        p1.start()
        time.sleep(1)
        sql_file = Path(os.path.join(self.temp_dir, 'fiduswriter.sql'))
        assert sql_file.exists()
        # Get page during transpile to see if we get setup page
        page = urllib.request.urlopen(
            'http://localhost:7000/'
        ).read().decode('utf-8')
        assert "Fidus Writer is currently being updated." in page
        p1.kill()

    def start_fidus(self, temp_dir):
        os.environ.pop("PROJECT_PATH")

        subprocess.call(
            [
                "./manage.py",
                "--pythonpath",
                temp_dir,
                "runserver",
                "7000"
            ],
            stdout=open(os.devnull, 'w'),
            stderr=subprocess.STDOUT
        )
