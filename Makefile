%.html: %.md
	pandoc $< | perl doc/tool/filter-md-html.pl > $@
