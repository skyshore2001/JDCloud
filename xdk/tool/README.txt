## 版本升级说明

假如原先appVersion为6，对应 intelxdk.config.additions.xml 中也会指定URL并在参数cordova中设置大版本号

	<content src="http://yourserver.com/yourpath/m2/index.html?cordova=6" />
	
如果增加了插件，请增加主版本号:

- 在XDK中修改appVersion为7，修改app version code为700 (对应实际版本号可能为7008)
- 修改intelxdk.config.additions.xml中的URL地址： 

	<content src="http://yourserver.com/yourpath/m2/index.html?cordova=7" />

- 增加插件后，请相应在xdk项目中的以下文件中增加插件声明 

	m/cordova/cordova_plugins.js
	m/cordova-ios/cordova_plugins.js

	以及拷贝新的插件www目录过来。

如果只是小改动，没有插件增减，则可设置小版本号，如

- 在XDK中修改appVersion为7.1, 修改app version code为701.

其它不用修改。

## Android证书(keystore)

my.keystore
key alias: my
keystore/key password: 123456

查看应用签名：

	keytool -list -v -keystore my.keystore 

其中md5信息即证书签名。
当前证书签名为 1AF1CF9403CE3CCBC9B727823EE1B808

检查和修改_SIGN.bat中的参数后，即可为应用签名命令：

	cd {当前tool目录}
	_SIGN.bat yourpath\yourapk.apk

##
vi: ft=markdown tw&
