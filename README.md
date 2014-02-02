Fidus Writer 
===========

Fidus Writer is an online collaborative editor especially made for academics who need to use citations and/or formulas. The editor focuses on the content rather than the layout, so that with the same text, you can later on publish it in multiple ways: On a website, as a printed book, or as an ebook. In each case, you can choose from a number of layouts that are adequate for the medium of choice.


Contributing
----

For details on contributing, please check http://fiduswriter.org/help-us/


License
----

All of Fidus Writer's original code is licensed under the GNU AFFERO GENERAL PUBLIC LICENSE, for details see LICENSE. Some third party libraries are licensed under other, compatible open source libraries. Licensing information is included in those files.


Simple install
----


The following are instructions working on most *NIX systems and gives you a simple test installation.

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

7. Initialize the Fidus Writer site and create a super user by typing:

  > python manage.py init
  
8. Run the Fidus Writer server by typing:

  > python manage.py runserver

9. In your Chrome/Chromium/Safari browser, navigate to http://localhost:8000/ and set up a user account.


10. Notice that emails sent to the user appear in the console until an SMTP backend is configured (see below).

Advanced options
----
### Setup SMTP for the email:

  1. Copy the file configuration.py-default to configuration.py

  2. Edit the lines that start with "EMAIL" uncommenting and adding your server configuration.
  
### Use a MySQL/PostGreSQL server instead of sqlite:

  1. Install the libmysql development package. On Debian/Ubuntu, you can do this by executing:

    > sudo apt-get install libmysqlclient-dev

  2. While inside your Fidus Writer virtualenv, install the python requirements specific to MySQL:  
  
    > pip install -r mysql-requirements.txt

  3. Create a database and a user with access to it, making sure that the characterset of the database is set to UTF8. Check here http://www.debuntu.org/how-to-create-a-mysql-database-and-set-privileges-to-a-user/ for how to create a database and set up user priviliges. Make sure that when you create the database, you specify the characterset:
    
    > create database DBNAME character set utf8;

  4. Copy configuration.py-default to configuration.py, uncomment and fill out the section entitled "DATABASES".

### Run several instances of Fidus Writer in parallel:
 
  1. If you will be running several instances of Fidus Writer that need to communicate between each other, you will need to add redis for message exchange. Install a redis server. On Debian/Ubuntu, you need to do:
  
    > sudo apt-get install redis-server 
  
  2. While inside your Fidus Writer virtualenv, install the python requirements for redis like this:

    > pip install -r redis-requirements.txt

  3. Copy configuration.py-default to configuration.py, uncomment and fill out the section entitled "CACHES".


### Run the Fidus Writer server on an alternative port:

  Instead of starting the server with:

  > python manage.py runserver

  Specify the port number like this:

  > python manage.py runserver 9000
  
  9000 is the port number that this server listens on.
