Fidus Writer
===========

Fidus Writer is an online collaborative editor especially made for academics who need to use citations and/or formulas. The editor focuses on the content rather than the layout, so that with the same text, you can later on publish it in multiple ways: On a website, as a printed book, or as an ebook. In each case, you can choose from a number of layouts that are adequate for the medium of choice.


Contributing
----

[![Bountysource](https://www.bountysource.com/badge/tracker?tracker_id=328497)](https://www.bountysource.com/trackers/328497-fiduswriter?utm_source=328497&utm_medium=shield&utm_campaign=TRACKER_BADGE)

For details on contributing, please check http://fiduswriter.org/help-us/


License
----

All of Fidus Writer's original code is licensed under the GNU AFFERO GENERAL PUBLIC LICENSE, for details see LICENSE. Some third party libraries are licensed under other, compatible open source libraries. Licensing information is included in those files.


Simple install
----

The following are instructions working on Ubuntu 14.04. Make adjustments as needed for other systems.

1. Install the development packages of libjpeg, gettext, zlib, python and the python virtual environment creator by running:

  > `sudo apt-get install libjpeg-dev python-dev python-virtualenv gettext zlib1g-dev git`

2. Download the Fidus Writer sources to your computer from github by running:

  > `git clone https://github.com/fiduswriter/fiduswriter.git`

3. Enter the fiduswriter folder:

  > `cd fiduswriter`

4. Create a virtual environment. The following command will create an environment called "venv":

  > `virtualenv  venv`

5. Activate the virtualenv by typing:

  > `source venv/bin/activate`

6. Install the requirements for running Fidus Writer by typing:

  > `pip install -r requirements.txt`

7. Initialize the Fidus Writer site by typing:

  > `./manage.py init`

  This will take a while.

8. Set up an admin user by typing:

  > `./manage.py createsuperuser`

9. Start the Fidus Writer server by typing:

  > `./manage.py runserver`

10. In your browser, navigate to http://localhost:8000/ and log in.

11. Notice that emails sent to the user appear in the console until an SMTP backend is configured (see below).

Advanced options
----
### Setup SMTP for the email:

  1. Copy the file configuration.py-default to configuration.py

  2. Edit the lines that start with "EMAIL" uncommenting and adding your server configuration. Depending on your server setup you may also need to configure DEFAULT_FROM_EMAIL

### Use a MySQL server instead of sqlite:

  1. Install the libmysql development package. On Debian/Ubuntu, you can do this by executing:

    > `sudo apt-get install libmysqlclient-dev`

  2. While inside your Fidus Writer virtualenv, install the python requirements specific to MySQL:  

    > `pip install -r mysql-requirements.txt`

  3. Create a database and a user with access to it, making sure that the characterset of the database is set to UTF8. Check here http://www.debuntu.org/how-to-create-a-mysql-database-and-set-privileges-to-a-user/ for how to create a database and set up user privileges. Make sure that when you create the database, you specify the characterset:

    > `create database DBNAME character set utf8;`

  4. Copy configuration.py-default to configuration.py, uncomment and fill out the section entitled "DATABASES".

### Use a PostgreSQL server instead of sqlite:

  1. Install the PostgreSQL development package. On Debian/Ubuntu, you can do this by executing:

    > `sudo apt-get install libpq-dev`

  2. While inside your Fidus Writer virtualenv, install the python requirements specific to PostgreSQL:  

    > `pip install -r postgresql-requirements.txt`

  3. Create a database and a user with access to it, making sure that the encoding of the database is set to UTF8. Check http://www.postgresql.org/docs/9.4/static/sql-createrole.html and http://www.postgresql.org/docs/9.4/static/sql-createdatabase.html for how to create a user and a database. Make sure that when you create the database, you specify the encoding:

    > `CREATE DATABASE dbname OWNER dbuser ENCODING 'utf8';`

  4. Copy configuration.py-default to configuration.py, uncomment and fill out the section entitled "DATABASES".

### Run the Fidus Writer server on an alternative port:

  Instead of starting the server with:

  > `./manage.py runserver`

  Specify the port number like this:

  > `./manage.py runserver 9000`

  9000 is the port number that this server listens on.

### Add new document styles:

  1. While your server is running, navigate to http://[ADDRESS:PORT]/admin/style .
  2. Add all required document fonts. Each font consists of a font file and a CSS definition of the font. Notice that instead the URL for the font file in the CSS definition should be [URL]
  3. Add one or several new document styles. Insert the CSS definition and select all the fonts required by the style.
  4. In your console, interrupt the server and run:

    > `./manage.py create_document_styles`

  5. Depending on your server setup, you may also have to run:

    > `./manage.py collectstatic`

  6. Restart your server.

### Development/upgrade:

  If there are changes to the JavaScript source code of Fidus Writer, you need to run:

  > `./manage.py transpile`
  
  If there are changes to translations, you need to run:
  
  > `./manage.py compilemessages`

  If there are changes to the database models, you need to run:

  > `./manage.py migrate`
  
  On a production server additionally:
  
  > `./manage.py collectstatic`  
