Fidus Writer 
===========

Fidus Writer is an online collaborative editor especially made for academics who need to use citations and/or formulas. The editor focuses on the content rather than the layout, so that with the same text, you can later on publish it in multiple ways: On a website, as a printed book, or as an ebook. In each case, you can choose from a number of layouts that are adequate for the medium of choice.


Contributing
----

For details on contributing, please check http://fiduswriter.org/help-us/


License
----

All of Fidus Writer's original code is licensed under the GNU AFFERO GENERAL PUBLIC LICENSE, for details see LICENSE. Some third party libraries are licensed under other, compatible open source libraries. Licensing information is included in those files.


Howto install
----

The following are instructions working on most *NIX systems.

1. Download the Fidus Writer sources to your computer. Unarchive if necessary.

2. Install the development packages of libjpeg, gettext, python and the python virtual environment creator. How you do this depends on your system. On Debian and Ubuntu the packages are called libjpeg-dev, python-dev and python-virtualenv. Install them with your favorite package manager, for example on the command line by running:

  sudo apt-get install libjpeg-dev python-dev python-virtualenv gettext

3. Start the command line (terminal).

4. Cd to where you have your sources.

5. You can use the virtualenv command to create virtual environments. The following command will create an environment called "fiduswriter-venv":

  virtualenv  --no-site-packages fiduswriter-venv

6. Activate the virtualenv by typing:

  source fiduswriter-venv/bin/activate

7. Install the requirements for running  fiduswriter by typing:

  pip install -r requirements.txt

8. If you want to go beyond a local test installation, copy configuration.py-default to configuration.py, and edit configuration.py with a text editor, adjusting it to fit your needs. 
   If you you set DEBUG = False in configuration.py, you likely need to run:

  python manage.py collectstatic
  python manage.py compress 

9. Recompile locale message files by typing:

  python manage.py compilemessages

10. Synchronize the DB and create a superuser by typing:

  python manage.py syncdb

  python manage.py migrate

  python manage.py loaddata bibliography/fixture/initial_bib_rules.json

  python manage.py loaddata base/fixture/initial_terms.json

11. Run the Fidus Writer server by typing:

  python manage.py runserver

  or, to start the server on a different port than the default 8000, run:

  python manage.py runserver 8000

- - - - - -

For best results for the end user:

1. Install Chrome/Chromium at least version 26

2. Enable Webkit experimental features (in type "about:flags" into the navigation bar of the browser)

3. Restart Chrome/Chromium
