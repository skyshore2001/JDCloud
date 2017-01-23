<?php
/*
$COPY_EXCLUDE = [
	'm1/*',
	'wap/*'
];

$FILES = [
	'm2/index.html'
];
 */

$RULES = [
	'm2/*.html' => 'HASH',
	'm2/lib/app_fw.js' => 'HASH',

# 如果支持App则使用这部分
	'm2/cordova/cordova.js' => '
cd m2/cordova
sh -c "$WEBCC_LS_CMD" | grep -i "\.js$" | xargs cat | jsmin > $TARGET',

	'm2/cordova-ios/cordova.js' => '
cd m2/cordova-ios
sh -c "$WEBCC_LS_CMD" | grep -i "\.js$" | xargs cat | jsmin > $TARGET',


];

