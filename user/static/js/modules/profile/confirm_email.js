
export let bind = function() {
    jQuery(document).ready(() => {
        document.querySelectorAll('.checker').forEach(el => el.addEventListener(
            'click',
            () => {
                let testCheck = false
                if (document.getElementById('test-check')) {
                    if (document.getElementById('test-check').matches(':checked')) {
                        testCheck = true
                    }
                } else {
                    testCheck = true
                }
                if (testCheck && document.getElementById('terms-check').matches(':checked')) {
                    document.getElementById('submit').removeAttribute("disabled")
                } else {
                    document.getElementById('submit').setAttribute("disabled", "disabled")
                }
            }
        ))
        document.getElementById('submit').addEventListener('click', () => {
            window.alert(gettext('Thanks for verifying! You can now log in.'))
        })
    })
}
