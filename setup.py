import os
from setuptools import setup, find_packages

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

setup(
  name="fiduswriter",
  version=VERSION,
  long_description=LONG_DESCRIPTION,
  long_description_content_type='text/markdown',
  packages=find_packages(),
  include_package_data=True,
  install_requires=REQUIREMENTS,
  entry_points={
    "console_scripts": [
      "fiduswriter=fiduswriter.manage:entry"
    ]
  }
)
