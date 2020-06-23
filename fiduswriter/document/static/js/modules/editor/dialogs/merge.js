import {
    Dialog
} from "../../common"

const mergeHelpTemplate =
`            
<div class="merge-instruction">
    <ol class="instruction">
        <li class="instruction-item">
            <div>
                <div class="merge-question"><i class="fas fa-plus-circle"></i>Why am I seeing this merge window ?</div>
                <div class= "merge-answer">You're seeing this merge window , because you were offline for a long time , and the changes you made to the document while you were offline , conflicted with the changes made by the online user. So it was not possible to resolve them automatically. So that's why you're seeing this window.
                </div>
            </div>
        </li>
        <li class="instruction-item">
            <div>
                <div class="merge-question"><i class="fas fa-plus-circle"></i>Am I the only one seeing this window ?</div> 
                <div class= "merge-answer">Yes , you're the only one who can see this window. Therefore it would be great if the you could ask the collaborators to stop editing the document , so that once you're finished with the merge it would not lead to more conflicts once you try to merge with the document edited by the collaborators.</div>
            </div>
        </li>
        <li class="instruction-item">
            <div>
                <div class="merge-question"><i class="fas fa-plus-circle"></i>Why am I seeing three editors ?</div>
                <div class= "merge-answer">The editor on the left will show the offline version of the document (the document resulting from your changes ), the editor on the middle contains the last synced version of the document , and the editor on the right contains the online version of the document (document resulting from the online users edits).</div>
            </div>
        </li>
        <li class="instruction-item">
            <div>
                <div class="merge-question"><i class="fas fa-plus-circle"></i>What are the green and red highlights in the editors ?</div>
                <div class= "merge-answer">The editors on left and right will show content that are highlighted in green , and the editor in the middle will contain text that are highlighted usually in red. The text marked in green corresponds to the text that got edited(added) by online user or you. The text marked in red corresponds to text that got deleted by either you or the online user. This deletion will be marked only in the middle editor and the insertions will be marked in the other editors only.</div>
            </div>
        </li>
        <li class="instruction-item">
            <div>
                <div class="merge-question"><i class="fas fa-plus-circle"></i>How do I accept or reject a particular change ?</div>
                <div class= "merge-answer">Accepting or rejecting a change from editors , causes a change in the editor in the middle. You can accept a change by directly clicking on the highlighted text , which shows up a drop , where in you can either accept / reject a change. When you click on the highlighted text , it also highlights the changes that will get accepted.
                <img src="${settings_STATIC_URL}img/accept-change.png" class = "merge-img">
                As shown in the above image one can click on a highlighted change , and click on accept change. On accepting a change it'll be reflected in the merged document editor in the middle. Rejecting a change works in the same way except on reject a change the highlight of the change will be lost , with it the ability to accept, reject or copy a change.
                </div>
            </div>
        </li>
        <li class="instruction-item">
            <div>
                <div class="merge-question"><i class="fas fa-plus-circle"></i>I cannot accept a particular change. What do i do ?</div>
                <div class= "merge-answer">If you cannot automatically accept a change into the middle editor , no issues. You can choose to copy the change by clicking on the copy button and then you can paste it in the middle editor. It is as simple as that!</div>
            </div>
        </li>
        <li class="instruction-item">
            <div>
                <div class="merge-question"><i class="fas fa-plus-circle"></i>Can I edit content in all the editors ?</div>
                <div class= "merge-answer">You can edit the content in all the editors. But do keep in mind that whatever you type in the left most and right most editor will not be tracked (you cannot accept or reject it). And moreover the edits made in these two editors will not be preserved once the merge is completed.</div>
            </div>
        </li>
        <li class="instruction-item">
            <div>
                <div class="merge-question"><i class="fas fa-plus-circle"></i>What do i do after completing the merge ?</div>
                <div class= "merge-answer">After the merge is completed , you can click on the button merge complete which in turn will move your changes to the main editor. Do note if other users made significant changes to the document while you were merging the document , you might've to merge the documents together again.</div>
            </div>
        </li>
    </ol>
</div>
<div class = "instruction-note">
    Note:
    It is always better that you try to accept the changes in a linear fashion.
    Also it is better that you ask your collaborators to refrain from editing the document during this period of merge as it might cause conflicts when you try to merge the merged document with the latest version edited by the online user.
</div>`
export class mergeHelpDialog {
    constructor() {
        this.helpDialog = new Dialog({
            id: 'editor-merge-help',
            title: gettext("Frequently Asked Questions"),
            body: mergeHelpTemplate,
            height:600,
            width:900,
            buttons:[]
        })
    }

    open() {
        this.helpDialog.open()
        const question_items = document.querySelectorAll('.merge-question .fa-plus-circle')
        question_items.forEach(element=>{
            const answerEle = element.parentNode.nextSibling.nextElementSibling
            answerEle.style.display = "none"
        })
        question_items.forEach(element=>{
            element.addEventListener('click', ()=>{
                const answerEle = element.parentNode.nextSibling.nextElementSibling
                if (answerEle.style.display == "") {
                    element.classList.remove("fa-minus-circle")
                    element.classList.add("fa-plus-circle")
                    answerEle.style.display = "none"
                } else if (answerEle.style.display == "none") {
                    element.classList.remove("fa-plus-circle")
                    element.classList.add("fa-minus-circle")
                    answerEle.style.display = ""
                }
            })
        })
    }

}

