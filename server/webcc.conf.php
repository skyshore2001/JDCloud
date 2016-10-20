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
	'm/*.html' => 'HASH',
	'm/lib/app_fw.js' => 'HASH',
	'm2/*.html' => 'HASH',

	'm/cordova/cordova.js' => '
git ls-files m/cordova | grep -i "\.js$" | xargs cat | jsmin > $TARGET',

	'm/cordova-ios/cordova.js' => '
git ls-files m/cordova-ios | grep -i "\.js$" | xargs cat | jsmin > $TARGET',

	'm/lib-jqm.min.js' => '
cd m/lib
cat jquery.mobile-1.4.5.min.js \
	jquery.validate.min.js \
	messages_zh.min.js \
	> $TARGET
',

	'm/lib-app.min.js' => ['
cd m/lib
cat common.js app_fw.js ../app.js | jsmin > $TARGET
', 'HASH'],

	'm/main.js' => 'jsmin < m/main.js > $TARGET',

	'm2/lib-app.min.js' => ['
cd m2
cat ../m/lib/common.js lib/app_fw.js app.js | jsmin > $TARGET
', 'HASH'],

];

?>
