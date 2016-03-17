import {initZipFileRead, init} from "./es6_modules/importer/zip"

let importer = {}

importer.initZipFileRead = initZipFileRead
importer.init = init

window.importer = importer
