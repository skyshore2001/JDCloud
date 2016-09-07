cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/cordova-plugin-splashscreen/www/splashscreen.js",
        "id": "cordova-plugin-splashscreen.SplashScreen",
        "pluginId": "cordova-plugin-splashscreen",
        "clobbers": [
            "navigator.splashscreen"
        ]
    }
];

filterCordovaModule(module);

module.exports.metadata = 
// TOP OF METADATA
{
    "cordova-plugin-splashscreen": "2.1.0"
}
// BOTTOM OF METADATA
});
