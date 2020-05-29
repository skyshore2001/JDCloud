#!/bin/sh

make refdoc $@

# [[ -n $WINDIR ]] && opt='-encoding gb2312'
# 
# php gendoc.php ../server/m/lib/common.js ../server/m2/lib/app_fw.js -title "API参考 - 筋斗云前端（移动Web版）" $opt > ../doc/api_m2.html
# php gendoc.php ../server/php/common.php ../server/php/app_fw.php ../server/php/api_fw.php -title "API参考 - 筋斗云服务端" $opt > ../doc/api_php.html
# php gendoc.php ../server/web/lib/app_fw.js -title "API参考 - 筋斗云前端（桌面Web版）" $opt > ../doc/api_web.html
