import os
import distutils
import setuptools
from setuptools.command.sdist import sdist as _sdist


def read(name):
    with open(
        os.path.join(os.path.dirname(os.path.realpath(__file__)), name)
    ) as f:
        return f.read()


class compilemessages(distutils.cmd.Command):
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
        import subprocess
        command = []
        command.append(os.path.join(
            os.path.dirname(os.path.realpath(__file__)),
            'fiduswriter/manage.py'
        ))
        command.append('compilemessages')
        self.announce(
            'Running command: %s' % str(' '.join(command)),
            level=distutils.log.INFO
        )
        subprocess.check_call(command)


class sdist(_sdist):
    """Custom build command."""

    def run(self):
        self.run_command('compilemessages')
        _sdist.run(self)

cmdclass = {
    'compilemessages': compilemessages,
    'sdist': sdist
}

try:
    from wheel.bdist_wheel import bdist_wheel as _bdist_wheel
    class bdist_wheel(_bdist_wheel):
        """Custom build command."""

        def run(self):
            self.run_command('compilemessages')
            _bdist_wheel.run(self)
    cmdclass['bdist_wheel'] = bdist_wheel
except ImportError:
    pass


setuptools.setup(
    cmdclass=cmdclass,
    name="fiduswriter",
    version=read('version.txt').splitlines()[0],
    description="A semantic wordprocessor for academic purposes",
    license="AGPL",
    author="Lund Info AB",
    author_email="mail@lundinfo.com",
    url="https://www.fiduswriter.org",
    long_description=read('README.md'),
    long_description_content_type='text/markdown',
    classifiers = [
        "Development Status :: 5 - Production/Stable",
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
    python_requires='>=3',
    install_requires=read('fiduswriter/requirements.txt').splitlines(),
    extras_require={
        "books": "fiduswriter-books ~= 3.7.4",
        "citation-api-import": "fiduswriter-citation-api-import ~= 3.7.1",
        "languagetool": "fiduswriter-languagetool ~= 3.7.1",
        "ojs": "fiduswriter-ojs ~= 3.7.2",
        "phplist": "fiduswriter-phplist ~= 3.7.2",
        "mysql": read('fiduswriter/mysql-requirements.txt').splitlines(),
        "postgresql": read(
            'fiduswriter/postgresql-requirements.txt'
        ).splitlines()
    },
    entry_points={
        "console_scripts": [
            "fiduswriter=fiduswriter.manage:entry"
        ]
    }
)
