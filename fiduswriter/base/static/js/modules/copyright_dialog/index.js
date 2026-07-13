import {edtfParse} from "bibliojson"
import deepEqual from "fast-deep-equal"
import {Dialog, InputList, TypeSwitch, escapeText} from "fwtoolkit"
import {
    copyrightTemplate,
    licenseInputTemplate,
    licenseSelectTemplate
} from "./templates"

export const LICENSE_URLS = [
    ["CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/"],
    ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"],
    ["CC BY-ND 4.0", "https://creativecommons.org/licenses/by-nd/4.0/"],
    ["CC BY-NC 4.0", "https://creativecommons.org/licenses/by-nc/4.0/"],
    ["CC BY-NC-SA 4.0", "https://creativecommons.org/licenses/by-nc-sa/4.0/"],
    ["CC BY-NC-ND 4.0", "https://creativecommons.org/licenses/by-nc-nd/4.0/"],
    ["CC0", "https://creativecommons.org/publicdomain/zero/1.0/"]
]

function getLicenseTitle(url) {
    const license = LICENSE_URLS.find(license => license[1] === url)
    return license ? license[0] : ""
}

export class CopyrightDialog {
    constructor(copyright) {
        this.copyright = copyright
        this.origCopyright = copyright
        this.dialog = false
    }

    getCurrentValue() {
        this.copyright = {}
        const holder = this.dialog.dialogEl.querySelector(".holder").value
        this.copyright.holder = holder.length ? holder : false
        const year = this.dialog.dialogEl.querySelector(".year").value
        this.copyright.year = year.length
            ? Math.max(0, Math.min(Number.parseInt(year) || 0, 2100))
            : false
        this.copyright.freeToRead = this.dialog.dialogEl.querySelector(
            ".free-to-read:checked"
        )
            ? true
            : false
        const licenseStartDates = Array.from(
            this.dialog.dialogEl.querySelectorAll(".license-start")
        ).map(el => el.value)
        this.copyright.licenses = this.licensesList.values
            .map((license, index) => {
                if (!license.url.length) {
                    return false
                }
                const returnValue = {
                    url: license.url,
                    title: license.title
                }
                const startDate = edtfParse(licenseStartDates[index])
                if (
                    startDate.valid &&
                    (startDate.type === "Date" ||
                        startDate.type === "YearMonth" ||
                        startDate.type === "Year") &&
                    !startDate.uncertain &&
                    !startDate.approximate
                ) {
                    returnValue.start = startDate.cleanedString
                }
                return returnValue
            })
            .filter(license => license)
    }

    init() {
        return new Promise(resolve => {
            const buttons = []
            buttons.push({
                text: gettext("Change"),
                classes: "fw-dark",
                click: () => {
                    this.dialog.close()
                    this.getCurrentValue()
                    if (deepEqual(this.copyright, this.origCopyright)) {
                        // No change.
                        resolve(false)
                    }
                    resolve(this.copyright)
                }
            })

            buttons.push({
                type: "cancel"
            })

            this.dialog = new Dialog({
                width: 940,
                height: 300,
                id: "configure-copyright",
                title: gettext("Set copyright information"),
                body: copyrightTemplate(this.copyright),
                buttons
            })

            this.dialog.open()
            this.bind()
        })
    }

    bind() {
        this.licensesList = new InputList({
            dom: this.dialog.dialogEl.querySelector(".copyright-licenses-list"),
            initialValues: this.copyright.licenses || [],
            emptyValue: {url: "", title: "", start: false},
            renderItem: license => ({
                html: `<div class="copyright-license-switch"></div>
                    <div class="field-part field-part-small">
                        <input type="text" class="license-start" value="${license.start ? escapeText(license.start) : ""}" placeholder="${gettext("Start date")}">
                    </div>`,
                bind: el => {
                    const licenseContainer = el.closest("tr")
                    const startInput =
                        licenseContainer.querySelector(".license-start")
                    if (license.start) {
                        startInput.value = license.start
                    }

                    const mode =
                        license.url === "" ||
                        LICENSE_URLS.find(
                            licenseUrl => licenseUrl[1] === license.url
                        )
                            ? 1
                            : 2
                    new TypeSwitch({
                        dom: el.querySelector(".copyright-license-switch"),
                        label1: gettext("From list"),
                        label2: gettext("Custom"),
                        initialMode: mode,
                        render1: () =>
                            licenseSelectTemplate({url: license.url}),
                        render2: () =>
                            licenseInputTemplate({
                                url: license.url,
                                title: license.title
                            }),
                        onChange: () => {
                            // Restore focus to the license input after switching.
                            const focusable = el.querySelector(
                                ".fw-type-switch-input-inner input, .fw-type-switch-input-inner select"
                            )
                            if (focusable) {
                                focusable.focus()
                            }
                        }
                    })
                }
            }),
            getValue: el => {
                const licenseInput = el.querySelector(
                    ".fw-type-switch-input-inner"
                )
                const selectEl = licenseInput.querySelector("select.license")
                let url, title
                if (selectEl) {
                    url = selectEl.value
                    title = getLicenseTitle(url)
                } else {
                    url = licenseInput.querySelector("input.license").value
                    title = licenseInput.querySelector(
                        "input.license-title"
                    ).value
                }
                const start =
                    el.closest("tr").querySelector(".license-start").value ||
                    false
                return {url, title, start}
            }
        })
    }
}
