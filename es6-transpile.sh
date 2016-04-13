#!/bin/bash


# Temporary conversion of JavaScript ES6 to ES5. Once
# all supported browsers support ES6 sufficiently ('class' in particular,
# see http://kangax.github.io/compat-table/es6/), this script can be
# replaced/updated.
# Delete also node_modules, and run
# pip uninstall nodeenv.
#
# Run this script every time you update an *.es6.js file or any of the modules it loads.

if [ ! -f node_modules/.bin/browserify ];
then

if ! hash nodeenv;
then
pip install nodeenv
nodeenv -p
fi

npm install

## Comment this part when using a release version of ProseMirror
#cd node_modules/prosemirror/
#npm install
#npm run dist
#cd ../..
## End comment

fi

IFS=$'\n';

sourcefiles=$(find . -path ./node_modules -prune -o  -type f -name "*.es6.js" -print)

# Collect all javascript in a temporary dir (similar to ./manage.py collectstatic).
# This allows for the modules to import from oneanother, across Django Apps.
# The temporary dir is a subfolder in the current directory and not a folder in
# /tmp, because browserify doesn't allow operations in higher level folders.
mkdir es6-tmp
tmp_dir='./es6-tmp/'
for directory in $(find . -type d -wholename '*static/js')
do
  cp -R $directory/. $tmp_dir
done


for file in $sourcefiles
do
  dirname=$(dirname "$file")
  basename=$(basename "$file")
  outfilename="${basename%.es6.js}"
  relative_dir=$(echo $dirname | awk 'BEGIN {FS="static/js"} {print $2}')
  infile="$tmp_dir$relative_dir$basename"
  outfile="$dirname/$outfilename.es5.js"
  echo "Converting $file to $outfile"
  node_modules/.bin/browserify --outfile $outfile -t babelify $infile
  #node_modules/.bin/browserify $infile --list --fast --detect-globals=false
  sed -i "1i /* This file has been automatically generated. DO NOT EDIT IT. \n Changes will be overwritten. Edit $basename and run ./es6-transpile.sh */"  "$outfile"
done

echo "Time spent: $SECONDS seconds"
rm -r es6-tmp
