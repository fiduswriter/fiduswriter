import unittest
import os
import multiprocessing
import time
import shutil
import subprocess
import urllib.request
from urllib.error import URLError
from pathlib import Path
from tempfile import mkdtemp
import socket
import errno

from django.conf import settings

START_PORT = 8025
END_PORT = 8040


class ManageTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.port = START_PORT
        while cls.port < END_PORT:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            try:
                sock.bind(("127.0.0.1", cls.port))
            except socket.error as err:
                if err.errno == errno.EADDRINUSE:
                    cls.port += 1
                else:
                    raise err
            sock.close()
            break

    def test_startserver(self):
        os.chdir(settings.PROJECT_PATH)
        temp_dir = mkdtemp()
        p1 = multiprocessing.Process(target=self.start_fidus, args=(temp_dir,))
        p1.start()
        time.sleep(2)
        sql_file = Path(os.path.join(temp_dir, "fiduswriter.sql"))
        assert sql_file.exists()
        # Get page during transpile to see if we get setup page
        try:
            page = (
                urllib.request.urlopen(
                    "http://localhost:{}/".format(self.port)
                )
                .read()
                .decode("utf-8")
            )
            assert "Fidus Writer is currently being updated." in page
        except URLError as err:
            if self.port < END_PORT:
                self.port += 1
                shutil.rmtree(temp_dir)
                p1.join()
                return self.test_startserver()
            else:
                raise err
        # We remove the project dir. The process should then finish as well.
        shutil.rmtree(temp_dir)
        p1.join()

    def start_fidus(self, temp_dir):
        os.environ.pop("PROJECT_PATH")
        if os.getenv("COVERAGE_RCFILE"):
            os.environ["COVERAGE_PROCESS_START"] = ".coveragerc"
        subprocess.call(
            [
                "./manage.py",
                "--pythonpath",
                temp_dir,
                "runserver",
                str(self.port),
            ],
            stdout=open(os.devnull, "w"),
            stderr=subprocess.STDOUT,
        )
