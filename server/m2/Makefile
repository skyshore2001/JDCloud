LIB=lib.min.css lib.min.js lib.html
MERGE=../../tool/mergeJsCss.sh

all: $(LIB) $(LIB_APP)
	
$(LIB): lib/weui.min.css \
	lib/jquery-1.11.1.min.js lib/jquery.touchSwipe.min.js \
	lib/mui.css app.css icon.out.css \
	lib/jdcloud-mui.js app.js
	MERGE=lib $(MERGE) $^

# 检查是否符合ES5规范. 为保证兼容性, 目前不允许使用ES6特性.
# 须先安装es-check: `cnpm i es-check -g`
check:
	es-check --module es5 *.js page/*.js page-emp/*.js page-emp/*/*.js | tee 1.log
	@echo === write to 1.log
checkall:
	find . -name "*.js" | xargs es-check es5 | tee 1.log
	@echo === write to 1.log

clean:
	-rm -rf $(LIB) 2>/dev/null
