from django.core.management.base import BaseCommand
from django.core.management import call_command
from subprocess import call, check_output
from distutils.spawn import find_executable
import os
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
        if not (os.path.exists(os.path.join(PROJECT_PATH, "node_modules/.bin/browserifyinc")) and
                os.path.exists(os.path.join(PROJECT_PATH, "node_modules/package.json")) and
                filecmp.cmp(os.path.join(PROJECT_PATH, "package.json"), os.path.join(PROJECT_PATH, "node_modules/package.json"))):
            # Find the old katex version to determine if bundle_katex needs to be run
            old_katex_version = False
            if os.path.exists(os.path.join(PROJECT_PATH, "node_modules/package.json")):
                old_package_contents = open(os.path.join(PROJECT_PATH, "node_modules/package.json"))
                old_package_json = json.load(old_package_contents)
                old_katex_version = old_package_json["dependencies"]["katex"]
            if os.path.exists(os.path.join(PROJECT_PATH, "node_modules")):
                shutil.rmtree("node_modules")
            if not find_executable("nodeenv"):
                call(["pip", "install", "nodeenv"])
                call(["nodeenv", "-p"])
            print("Installing dependencies")
            call(["npm", "install"])
            # Copy the package.json file to node_modules, so we can compare it to
            # the current version next time we run it.
            call(["cp", "package.json", "node_modules"])
            package_contents = open(os.path.join(PROJECT_PATH, "package.json"))
            package_json = json.load(package_contents)
            # Check if we have a git version of prosemirror. In that case, transpile it.
            if package_json["dependencies"]["prosemirror"][:3] == "git":
                print("Installing ProseMirror dependencies")
                shutil.os.chdir(os.path.join(PROJECT_PATH, "node_modules/prosemirror"))
                call(["npm","install"])
                call(["npm","run","dist"])
                shutil.os.chdir(os.path.join(PROJECT_PATH))

            if package_json["dependencies"]["katex"] != old_katex_version:
                # Katex has been updated!
                call_command("bundle_katex")
        # Collect all javascript in a temporary dir (similar to ./manage.py collectstatic).
        # This allows for the modules to import from oneanother, across Django Apps.


        # Create a cache dir for collecting JavaScript files
        cache_path = os.path.join(PROJECT_PATH, "es6-cache")
        if not os.path.exists(cache_path):
            os.makedirs(cache_path)
        cache_dir = "./es6-cache/"

        # Remove any previously created static output dirs
        if os.path.exists(os.path.join(PROJECT_PATH, "static-es5")):
            shutil.rmtree("static-es5")

        # Create a static output dir
        os.makedirs("static-es5/js")
        out_dir = "./static-es5/js"
        with open("./static-es5/README.txt",'w') as f:
            f.write("These files have been automatically generated. DO NOT EDIT THEM! \n Changes will be overwritten. Edit the original files in one of the django apps, and run manage.py transpile.")

        mainfiles = check_output(["find",".", "-type", "f", "-name", "*.es6.js", "-print"]).split("\n")[:-1]
        mainfiles = [item for item in mainfiles if not ("node_modules" in item or "es6-cache" in item)]

        sourcefiles = check_output(["find",".","-type","f","-wholename","*static/js/*js"]).split("\n")[:-1]
        sourcefiles = [item for item in sourcefiles if not ("node_modules" in item or "es6-cache" in item)]

        for sourcefile in sourcefiles:
            relative_path = sourcefile.split('static/js/')[1]
            outfile = os.path.join(cache_dir, relative_path)
            dirname = os.path.dirname(outfile)
            if not os.path.exists(dirname):
                os.makedirs(dirname)
                shutil.copyfile(sourcefile, outfile)
            elif not os.path.isfile(outfile):
                shutil.copyfile(sourcefile, outfile)
            elif os.path.getmtime(outfile) < os.path.getmtime(sourcefile):
                shutil.copyfile(sourcefile, outfile)

        for sourcefile in mainfiles:
            dirname = os.path.dirname(sourcefile)
            basename = os.path.basename(sourcefile)
            outfilename = basename.split('.')[0] + ".es5.js"
            cachefile = os.path.join(cache_dir, basename.split('.')[0] + ".cache.json")
            relative_dir = dirname.split('static/js')[1]
            infile = os.path.join(cache_dir, relative_dir, basename)
            outfile = os.path.join(out_dir, relative_dir, outfilename)
            print("Transpiling " + sourcefile + " to " + outfile)
            call(["node_modules/.bin/browserifyinc", "--cachefile", cachefile, "--outfile", outfile, "-t", "babelify", infile])


        # Copy mathquill CSS
        os.makedirs("static-es5/css/libs/mathquill")
        call(["cp", "node_modules/mathquill/build/mathquill.css", "static-es5/css/libs/mathquill"])
        call(["cp", "-R", "node_modules/mathquill/build/font", "static-es5/css/libs/mathquill"])

        end = time.time()
        print("Time spent transpiling: "+ str(int(round(end-start))) + " seconds")
