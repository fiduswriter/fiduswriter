import os
import shutil
import distutils
import setuptools
from setuptools.command.sdist import sdist as _sdist
from django.core.management import call_command


with open(os.path.join(os.path.dirname(__file__), 'version.txt')) as f:
    VERSION = f.read()

with open(
    os.path.join(
        os.path.dirname(__file__),
        'fiduswriter/requirements.txt'
    )
) as f:
    REQUIREMENTS = f.read().splitlines()

with open(
    os.path.join(
        os.path.dirname(__file__),
        'README.md'
    ),
    encoding='utf-8'
) as f:
    LONG_DESCRIPTION = f.read()


class CompileMessagesCommand(distutils.cmd.Command):
    """A custom command to create *.mo files for each language."""
    description = "Create *.mo files to be included in the final package."
    user_options = []

    def initialize_options(self):
        """Set default values for options."""
        pass

    def finalize_options(self):
        """Post-process options."""
        pass

    def run(self):
        cwd = os.getcwd()
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "fiduswriter.core.settings")
        SRC_PATH = os.path.join(
            os.path.dirname(os.path.realpath(__file__)),
            'fiduswriter/'
        )
        shutil.os.chdir(SRC_PATH)
        os.environ.setdefault("PROJECT_PATH", SRC_PATH)
        os.environ.setdefault("SRC_PATH", SRC_PATH)
        call_command('compilemessages')
        shutil.os.chdir(cwd)


class SdistCommand(_sdist):
    """Custom build command."""

    def run(self):
        self.run_command('compilemessages')
        _sdist.run(self)


setuptools.setup(
    cmdclass={
        'compilemessages': CompileMessagesCommand,
        'sdist': SdistCommand,
    },
    name="fiduswriter",
    version=VERSION,
    description="The all in one solution for collaborative academic writing",
    license="AGPL",
    author="Lund Info AB",
    author_email="mail@lundinfo.com",
    url="https://www.fiduswriter.org",
    long_description=LONG_DESCRIPTION,
    long_description_content_type='text/markdown',
    classifiers = [
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Science/Research",
        "Framework :: Django :: 2.2",
        "License :: OSI Approved :: GNU Affero General Public License v3",
        "Programming Language :: Python :: 3",
        "Topic :: Scientific/Engineering",
        "Topic :: Text Editors :: Word Processors",
        "Topic :: Text Processing",
        "Topic :: Text Processing :: Markup :: HTML",
        "Topic :: Text Processing :: Markup :: LaTeX",
        "Topic :: Text Processing :: Markup :: XML",
        "Topic :: Utilities",
    ],
    packages=setuptools.find_packages(),
    include_package_data=True,
    install_requires=REQUIREMENTS,
    entry_points={
        "console_scripts": [
            "fiduswriter=fiduswriter.manage:entry"
        ]
    }
)
