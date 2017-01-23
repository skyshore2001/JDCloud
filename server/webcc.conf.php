<?php

$RULES = [
	'*.html' => 'HASH',
	'lib/app_fw.js' => 'HASH',

# 如果支持App则使用这部分
	'cordova/cordova.js' => '
cd cordova
sh -c "$WEBCC_LS_CMD" | grep -i "\.js$" | xargs cat | jsmin > $TARGET',

	'cordova-ios/cordova.js' => '
cd cordova-ios
sh -c "$WEBCC_LS_CMD" | grep -i "\.js$" | xargs cat | jsmin > $TARGET',

# 	'cordova/cordova.js' => 'FAKE',
# 	'cordova-ios/cordova.js' => 'FAKE',

];

