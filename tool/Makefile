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

refdoc_targets=../doc/api_m2.html ../doc/api_php.html ../doc/api_web.html

refdoc: $(refdoc_targets)

../doc/api_m2.html: ../server/m/lib/common.js ../server/m2/lib/app_fw.js 
	php gendoc.php $^ -title "API²Î¿¼ - ½î¶·ÔÆÇ°¶Ë£¨ÒÆ¶¯Web°æ£©" $(opt) > $@

../doc/api_web.html: ../server/web/lib/app_fw.js ../server/web/app.js 
	php gendoc.php $^ -title "API²Î¿¼ - ½î¶·ÔÆÇ°¶Ë£¨×ÀÃæWeb°æ£©" $(opt) > $@

../doc/api_php.html: ../server/php/common.php ../server/php/app_fw.php ../server/php/api_fw.php
	php gendoc.php $^ -title "API²Î¿¼ - ½î¶·ÔÆ·þÎñ¶Ë" $(opt) > $@

clean: clean-refdoc

clean-refdoc: 
	-rm -rf ../doc/api_m2.html ../doc/api_php.html ../doc/api_web.html

###### sprite 

sprite: ../server/m2/icon.out.css

../server/m2/icon.out.css: ../server/m2/icon.css
	php make-sprite.php $< -2x -group -sprite icon/icon@2x.png

clean-sprite:
	-rm -rf ../server/m2/icon.out.css ../server/m2/icon/icon@2x-*.png

