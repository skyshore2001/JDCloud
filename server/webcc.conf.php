<?php
/*
$COPY_EXCLUDE = [
	'm1/*',
	'wap/*'
];

$FILES = [
	'm2/index.html',
	'm2/lib/app_fw.js'
];
 */

$RULES = [
	'm2/*.html' => 'HASH',
	'm2/lib/app_fw.js' => 'HASH',

	'm2/cordova/cordova.js' => '
git ls-files m2/cordova | grep -i "\.js$" | xargs cat | jsmin > $TARGET',

	'm2/cordova-ios/cordova.js' => '
git ls-files m2/cordova-ios | grep -i "\.js$" | xargs cat | jsmin > $TARGET',


];

?>
