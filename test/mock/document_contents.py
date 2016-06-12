"""
This is the *assumed* spec of document-contents, to which the tests will be
restricted.
"""

# CONSTANTS
BR_ELEM_STRING = '{"nn":"BR"}'


# OBJECTS
class Contents(list):
    """
    Contents is [BlockContent]
    interpretation: represents the document-contents element


    >>> str(Contents(Paragraph())) == ''.join([
    ...     '{"nn":"DIV","a":[["id","document-contents"]],"c":[',
    ...         '{"nn":"P","c":[',
    ...             '{"nn":"BR"}',
    ...         ']}',
    ...     ']}',
    ... ])
    True
    """
    # template = '{"nn":"DIV","a":[["id","document-contents"]],"c":[%s]}'
    template = ''.join([
        '{"nn":"DIV",',
        '"a":[',
        '["id","document-contents"]',
        '],',
        '"c":[%s]',
        '}',
    ])

    def __init__(self, *manyBlockContents):
        for b in manyBlockContents:
            assert isinstance(b, BlockContent)
        super(Contents, self).__init__(manyBlockContents)

    def __str__(self):
        return self.template % ','.join([
            str(bc)
            for bc in self
        ])


class BlockContent(object):
    """
    BlockContent is one of:
    - Paragraph
    - Headline
    - Quote
    - Code
    - NumberedList
    - BulletedList
    - Figure
    interpretation: superset type of types which can be direct children of
                    document-contents
    """
    pass


class ListOfInlineContent(list):

    def __init__(self, *manyInlineContents):
        for i in manyInlineContents:
            assert isinstance(i, InlineContent)
        super(ListOfInlineContent, self).__init__(manyInlineContents)

    def getChildrenString(self):
        return ','.join([
            str(ic)
            for ic in self
        ])


class Paragraph(BlockContent, ListOfInlineContent):
    """
    Paragraph is [InlineContent]
    interpretation: paragraph of text and other inline content


    >>> str(Paragraph()) == Paragraph.template % (BR_ELEM_STRING)
    True
    >>> str(Paragraph(
    ...     Text('Yetis are cool.')
    ... )) == Paragraph.template % ','.join([
    ...     Text.template %  dict(contents='Yetis are cool.'),
    ...     BR_ELEM_STRING
    ... ])
    True
    >>> str(Paragraph(
    ...     Equation('f(x) = x^2'),
    ...     BoldText('Nemo enim ipsam voluptatem quia voluptas,'),
    ...     Footnote('latin'),
    ...     ItalicText('sed quia consequuntur magni dolores.'),
    ...     Footnote('also latin'),
    ...     Text('This was taken from'),
    ...     Citation(0, '', '122'),
    ...     Link(text='about', address='/about/', title='About'),
    ... )) == Paragraph.template % ','.join([
    ...     Equation.template %  dict(formula='f(x) = x^2'),
    ...     BoldText.template
    ... %  dict(contents='Nemo enim ipsam voluptatem quia voluptas,'),
    ...     Footnote.template %  dict(text='latin'),
    ...     ItalicText.template
    ... %  dict(contents='sed quia consequuntur magni dolores.'),
    ...     Footnote.template %  dict(text='also latin'),
    ...     Text.template %  dict(contents='This was taken from'),
    ...     Citation.template
    ... %  dict(bibliographyId=0, textBefore='', page='122'),
    ...     Link.template
    ... %  dict(text='about', address='/about/', title='About'),
    ...     BR_ELEM_STRING,
    ... ])
    True
    >>> str(Paragraph(Text('x'))) == ''.join([
    ...     '{"nn":"P","c":[',
    ...             '{"t":"x"},',
    ...             '{"nn":"BR"}',
    ...     ']}',
    ... ])
    True

    """
    template = '{"nn":"P","c":[%s]}'

    def __str__(self):
        return self.template % ','.join([
            str(ic)
            for ic in self
        ] + [BR_ELEM_STRING])


class Headline(BlockContent, ListOfInlineContent):
    """
    Headline is [InlineContent]
    interpretation: text and other inline content styled as a headline
    """
    # !!! ignoring the subtypes of headline
    pass


class Quote(BlockContent, ListOfInlineContent):
    """
    Quote is [InlineContent]
    interpretation: text and other inline content styled as a block quote
    """
    pass


class Code(BlockContent, ListOfInlineContent):
    """
    Code is [InlineContent]
    interpretation: text and other inline content styled as code
    """
    pass


class ListBlock(list):
    """
    ListBlock is [ListItem]
    interpretation: base class of NumberedList and BulletedList
    """

    def __init__(self, *manyListItems):
        for li in manyListItems:
            assert isinstance(li, ListItem)
        super(ListBlock, self).__init__(manyListItems)


class ListItem(ListOfInlineContent):
    """
    ListItem is [InlineContent]
    interpretation: inline content formatted as an item in the parent list
    """
    pass


class NumberedList(BlockContent, ListBlock):
    """
    NumberedList is ListBlock
    interpretation: inline content organized into items and styled as a
                    numbered list
    """
    pass


class BulletedList(BlockContent, ListBlock):
    """
    BulletedList is ListBlock
    interpretation: inline content organized into items and styled as a
                    bulleted list
    """
    pass


class Figure(BlockContent):
    """
    Figure is ...
    interpretation: ...
    !!!
    """
    pass


class InlineContent(object):
    """
    InlineContent is one of:
    - FlatInlineContent
    - Comment
    interpretation: set of all types which can be children of a block element
    """
    pass


class FlatInlineContent(InlineContent):
    """
    FlatInlineContent is one of:
    - Text
    - BoldText
    - ItalicText
    - Link
    - Footnote
    - Citation
    - Equation
    interpretation: set of all InlineContent types which have a fixed number of
                    children
    """

    def __str__(self):
        return self.template % self.__dict__


class Text(FlatInlineContent):
    """
    Text is String
    interpretation: string without formatting
    """
    template = '{"t":"%(contents)s"}'

    def __init__(self, t):
        self.contents = t


class Bold(InlineContent, ListOfInlineContent):
    """
    Bold is [InlineContent]
    interpretation: inline content formatted as bold text
    """
    template = '{"nn":"B","c":[%s]}'

    def __str__(self):
        return self.template % ','.join([
            str(ic)
            for ic in self
        ])


class BoldText(Text):
    """
    BoldText is String
    interpretation: string formatted as bold text
    """
    template = '{"nn":"STRONG","c":[{"t":"%(contents)s"}]}'


class ItalicText(Text):
    """
    ItalicText is String
    interpretation: string formatted as italic text
    """
    template = '{"nn":"EM","c":[{"t":"%(contents)s"}]}'


class Link(FlatInlineContent):
    """
    Link is (String, String, String)
    interpretation: text formatted as a link, referencing the given address
    """
    template = (
        '{"nn":"A","a":[["href","%(address)s"],["title","%(title)s"]],'
        '"c":[{"t":"%(text)s"}]}'
    )

    def __init__(self, text, address, title):
        self.text = text
        self.address = address
        self.title = title

    def __str__(self):
        return self.template % self.__dict__


class Footnote(FlatInlineContent):
    """
    Footnote is String
    interpretation: string formatted as reference symbol and footnote
    """
    template = ''.join([
        '{"nn":"SPAN", "a":[["class","footnote"]], "c":[',
        '{"t":"%(text)s"},',
        '{"nn":"BR"}',
        ']}',
    ])

    def __init__(self, text):
        self.text = text


class Citation(FlatInlineContent):
    """
    Citation is (Integer, String, String)
    interpretation: reference to a bibliography entry
    """
    template = ''.join([
        '{"nn":"SPAN","a":[',
        '["class","citation"],',
        '["data-bib-entry","%(bibliographyId)i"],',
        '["data-bib-before","%(textBefore)s"],',
        '["data-bib-page","%(page)s"],',
        '["data-bib-format","autocite"]',
        ']}'
    ])

    def __init__(self, bibliographyId, textBefore, page):
        self.bibliographyId = bibliographyId
        self.textBefore = textBefore
        self.page = page


class Equation(FlatInlineContent):
    """
    Equation is String
    interpretation: formula string formatted as an equation
    """
    template = ''.join([
        '{"nn":"SPAN","a":[',
        '["class","equation"],',
        '["data-equation","%(formula)s"]',
        ']}',
    ])

    def __init__(self, formula):
        self.formula = formula


class Comment(InlineContent, ListOfInlineContent):
    """
    Comment is [FlatInlineContent]
    interpretation: list of FlatInlineContent formatted as commented, with
                    associated comment data
    """
    template = ''.join([
        '{"nn":"SPAN",',
        '"a":[',
        '["class","comment"],',
        '["data-id","%(dataId)s"],',
        '],',
        '"c":[%(children)s]',
        '}',
    ])

    def __init__(self, _id, dataId, *children):
        self.id = _id
        self.dataId = dataId
        super(Comment, self).__init__(*children)

    def __str__(self):
        return self.template % dict(
            self.__dict__,
            children=self.getChildrenString()
        )
