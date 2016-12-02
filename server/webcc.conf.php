<?php

$RULES = [
	'*.html' => 'HASH',

# 如果支持App则使用这部分
# 	'cordova/cordova.js' => '
# git ls-files cordova | grep -i "\.js$" | xargs cat | jsmin > $TARGET',
# 
# 	'cordova-ios/cordova.js' => '
# git ls-files cordova-ios | grep -i "\.js$" | xargs cat | jsmin > $TARGET',

	'cordova/cordova.js' => 'FAKE',
	'cordova-ios/cordova.js' => 'FAKE',

	'lib-app.min.js' => ['
cat lib/common.js lib/app_fw.js app.js | jsmin > $TARGET
', 'HASH'],

];

?>
