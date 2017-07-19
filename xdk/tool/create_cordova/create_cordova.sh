#!/bin/sh

# install cordova 5.4.1:
# sudo npm install -g cordova@5.4.1

src=jdcloud
dst=jdcloud-app
appId=com.daca.jdcloud
appName=jdcloud

cd ../../
cordova create $dst $appId $appName
cd $dst

mv www www1
cp -r ../$src/www ./
mv www/icon ./
mv config.xml config.xml.bak
cp ../$src/config.xml ./
cordova platform add ios
#cordova platform add android 

cordova plugin add ../$src/plugins/cordova-plugin-statusbar
cordova plugin add ../$src/plugins/cordova-plugin-device
cordova plugin add ../$src/plugins/cordova-plugin-splashscreen
cordova plugin add ../$src/plugins/cordova-plugin-camera
cordova plugin add ../$src/plugins/cordova-plugin-geolocation

#cordova plugin add ../$src/plugins/cordova-plugin-ios-plist
# cordova plugin add ../$src/plugins/cordova-plugin-wechat --variable WECHATAPPID=wx74127b4611XXXX
# cordova plugin add ../$src/plugins/cordova-plugin-inappbrowser
# cordova plugin add ../$src/plugins/cordova-plugin-weibosdk --variable WEIBO_APP_ID=9277XXXXX
# cordova plugin add ../$src/plugins/cordova-plugin-alipay --variable PARTNER_ID=208822197476XXXX --variable SELLER_ACCOUNT="jujiaxm@sina.com" --variable PRIVATE_KEY="XXXXXXXXXXXX"
# cordova plugin add ../$src/plugins/cordova-plugin-file
# cordova plugin add ../$src/plugins/cordova-plugin-file-transfer
# cordova plugin add ../$src/plugins/cordova-plugin-media
# cordova plugin add ../$src/plugins/cordova-plugin-videoproc
# cordova plugin add ../$src/plugins/cordova-plugin-qqsdk --variable QQ_APP_ID=1105569XXX --variable QQ_IOSAPP_ID=1105469XXX
# cordova plugin add ../$src/plugins/jpush-phonegap-plugin --variable API_KEY=f260b45e6fddaa684105XXXX

