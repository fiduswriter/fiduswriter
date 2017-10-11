let loginPage = function() {
    let btnWidth = 1,
    socialButtons = [].slice.call(document.querySelectorAll('.fw-button.fw-socialaccount'))

    socialButtons.forEach(
        button => {
            let theWidth = jQuery(button).width()
            if (btnWidth < theWidth) {
                btnWidth = theWidth
            }
        }
    )
    btnWidth += 15
    socialButtons.forEach(
        button => {
            button.style.width = `${btnWidth}px`
        }
    )
}

export let bind = function() {
    jQuery(document).ready(() => {
        loginPage()
    })
}
