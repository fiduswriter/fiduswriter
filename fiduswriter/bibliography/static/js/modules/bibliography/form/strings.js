import {
    BibFieldTypes,
    BibTypes,
    getFieldHelp,
    getFieldTitle,
    getLangidTitle,
    getLocale,
    getOtherOptionTitle,
    getTypeTitle
} from "biblatex-csl-converter"

// Cache for the current locale to avoid repeated lookups
let cachedLocale = null
let cachedLang = null

function getCachedLocale() {
    const lang = document.documentElement.lang || "en"
    if (lang !== cachedLang) {
        cachedLocale = getLocale(lang)
        cachedLang = lang
    }
    return cachedLocale
}

// Dynamic field title getter that uses biblatex-csl-converter's i18n
export function getBibFieldTitle(fieldKey, bibType = null) {
    const locale = getCachedLocale()
    if (bibType && BibTypes[bibType]) {
        return getFieldTitle(locale, bibType, fieldKey)
    }
    // Fallback to generic field title
    const fieldType = BibFieldTypes[fieldKey]
    if (fieldType && fieldType.title) {
        return fieldType.title
    }
    return fieldKey
}

// Dynamic type title getter
export function getBibTypeTitle(typeKey) {
    const locale = getCachedLocale()
    return getTypeTitle(locale, typeKey)
}

// Dynamic field help getter
export function getBibFieldHelp(fieldKey) {
    const locale = getCachedLocale()
    return getFieldHelp(locale, fieldKey)
}

// Dynamic option title getter (for editortype, pagination, pubstate, etc.)
export function getBibOptionTitle(optionKey) {
    const locale = getCachedLocale()
    return getOtherOptionTitle(locale, optionKey)
}

// Dynamic langid title getter
export function getBibLangidTitle(langidKey) {
    const locale = getCachedLocale()
    return getLangidTitle(locale, langidKey)
}

// For backward compatibility, create proxy objects that dynamically return translations
// These should be used sparingly - prefer using the function versions above
export const BibFieldTitles = new Proxy(
    {},
    {
        get(_target, prop) {
            return getBibFieldTitle(prop)
        }
    }
)

export const BibTypeTitles = new Proxy(
    {},
    {
        get(_target, prop) {
            return getBibTypeTitle(prop)
        }
    }
)

export const BibFieldHelp = new Proxy(
    {},
    {
        get(_target, prop) {
            return getBibFieldHelp(prop)
        }
    }
)

export const BibOptionTitles = new Proxy(
    {},
    {
        get(_target, prop) {
            return getBibOptionTitle(prop)
        }
    }
)

// Export a function to get all type titles as an object (for templates that need to map all types)
export function getAllTypeTitles() {
    const locale = getCachedLocale()
    const titles = {}
    Object.keys(BibTypes).forEach(typeKey => {
        titles[typeKey] = getTypeTitle(locale, typeKey)
    })
    return titles
}

// Export a function to get all field help texts
export function getAllFieldHelp() {
    const locale = getCachedLocale()
    const help = {}
    Object.keys(BibFieldTypes).forEach(fieldKey => {
        const helpText = getFieldHelp(locale, fieldKey)
        if (helpText) {
            help[fieldKey] = helpText
        }
    })
    return help
}
