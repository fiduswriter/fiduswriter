/** Pick the primary email address from a list of email objects.
 *  Falls back to the first address if no primary is marked.
 */
export const filterPrimaryEmail = emails => {
    const primaryEmails = emails.filter(email => email.primary)
    if (!primaryEmails.length) {
        if (emails.length) {
            return emails[0].address
        } else {
            return ""
        }
    }
    return primaryEmails[0].address
}
