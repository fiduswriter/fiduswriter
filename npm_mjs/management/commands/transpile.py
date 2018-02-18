from subprocess import call, check_output
import os
import shutil
import time
import pickle

from django.core.management.base import BaseCommand
from django.contrib.staticfiles import finders
from django.conf import settings

from .npm_install import install_npm
from npm_mjs import signals

if settings.PROJECT_PATH:
    PROJECT_PATH = settings.PROJECT_PATH
else:
    PROJECT_PATH = "./"

# Run this script every time you update an *.mjs file or any of the
# modules it loads.

transpile_time_path = os.path.join(
    PROJECT_PATH,
    ".transpile-time"
)

try:
    with open(
        transpile_time_path,
        'rb'
    ) as f:
        LAST_RUN = pickle.load(f)
except EOFError:
    LAST_RUN = 0
except IOError:
    LAST_RUN = 0


class Command(BaseCommand):
    help = ('Transpile ES6 JavaScript to ES5 JavaScript + include NPM '
            'dependencies')

    def handle(self, *args, **options):
        global LAST_RUN
        start = int(round(time.time()))
        npm_install = install_npm()
        self.stdout.write("Transpiling...")
        js_paths = finders.find('js/', True)
        # Remove paths inside of collection dir
        js_paths = [
            x for x in js_paths if not x.startswith(settings.STATIC_ROOT)
        ]

        transpile_path = os.path.join(
            PROJECT_PATH,
            "static-transpile"
        )

        if os.path.exists(transpile_path):
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
                os.path.commonprefix(
                    [newest_file, transpile_path]
                ) == transpile_path and
                not npm_install
            ):
                # Transpile not needed as nothing has changed
                return
            # Remove any previously created static output dirs
            shutil.rmtree(transpile_path)

        # Create a static output dir
        out_dir = os.path.join(transpile_path, "js/transpile")
        os.makedirs(out_dir)
        with open(os.path.join(transpile_path, "README.txt"), 'w') as f:
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
        # Note all cache files so that we can remove outdated files that no
        # longer are in the prject.
        cache_files = []
        # Note all plugin dirs and the modules inside of them to crate index.js
        # files inside of them.
        plugin_dirs = {}
        for sourcefile in sourcefiles:
            relative_path = sourcefile.split('static/js/')[1]
            outfile = os.path.join(cache_path, relative_path)
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
            ["find", cache_path, "-type", "f"]
        ).decode('utf-8').split("\n")[:-1]:
            if existing_file not in cache_files:
                if existing_file[-10:] == "cache.json":
                    if not existing_file[:-10] + "mjs" in cache_files:
                        self.stdout.write("Removing %s" % existing_file)
                        os.remove(existing_file)
                else:
                    self.stdout.write("Removing %s" % existing_file)
                    os.remove(existing_file)
        browserifyinc_path = os.path.join(
            PROJECT_PATH,
            'node_modules/.bin/browserifyinc'
        )
        for mainfile in mainfiles:
            dirname = os.path.dirname(mainfile)
            basename = os.path.basename(mainfile)
            outfilename = basename.split('.')[0] + ".js"
            cachefile = os.path.join(
                cache_path, basename.split('.')[0] + ".cache.json")
            relative_dir = dirname.split('static/js')[1]
            infile = os.path.join(cache_path, relative_dir, basename)
            outfile = os.path.join(out_dir, relative_dir, outfilename)
            self.stdout.write("Transpiling %s." % basename)
            call([browserifyinc_path, "--ignore-missing",
                  "--cachefile", cachefile, "--outfile", outfile, "-t",
                  "babelify", infile])

        end = int(round(time.time()))
        self.stdout.write(
            "Time spent transpiling: " + str(end - start) + " seconds"
        )

        LAST_RUN = end
        with open(
            os.path.join(
                PROJECT_PATH,
                ".transpile-time"
            ),
            'wb'
        ) as f:
            pickle.dump(LAST_RUN, f)
        signals.post_transpile.send(sender=None)
