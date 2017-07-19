@echo off
setlocal enabledelayedexpansion enableextensions

set src=jdcloud
set dst=jdcloud-app
set appId=com.daca.jdcloud
set appName=jdcloud

cd ../../
call cordova create %dst% %appId% %appName%
cd %dst%
mv www www1
cp -r ../%src%/www ./
mv www/icon ./
mv config.xml config.xml.bak
cp ../%src%/config.xml ./
call cordova platform add android 

call cordova plugin add ../%src%/plugins/cordova-plugin-statusbar
call cordova plugin add ../%src%/plugins/cordova-plugin-device
call cordova plugin add ../%src%/plugins/cordova-plugin-splashscreen
call cordova plugin add ../%src%/plugins/cordova-plugin-camera
call cordova plugin add ../%src%/plugins/cordova-plugin-geolocation

::call cordova plugin add ../%src%/plugins/com.justep.cordova.plugin.weixin.v3 --variable WEIXIN_APPID=wx0136112850b90XXX --variable WEIXIN_PARTNER_ID=1263699XXX --variable WEIXIN_API_KEY=uOSaobd6z0wnKVH2fOSl251YUqcK6XXX

