DESIGN.html: DESIGN.md

%.html: %.md
	pandoc $< | perl doc/tool/filter-md-html.pl > $@
