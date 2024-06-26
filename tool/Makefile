##############################
# make all
# make clean
#
# make sprite
# make clean-sprite
#
# make refdoc
# make clean-refdoc 
##############################

# 注意：某些版本git-bash只能用gb2312编码导致传到php的中文参数异常，此时须将本文件必须保存成gb2312编码，且为工具jdcloud-gendoc指定encoding参数内部转成utf-8再输出。
#opt=-encoding gb2312
opt=
gendoc=php jdcloud-gendoc.php -template refdoc-template.php -linkFiles "style.css,doc.css,refdoc.js"

all: refdoc

###### refdoc

refdoc_targets=../doc/api_m2.html ../doc/api_php.html ../doc/api_web.html ../doc/webcc.html ../doc/jdcloud-sprite.html ../doc/jdcloud-gendoc.html ../doc/jdcloud-upgrade.html
#refdoc_targets=../doc/api_php.html

refdoc: $(refdoc_targets)

../doc/api_m2.html: ../server/m2/lib/jdcloud-mui.js ../server/m2/lib/jdcloud-uploadpic.js
	$(gendoc) $^ -title "API参考 - 筋斗云前端（移动Web版）" $(opt) > $@

../doc/api_web.html: ../server/web/lib/jdcloud-wui.js ../server/web/lib/jdcloud-wui-ext.js ../server/web/lib/jdcloud-wui-stat.js ../server/web/page/pageSimple.js ../server/web/page/dlgReportCond.js ../server/web/page/pageTab.js 
	$(gendoc) $^ -title "API参考 - 筋斗云前端（桌面Web版）" $(opt) > $@

../doc/api_php.html: ../server/php/jdcloud-php/common.php ../server/php/jdcloud-php/app_fw.php ../server/php/jdcloud-php/api_fw.php ../server/php/jdcloud-php/AccessControl.php ../server/php/jdcloud-php/ext.php ../server/php/autoload.php
	$(gendoc) $^ -title "API参考 - 筋斗云服务端" $(opt) > $@

../doc/webcc.html: webcc.php jdcloud-build.sh
	$(gendoc) $^ -title "webcc - 站点发布优化工具" $(opt) > $@

../doc/jdcloud-sprite.html: jdcloud-sprite.php
	$(gendoc) $^ -title "jdcloud-sprite - 图片合并（精灵图制作）工具" $(opt) > $@

../doc/jdcloud-gendoc.html: jdcloud-gendoc.php
	$(gendoc) $^ -title "jdcloud-gendoc - 文档生成工具" $(opt) > $@

../doc/jdcloud-upgrade.html: upgrade.php
	$(gendoc) $^ -title "jdcloud-upgrade - 筋斗云升级工具" $(opt) > $@

clean: clean-refdoc

clean-refdoc: 
	-rm -rf $(refdoc_targets)

###### sprite 

sprite: ../server/m2/icon.out.css

../server/m2/icon.out.css: ../server/m2/icon.css
	php jdcloud-sprite.php $< -2x -group -sprite icon/icon@2x.png

clean-sprite:
	-rm -rf ../server/m2/icon.out.css ../server/m2/icon/icon@2x-*.png

meta:
	php upgrade.php export | tee ../server/tool/upgrade/META
	git add ../server/tool/upgrade/META

meta2:
	sh upgrade.sh initdb

meta3:
	sh upgrade.sh 'export(2)'

addon:
	php ../server/tool/upgrade-addon.php all

addon-install:
	php ../server/tool/upgrade-addon.php install

addon-clean:
	php ../server/tool/upgrade-addon.php clean

