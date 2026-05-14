global.gettext = str => str
global.interpolate = (str, args) => {
    return str.replace(/%s/g, () => args.shift())
}
