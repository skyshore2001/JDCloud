<?php

$RULES = [
	'*.html' => 'HASH',
	'lib/app_fw.js' => 'HASH',

# ���֧��App��ʹ���ⲿ��
# 	'cordova/cordova.js' => '
# git ls-files cordova | grep -i "\.js$" | xargs cat | jsmin > $TARGET',
# 
# 	'cordova-ios/cordova.js' => '
# git ls-files cordova-ios | grep -i "\.js$" | xargs cat | jsmin > $TARGET',

	'cordova/cordova.js' => 'FAKE',
	'cordova-ios/cordova.js' => 'FAKE',

];

