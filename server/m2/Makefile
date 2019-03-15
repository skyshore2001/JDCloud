LIB=lib.min.css lib.min.js lib.html
MERGE=../../tool/mergeJsCss.sh

all: $(LIB) $(LIB_APP)
	
$(LIB): lib/weui.min.css \
	lib/jquery-1.11.1.min.js lib/jquery.touchSwipe.min.js lib/jquery-dataview.min.js \
	lib/mui.css app.css icon.out.css \
	lib/jdcloud-mui.js app.js
	MERGE=lib $(MERGE) $^

clean:
	-rm -rf $(LIB) 2>/dev/null
