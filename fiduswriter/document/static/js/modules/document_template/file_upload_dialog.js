/*

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
  */
/*[].forEach.call(cols, function (col) {
    col.classList.remove('over');
  });*//*

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

function show_manage_attachment_dialog(docId){
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

function show_dialog_attach(docId) {
  let dialog = new Dialog({
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
    buttons: [
      {
        text: 'Upload',
        classes: 'ask-review',
        click: () => {
          let getCsrfToken = () => window.top.getCookie('csrftoken');
          let status;
          let form_file_uploader = new FormData();
          form_file_uploader.append('csrfmiddlewaretoken', getCsrfToken());
          form_file_uploader.append('docId', docId);

          let fileList = getFiles();
          fileList.forEach(function (file) {
            form_file_uploader.append('file', file);
            let request = new XMLHttpRequest();
            request.open("POST", '/dashboard/uploadFile');
            request.send(form_file_uploader);

            request.onreadystatechange = function() {
              if(this.readyState === 4 && this.status === 200) {
                // console.log("Success",request.response)
                status = JSON.parse(request.responseText);
                // console.log("Response type    - ", request.responseType)
                let name = status['attachment_name'].split('/')[1]
                let at_pos = document.querySelector(".article-Letters_of_intent_opt");
                at_pos.insertAdjacentHTML('afterbegin', `<a target="_blank" href="${window.location.origin}/media/${status['attachment_name']}?images=${status['num_images']}">${name} </a>`)
                //bindEventOnAnchorTag()
                blockAnchorLinks()
                //setTargetBlank()
                addAlert('info', status.status)
              }
              else {
                status = request.response;
              }
            }
          })
          dialog.close()

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
  document.querySelector(".upload-file-dialog").querySelector("#file-input").addEventListener("change", getFiles);
}

function blockAnchorLinks(){
  setTimeout(()=>{
    let pTags = document.querySelector(".article-Letters_of_intent_opt")
    if(pTags){
      Object.entries(pTags.children).map((obj)=>{
        if(obj[1]){
          obj[1].setAttribute('contenteditable','false')
          //obj[1].firstElementChild.setAttribute('target','_blank')
        }
      })
    }
    setTargetBlank()
  },1000)
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



*/
