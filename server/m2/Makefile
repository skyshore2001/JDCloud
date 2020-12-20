LIB=lib.min.css lib.min.js lib.html
MERGE=../../tool/mergeJsCss.sh

all: $(LIB) $(LIB_APP) lib-cordova.min.js lib-cordova-ios.min.js
	
$(LIB): lib/weui.min.css \
	lib/jquery-1.11.1.min.js lib/jquery.touchSwipe.min.js \
	lib/mui.css app.css icon.out.css \
	lib/jdcloud-mui.js app.js
	MERGE=lib $(MERGE) $^
	@echo "g_args.mergeJs=1;" >> lib.min.js

lib-cordova.min.js: $(shell git ls-files cordova)
	MERGE=lib-cordova $(MERGE) $^

lib-cordova-ios.min.js: $(shell git ls-files cordova-ios)
	MERGE=lib-cordova-ios $(MERGE) $^

# 检查是否符合ES5规范. 为保证兼容性, 目前不允许使用ES6特性.
# 须先安装es-check: `cnpm i es-check -g`
check:
	es-check --module es5 *.js page/*.js page-emp/*.js page-emp/*/*.js | tee 1.log
	@echo === write to 1.log
checkall:
	find . -name "*.js" | xargs es-check es5 | tee 1.log
	@echo === write to 1.log

clean:
	-rm -rf $(LIB) lib-cordova.min.js lib-cordova-ios.min.js 2>/dev/null 
