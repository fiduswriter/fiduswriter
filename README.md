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

  > sudo apt-get install libjpeg-dev python-dev python-virtualenv gettext

3. Cd to where you have your sources using your terminal/command line.

4. You can use the virtualenv command to create virtual environments. The following command will create an environment called "fiduswriter-venv":

  > virtualenv  --no-site-packages fiduswriter-venv

5. Activate the virtualenv by typing:

  > source fiduswriter-venv/bin/activate

6. Install the requirements for running  fiduswriter by typing:

  > pip install -U setuptools
  
  > pip install -r requirements.txt

7. The default is to use sqlite as the database backend. If you want to use mysql instead, you need a few more things:

  a. Install the libmysql development package. On Debian/Ubuntu, run:

    > sudo apt-get install libmysqlclient-development

  b. Install the requirements specific to MySQL:  
  
    > pip install -r mysql-requirements.txt

  c. Create a database and user with access to it, making sure that the characterset of the database is set to UTF8. Check here http://www.debuntu.org/how-to-create-a-mysql-database-and-set-privileges-to-a-user/ for how to create a database and set up user priviliges. Make sure that when you create the database, you specify the characterset:
    
    > create database DBNAME character set utf8;

8. If you want to go beyond a local test installation, copy configuration.py-default to configuration.py, and edit configuration.py with a text editor, adjusting it to fit your needs. 
   If you you set DEBUG = False in configuration.py, you likely need to run:

  > python manage.py collectstatic
  
  > python manage.py compress

9. If you will be running several instances of Fidus Writer that need to communicate between each other, you will need to add redis for message exchange. Install a redis server, install the requirements like this:

  > pip install -r redis-requirements.txt

  And you will need to adjust configuration.py by specifying the CACHES (see configuration.py-default comments).

10. Recompile locale message files by typing:

  > python manage.py compilemessages

11. Synchronize the DB and create a superuser by typing:

  > python manage.py syncdb

  > python manage.py migrate

  > python manage.py loaddata bibliography/fixture/initial_bib_rules.json

  > python manage.py loaddata base/fixture/initial_terms.json

12. Run the Fidus Writer server by typing:

  > python manage.py runserver

  or, to start the server on a different port than the default 8000, run:

  > python manage.py runserver 8000

- - - - - -

For best results for the end user:

1. Install a recent version of Chrome/Chromium 

2. Enable "Enable experimental Web Platform features." (in type "about:flags" into the navigation bar of the browser)

3. Restart Chrome/Chromium

Alternatively you can use Safari 6.1+
