/** Creates a dropdown box.
 * @param btn The button to open and close the dropdown box.
 * @param box The node containing the contents of the dropdown box.
 * @param preopen An optional function to be called before opening the dropdown box. Used to position dropdown box.
 */
export const filterPrimaryEmail = function(emails) {
    const primary_emails = emails.filter(email => email.primary)
    return primary_emails[0].address
}