import {escapeText, noSpaceTmp} from "../../../common"
import {ContributorDialog} from "../../dialogs"

export const createDropUp = (selection, view) => {
    const dropUp = document.createElement("span"),
        requiredPx = 120,
        parentNode = selection.$anchor.parent

    dropUp.classList.add("drop-up-outer")

    dropUp.innerHTML = noSpaceTmp`
        <div class="link drop-up-inner" style="top: -${requiredPx}px;">
            <div class="drop-up-head">
                <div>${escapeText(parentNode.attrs.item_title)}</div>
            </div>
            <ul class="drop-up-options">
                <li class="edit-contributor">${gettext("Edit")}</li>
            </ul>
        </div>`
    dropUp
        .querySelector(".edit-contributor")
        .addEventListener("mousedown", event => {
            event.preventDefault()
            const dialog = new ContributorDialog(
                parentNode,
                view,
                selection.node.attrs
            )
            dialog.init()
        })
    return dropUp
}
