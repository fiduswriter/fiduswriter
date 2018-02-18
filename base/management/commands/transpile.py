from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.apps import apps as django_apps
from subprocess import call, check_output
import os
import shutil
import time
import pickle

from django.contrib.staticfiles import finders
from fiduswriter.settings import PROJECT_PATH, STATIC_ROOT


# Temporary conversion of JavaScript ES6 to ES5. Once
# all supported browsers support ES6 sufficiently ('class' in particular,
# see http://kangax.github.io/compat-table/es6/), this script can be
# replaced/updated.

# Run this script every time you update an *.mjs file or any of the
# modules it loads.
LAST_RUN = 0
try:
    with open(
        os.path.join(
            PROJECT_PATH,
            ".transpile-time"
        ),
        'rb'
    ) as f:
        LAST_RUN = pickle.load(f)
except EOFError:
    pass
except IOError:
    pass


class Command(BaseCommand):
    help = ('Transpile ES6 JavaScript to ES5 JavaScript + include NPM '
            'dependencies')

    def handle(self, *args, **options):
        global LAST_RUN
        start = int(round(time.time()))
        settings_change = os.path.getmtime(
            os.path.join(
                PROJECT_PATH,
                "fiduswriter/settings.py"
            )
        )
        configuration_change = 0
        try:
            configuration_change = os.path.getmtime(
                os.path.join(
                    PROJECT_PATH,
                    "configuration.py"
                )
            )
        except OSError:
            pass
        configuration_change = max([settings_change, configuration_change])
        package_change = -1
        try:
            package_change = os.path.getmtime(
                os.path.join(
                    PROJECT_PATH,
                    "package.json"
                )
            )
        except OSError:
            pass
        app_package_change = 0
        configs = django_apps.get_app_configs()
        for config in configs:
            package_path = os.path.join(config.path, 'package.json')
            try:
                app_package_change = max(
                    os.path.getmtime(package_path),
                    app_package_change
                )
            except OSError:
                pass
        npm_install = False
        if (
            configuration_change > LAST_RUN or
            app_package_change > package_change
        ):
            call_command("create_package_json")
            if os.path.exists(os.path.join(PROJECT_PATH, "node_modules")):
                shutil.rmtree("node_modules")
            print("Installing dependencies")
            call(["npm", "install"])
            call_command("bundle_katex")
            npm_install = True
        js_paths = finders.find('js/', True)
        # Remove paths inside of collection dir
        js_paths = [x for x in js_paths if not x.startswith(STATIC_ROOT)]

        es5_path = os.path.join(PROJECT_PATH, "static-transpile")

        if os.path.exists(es5_path):
            files = []
            for js_path in js_paths:
                for root, dirnames, filenames in os.walk(js_path):
                    for filename in filenames:
                        files.append(os.path.join(root, filename))
            newest_file = max(
                files,
                key=os.path.getmtime
            )
            if (
                os.path.commonprefix([newest_file, es5_path]) == es5_path and
                not npm_install
            ):
                # Transpile not needed as nothing has changed
                return
            # Remove any previously created static output dirs
            shutil.rmtree("static-transpile")

        # Create a static output dir
        out_dir = "./static-transpile/js/transpile"
        os.makedirs(out_dir)
        with open("./static-transpile/README.txt", 'w') as f:
            f.write(
                (
                    'These files have been automatically generated. '
                    'DO NOT EDIT THEM! \n Changes will be overwritten. Edit '
                    'the original files in one of the django apps, and run '
                    './manage.py transpile.'
                )
            )

        mainfiles = []
        sourcefiles = []
        for path in js_paths:
            for mainfile in check_output(
                ["find", path, "-type", "f", "-name", "*.mjs", "-print"]
            ).decode('utf-8').split("\n")[:-1]:
                mainfiles.append(mainfile)
            for sourcefile in check_output(
                ["find", path, "-type", "f", "-wholename", "*js"]
            ).decode('utf-8').split("\n")[:-1]:
                if 'static/js' in sourcefile:
                    sourcefiles.append(sourcefile)
        # Collect all JavaScript in a temporary dir (similar to
        # ./manage.py collectstatic).
        # This allows for the modules to import from oneanother, across Django
        # Apps.
        # Create a cache dir for collecting JavaScript files
        cache_path = os.path.join(PROJECT_PATH, ".transpile-cache")
        if not os.path.exists(cache_path):
            os.makedirs(cache_path)
        cache_dir = "./.transpile-cache/"
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
            if relative_path[:16] == 'modules/plugins/':
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
            ["find", './.transpile-cache', "-type", "f"]
        ).decode('utf-8').split("\n")[:-1]:
            if existing_file not in cache_files:
                if existing_file[-10:] == "cache.json":
                    if not existing_file[:-10] + "mjs" in cache_files:
                        print("Removing %s" % existing_file)
                        os.remove(existing_file)
                else:
                    print("Removing %s" % existing_file)
                    os.remove(existing_file)

        for mainfile in mainfiles:
            dirname = os.path.dirname(mainfile)
            basename = os.path.basename(mainfile)
            outfilename = basename.split('.')[0] + ".js"
            cachefile = os.path.join(
                cache_dir, basename.split('.')[0] + ".cache.json")
            relative_dir = dirname.split('static/js')[1]
            infile = os.path.join(cache_dir, relative_dir, basename)
            outfile = os.path.join(out_dir, relative_dir, outfilename)
            print("Transpiling %s." % basename)
            call(["node_modules/.bin/browserifyinc", "--ignore-missing",
                  "--cachefile", cachefile, "--outfile", outfile, "-t",
                  "babelify", infile])

        # Copy mathquill CSS
        os.makedirs("static-transpile/css/libs/mathquill")
        call(["cp", "node_modules/mathquill/build/mathquill.css",
              "static-transpile/css/libs/mathquill"])
        call(["cp", "-R", "node_modules/mathquill/build/font",
              "static-transpile/css/libs/mathquill"])

        end = int(round(time.time()))
        print("Time spent transpiling: " +
              str(end - start) + " seconds")
        LAST_RUN = end
        with open(
            os.path.join(
                PROJECT_PATH,
                ".transpile-time"
            ),
            'wb'
        ) as f:
            pickle.dump(LAST_RUN, f)
