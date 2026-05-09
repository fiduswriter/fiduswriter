let _settings = null

export function initSettings(rawSettings) {
    if (_settings) {
        throw new Error("Settings already initialized")
    }
    // Freeze to prevent accidental mutation at runtime
    _settings = Object.freeze({...rawSettings})
}

export function getSettings() {
    if (!_settings) {
        throw new Error(
            "App settings not initialized. Call initSettings() first."
        )
    }
    return _settings
}
