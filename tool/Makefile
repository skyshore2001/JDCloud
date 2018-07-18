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

opt=-encoding gb2312
gendoc=php jdcloud-gendoc.php -template refdoc-template.php -linkFiles "style.css,doc.css,refdoc.js"

all: refdoc

###### refdoc

refdoc_targets=../doc/api_m2.html ../doc/api_php.html ../doc/api_web.html ../doc/webcc.html ../doc/jdcloud-sprite.html ../doc/jdcloud-gendoc.html ../doc/jdcloud-upgrade.html
#refdoc_targets=../doc/api_php.html

refdoc: $(refdoc_targets)

../doc/api_m2.html: ../server/m2/lib/jdcloud-mui.js
	$(gendoc) $^ -title "API参考 - 筋斗云前端（移动Web版）" $(opt) > $@

../doc/api_web.html: ../server/web/lib/jdcloud-wui.js
	$(gendoc) $^ -title "API参考 - 筋斗云前端（桌面Web版）" $(opt) > $@

../doc/api_php.html: ../server/php/jdcloud-php/common.php ../server/php/jdcloud-php/app_fw.php ../server/php/jdcloud-php/api_fw.php ../server/php/jdcloud-php/AccessControl.php ../server/php/jdcloud-php/ext.php
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

