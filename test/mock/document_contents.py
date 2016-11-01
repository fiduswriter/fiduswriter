"""
This is the spec of document-contents, to which the tests will be
restricted.
"""


# OBJECTS
class Contents(list):
    """
    Contents is [BlockContent]
    interpretation: represents the document-contents basic structure


    >>> str(Contents(Paragraph())) == ''.join([
    ...     '{"papersize":"A4","citationstyle":"apa",'
    ...     '"documentstyle":"elephant"},'
    ...     '"content":['
    ...         '{"type":"title"},'
    ...         '{"type":"subtitle","attrs":{"hidden":true}},'
    ...         '{"type":"authors","attrs":{"hidden":true}},'
    ...         '{"type":"abstract","attrs":{"hidden":true},"content":['
    ...             '{"type": "paragraph"}'
    ...         ']},'
    ...         '{"type":"keywords","attrs":{"hidden":true}},'
    ...         '{"type":"body","content":['
    ...              '{"type":"paragraph","content":[]}',
    ...         ']}'
    ...     ']}'
    ... ])
    True
    """

    template = (
        '{"type":"article","attrs":'
        '{"papersize":"A4","citationstyle":"apa","documentstyle":"elephant"},'
        '"content":['
            '{"type":"title"},'
            '{"type":"subtitle","attrs":{"hidden":true}},'
            '{"type":"authors","attrs":{"hidden":true}},'
            '{"type":"abstract","attrs":{"hidden":true},"content":['
                '{"type":"paragraph"}'
            ']},'
            '{"type":"keywords","attrs":{"hidden":true}},'
            '{"type":"body","content":[%s]}'
        ']}'
    )

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


    >>> str(Paragraph()) == Paragraph.template % ('')
    True
    >>> str(Paragraph(
    ...     Text('Yetis are cool.')
    ... )) == Paragraph.template % ','.join([
    ...     Text.template %  dict(contents='Yetis are cool.')
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
    ... ])
    True
    >>> str(Paragraph(Text('x'))) == ''.join([
    ...     '{"type":"paragraph","content":[',
    ...             '{"type:"text","text":"x"},',
    ...     ']}',
    ... ])
    True

    """
    template = '{"type":"paragraph","content":[%s]}'

    def __str__(self):
        return self.template % ','.join([
            str(ic)
            for ic in self
        ])


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
    template = '{"type":"text","text":"%(contents)s"}'

    def __init__(self, contents):
        self.contents = contents


class BoldText(Text):
    """
    BoldText is String
    interpretation: string formatted as bold text
    """
    template = (
        '{"type":"text","marks":[{"type":"strong"}],"text":"%(contents)s"}'
    )


class ItalicText(Text):
    """
    ItalicText is String
    interpretation: string formatted as italic text
    """
    template = '{"type":"text","marks":[{"type":"em"}],"text":"%(contents)s"}'


class Link(FlatInlineContent):
    """
    Link is (String, String, String)
    interpretation: text formatted as a link, referencing the given address
    """
    template = (
        '{"type":"text","marks":[{"type":"link","attrs":{"href":"%(address)s",'
        '"title":"%(title)s"}}],"text":"%(text)s"}'
    )

    def __init__(self, text, address, title):
        self.text = text
        self.address = address
        self.title = title

    def __str__(self):
        return self.template % self.__dict__


class BoldLink(FlatInlineContent):
    """
    BoldLink is (String, String, String)
    interpretation: bold text formatted as a link, referencing
    the given address
    """
    template = (
        '{"type":"text","marks":[{"type":"strong"},'
        '{"type":"link","attrs":{"href":"%(address)s","title":"%(title)s"}}],'
        '"text":"%(text)s"}'
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
    template = (
        '{"type":"footnote","attrs":{"footnote":[{"type":"paragraph",'
        '"content":[{"type":"text","text":"%(text)s"}]}]}}'
    )

    def __init__(self, text):
        self.text = text


class Citation(FlatInlineContent):
    """
    Citation is (Integer, String, String)
    interpretation: reference to a bibliography entry
    """
    template = (
        '{"type":"citation","attrs":{"bibFormat":"autocite",'
        '"bibEntry":"%(bibliographyId)i","bibBefore":"%(textBefore)s",'
        '"bibPage":"%(page)s"}}'
    )

    def __init__(self, bibliographyId, textBefore, page):
        self.bibliographyId = bibliographyId
        self.textBefore = textBefore
        self.page = page


class Equation(FlatInlineContent):
    """
    Equation is String
    interpretation: formula string formatted as an equation
    """
    template = (
        '{"type":"equation","attrs":{"equation":"%(formula)s"}}'
    )

    def __init__(self, formula):
        self.formula = formula


class Comment(FlatInlineContent):
    """
    Comment is [FlatInlineContent]
    interpretation: list of FlatInlineContent formatted as commented, with
                    associated comment data
    """
    template = (
        '{"type":"text","marks":[{"type":"comment",'
        '"attrs":{"id":%(dataId)s}}],"text":"%(contents)s"}'
    )

    def __init__(self, _id, dataId, contents):
        self.id = _id
        self.dataId = dataId
        self.contents = contents
