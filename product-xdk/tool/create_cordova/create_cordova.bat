@echo off
setlocal enabledelayedexpansion enableextensions

set src=client
set dst=client-test
set appId=com.daca.jdcloud
set appName=jdcloud

cd ../../
call cordova create %dst% %appId% %appName%
cd %dst%
mv www www1
cp -r ../%src%/www ./
call cordova platform add android 

call cordova plugin add ../%src%/plugins/cordova-plugin-splashscreen
call cordova plugin add ../%src%/plugins/org.apache.cordova.camera
call cordova plugin add ../%src%/plugins/com.justep.cordova.plugin.weixin.v3 --variable WEIXIN_APPID=wx0136112850b90306 --variable WEIXIN_PARTNER_ID=1263699901 --variable WEIXIN_API_KEY=uOSaobd6z0wnKVH2fOSl251YUqcK6160

