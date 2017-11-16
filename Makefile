DESIGN.html: DESIGN.md

filterDoc=perl doc/tool/filter-md-html.pl -linkFiles "doc/style.css,doc/doc.css,doc/doc.js"

%.html: %.md
	pandoc $< | $(filterDoc) > $@
