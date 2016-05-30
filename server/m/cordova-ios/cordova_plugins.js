cordova.define('cordova/plugin_list', function(require, exports, module) {
	// filter格式: [ [app1, minVer?=1, maxVer?=9999], ...], 仅当app匹配且版本在minVer/maxVer之间才使用
	// 如果未指定filter, 表示总是使用
	// app:"user"-客户端;"doctor"-医生端
var plugins = [
    {
        "file": "plugins/cordova-plugin-splashscreen/www/splashscreen.js",
        "id": "cordova-plugin-splashscreen.SplashScreen",
        "clobbers": [
            "navigator.splashscreen"
        ],
		//"filter": [ ["user", 1], ["doctor", 1] ]
    }
];

module.exports = [];

var app = g_args._app || 'user';
var ver = g_args.cordova || 1;
plugins.forEach(function (e) {
	var yes = 0;
	if (e.filter) {
		e.filter.forEach(function (f) {
			if (app == f[0] && ver >= (f[1] || 1) && ver <= (f[2] || 9999)) {
				yes = 1;
				return false;
			}
		});
	}
	else {
		yes = 1;
	}
	if (yes)
		module.exports.push(e);
});

module.exports.metadata = 
// TOP OF METADATA
{
    "cordova-plugin-splashscreen": "2.1.0"
}
// BOTTOM OF METADATA
});
