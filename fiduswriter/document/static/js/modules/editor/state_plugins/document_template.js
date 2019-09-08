import {Plugin, PluginKey} from "prosemirror-state"
import {Fragment} from "prosemirror-model"
import {DOMSerializer} from "prosemirror-model"
import {
    addAlert,
    Dialog,
    getJson,
    postJson
  } from "../../common"

export function addDeletedPartWidget(dom, view, getPos) {
    dom.classList.add('article-deleted')
    dom.insertAdjacentHTML(
        'beforeend',
        '<div class="remove-article-part"><i class="fa fa-trash-alt"></i></div>'
    )
    const removeButton = dom.lastElementChild
    removeButton.addEventListener('click', () => {
        const from = getPos(),
            to = from + view.state.doc.nodeAt(from).nodeSize,
            tr = view.state.tr
        tr.delete(from, to)
        tr.setMeta('filterFree', true)
        view.dispatch(tr)
    })
}

export class PartView {
    constructor(node, view, getPos) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.dom = document.createElement('div')
        this.dom.classList.add('article-part')
        this.dom.classList.add(`article-${this.node.type.name}`)
        this.dom.classList.add(`article-${this.node.attrs.id}`)
        if (node.attrs.hidden) {
            this.dom.dataset.hidden = true
        }
        if (node.attrs.deleted) {
            this.contentDOM = this.dom.appendChild(document.createElement('div'))
            addDeletedPartWidget(this.dom, view, getPos)
        } else {
            this.contentDOM = this.dom
        }
    }

    stopEvent() {
        return false
    }
}

export class FileView{
    constructor(node, view, getPos, docId, options) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.options = options
        console.log(" inside constructor, node", node)
        this.docId = docId
        this.serializer = DOMSerializer.fromSchema(node.type.schema)

        this.dom = this.serializer.serializeNode(this.node)
        this.dom.classList.add('article-part', 'article-file_upload_part')
        if(this.node.attrs.upload) {
            this.button_upload = document.createElement('button')
            this.button_upload.innerHTML = "Upload File"
            this.button_upload.setAttribute('contenteditable', 'false')
            //this.button_upload.onclick = function(){console.log("you clicked")}
            const buttons = []
            buttons.push({
              text: 'Upload',
              click: () => {
                let fileList = getFiles();
                fileList.forEach(file => {

                  const values = {
                      docId: docId,
                      file: file
                  }

                  postJson('/api/document/attachment/upload/', values).then(
                    ({json}) => {
                        console.log(" result :-  ", json)
                        console.log("get pos ", this.getPos(), this.options.editor.view.state.doc.nodeAt(this.getPos()))

                        const attrs = Object.assign(
                            {},
                            this.node.attrs,
                            {
                                files: this.node.attrs.files.concat([json.name]),
                                files_path: this.node.attrs.files.concat([json.path])
                            }
                        )

                        const tr = this.options.editor.view.state.tr.setNodeMarkup(this.getPos(), null, attrs).setMeta('filterFree', true)
                        console.log({attrs, pos: this.getPos(), tr})
                        // const attrs = Object.assign({}, this.node.attrs, {files: this.node.attrs.files.concat([json.name]), files_path: this.node.attrs.files_path.concat([json.path])})
                        this.options.editor.view.dispatch(tr)

                        // console.log(this.node.attrs.files, " now")
                        // console.log(this.dom.querySelector('.article-filelinks'))
                        // const filelinks_dom = this.dom.querySelector('.article-filelinks')
                        // const fileLink = document.createElement('a')
                        // fileLink.innerHTML = json.name
                        // fileLink.setAttribute('href', json.path);
                        // filelinks_dom.appendChild(fileLink)
                        // this.update(this.view, this.node)

                        return

                    }
                  ).catch(
                    response => {
                      console.log("error", response)
                    }
                  )


                })
                this.dialog.close()

              }
            }


            )
            buttons.push({
              type: 'cancel',
              text: 'Cancel',
             // classes: 'ask-review',
              click: () => {
                this.dialog.close();
              }
            })

            this.button_upload.onclick = ()=>{
                //console.log(options.editor.docInfo)
                console.log(" doc id ", docId)
                //FileUploadDialog(docId, this.node.attrs.files, this.node.attrs.files_path)
                this.dialog = new Dialog({
                  title: 'File Uploader',
                  body:`<div class="upload-file-dialog">
                      <b>
                        Please Upload a File <i style="font-size:0.85rem;">(* Max. file size: 2MB)</i>
                    <br/>
                    <form name="file-uploader" id="file-uploader">
                        <br/><input id="file-input" name="pdfFile" type="file" multiple/>
                    </form>
                    <div id='file-list-display'></div>
                    <br>
                  </div>`,
                  buttons,
                })
                this.dialog.open()
                document.querySelector(".upload-file-dialog").querySelector("#file-input").addEventListener("change", getFiles);

            }
            this.dom.appendChild(this.button_upload)
            //this.dom.insertBefore(this.button_upload, this.dom.lastChild)
        }
        console.log(this.node.attrs.files)
        console.log("File View Worked! ")
        if(this.node.attrs.manage) {
            this.button_manage = document.createElement('button')
            this.button_manage.innerHTML = "Manage File"
            this.button_manage.setAttribute('contenteditable', 'false')
            this.button_manage.onclick = function(){console.log("you clicked")}

            this.button_manage.onclick = ()=>{
                //console.log(options.editor.docInfo)
                console.log("you clicked")
                //////not yet complete
                manageAttachment()

            }
            this.dom.appendChild(this.button_manage)
            //this.dom.insertBefore(this.button_manage, this.dom.lastChild)
        }


        function getFiles() {
            let fileInput = document.getElementById('file-input');
            let fileList = [];
            for (let i = 0; i < fileInput.files.length; i++) {
              fileList.push(fileInput.files[i]);
            }
            renderFileList(fileList);
            return fileList;
          }

          function renderFileList(fileList) {
            let fileListDisplay = document.getElementById('file-list-display');
            fileListDisplay.innerHTML = '';
            fileList.forEach(function (file, index) {
              var fileDisplayEl = document.createElement('p');
              fileDisplayEl.innerHTML = (index + 1) + ': ' + file.name;
              fileListDisplay.appendChild(fileDisplayEl);
            });
          }

          let dragSrcEl = null;

          function handleDragStart(e) {
            // Target (this) element is the source node.
            dragSrcEl = this;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.outerHTML);
            this.classList.add('dragElem');
          }

          function handleDragOver(e) {

            if (e.preventDefault) {
              e.preventDefault(); // Necessary. Allows us to drop.
            }
            this.classList.add('over');
            if(this.classList.contains('delete-area')){
              this.classList.add('delete-area-drop')
            }
            e.dataTransfer.dropEffect = 'move';  // See the section on the DataTransfer object.
            return false;
          }

          function handleDragEnter(e) {
            // console.log("on drag enter")
            // this / e.target is the current hover target.
          }

          function handleDragLeave(e) {
            // console.log("on drag leave")
            // console.log(this)
            if(this.classList.contains('delete-area')){
              this.classList.remove('delete-area-drop')
            }
            this.classList.remove('over');  // this / e.target is previous target element.
          }

function handleDrop(e) {
  // console.log("on drag drop")
  // this/e.target is current target element.
  if (e.stopPropagation) {
    e.stopPropagation(); // Stops some browsers from redirecting.
  }
  // Don't do anything if dropping the same column we're dragging.
  if (dragSrcEl != this) {
    if(this.classList.contains('delete-area')){
      // the array stores the link from which we delete the files in bkend
      link_array.push(dragSrcEl.childNodes[0].href)
      // The element array is used to store respective elements. To be used in future for better error handling
      element_array.push(dragSrcEl)
      this.previousElementSibling.removeChild(dragSrcEl)
      this.classList.remove('delete-area-drop')
      // console.log("hola",dragSrcEl)
      return;
    }
    // Set the source column's HTML to the HTML of the column we dropped on.
    //alert(this.outerHTML);
    //dragSrcEl.innerHTML = this.innerHTML;
    //this.innerHTML = e.dataTransfer.getData('text/html');
    this.parentNode.removeChild(dragSrcEl);
    var dropHTML = e.dataTransfer.getData('text/html');
    this.insertAdjacentHTML('beforebegin',dropHTML);
    var dropElem = this.previousSibling;
    addDnDHandlers(dropElem);
  }
  this.classList.remove('over');
  return false;
}

function handleDragEnd(e) {
  // console.log("on drag end")
  // this/e.target is the source node.
  this.classList.remove('over');
  this.classList.remove('dragElem');
  /*[].forEach.call(cols, function (col) {
    col.classList.remove('over');
  });*/
}


function addDnDHandlers(elem) {
  elem.addEventListener('dragstart', handleDragStart, false);
  elem.addEventListener('dragenter', handleDragEnter, false)
  elem.addEventListener('dragover', handleDragOver, false);
  elem.addEventListener('dragleave', handleDragLeave, false);
  elem.addEventListener('drop', handleDrop, false);
  elem.addEventListener('dragend', handleDragEnd, false);
}

function deleteindb(docId){
  for(let link in link_array){
    let promis = getJson('/dashboard/delete_attachment',{'link':link_array[link], 'id_doc': docId})
    promis.then((response)=>{
      if(response.status == "ok"){
        addAlert("info","Deleted file successfully")
      }
      else {
        console.log("Problem with deleting file!")
        addAlert("error","Problem with deleting file!")
      }
  })
  }
}

function delete_elements_in_array(){
  // Reset the link_array and element_array when dialog is opened.
  link_array = []
  element_array = []
}

function manageAttachment(docId){
  // Copying the content of editor into dialogbox
  let temporary_div = document.createElement('div')
  //This class name must be in the Template !!!
  temporary_div.innerHTML = document.querySelector(".article-Letters_of_intent_opt").innerHTML
  // Creating a List to hold the elements for dialogbox
  let ul = document.createElement('ul')
  ul.setAttribute('id','columns')
  for(let i of temporary_div.children){
    if(i.querySelector('a'))
      ul.innerHTML += `<li class="column" draggable="true">${i.innerHTML}</li>`
  }

  let delete_button = `<div class="delete-area">
  <span><i class="fa fa-trash"></i></span>
  </div>
  `
  let div_for_dialog_box = document.createElement('div')
  div_for_dialog_box.innerHTML = delete_button
  div_for_dialog_box.prepend(ul)
  div_for_dialog_box.innerHTML += `<i style="font-size:0.85rem;">* Drag attachments to new spot in the list to change the order<br/> * Drag and drop on to trash icon to remove the attachment </i>`

  let dialog = new Dialog({
    title: 'Manage Attachment',
    body:`${div_for_dialog_box.innerHTML}`,
    buttons: [
    {
      text: 'Update',
      classes: 'ask-review',
      click: ()=>{
        // Deleting in DB
        deleteindb(docId=docId)
        let dialog_content = document.querySelector("#columns").innerHTML
        let regex = /(<li[^>]+>|<li>)/g;
        dialog_content = dialog_content.replace(regex, "<p>");
        dialog_content = dialog_content.replace(/<\/li>/g,"</p>");
        dialog_content += `<p><br/></p>`
        document.querySelector(".article-Letters_of_intent_opt").innerHTML = dialog_content;
        blockAnchorLinks()
        //setTargetBlank()
        dialog.close();
      }
    },
    {
      type: 'cancel',
      text: 'Cancel',
      classes: 'ask-review',
      click: () => {
        dialog.close();
      }
    }
  ]
  })
  dialog.open()

  dialog.dialogEl.style.width = dialog.dialogEl.offsetWidth+"px"
  dialog.dialogEl.querySelector('.ui-dialog-content').classList.add("overflow-none")
  var cols = document.querySelectorAll('#columns .column');
  [].forEach.call(cols, addDnDHandlers);
  addDnDHandlers(document.querySelector('.delete-area'))
  delete_elements_in_array()
}

function setTargetBlank(){

    setTimeout(()=>{
      let aTags = document.querySelectorAll(".article-Letters_of_intent_opt a")

      Object.entries(aTags).map((obj)=>{
        obj[1].onclick = (e)=>{
          e.preventDefault()
          e.stopPropagation()
          let url = e.target.parentElement.href
          let anchor =  document.createElement('a')
          anchor.href = url;
          anchor.setAttribute('download','')
          anchor.click()
        }
      })

      //blockAnchorLinks()
    },1000)

  }
//   function getFiles() {
//     let fileInput = document.getElementById('file-input');
//     let fileList = [];
//     for (let i = 0; i < fileInput.files.length; i++) {
//       fileList.push(fileInput.files[i]);
//     }
//     renderFileList(fileList);
//     return fileList;
//   }

  function renderFileList(fileList) {
    let fileListDisplay = document.getElementById('file-list-display');
    fileListDisplay.innerHTML = '';
    fileList.forEach(function (file, index) {
      var fileDisplayEl = document.createElement('p');
      fileDisplayEl.innerHTML = (index + 1) + ': ' + file.name;
      fileListDisplay.appendChild(fileDisplayEl);
    });
  }






    }


    update(view, node) {
      console.log("update of nodeview called")
      // console.log(" result :-  ", json)
      // console.log("get pos ", this.getPos(), this.options.editor.view.state.doc.nodeAt(this.getPos()))

      // let files = this.node.attrs
      // let files_new = this.node.attrs
      // const attrs_n = JSON.parse(JSON.stringify(this.node.attrs))

      // files_new.files.push(json.name)
      // files_new.files_path.push(json.path)
      // attrs_n.files.push(json.name)
      // attrs_n.files_path.push(json.path)

      // console.log("New files :- ", files_new.files.length)
      // const attrs = Object.assign({}, files, attrs_n)
      // const trans = this.view.state.tr.setNodeMarkup(this.getPos(), false, attrs)
      // this.view.dispatch(
      //   this.view.state.tr.setNodeMarkup(this.getPos(), false, attrs)
      // )
      // console.log("999999", trans)
      // this.view.dispatch(
      //   trans
      // )
      // Not necessary :-
      // console.log(this.node.attrs.files, " now")
      // console.log(this.dom.querySelector('.article-filelinks'))
      // const filelinks_dom = this.dom.querySelector('.article-filelinks')
      // const fileLink = document.createElement('a')
      // fileLink.innerHTML = json.name
      // fileLink.setAttribute('href', json.path);
      // filelinks_dom.appendChild(fileLink)

  }

}

const key = new PluginKey('documentTemplate')
export const documentTemplatePlugin = function(options) {
    return new Plugin({
        key,
        state: {
            init(config, state) {
                if (options.editor.docInfo.access_rights === 'write') {
                    this.spec.props.nodeViews['richtext_part'] = (node, view, getPos) => new PartView(
                        node,
                        view,
                        getPos
                    )
                    this.spec.props.nodeViews['heading_part'] = (node, view, getPos) => new PartView(
                        node,
                        view,
                        getPos
                    )
                    this.spec.props.nodeViews['table_part'] = (node, view, getPos) => new PartView(
                        node,
                        view,
                        getPos
                    )
                    console.log(options.editor.docInfo)
                    let docId = options.editor.docInfo.id
                    console.log("yoloooo  ", options.editor.view.state.doc.firstChild)

                    this.spec.props.nodeViews['file_upload_part'] = (node, view, getPos) => new FileView(
                      node,
                      view,
                      getPos,
                      docId, //not needed can be removed later after accessing docid from options
                      options);
                    // Tags and Contributors have node views defined in tag_input and contributor_input.
                    // TOCs have node views defined in toc_render.
                }

                const protectedRanges = [
                    {from: 0, to: 1} // article node
                ]
                state.doc.firstChild.forEach((node, pos) => {
                    const from = pos + 1 // + 1 to get inside the article node
                    let to = from + 1 // + 1 for the part node
                    if (node.attrs.locking==='fixed') {
                        to = from + node.nodeSize
                    } else if (node.attrs.locking==='header') { // only relevant for tables
                        to = from + 1 + 1 + 1 + node.firstChild.firstChild.nodeSize // + 1 for the part node + 1 for the table + 1 for the first row
                    } else if (node.attrs.locking==='start') {
                        let initialFragment = Fragment.fromJSON(options.editor.schema, node.attrs.initial)
                        let protectionSize = initialFragment.size
                        if (initialFragment.lastChild && initialFragment.lastChild.isTextblock) {
                            protectionSize -= 1 // We allow writing at the end of the last text block.
                            if (initialFragment.lastChild.nodeSize === 2) {
                                // The last text block is empty, so we remove all protection from it, even node type
                                protectionSize -= 1
                            }
                            initialFragment = initialFragment.cut(0, protectionSize)

                        }
                        if (
                            node.content.size >= protectionSize &&
                            initialFragment.eq(
                                node.slice(0, protectionSize).content
                            )
                        ) {
                            // We only add protection if the start of the current content corresponds to the
                            // initial content. This may not be the case if the template has been changed.
                            to = from + 1 + protectionSize // + 1 for inside the part node
                        }
                    }
                    protectedRanges.push({from, to})
                })

                return {
                    protectedRanges
                }
            },
            apply(tr, prev, oldState, _state) {
                let {
                    protectedRanges
                } = this.getState(oldState)
                protectedRanges = protectedRanges.map(marker => ({
                    from: tr.mapping.map(marker.from, 1),
                    to: tr.mapping.map(marker.to, -1)
                }))
                console.log("In apply");
                return {
                    protectedRanges
                }
            }
        },
        props: {
            nodeViews: {}
        },

        filterTransaction: (tr, state) => {
            if (
                !tr.docChanged ||
                tr.getMeta('fixIds') ||
                tr.getMeta('remote') ||
                tr.getMeta('track') ||
                tr.getMeta('fromFootnote') ||
                tr.getMeta('filterFree') ||
                tr.getMeta('settings') ||
                ['historyUndo', 'historyRedo'].includes(tr.getMeta('inputType'))
            ) {
                return true
            }
            if (state.doc.firstChild.childCount !== tr.doc.firstChild.childCount) {
                return false
            }
            const {
                protectedRanges
            } = key.getState(state)
            let allowed = true

            let changingRanges = []

            // We map all changes back to the document before changes have been applied.
            tr.mapping.maps.slice().reverse().forEach(map => {
                if (changingRanges.length) {
                    const mapInv = map.invert()
                    changingRanges = changingRanges.map(range => (
                        {start: mapInv.map(range.start, -1), end: mapInv.map(range.end, 1)}
                    ))
                }
                map.forEach((start, end) => {
                    changingRanges.push({start, end})
                })
            })

            changingRanges.forEach(({start, end}) => {
                if (protectedRanges.find(({from, to}) => !(
                    (start <= from && end <= from) ||
                    (start >= to && end >= to)
                ))) {
                    allowed = false
                }

            })

            let allowedElements = false, allowedMarks = false

            changingRanges.forEach(range => state.doc.nodesBetween(range.from, range.to, (node, pos, parent, _index) => {
                if (parent===tr.doc.firstChild) {
                    allowedElements = node.attrs.elements ?
                        node.attrs.elements.concat('table_row', 'table_cell', 'table_header', 'list_item', 'text') :
                        false
                    allowedMarks = node.attrs.marks ?
                        node.attrs.marks.concat('insertion', 'deletion', 'comment') :
                        false
                    return allowed
                }
                if (pos < range.from) {
                    return true
                }
                if (
                    allowedElements &&
                    !allowedElements.includes(node.type.name)
                ) {
                    allowed = false
                } else if (allowedMarks) {
                    node.marks.forEach(mark => {
                        if (!allowedMarks.includes(mark.type.name)) {
                            allowed = false
                        }
                    })
                }

            }))

            return allowed
        }
    })
}
