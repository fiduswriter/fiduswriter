from django.core.management.base import BaseCommand
from subprocess import call, check_output
from os import path
from distutils.spawn import find_executable
import filecmp
import json
import shutil
import time

from fiduswriter.settings import PROJECT_PATH

# Temporary conversion of JavaScript ES6 to ES5. Once
# all supported browsers support ES6 sufficiently ('class' in particular,
# see http://kangax.github.io/compat-table/es6/), this script can be
# replaced/updated.

# Run this script every time you update an *.es6.js file or any of the modules it loads.

class Command(BaseCommand):
    args = ''
    help = 'Transpile ES6 JavaScript to ES5 JavaScript + include NPM dependencies'

    def handle(self, *args, **options):
        start = time.time()
        shutil.os.chdir(PROJECT_PATH)
        if not (path.exists(path.join(PROJECT_PATH, "node_modules/.bin/browserify")) and
                path.exists(path.join(PROJECT_PATH, "node_modules/package.json")) and
                filecmp.cmp(path.join(PROJECT_PATH, "package.json"), path.join(PROJECT_PATH, "node_modules/package.json"))):
            if path.exists(path.join(PROJECT_PATH, "node_modules")):
                shutil.rmtree("node_modules")
            if not find_executable("nodeenv"):
                call(["pip", "install", "nodeenv"])
                call(["nodeenv", "-p"])
            print("Installing dependencies")
            call(["npm", "install"])
            # Copy the package.json file to node_modules, so we can compare it to
            # the current version next time we run it.
            call(["cp", "package.json", "node_modules"])
            package_contents = open(path.join(PROJECT_PATH, "package.json"))
            package_json = json.load(package_contents)
            # Check if we have a git version of prosemirror. In that case, transpile it.
            if package_json["dependencies"]["prosemirror"][:3] == "git":
                print("Installing ProseMirror dependencies")
                shutil.os.chdir(path.join(PROJECT_PATH, "node_modules/prosemirror"))
                call(["npm","install"])
                call(["npm","run","dist"])
                shutil.os.chdir(path.join(PROJECT_PATH))
        # Collect all javascript in a temporary dir (similar to ./manage.py collectstatic).
        # This allows for the modules to import from oneanother, across Django Apps.
        # The temporary dir is a subfolder in the current directory and not a folder in
        # /tmp, because browserify doesn't allow operations in higher level folders.

        # Remove any previous tmp dir for collecting JavaScript files
        if path.exists(path.join(PROJECT_PATH, "es6-tmp")):
            shutil.rmtree("es6-tmp")
        # Create a tmp dir for collecting JavaScript files
        shutil.os.mkdir("es6-tmp")
        tmp_dir = "./es6-tmp/"

        # Remove any previously created static output dirs
        if path.exists(path.join(PROJECT_PATH, "static-es5")):
            shutil.rmtree("static-es5")

        # Create a static output dir
        shutil.os.mkdir("static-es5")
        shutil.os.mkdir("static-es5/js")
        out_dir = "./static-es5/js"
        with open("./static-es5/README.txt",'w') as f:
            f.write("These files have been automatically generated. DO NOT EDIT THEM! \n Changes will be overwritten. Edit the original files in one of the django apps, and run manage.py transpile.")

        sourcefiles = check_output(["find",".","-path","./node_modules", "-prune", "-o", "-type", "f", "-name", "*.es6.js", "-print"]).split("\n")[:-1]

        directories = check_output(["find",".","-type","d","-wholename","*static/js"]).split("\n")[:-1]

        for directory in directories:
            call(["cp","-R", directory+"/.", tmp_dir])

        for sourcefile in sourcefiles:
            dirname = path.dirname(sourcefile)
            basename = path.basename(sourcefile)
            outfilename = basename.split('.')[0] + ".es5.js"
            relative_dir = dirname.split('static/js')[1]
            infile = path.join(tmp_dir, relative_dir, basename)
            outfile = path.join(out_dir, relative_dir, outfilename)
            print("Transpiling " + sourcefile + " to " + outfile)
            call(["node_modules/.bin/browserify", "--outfile", outfile, "-t", "babelify", infile])

        # Remove tmp dir
        shutil.rmtree("es6-tmp")

        # Copy CSS files
        shutil.os.mkdir("static-es5/css")
        shutil.os.mkdir("static-es5/css/libs")

        # Copy mathquill CSS
        shutil.os.mkdir("static-es5/css/libs/mathquill")
        call(["cp", "node_modules/mathquill/build/mathquill.css", "static-es5/css/libs/mathquill"])
        call(["cp", "-R", "node_modules/mathquill/build/font", "static-es5/css/libs/mathquill"])

        # Copy KaTeX CSS
        shutil.os.mkdir("static-es5/css/libs/katex")
        call(["cp", "node_modules/katex/dist/katex.min.css", "static-es5/css/libs/katex"])
        call(["cp", "-R", "node_modules/katex/dist/fonts", "static-es5/css/libs/katex"])

        end = time.time()
        print("Time spent transpiling: "+ str(int(round(end-start))))
