// Mock global gettext function (provided by Django JS catalog)
global.gettext = str => str
global.interpolate = (str, args) => {
    return str.replace(/%s/g, () => args.shift())
}
