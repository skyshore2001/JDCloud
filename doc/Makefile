%.html: %.md h.inc
	perl tool/filter-md.pl $< | pandoc -f markdown -t html -s --toc -N -H h.inc -o $@
