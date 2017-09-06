from django.core.management.base import BaseCommand
from django.core.management import call_command
from subprocess import call, check_output
import os
import filecmp
import shutil
import time

from django.contrib.staticfiles import finders
from fiduswriter.settings import PROJECT_PATH, STATIC_ROOT

# Temporary conversion of JavaScript ES6 to ES5. Once
# all supported browsers support ES6 sufficiently ('class' in particular,
# see http://kangax.github.io/compat-table/es6/), this script can be
# replaced/updated.

# Run this script every time you update an *.es6.js file or any of the
# modules it loads.


class Command(BaseCommand):
    help = ('Transpile ES6 JavaScript to ES5 JavaScript + include NPM '
            'dependencies')

    def handle(self, *args, **options):
        start = time.time()
        shutil.os.chdir(PROJECT_PATH)
        call_command("create_package_json")
        npm_install = True
        bundle_katex = True
        if (
            os.path.exists(
                os.path.join(
                    PROJECT_PATH,
                    "node_modules/.bin/browserifyinc"
                )
            ) and os.path.exists(
                os.path.join(
                    PROJECT_PATH,
                    "node_modules/package.json"
                )
            ) and os.path.exists(
                os.path.join(
                    PROJECT_PATH,
                    "node_modules/static-libs/"
                )
            )
        ):
            if filecmp.cmp(
                os.path.join(
                    PROJECT_PATH,
                    "package.json"
                ),
                os.path.join(
                    PROJECT_PATH,
                    "node_modules/package.json"
                )
            ):
                npm_install = False
                if os.path.exists(
                    os.path.join(
                        PROJECT_PATH,
                        "base/static/zip/katex-style.zip"
                    )
                ) and os.path.exists(
                    os.path.join(
                        PROJECT_PATH,
                        "base/static/js/es6_modules/katex/opf-includes.js"
                    )
                ):
                    bundle_katex = False

        if npm_install:
            if os.path.exists(os.path.join(PROJECT_PATH, "node_modules")):
                shutil.rmtree("node_modules")
            print("Cleaning npm cache")
            call(["npm", "cache", "clean"])  # Not use Pm from git w/ same ver.
            print("Installing dependencies")
            call(["npm", "install"])
            # Copy the package.json file to node_modules, so we can compare it
            # to the current version next time we run it.
            call(["cp", "package.json", "node_modules"])

        if bundle_katex:
            call_command("bundle_katex")
        # Collect all javascript in a temporary dir (similar to
        # ./manage.py collectstatic).
        # This allows for the modules to import from oneanother, across Django
        # Apps.
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
        with open("./static-es5/README.txt", 'w') as f:
            f.write(
                (
                    'These files have been automatically generated. '
                    'DO NOT EDIT THEM! \n Changes will be overwritten. Edit '
                    'the original files in one of the django apps, and run '
                    './manage.py transpile.'
                )
            )

        js_paths = finders.find('js/', True)
        mainfiles = []
        sourcefiles = []
        # Remove paths inside of collection dir
        js_paths = [x for x in js_paths if not x.startswith(STATIC_ROOT)]
        for path in js_paths:
            for mainfile in check_output(
                ["find", path, "-type", "f", "-name", "*.es6.js", "-print"]
            ).split("\n")[:-1]:
                mainfiles.append(mainfile)
            for sourcefile in check_output(
                ["find", path, "-type", "f", "-wholename", "*js"]
            ).split("\n")[:-1]:
                if 'static/js' in sourcefile:
                    sourcefiles.append(sourcefile)

        # Note all cache files so that we can remove outdated files that no
        # longer are in the prject.
        cache_files = []
        # Note all plugin dirs and the modules inside of them to crate index.js
        # files inside of them.
        plugin_dirs = {}
        for sourcefile in sourcefiles:
            relative_path = sourcefile.split('static/js/')[1]
            outfile = os.path.join(cache_dir, relative_path)
            cache_files.append(outfile)
            dirname = os.path.dirname(outfile)
            if not os.path.exists(dirname):
                os.makedirs(dirname)
                shutil.copyfile(sourcefile, outfile)
            elif not os.path.isfile(outfile):
                shutil.copyfile(sourcefile, outfile)
            elif os.path.getmtime(outfile) < os.path.getmtime(sourcefile):
                shutil.copyfile(sourcefile, outfile)
            # Check for plugin connectors
            if relative_path[:20] == 'es6_modules/plugins/':
                if dirname not in plugin_dirs:
                    plugin_dirs[dirname] = []
                module_name = os.path.splitext(
                    os.path.basename(relative_path)
                )[0]
                if (
                    module_name != 'init' and
                    module_name not in plugin_dirs[dirname]
                ):
                    plugin_dirs[dirname].append(module_name)

        # Write an index.js file for every plugin dir
        for plugin_dir in plugin_dirs:
            index_js = ""
            for module_name in plugin_dirs[plugin_dir]:
                index_js += 'export * from "./%s"\n' % module_name
            outfile = os.path.join(plugin_dir, 'index.js')
            cache_files.append(outfile)
            if not os.path.isfile(outfile):
                index_file = open(outfile, 'w')
                index_file.write(index_js)
                index_file.close()
            else:
                index_file = open(outfile, 'r')
                old_index_js = index_file.read()
                index_file.close()
                if old_index_js != index_js:
                    index_file = open(outfile, 'w')
                    index_file.write(index_js)
                    index_file.close()

        # Check for outdated files that should be removed
        for existing_file in check_output(
            ["find", './es6-cache', "-type", "f"]
        ).split("\n")[:-1]:
            if existing_file not in cache_files:
                if existing_file[-10:] == "cache.json":
                    if not existing_file[:-10] + "es6.js" in cache_files:
                        print("Removing %s" % existing_file)
                        os.remove(existing_file)
                else:
                    print("Removing %s" % existing_file)
                    os.remove(existing_file)

        for mainfile in mainfiles:
            dirname = os.path.dirname(mainfile)
            basename = os.path.basename(mainfile)
            outfilename = basename.split('.')[0] + ".es5.js"
            cachefile = os.path.join(
                cache_dir, basename.split('.')[0] + ".cache.json")
            relative_dir = dirname.split('static/js')[1]
            infile = os.path.join(cache_dir, relative_dir, basename)
            outfile = os.path.join(out_dir, relative_dir, outfilename)
            print("Transpiling %s to %s." % (basename, outfile))
            call(["node_modules/.bin/browserifyinc", "--ignore-missing",
                  "--cachefile", cachefile, "--outfile", outfile, "-t",
                  "babelify", infile])

        # Copy mathquill CSS
        os.makedirs("static-es5/css/libs/mathquill")
        call(["cp", "node_modules/mathquill/build/mathquill.css",
              "static-es5/css/libs/mathquill"])
        call(["cp", "-R", "node_modules/mathquill/build/font",
              "static-es5/css/libs/mathquill"])

        end = time.time()
        print("Time spent transpiling: " +
              str(int(round(end - start))) + " seconds")
