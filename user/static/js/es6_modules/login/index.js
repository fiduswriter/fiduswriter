let loginPage = function() {
    let btnWidth = 1
    [].slice.call(document.querySelectorAll('.fw-button.fw-socialaccount')).forEach(
        element => {
            let theWidth = jQuery(element).width()
            if (btnWidth < theWidth) {
                btnWidth = theWidth
            }
        }
    )
    jQuery('.fw-button.fw-socialaccount').css('width', btnWidth + 15)
}

export let bind = function() {
    jQuery(document).ready(() => {
        loginPage()
    })
}
