#!/bin/sh
php gendoc.php ../server/m2/lib/app_fw.js > ../doc/api_m2.html
php gendoc.php ../server/php/app_fw.php ../server/php/api_fw.php > ../doc/api_php.html
php gendoc.php ../server/web/lib/app_fw.js > ../doc/api_web.html
