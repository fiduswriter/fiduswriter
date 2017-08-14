import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {ReplaceAroundStep} from "prosemirror-transform"
import {Slice, Fragment} from "prosemirror-model"
import {noSpaceTmp} from "../../common"
import {randomHeadingId, randomFigureId} from "../../schema/common"

const linksKey = new PluginKey('links')
export let linksPlugin = function(options) {


    function createLinkDropUp(linkMark,$head,anchorMark ='undefined' , anchor=false, doubleDropUp=false) {
        let linkDropUp = document.createElement('span'),
            anchorType = 'external',
            href = linkMark.attrs.href,
            editor = options.editor,
            toolbarLink = editor.menu.toolbarModel.content.find(item => item.id==='link'),
            anchor_href
            

        if (!toolbarLink) {
            // No link in toolbar to edit link. Disable all editing.
            // This should not ever happen unless someone messes with
            // the toolbar.
            toolbarLink = {disabled: () => false}
        }
        if (anchor == true) {
        	anchor_href='#'+anchorMark.attrs.id
        	anchor_href= window.location.href.split('#')[0] + anchor_href
         linkDropUp.classList.add('active-anchor')
        }
        
        linkDropUp.classList.add('link')
        
        linkDropUp.classList.add('drop-up-outer')

        
        if(anchor && !doubleDropUp){
        	anchorType = 'internal'
        	linkDropUp.innerHTML = noSpaceTmp`
            <div class="link drop-up-inner">
                ${gettext('Link')}:&nbsp;<a class="href" ${anchorType === 'external' ? 'target="_blank"' : ''} href="${anchor_href}">
                    ${anchor_href}
                </a><br>
                ${toolbarLink.disabled(editor) ? '' : noSpaceTmp`
                    <div class="edit">
                        [<a href="#" class="copy-url">${gettext('Copy Url')}</a> | <a href="#" class="remove-anchor">${gettext('Remove')}</a>]
                    </div>
                `}
            </div>
        `
        
        linkDropUp.querySelector('.copy-url').addEventListener('click', () => {
        	
        	var text = anchor_href
        	var textarea = document.createElement("textarea");
        	textarea.textContent = text;
        	textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in MS Edge.
    		document.body.appendChild(textarea);
		   textarea.select();
		   try {
		   	var successful = document.execCommand("copy");  // Security exception may be thrown by some browsers.
		   	var msg = successful ? 'successful' : 'unsuccessful';
		   	} 
		   catch (ex) {
		   //	addAlert('error','Copy to clipboard failed.');
		   	console.warn("Copy to clipboard failed.", ex);            
		    } finally {
		 	document.body.removeChild(textarea);		 	
		// 	addAlert('success',parseInt(jQuery(this).attr('data-id')) + 'was copied');
         }   
        })
        
        linkDropUp.querySelector('.remove-anchor').addEventListener('click', () => {
            editor.view.dispatch ( editor.view.state.tr.removeMark($head.start(), $head.end(), linkMark) )
                })
        }else{
        	if(href.length && href[0] === '#') {
        		anchorType = 'internal'
        		href = window.location.href.split('#')[0] + href            
        		}
        		linkDropUp.innerHTML = noSpaceTmp`
        		<div class="link drop-up-inner">
        		${gettext('Link')}:&nbsp;<a class="href" ${anchorType === 'external' ? 'target="_blank"' : ''} href="${href}">
        		${href}
        		</a><br>
        		${gettext('Title')}:&nbsp;${linkMark.attrs.title}
        		${toolbarLink.disabled(editor) ? '' : noSpaceTmp`
                    <div class="edit">
                        [<a href="#" class="edit-link">${gettext('Edit')}</a> | <a href="#" class="remove-link">${gettext('Remove')}</a
                    </div>
                `}>]
            </div>
        `
        linkDropUp.querySelector('.edit-link').addEventListener('click', () => {
            toolbarLink.action(options.editor)
        })
        
        linkDropUp.querySelector('.remove-link').addEventListener('click', () => {
            editor.view.dispatch(
                editor.view.state.tr.removeMark($head.start(), $head.end(), linkMark)
            )
        		})
        
        }
        if (doubleDropUp) {
        	linkDropUp.innerHTML += noSpaceTmp`
            <div class="link drop-up-inner">
                ${gettext('Link')}:&nbsp;<a class="href" ${anchorType === 'external' ? 'target="_blank"' : ''} href="${anchor_href}">
                    ${anchor_href}
                </a><br>
                ${toolbarLink.disabled(editor) ? '' : noSpaceTmp`
                    <div class="edit">
                        [<a href="#" class="copy-url">${gettext('Copy Url')}</a> | <a href="#" class="remove-anchor">${gettext('Remove')}</a>]
                    </div>
                `}
            </div>
        `
        linkDropUp.querySelector('.copy-url').addEventListener('click', () => {
        	
        	var text = anchor_href
        	var textarea = document.createElement("textarea");
        	textarea.textContent = text;
        	textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in MS Edge.
    		document.body.appendChild(textarea);
		   textarea.select();
		   try {
		   	var successful = document.execCommand("copy");  // Security exception may be thrown by some browsers.
		   	var msg = successful ? 'successful' : 'unsuccessful';
		   	} 
		   catch (ex) {
		   //	addAlert('error','Copy to clipboard failed.');
		   	console.warn("Copy to clipboard failed.", ex);            
		    } finally {
		 	document.body.removeChild(textarea);		 	
		// 	addAlert('success',parseInt(jQuery(this).attr('data-id')) + 'was copied');
         }   
        })
        
        linkDropUp.querySelector('.remove-anchor').addEventListener('click', () => {
            editor.view.dispatch ( editor.view.state.tr.removeMark($head.start(), $head.end(), linkMark) )
                })
        }

        if (anchorType === 'internal') {
            linkDropUp.querySelector('a.href').addEventListener('click', event => {
                event.preventDefault()
                if (href) {
                	let id = linkMark.attrs.href.slice(1)
                	editor.scrollIdIntoView(id)                
                }else {
                	let id = linkMark.attrs.id
                	editor.scrollIdIntoView(id)          
                }
                })
            }

        return linkDropUp
    }

    return new Plugin({
        key: linksKey,
        state: {
            init() {
                return {
                    url: window.location.href
                }
            },
            apply(tr, prev, oldState, state) {
                let {
                    url
                } = this.getState(oldState)
                let id = state.selection.$head.parent.attrs.id,
                    mark = state.selection.$head.marks().find(mark => mark.type.name === 'anchor'),
                    newUrl = url.split('#')[0]
                if (mark) {
                    newUrl += `#${mark.attrs.id}`
                } else if (id) {
                    newUrl += `#${id}`
                }
                let changed = url === newUrl ? false : true
                // TODO: Should the following be moved to a view?
                // Not sure if this counts as a DOM update.
               
                return {
                    url: newUrl
                }
            }
        },
        appendTransaction: (transactions, oldState, state) => {
            // Check if any of the transactions are local.
            if(transactions.every(transaction => transaction.getMeta('remote'))) {
                // All transactions are remote. Give up.
                return
            }
            // Check if there are any headings or figures in the affected range.
            // Otherwise, skip.
            let ranges = []
            transactions.forEach(transaction => {
                transaction.steps.forEach((step, index) => {
                    if (step.jsonID === 'replace' || step.jsonID === 'replaceAround') {
                        ranges.push([step.from, step.to])
                    }
                    ranges = ranges.map(range => {
                        return [
                            transaction.mapping.maps[index].map(range[0], -1),
                            transaction.mapping.maps[index].map(range[1], 1)
                        ]
                    })
                })
            })
            let transaction = transactions.slice(-1)[0],
                foundIdElement = false // found heading or figure, anchor marks
                // are allowed to be duplicated
            ranges.forEach(range => {
                transaction.doc.nodesBetween(
                    range[0],
                    range[1],
                    (node, pos, parent) => {
                        if (node.type.name === 'heading' || node.type.name === 'figure') {
                            foundIdElement = true
                        }
                    }
                )
            })

            if (!foundIdElement) {
                return
            }

            // Check that unique IDs only exist once in the document
            // If an ID is used more than once, add steps to change the ID of all
            // but the first occurence.
            let headingIds = [], doubleHeadingIds = []
            let figureIds = [], doubleFigureIds = []

            // ID should not be found in the other pm either. So we look through
            // those as well.
            let otherState = oldState === options.editor.view.state ?
                options.editor.mod.footnotes.fnEditor.view.state : options.editor.view.state

            otherState.doc.descendants(node => {
                if (node.type.name === 'heading') {
                    headingIds.push(node.attrs.id)
                } else if (node.type.name === 'figure') {
                    figureIds.push(node.attrs.id)
                }
            })

            transaction.doc.descendants((node, pos) => {
                if (node.type.name === 'heading') {
                    if (headingIds.includes(node.attrs.id)) {
                        doubleHeadingIds.push({
                            node,
                            pos
                        })
                    }
                    headingIds.push(node.attrs.id)
                }

                if (node.type.name === 'figure') {
                    if (figureIds.includes(node.attrs.id)) {
                        doubleFigureIds.push({
                            node,
                            pos
                        })
                    }
                    figureIds.push(node.attrs.id)
                }

            })

            if (!doubleHeadingIds.length && !doubleFigureIds.length) {
                return
            }

            let newTransaction = state.tr
            // Change the IDs of the nodes that having an ID that was used previously
            // already.
            doubleHeadingIds.forEach(doubleId => {
                let node = doubleId.node,
                    posFrom = doubleId.pos,
                    posTo = posFrom + node.nodeSize,
                    blockId

                while (!blockId || headingIds.includes(blockId)) {
                    blockId = randomHeadingId()
                }

                let attrs = {
                    level: node.attrs.level,
                    id: blockId
                }
                // Because we only change attributes, positions should stay the
                // the same throughout all our extra steps. We therefore do no
                // mapping of positions through these steps.

                newTransaction.step(
                    new ReplaceAroundStep(
                        posFrom,
                        posTo,
                        posFrom + 1,
                        posTo - 1,
                        new Slice(Fragment.from(node.type.create(attrs)), 0, 0),
                        1,
                        true
                    )
                )

                headingIds.push(blockId)
            })


            doubleFigureIds.forEach(doubleId => {
                let node = doubleId.node,
                    posFrom = doubleId.pos,
                    posTo = posFrom + node.nodeSize,
                    blockId

                while (!blockId || figureIds.includes(blockId)) {
                    blockId = randomFigureId()
                }

                let attrs = {
                    equation: node.attrs.equation,
                    image: node.attrs.image,
                    figureCategory: node.attrs.figureCategory,
                    caption: node.attrs.caption,
                    id: blockId
                }

                // Because we only change attributes, positions should stay the
                // the same throughout all our extra steps. We therefore do no
                // mapping of positions through these steps.
                newTransaction.step(
                    new ReplaceAroundStep(
                        posFrom,
                        posTo,
                        posFrom + 1,
                        posTo - 1,
                        new Slice(Fragment.from(node.type.create(attrs)), 0, 0),
                        1,
                        true
                    )
                )

                figureIds.push(blockId)
            })

            return newTransaction
        },
        props: {
            onFocus: editorView => {
                let {
					url
				} = linksKey.getState(editorView.state)
                window.history.replaceState("", "", url)
            },
            decorations: (state) => {
                const $head = state.selection.$head
                let linkMark = $head.marks().find(
                    mark => mark.type.name === 'link'
                )
                let anchorMark = $head.marks().find(
                    mark => mark.type.name === 'anchor'
                )
                if (anchorMark && !linkMark) {
                	let startIndex = $head.index()
                	while (
                	startIndex > 0 &&
                	anchorMark.isInSet($head.parent.child(startIndex - 1).marks)
                	)
                	{
                	 	startIndex--
                	 	}
                 let startPos = $head.start() // position of block start.
                	for (let i = 0; i < startIndex; i++) {
                		startPos += $head.parent.child(i).nodeSize
                		}
                	
                		let dom = createLinkDropUp(anchorMark,$head,anchorMark,true)
                		let deco = Decoration.widget(startPos, dom) 
                		                	
                
                return DecorationSet.create(state.doc, [deco])
                }
                
                if (!linkMark) {
                	
                    return
                }

                let startIndex = $head.index()
                while (
                    startIndex > 0 &&
                    linkMark.isInSet($head.parent.child(startIndex - 1).marks)
                ) {
                    startIndex--
                }

                let startPos = $head.start() // position of block start.

                for (let i = 0; i < startIndex; i++) {
                    startPos += $head.parent.child(i).nodeSize
                }

                let dom
                
                if (anchorMark) {
                	dom = createLinkDropUp(linkMark,$head,anchorMark,true,true)	                
                }else{
                	dom = createLinkDropUp(linkMark,$head)
                }


                let deco = Decoration.widget(startPos, dom)
                return DecorationSet.create(state.doc, [deco])

            }
        }
    })
}
