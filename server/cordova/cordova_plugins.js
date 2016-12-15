cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [

    {
        "file": "plugins/cordova-plugin-splashscreen/www/splashscreen.js",
        "id": "cordova-plugin-splashscreen.SplashScreen",
        "clobbers": [
            "navigator.splashscreen"
        ]
    }
];

filterCordovaModule(module);

module.exports.metadata = 
// TOP OF METADATA
{
    "cordova-plugin-splashscreen": "3.0.0",
};
// BOTTOM OF METADATA
});
