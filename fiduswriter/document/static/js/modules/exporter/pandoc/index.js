// Sample Fidus Writer JSON input
const fidusData =
{
    "type": "article",
    "attrs": {
        "template": "Standard Article",
        "import_id": "standard-article",
        "documentstyle": "elephant"
    },
    "content": [{
        "type": "title",
        "content": [{
            "text": "The title of the document",
            "type": "text",
            "marks": [{
                "type": "insertion",
                "attrs": {
                    "date": 28194510,
                    "user": 1,
                    "username": "jw"
                }
            }]
        }]
    }, {
        "type": "heading_part",
        "attrs": {
            "id": "subtitle",
            "marks": ["strong", "em", "link"],
            "title": "Subtitle",
            "initial": [{
                "type": "heading1",
                "attrs": {
                    "id": "H3465720"
                }
            }],
            "metadata": "subtitle",
            "optional": "hidden"
        },
        "content": [{
            "type": "heading1",
            "attrs": {
                "id": "H2845406"
            },
            "content": [{
                "text": "The subtitle",
                "type": "text",
                "marks": [{
                    "type": "insertion",
                    "attrs": {
                        "date": 28194510,
                        "user": 1,
                        "username": "jw"
                    }
                }]
            }]
        }]
    }, {
        "type": "contributors_part",
        "attrs": {
            "id": "authors",
            "title": "Authors",
            "metadata": "authors",
            "optional": "hidden",
            "item_title": "Author"
        },
        "content": [{
            "type": "contributor",
            "attrs": {
                "email": "j@rv.no",
                "lastname": "Wilm",
                "firstname": "Johannes",
                "institution": "University of Florida"
            },
            "marks": [{
                "type": "insertion",
                "attrs": {
                    "date": 28194510,
                    "user": 1,
                    "username": "jw"
                }
            }]
        }]
    }, {
        "type": "richtext_part",
        "attrs": {
            "id": "abstract",
            "marks": ["strong", "em", "link"],
            "title": "Abstract",
            "elements": ["paragraph", "heading1", "heading2", "heading3", "heading4", "heading5", "heading6", "figure", "ordered_list", "bullet_list", "horizontal_rule", "equation", "citation", "cross_reference", "blockquote", "footnote", "table"],
            "metadata": "abstract",
            "optional": "hidden"
        },
        "content": [{
            "type": "paragraph",
            "content": [{
                "text": "This is the abstract of the document.",
                "type": "text",
                "marks": [{
                    "type": "insertion",
                    "attrs": {
                        "date": 28194510,
                        "user": 1,
                        "username": "jw"
                    }
                }]
            }]
        }]
    }, {
        "type": "tags_part",
        "attrs": {
            "id": "keywords",
            "title": "Keywords",
            "metadata": "keywords",
            "optional": "hidden",
            "item_title": "Keyword"
        },
        "content": [{
            "type": "tag",
            "attrs": {
                "tag": "Keyword 1"
            },
            "marks": [{
                "type": "insertion",
                "attrs": {
                    "date": 28194510,
                    "user": 1,
                    "username": "jw"
                }
            }]
        }, {
            "type": "tag",
            "attrs": {
                "tag": "Keyword 2"
            },
            "marks": [{
                "type": "insertion",
                "attrs": {
                    "date": 28194510,
                    "user": 1,
                    "username": "jw"
                }
            }]
        }, {
            "type": "tag",
            "attrs": {
                "tag": "Keyword 3"
            },
            "marks": [{
                "type": "insertion",
                "attrs": {
                    "date": 28194510,
                    "user": 1,
                    "username": "jw"
                }
            }]
        }]
    }, {
        "type": "richtext_part",
        "attrs": {
            "id": "body",
            "marks": ["strong", "em", "link"],
            "title": "Body",
            "elements": ["paragraph", "heading1", "heading2", "heading3", "heading4", "heading5", "heading6", "figure", "ordered_list", "bullet_list", "horizontal_rule", "equation", "citation", "cross_reference", "blockquote", "footnote", "table"]
        },
        "content": [{
            "type": "paragraph",
            "content": [{
                "text": "And this is the body.",
                "type": "text",
                "marks": [{
                    "type": "insertion",
                    "attrs": {
                        "date": 26393570,
                        "user": 1,
                        "username": "jw"
                    }
                }]
            }]
        }, {
            "type": "figure",
            "attrs": {
                "id": "F10024511",
                "width": "50",
                "caption": true,
                "category": "figure"
            },
            "content": [{
                "type": "image",
                "attrs": {
                    "image": 769
                }
            }, {
                "type": "figure_caption",
                "content": [{
                    "text": "This is a figure showing a person.",
                    "type": "text",
                    "marks": [{
                        "type": "insertion",
                        "attrs": {
                            "date": 28194510,
                            "user": 1,
                            "username": "jw"
                        }
                    }]
                }]
            }]
        }, {
            "type": "ordered_list",
            "attrs": {
                "id": "L00001747"
            },
            "content": [{
                "type": "list_item",
                "content": [{
                    "type": "paragraph",
                    "content": [{
                        "text": "lalal",
                        "type": "text",
                        "marks": [{
                            "type": "insertion",
                            "attrs": {
                                "date": 26395540,
                                "user": 1,
                                "username": "jw"
                            }
                        }]
                    }, {
                        "text": "DADA",
                        "type": "text",
                        "marks": [{
                            "type": "insertion",
                            "attrs": {
                                "date": 26395540,
                                "user": 1,
                                "approved": false,
                                "username": "jw"
                            }
                        }]
                    }, {
                        "text": "mum",
                        "type": "text",
                        "marks": [{
                            "type": "insertion",
                            "attrs": {
                                "date": 26395540,
                                "user": 1,
                                "username": "jw"
                            }
                        }]
                    }]
                }]
            }, {
                "type": "list_item",
                "content": [{
                    "type": "paragraph",
                    "content": [{
                        "text": "two",
                        "type": "text",
                        "marks": [{
                            "type": "insertion",
                            "attrs": {
                                "date": 26556280,
                                "user": 1,
                                "username": "jw"
                            }
                        }]
                    }, {
                        "text": " iz a ",
                        "type": "text",
                        "marks": [{
                            "type": "insertion",
                            "attrs": {
                                "date": 27953960,
                                "user": 1,
                                "username": "jw"
                            }
                        }]
                    }, {
                        "text": "goood",
                        "type": "text",
                        "marks": [{
                            "type": "link",
                            "attrs": {
                                "href": "https://www.sports.com",
                                "title": "A link to sports.com"
                            }
                        }, {
                            "type": "insertion",
                            "attrs": {
                                "date": 27953960,
                                "user": 1,
                                "username": "jw"
                            }
                        }]
                    }, {
                        "text": " number. ",
                        "type": "text",
                        "marks": [{
                            "type": "insertion",
                            "attrs": {
                                "date": 27953960,
                                "user": 1,
                                "username": "jw"
                            }
                        }]
                    }]
                }]
            }, {
                "type": "list_item",
                "content": [{
                    "type": "paragraph",
                    "content": [{
                        "text": "thre",
                        "type": "text",
                        "marks": [{
                            "type": "strong"
                        }, {
                            "type": "insertion",
                            "attrs": {
                                "date": 26556280,
                                "user": 1,
                                "username": "jw"
                            }
                        }]
                    }, {
                        "text": "e",
                        "type": "text",
                        "marks": [{
                            "type": "insertion",
                            "attrs": {
                                "date": 26556280,
                                "user": 1,
                                "username": "jw"
                            }
                        }]
                    }]
                }, {
                    "type": "bullet_list",
                    "attrs": {
                        "id": "L00001748"
                    },
                    "content": [{
                        "type": "list_item",
                        "content": [{
                            "type": "paragraph",
                            "content": [{
                                "text": "b",
                                "type": "text",
                                "marks": [{
                                    "type": "insertion",
                                    "attrs": {
                                        "date": 26556280,
                                        "user": 1,
                                        "username": "jw"
                                    }
                                }]
                            }, {
                                "text": "ulle",
                                "type": "text",
                                "marks": [{
                                    "type": "em"
                                }, {
                                    "type": "insertion",
                                    "attrs": {
                                        "date": 26556280,
                                        "user": 1,
                                        "username": "jw"
                                    }
                                }]
                            }, {
                                "text": "t",
                                "type": "text",
                                "marks": [{
                                    "type": "insertion",
                                    "attrs": {
                                        "date": 26556280,
                                        "user": 1,
                                        "username": "jw"
                                    }
                                }]
                            }]
                        }]
                    }]
                }]
            }]
        }, {
            "type": "bullet_list",
            "attrs": {
                "id": "L00001749"
            },
            "content": [{
                "type": "list_item",
                "content": [{
                    "type": "paragraph",
                    "content": [{
                        "text": "bullet",
                        "type": "text",
                        "marks": [{
                            "type": "insertion",
                            "attrs": {
                                "date": 26556280,
                                "user": 1,
                                "username": "jw"
                            }
                        }]
                    }]
                }]
            }]
        }, {
            "type": "ordered_list",
            "attrs": {
                "id": "L00001750"
            },
            "content": [{
                "type": "list_item",
                "content": [{
                    "type": "paragraph",
                    "content": [{
                        "text": "one",
                        "type": "text",
                        "marks": [{
                            "type": "insertion",
                            "attrs": {
                                "date": 26556280,
                                "user": 1,
                                "username": "jw"
                            }
                        }]
                    }]
                }]
            }, {
                "type": "list_item",
                "content": [{
                    "type": "paragraph",
                    "content": [{
                        "text": "two",
                        "type": "text",
                        "marks": [{
                            "type": "insertion",
                            "attrs": {
                                "date": 26556280,
                                "user": 1,
                                "username": "jw"
                            }
                        }]
                    }]
                }]
            }, {
                "type": "list_item",
                "content": [{
                    "type": "paragraph",
                    "content": [{
                        "text": "three",
                        "type": "text",
                        "marks": [{
                            "type": "insertion",
                            "attrs": {
                                "date": 26556280,
                                "user": 1,
                                "username": "jw"
                            }
                        }]
                    }, {
                        "text": " ",
                        "type": "text",
                        "marks": [{
                            "type": "insertion",
                            "attrs": {
                                "date": 28194510,
                                "user": 1,
                                "username": "jw"
                            }
                        }]
                    }, {
                        "type": "citation",
                        "attrs": {
                            "references": [{
                                "id": 55244,
                                "prefix": "for example",
                                "locator": "34"
                            }]
                        },
                        "marks": [{
                            "type": "insertion",
                            "attrs": {
                                "date": 28194510,
                                "user": 1,
                                "username": "jw"
                            }
                        }]
                    }]
                }]
            }]
        }, {
            "type": "paragraph"
        }, {
            "type": "paragraph",
            "content": [{
                "text": "This is a text that is followed by a footnote.",
                "type": "text",
                "marks": [{
                    "type": "insertion",
                    "attrs": {
                        "date": 28194510,
                        "user": 1,
                        "username": "jw"
                    }
                }]
            }, {
                "type": "footnote",
                "attrs": {
                    "footnote": [{
                        "type": "paragraph",
                        "attrs": {
                            "track": []
                        },
                        "content": [{
                            "text": "This is a footnote.",
                            "type": "text",
                            "marks": [{
                                "type": "insertion",
                                "attrs": {
                                    "date": 28194510,
                                    "user": 1,
                                    "approved": true,
                                    "username": "jw"
                                }
                            }]
                        }]
                    }]
                },
                "marks": [{
                    "type": "insertion",
                    "attrs": {
                        "date": 28194510,
                        "user": 1,
                        "username": "jw"
                    }
                }]
            }]
        }, {
            "type": "heading3",
            "attrs": {
                "id": "H5841327"
            },
            "content": [{
                "text": "A headline of level 3",
                "type": "text",
                "marks": [{
                    "type": "insertion",
                    "attrs": {
                        "date": 28194510,
                        "user": 1,
                        "username": "jw"
                    }
                }]
            }]
        }, {
            "type": "blockquote",
            "content": [{
                "type": "paragraph",
                "content": [{
                    "text": "Here is a block quote",
                    "type": "text",
                    "marks": [{
                        "type": "insertion",
                        "attrs": {
                            "date": 28194510,
                            "user": 1,
                            "username": "jw"
                        }
                    }]
                }]
            }]
        }, {
            "type": "table",
            "attrs": {
                "id": "T53655251"
            },
            "content": [{
                "type": "table_caption"
            }, {
                "type": "table_body",
                "content": [{
                    "type": "table_row",
                    "content": [{
                        "type": "table_cell",
                        "content": [{
                            "type": "paragraph",
                            "content": [{
                                "text": "Table cell 1",
                                "type": "text",
                                "marks": [{
                                    "type": "insertion",
                                    "attrs": {
                                        "date": 28194510,
                                        "user": 1,
                                        "username": "jw"
                                    }
                                }]
                            }]
                        }]
                    }, {
                        "type": "table_cell",
                        "content": [{
                            "type": "paragraph",
                            "content": [{
                                "text": "Table cell 2",
                                "type": "text",
                                "marks": [{
                                    "type": "insertion",
                                    "attrs": {
                                        "date": 28194510,
                                        "user": 1,
                                        "username": "jw"
                                    }
                                }]
                            }]
                        }]
                    }]
                }, {
                    "type": "table_row",
                    "content": [{
                        "type": "table_cell",
                        "attrs": {
                            "colspan": 2
                        },
                        "content": [{
                            "type": "paragraph",
                            "content": [{
                                "text": "Merged table cells 3 and 4 in the middle",
                                "type": "text",
                                "marks": [{
                                    "type": "insertion",
                                    "attrs": {
                                        "date": 28194510,
                                        "user": 1,
                                        "username": "jw"
                                    }
                                }]
                            }]
                        }]
                    }]
                }, {
                    "type": "table_row",
                    "content": [{
                        "type": "table_cell",
                        "content": [{
                            "type": "paragraph",
                            "content": [{
                                "text": "Table cell 5",
                                "type": "text",
                                "marks": [{
                                    "type": "insertion",
                                    "attrs": {
                                        "date": 28194510,
                                        "user": 1,
                                        "username": "jw"
                                    }
                                }]
                            }]
                        }]
                    }, {
                        "type": "table_cell",
                        "content": [{
                            "type": "paragraph",
                            "content": [{
                                "text": "Table cell 6",
                                "type": "text",
                                "marks": [{
                                    "type": "insertion",
                                    "attrs": {
                                        "date": 28194510,
                                        "user": 1,
                                        "username": "jw"
                                    }
                                }]
                            }]
                        }]
                    }]
                }]
            }]
        }]
    }]
}

const fidusWriterSettings = {
    "documentstyle": "elephant",
    "tracked": false,
    "citationstyle": "apa",
    "citationstyles": ["american-anthropological-association", "apa", "chicago-author-date", "chicago-note-bibliography", "harvard-cite-them-right", "modern-language-association", "nature", "oxford-university-press-humsoc"],
    "language": "en-US",
    "languages": ["af-ZA", "sq-AL", "ar", "ast", "be", "br", "bg", "ca", "ca-ES-Valencia", "zh-CN", "da", "nl", "en-AU", "en-CA", "en-NZ", "en-ZA", "en-GB", "en-US", "eo", "fr", "gl", "de-DE", "de-AU", "de-CH", "el", "he", "is", "it", "ja", "km", "lt", "ml", "nb-NO", "nn-NO", "fa", "pl", "pt-BR", "pt-PT", "ro", "ru", "tr", "sr-SP-Cy", "sr-SP-Lt", "sk", "sl", "es", "sv", "ta", "tl", "uk"],
    "papersize": "A4",
    "papersizes": ["A4", "US Letter"],
    "footnote_marks": ["strong", "em", "link"],
    "footnote_elements": ["paragraph", "heading1", "heading2", "heading3", "heading4", "heading5", "heading6", "figure", "ordered_list", "bullet_list", "horizontal_rule", "equation", "citation", "cross_reference", "blockquote", "table"],
    "bibliography_header": {},
    "template": "Standard Article",
    "import_id": "standard-article",
    "copyright": {
        "holder": false,
        "year": false,
        "freeToRead": true,
        "licenses": []
    }
}

const imageDB =
{"769": {"id": 769, "title": "", "copyright": {"year": false, "holder": false, "licenses": [], "freeToRead": true}, "image": "/media/images/7fe1d07a-2f6c-48ed-8842-23a0e21d204d.jpg", "file_type": "image/jpeg", "added": 1583614346000, "checksum": 41795681583614344, "cats": [], "thumbnail": "/media/image_thumbnails/IMG_20191016_221605_thumbnail.jpg", "height": 4000, "width": 3000}}

// Initialize Pandoc JSON structure
const pandocData = {
    "pandoc-api-version": [1, 23, 1],
    meta: {
        lang: {"t": "MetaInlines", "c": [{"t": "Str", "c": fidusWriterSettings.language.split("-")[0]}]}
    },
    blocks: []
}

// Mapping between Fidus Writer elements and Pandoc elements
const elementMapping = {
    blockquote: "BlockQuote",
    bullet_list: "BulletList",
    contributors_part: "Div",
    heading_part: "Header",
    list_item: "ListItem",
    ordered_list: "OrderedList",
    paragraph: "Para",
    table: "Div",
}

function convertText(text) {
    const textContent = []
    if (!text.length) {
        return []
    }
    const words = text.trim().split(" ")
    words.forEach((c, index) => {
        textContent.push({
            t: "Str",
            c
        })
        if (index < words.length - 1) {
            textContent.push({
                t: "Space"
            })
        }
    })
    return textContent
}

function convertContributor(contributor) {
    const contributorContent = []
    if (contributor.firstname || contributor.lastname) {
        const nameParts = []
        if (contributor.lastname) {
            nameParts.push(contributor.lastname)
        }
        if (contributor.firstname) {
            nameParts.push(contributor.firstname)
        }
        contributorContent.push(...convertText(nameParts.join(" ")))
    } else if (contributor.institution) {
        contributorContent.push(...convertText(contributor.institution))
    }
    if (contributor.email) {
        contributorContent.push({
            "t": "Note",
            "c": [{
                "t": "Para",
                "c": [convertText(contributor.email)]
            }]
        })
    }
    return contributorContent.length ? {t: "MetaInlines", c: contributorContent} : false
}

// Function to convert Fidus Writer content to Pandoc format
function convertContent(fidusContent) {
    const pandocContent = []
    for (const node of fidusContent) {
        const pandocElement = {}
        switch (node.type) {
        case "contributors_part": {
            if (node.attrs.metadata === "authors") {
                if (!pandocData.meta.author) {
                    pandocData.meta.author = {t: "MetaList", c: []}
                }
                const convertedContributors = node.content.map(contributor => convertContributor(contributor.attrs)).filter(convertedContributor => convertedContributor)
                pandocData.meta.author.c.push(...convertedContributors)
            } else {
                pandocElement.t = "Para"
                const contributorText = node.content.map(contributor => `${contributor.attrs.firstname} ${contributor.attrs.lastname}, ${contributor.attrs.institution}, ${contributor.attrs.email}`).join("; ")
                pandocElement.c = convertText(contributorText)
            }
            break
        }
        case "heading_part":
        {
            if (node.attrs?.metadata === "subtitle" && !pandocData.meta.subtitle) {
                pandocData.meta.subtitle = {
                    t: "MetaInlines",
                    c: []
                }
                pandocData.meta.subtitle.c.push(...convertContent(node.content))
            } else {
                pandocElement.t = "Header"
                pandocElement.c = [2, [node.attrs?.metadata || "", [], []]]
            }
            break
        }
        case "figure":
        {
            const image = node.content.find(node => node.type === "image")?.attrs.image || false
            const caption = node.attrs.caption ? node.content.find(node => node.type === "figure_caption")?.content || [] : []
            if (image !== false) {
                const imageDBEntry = imageDB[image],
                    filePathName = imageDBEntry.image
                //const copyright = imageDBEntry.copyright
                const imageFilename = filePathName.split("/").pop()
                const c = [
                    ["", [], []],
                    convertContent(caption),
                    [imageFilename, node.attrs.category || ""]
                ]
                pandocContent.push({
                    t: "Para",
                    c: [{
                        t: "Image",
                        c
                    }]
                })
            }
            // TODO: equation figure and figure attributes like 50% with, etc.
            break
        }
        case "footnote":
        {
            const c = []
            pandocContent.push({
                t: "Note",
                c
            })
            c.push(...convertContent(node.attrs.footnote))
            break
        }
        case "heading1":
        case "heading2":
        case "heading3":
        case "heading4":
        case "heading5":
        case "heading6":
        {
            const level = parseInt(node.type.slice(-1))
            pandocElement.t = "Header"
            pandocElement.c = [level, ["", [], []]]
            break
        }
        case "richtext_part": {
            if (node.attrs?.metadata === "abstract" && !pandocData.meta.abstract) {
                pandocData.meta.abstract = {
                    t: "MetaBlocks",
                    c: []
                }
                pandocData.meta.abstract.c.push(...convertContent(node.content))
            } else {
                pandocElement.t = "Div"
            }
            break
        }
        case "tags_part": {
            const c = []
            pandocContent.push({
                t: "Para",
                c
            })
            c.push(...convertText(node.content.map(tag => tag.attrs.tag).join("; ")))
            break
        }
        case "text": {
            if (node.text) {
                let containerContent = pandocContent
                let strong, em, underline, hyperlink
                if (node.marks) {
                    strong = node.marks.find(mark => mark.type === "strong")
                    em = node.marks.find(mark => mark.type === "em")
                    underline = node.marks.find(mark => mark.type === "underline")
                    hyperlink = node.marks.find(mark => mark.type === "link")
                }
                if (em) {
                    const c = []
                    containerContent.push({
                        t: "Emph",
                        c
                    })
                    containerContent = c
                }
                if (strong) {
                    const c = []
                    containerContent.push({
                        t: "Strong",
                        c
                    })
                    containerContent = c
                }
                if (underline) {
                    const c = []
                    containerContent.push({
                        t: "Underline",
                        c
                    })
                    containerContent = c
                }
                if (hyperlink) {
                    const c = []
                    containerContent.push({
                        t: "Link",
                        c
                    })
                    containerContent = c
                }
                containerContent.push([].concat(convertText(node.text)))
                if (hyperlink) {
                    // link address is added at end of content
                    containerContent.push([hyperlink.attrs.href, ""])
                }

            }
            break
        }
        case "title": {
            if (!pandocData.meta.title) {
                pandocData.meta.title = {
                    t: "MetaInlines",
                    c: []
                }
                pandocData.meta.title.c.push(...convertContent(node.content))
            } else {
                pandocElement.t = "Header"
                pandocElement.c = [1, ["title", [], []]]
            }
            break
        }
        default: {
            const elementType = node.type
            pandocElement.t = elementMapping[elementType] || elementType
            // if (node.attrs) {
            //   pandocElement.c = [node.attrs] // Wrap attributes in an array
            // }
            break
        }
        }
        if (pandocElement.t) {
            if (node.content) {
                pandocElement.c = pandocElement.c || []
                pandocElement.c.push(...convertContent(node.content))
            }
            pandocContent.push(pandocElement)
        } else if (!ignoreContent) {

        }
    }
    return pandocContent
}

pandocData.blocks = convertContent(fidusData.content)

// Convert Pandoc data to JSON and log
const pandocJson = JSON.stringify(pandocData, null, 4)
console.log(pandocJson)
