filterDoc=perl tool/filter-md-html.pl -linkFiles "style.css,doc.css,doc.js"

%.html: %.md
	pandoc $< | $(filterDoc) > $@
