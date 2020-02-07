export const readMe =
`In order to compile the latex file, you need to use at least TeXLive 2016. If
there are citations, you additionally need Biber 2.7/BibLaTeX 3.7.

On Ubuntu 18.04+ install these packages:

> sudo apt install texlive-latex-base texlive-bibtex-extra biber texlive-latex-extra

Extract all the files included in this ZIP into a folder.
Run then these commands to create a PDF from within this folder:

> lualatex document

If there are citations, continue with these commands:

> biber document
> lualatex document

Look at the output messages to determine whether you need to run laluatex again.
`
