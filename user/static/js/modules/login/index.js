import {whenReady} from "../common"

const loginPage = function() {
    const socialButtons = document.querySelectorAll('.fw-button.fw-socialaccount')
    let btnWidth = 1

    socialButtons.forEach(
        button => {
            const theWidth = button.clientWidth
            if (btnWidth < theWidth) {
                btnWidth = theWidth
            }
        }
    )
    btnWidth += 15
    socialButtons.forEach(
        button => button.style.width = `${btnWidth}px`
    )
}

export const bind = function() {
    whenReady().then(() => {
        loginPage()
    })
}
