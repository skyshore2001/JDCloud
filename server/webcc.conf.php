<?php

$RULES = [
	'*.html' => 'HASH',
	'lib/app_fw.js' => 'HASH',

# ���֧��App��ʹ���ⲿ��
	'cordova/cordova.js' => '
cd cordova
sh -c "$WEBCC_LS_CMD" | grep -i "\.js$" | xargs cat | jsmin > $TARGET',

	'cordova-ios/cordova.js' => '
cd cordova-ios
sh -c "$WEBCC_LS_CMD" | grep -i "\.js$" | xargs cat | jsmin > $TARGET',

# 	'cordova/cordova.js' => 'FAKE',
# 	'cordova-ios/cordova.js' => 'FAKE',

];

