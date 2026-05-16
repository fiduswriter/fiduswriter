# Export Templates

Fidus Writer can export documents to Microsoft Word (DOCX) and LibreOffice (ODT) format using custom templates. A template is an ordinary DOCX or ODT file that contains special placeholder tags. When you export a document, Fidus Writer replaces these tags with the actual content from your document.

This guide explains how to write and use these templates.

---

## Getting Started

1. Create a document in Microsoft Word or LibreOffice Writer that looks the way you want your exported documents to look.
2. Add placeholder tags (see below) where Fidus Writer should insert content.
3. Save the file as DOCX or ODT.
4. In Fidus Writer, go to the template manager and upload your template file.

---

## Basic Tags

The simplest placeholders are written inside curly braces. Fidus Writer replaces them with the corresponding document content.

| Tag | What it inserts |
|-----|----------------|
| `{title}` | The document title |
| `{authors}` | All authors (as a simple list) |
| `{editors}` | All editors (if configured in the document template) |
| `{translators}` | All translators (if configured) |
| `{reviewers}` | All reviewers (if configured) |
| `{contributors}` | All contributors (if configured) |
| `{keywords}` | The document keywords |

In addition to the tags above, any heading or contributor block that you defined in your document template can be used as a tag. For example, if you created a heading block called `abstract`, you can use `{abstract}` in your export template.

Special blocks use the `@` prefix:

| Tag | What it inserts |
|-----|----------------|
| `@bibliography` | The bibliography / reference list |
| `@copyright` | Copyright notice block |
| `@licenses` | License block |

---

## Format Strings

If you need more control over how authors, editors, or keywords are displayed, use a **format string**.

### Syntax

```
{tag:format=FORMAT_STRING|DELIMITER}
```

- **FORMAT_STRING** — Defines how each item is displayed. Use field placeholders like `%firstname`, `%lastname`, etc.
- **DELIMITER** — Defines what is placed between items. Can be any text.

### Available Fields

| Field | Meaning |
|-------|---------|
| `%firstname` | First name |
| `%lastname` | Last name |
| `%institution` | Institution |
| `%email` | Email address |
| `%id_type` | ID type (for example "ORCID") |
| `%id_value` | ID value (for example "0000-0001-2345-6789") |
| `%tag` | Tag text (for keywords and other tag lists) |

### Delimiter Special Characters

| Character | Result |
|-----------|--------|
| `\n` | Line break (new line) |
| `\p` | Paragraph break |
| `\t` | Tab |
| anything else | Used literally |

### Examples

**Authors separated by semicolons:**

```
{authors:format=%firstname %lastname|; }
```

Result: `Jane Doe; John Smith; Maria Garcia`

**Authors with institutions:**

```
{authors:format=%lastname, %firstname (%institution)|; }
```

Result: `Doe, Jane (MIT); Smith, John (Harvard)`

**Authors each on a new line:**

```
{authors:format=%firstname %lastname|\n}
```

Result:
```
Jane Doe
John Smith
Maria Garcia
```

**Keywords separated by commas:**

```
{keywords:format=%tag|, }
```

Result: `testing, export, fiduswriter`

---

## Structured Blocks — Loops

When you need to repeat a piece of XML for every author, keyword, or other item, use a **loop block**.

### Syntax

```
{BEGIN_tag}
    ... XML to repeat for each item ...
{END_tag}
```

Inside the loop, use field placeholders (`%firstname`, `%lastname`, etc.) to insert the current item's data.

### Limiting the Number of Items

You can process only the first N items:

```
{BEGIN_tag:limit=N}
    ...
{END_tag}
```

### Examples

**Simple author loop (DOCX):**

```xml
{BEGIN_authors}
<w:p>
  <w:r><w:t>{%firstname} {%lastname}</w:t></w:r>
</w:p>
{END_authors}
```

**Table row with limited authors (DOCX):**

```xml
<w:tr>
  {BEGIN_authors:limit=2}
  <w:tc>
    <w:p><w:r><w:t>{%firstname} {%lastname}</w:t></w:r></w:p>
  </w:tc>
  {END_authors}
  <w:tc>
    <w:p><w:r><w:t>et al.</w:t></w:r></w:p>
  </w:tc>
</w:tr>
```

**Simple author loop (ODT):**

```xml
{BEGIN_authors}
<text:p>{%firstname} {%lastname}</text:p>
{END_authors}
```

---

## Conditionals

You can show or hide parts of a template depending on the document content.

### Syntax

```
{IF(expression)}
    ... content shown when expression is true ...
{ELIF(another_expression)}
    ... content shown when the second expression is true ...
{ELSE}
    ... content shown when nothing above matched ...
{ENDIF}
```

- `{IF(...)}` starts a conditional block.
- `{ELIF(...)}` is optional and can be used multiple times.
- `{ELSE}` is optional and comes last before `{ENDIF}`.
- `{ENDIF}` ends the block.

### Expressions

You can use the following in expressions:

| Expression | Meaning |
|------------|---------|
| `ctx.count` | Number of items (for example, number of authors) |
| `ctx.first` | `true` inside a loop if this is the first item |
| `ctx.last` | `true` inside a loop if this is the last item |
| `ctx.index` | Current item index inside a loop (starts at 0) |
| `tagname.count` | Same as `ctx.count`, but using the tag name directly (for example, `authors.count`) |

Comparison and logical operators:

| Operator | Meaning |
|----------|---------|
| `===` | Equal to |
| `!==` | Not equal to |
| `>` , `<` , `>=` , `<=` | Greater / less than |
| `&&` | And |
| `\|\|` | Or |
| `!` | Not |

### Examples

**Show different text depending on author count:**

```
{IF(authors.count === 1)}
  Single author
{ELIF(authors.count === 2)}
  Two authors
{ELSE}
  Multiple authors
{ENDIF}
```

**First author gets special formatting inside a loop:**

```xml
{BEGIN_authors}
  {IF(ctx.first)}
    <w:p><w:r><w:t>First author: {%firstname} {%lastname}</w:t></w:r></w:p>
  {ELSE}
    <w:p><w:r><w:t>Co-author: {%firstname} {%lastname}</w:t></w:r></w:p>
  {ENDIF}
{END_authors}
```

**Show "et al." only when there are 3 or more authors:**

```xml
<w:tr>
  {BEGIN_authors:limit=2}
  <w:tc>
    <w:p><w:r><w:t>{%firstname} {%lastname}</w:t></w:r></w:p>
  </w:tc>
  {END_authors}
  {IF(authors.count >= 3)}
  <w:tc>
    <w:p><w:r><w:t>et al.</w:t></w:r></w:p>
  </w:tc>
  {ENDIF}
</w:tr>
```

---

## Complete Example: Author Table (DOCX)

This example shows a table row that adapts its layout to the number of authors:

```xml
{IF(authors.count === 1)}
  <w:tr>
    <w:tc>
      <w:tcPr><w:gridSpan w:val="3"/></w:tcPr>
      <w:p><w:r><w:t>{%firstname} {%lastname}</w:t></w:r></w:p>
      <w:p><w:r><w:t>{%institution}</w:t></w:r></w:p>
    </w:tc>
  </w:tr>
{ELIF(authors.count === 2)}
  <w:tr>
    <w:tc><w:p><w:r><w:t>{%firstname} {%lastname}</w:t></w:r></w:p></w:tc>
    <w:tc><w:p><w:r><w:t>{%firstname} {%lastname}</w:t></w:r></w:p></w:tc>
  </w:tr>
{ELIF(authors.count >= 3)}
  <w:tr>
    {BEGIN_authors:limit=2}
    <w:tc><w:p><w:r><w:t>{%firstname} {%lastname}</w:t></w:r></w:p></w:tc>
    {END_authors}
    <w:tc><w:p><w:r><w:t>et al.</w:t></w:r></w:p></w:tc>
  </w:tr>
{ENDIF}
```

*Note: In a real template you would place the conditional inside a table in your Word document. The exact XML structure depends on how the table was created.*

---

## Tips

1. **Start simple.** Use basic tags like `{title}` and `{authors}` first. Add format strings and loops only when you need more control.

2. **Use Word or LibreOffice to create the structure.** Write your loops and conditionals inside an existing table or paragraph that you created visually. Then switch to the XML if needed.

3. **Test with sample documents.** Upload your template and check the "Found tags" and "Missing tags" indicators in the template manager. They detect tags in all forms: simple `{tag}`, format strings `{tag:format=...}`, loops `{BEGIN_tag}`, and conditionals `{IF(tag...)}`.

4. **Keep backups.** Save your original DOCX/ODT file before adding template syntax, so you can easily revert.

5. **Field placeholders only work inside loops.** `%firstname`, `%lastname`, etc. are meant to be used between `{BEGIN_tag}` and `{END_tag}`. Outside loops, use format strings instead.

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Tag is not replaced | Typo in tag name | Check spelling and case |
| Authors appear as `[object Object]` | Old template without format string on structured data | Use `{authors:format=%firstname %lastname|; }` or a loop |
| Conditional always shows false | Expression uses wrong tag name | Make sure the tag name matches the section ID |
| Line breaks do not appear in Word | Used `\n` but not inside a format string | Format strings handle `\n` correctly; in raw XML use `<w:br/>` (DOCX) or `<text:line-break/>` (ODT) |
