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

all: refdoc

###### refdoc

refdoc_targets=../doc/api_m2.html ../doc/api_php.html ../doc/api_web.html ../doc/webcc.html ../doc/jdcloud-sprite.html ../doc/jdcloud-gendoc.html

refdoc: $(refdoc_targets)

../doc/api_m2.html: ../server/m2/lib/common.js ../server/m2/lib/app_fw.js 
	php jdcloud-gendoc.php $^ -title "API参考 - 筋斗云前端（移动Web版）" $(opt) > $@

../doc/api_web.html: ../server/web/lib/common.js ../server/web/lib/app_fw.js ../server/web/app.js 
	php jdcloud-gendoc.php $^ -title "API参考 - 筋斗云前端（桌面Web版）" $(opt) > $@

../doc/api_php.html: ../server/php/common.php ../server/php/app_fw.php ../server/php/api_fw.php
	php jdcloud-gendoc.php $^ -title "API参考 - 筋斗云服务端" $(opt) > $@

../doc/webcc.html: webcc.php
	php jdcloud-gendoc.php $^ -title "webcc - 站点发布优化工具" $(opt) > $@

../doc/jdcloud-sprite.html: jdcloud-sprite.php
	php jdcloud-gendoc.php $^ -title "jdcloud-sprite - 图片合并（精灵图制作）工具" $(opt) > $@

../doc/jdcloud-gendoc.html: jdcloud-gendoc.php
	php jdcloud-gendoc.php $^ -title "jdcloud-gendoc - 文档生成工具" $(opt) > $@

clean: clean-refdoc

clean-refdoc: 
	-rm -rf $(refdoc_targets)

###### sprite 

sprite: ../server/m2/icon.out.css

../server/m2/icon.out.css: ../server/m2/icon.css
	php jdcloud-sprite.php $< -2x -group -sprite icon/icon@2x.png

clean-sprite:
	-rm -rf ../server/m2/icon.out.css ../server/m2/icon/icon@2x-*.png

