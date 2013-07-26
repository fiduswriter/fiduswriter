Fidus Writer 
===========
Fidus Writer is an online collaborative editor especially made for academics who need to use citations and/or formulas. The editor focuses on the content rather than the layout, so that with the same text, you can later on publish it in multiple ways: On a website, as a printed book, or as an ebook. In each case, you can choose from a number of layouts that are adequate for the medium of choice.

----

Contributing
=======
For details on contributing, please check http://fiduswriter.com/help-us/
----

License
=======

All of Fidus Writer's original code is licensed under the GNU AFFERO GENERAL PUBLIC LICENSE, for details see LICENSE. Some third party libraries are licensed under other, compatible open source libraries. Licensing information is included in those files.

----

Howto install
=======

The following are instructions working on most *NIX systems.

0. Install the development package of libjpeg. How you do this depends on your system. On Ubuntu the package is called libjpeg-dev. Install with your favorite package manager.

1. Start the command line (terminal).

2. Cd to where you have your sources.

3. Install virtualenv. To do so, type on the command line:

easy_install virtualenv

4. Once virtualenv is installed, you can use the virtualenv command to create virtual environments. The following command will create an environment called "fiduswriter-venv":

virtualenv  --no-site-packages fiduswriter-venv

5. Activate the virtualenv by typing:

source fiduswriter-venv/bin/activate

6. Install the requirements for running  fiduswriter by typing:

pip install -r requirements.txt

7. Synchronize the DB and create a superuser by typing:

python manage.py syncdb
python manage.py migrate
python manage.py loaddata bibliography/fixture/initial_bib_rules.json
python manage.py loaddata bibliography/fixture/initial_tex_chars.json

8. Run the fiduswriter server by typing:

python manage.py runserver

9. Navigate to "http://localhost:8000" in your favorite browser

For best results:

10. Install Chrome/Chromium at least version 26

11. Enable Webkit experimental features (in type "about:flags" into the navigation bar of the browser)

12. Restart Chrome/Chromium

13. Navigate to "http://localhost:8000" 
