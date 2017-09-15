import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {noSpaceTmp} from "../../common"

import {addColumnAfter, addColumnBefore, deleteColumn, addRowBefore, addRowAfter, deleteRow, deleteTable,
        mergeCells, splitCell, setCellAttr, toggleHeaderRow, toggleHeaderColumn, toggleHeaderCell,
        goToNextCell} from "prosemirror-tables"

const key = new PluginKey('tables')

export let tablesPlugin = function(options) {

    var color = ["#AAAAAA" , "#FF9992", "#BF9232"];
    function  addOptions(arr, selectId) {

    }


    return new Plugin({
        key,
        props: {
           decorations: (state) => {
                const $head = state.selection.$head.node(3)
                if($head != undefined && $head.type.name == 'table'){

                    let startPos = state.selection.$head.start()
                    let tableDropUp = document.createElement('span')
                     tableDropUp.innerHTML = noSpaceTmp`
                        <span class="table-edit-button ui-button-text"><i class="icon-table"></i></span>
                        <span class="ui-button-text delete-table" title="${gettext("Delete Table")}" >
                            <label>${gettext("Delete table")}</label>
                        </span>
                        <span class="ui-button-text color-lists" title="${gettext("Delete Table")}" >
                            <label>${gettext("Delete table")}</label>
                        </span>
                        
                        <span class="ui-button-text bg-color" title="${gettext("Background Color")}" >
                            <label>${gettext("Background Color")}</label>
                        </span>
                        <span class="ui-button-text row" title="${gettext("Insert row")}" >
                            <label>${gettext("Insert/Delete row ")}</label>
                        </span>
                        <span class="ui-button-text col" title="${gettext("Insert column")}" >
                            <label>${gettext("Insert/Delete Column ")}</label>
                        </span>
                        <span class="ui-button-text cell" title="${gettext("Merge/Split cell")}" >
                            <label>${gettext("Merge/Split cell ")}</label>
                        </span>
                        <span class="ui-button-text toggle" title="${gettext("Insert Toggle")}" >
                            <label>${gettext("Insert toggle ")}</label>
                        </span>

                        <span class="ui-button-text row-before" title="${gettext("Insert row before")}" >
                            <label>${gettext("Insert row before")}</label>
                        </span>
                        <span class="ui-button-text row-after" title="${gettext("Insert row after")}" >
                            <label>${gettext("Insert row after")}</label>
                        </span>
                        <span class="ui-button-text" title="${gettext("Insert Column before")}">
                            <label class="col-before">${gettext("Insert Column before")}</label>
                        </span>
                        <span class="ui-button-text" title="${gettext("Insert Column before")}">
                            <label class="col-after">${gettext("Insert Column after")}</label>
                        </span>
                        <span class="ui-button-text" title="${gettext("Delete Column")}">
                            <label class="del-col">${gettext("Insert Column after")}</label>
                        </span>
                        <span class="ui-button-text" title="${gettext("Delete Row")}">
                            <label class="del-row">${gettext("Delete Row")}</label>
                        </span>
                        <span class="ui-button-text" title="${gettext("Merge cell")}">
                            <label class="merge-cell">${gettext("Merge cell")}</label>
                        </span>
                        <span class="ui-button-text" title="${gettext("Split cell")}">
                            <label class="split-cell">${gettext("Split cell")}</label>
                        </span>

                        <span class="ui-button-text" title="${gettext("Toggle Row Header")}">
                            <label class="toggle-row">${gettext("Toggle Row Header")}</label>
                        </span>
                        <span class="ui-button-text" title="${gettext("Toggle Column Header")}">
                            <label class="toggle-col">${gettext("Toggle Column Header")}</label>
                        </span>
                        <span class="ui-button-text" title="${gettext("Toggle Header Cell")}">
                            <label class="toggle-cell">${gettext("Toggle cell Header")}</label>
                        </span>
                    `

                    tableDropUp.querySelector('.row-before').style.display = "none";
                    tableDropUp.querySelector('.row-after').style.display = "none";
                    tableDropUp.querySelector('.del-row').style.display = "none";


                    tableDropUp.querySelector('.col-before').style.display = "none";
                    tableDropUp.querySelector('.col-after').style.display = "none";
                    tableDropUp.querySelector('.del-col').style.display = "none";

                    tableDropUp.querySelector('.toggle-col').style.display = "none";
                    tableDropUp.querySelector('.toggle-row').style.display = "none";
                    tableDropUp.querySelector('.toggle-cell').style.display = "none";
                    //tableDropUp.querySelector('.table-edit-button').addEventListener('click', event => {
                     //   tableDropUp.querySelector('.row').style.display = "block";
                    //})
                    tableDropUp.querySelector('.merge-cell').style.display = "none";
                    tableDropUp.querySelector('.split-cell').style.display = "none";


                    tableDropUp.querySelector('.row').addEventListener('click', () => {
                        tableDropUp.querySelector('.row-before').style.display = "block";
                        tableDropUp.querySelector('.row-after').style.display = "block";
                        tableDropUp.querySelector('.del-row').style.display = "block";
                    })

                    tableDropUp.querySelector('.col').addEventListener('click', () => {
                        tableDropUp.querySelector('.col-before').style.display = "block";
                        tableDropUp.querySelector('.col-after').style.display = "block";
                        tableDropUp.querySelector('.del-col').style.display = "block";
                    })

                    tableDropUp.querySelector('.cell').addEventListener('click', () => {
                        tableDropUp.querySelector('.merge-cell').style.display = "block";
                        tableDropUp.querySelector('.split-cell').style.display = "block";
                    })


                    tableDropUp.querySelector('.toggle').addEventListener('click', () => {
                    tableDropUp.querySelector('.toggle-col').style.display = "block";
                    tableDropUp.querySelector('.toggle-row').style.display = "block";
                    tableDropUp.querySelector('.toggle-cell').style.display ="block";
                    })

                    tableDropUp.querySelector('.bg-color').addEventListener('click', () => {
                        let a = addOptions(color, "second");
                        console.log("a", a)
                        let g = setCellAttr("background", "#dfd")
                        g(state, options.editor.view.dispatch)
                    })


                    tableDropUp.querySelector('.delete-table').addEventListener('click', () => {
                        deleteTable(state, options.editor.view.dispatch)
                    })
                    tableDropUp.querySelector('.row-before').addEventListener('click', () => {
                        addRowBefore(state, options.editor.view.dispatch)
                    })
                    tableDropUp.querySelector('.row-after').addEventListener('click', () => {
                        addRowAfter(state, options.editor.view.dispatch)
                    })
                    tableDropUp.querySelector('.col-before').addEventListener('click', () => {
                        addColumnBefore(state, options.editor.view.dispatch)
                    })
                    tableDropUp.querySelector('.col-after').addEventListener('click', () => {
                        addColumnBefore(state, options.editor.view.dispatch)
                    })
                    tableDropUp.querySelector('.del-row').addEventListener('click', () => {
                        deleteRow(state, options.editor.view.dispatch)
                    })
                    tableDropUp.querySelector('.del-col').addEventListener('click', () => {
                        deleteColumn(state, options.editor.view.dispatch)
                    })
                    tableDropUp.querySelector('.merge-cell').addEventListener('click', () => {
                        mergeCells(state, options.editor.view.dispatch)
                    })
                    tableDropUp.querySelector('.split-cell').addEventListener('click', () => {
                        splitCell(state, options.editor.view.dispatch)
                    })
                    tableDropUp.querySelector('.toggle-col').addEventListener('click', () => {
                        toggleHeaderColumn(state, options.editor.view.dispatch)
                    })
                    tableDropUp.querySelector('.toggle-row').addEventListener('click', () => {
                        toggleHeaderRow(state, options.editor.view.dispatch)
                    })
                    tableDropUp.querySelector('.toggle-cell').addEventListener('click', () => {
                        toggleHeaderCell(state, options.editor.view.dispatch)
                    })


                    let deco = Decoration.widget(
                        startPos,
                        tableDropUp,
                        {stopEvent: event => true}
                    )

                    return DecorationSet.create(state.doc, [deco])
               }
                else{
                    return
                }


           }
        }
    })
}
