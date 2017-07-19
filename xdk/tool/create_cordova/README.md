# 根据Intel XDK工程目录创建Cordova工程

如果需要调试原生代码，应在本地搭建开发环境（如调试安卓，需要安装安卓SDK, Cordova等），创建Cordova工程，编译及调试应用。

create_cordova.bat: 在windows环境下创建安卓工程。
create_cordova.sh : 在mac-os环境下创建ios工程。

- cordova配置文件参考config.xml。其中定义了常用图标和启动图。
- 修改和运行 create_cordova.bat ，它在xdk目录下创建Cordova应用目录并初始化工程。它将复制config.xml到创建的cordova工程下。

- 编译并运行

注意：

- 如果使用android studio调试，应确保安卓SDK版本与cordova安装的SDK版本一致。或修改`platforms\android\project.properties`, 改为期望的版本号，如：

	target=android-23

- 如果安卓编译出问题，可能需要：将httpcore-4.1.jar和httpclient-4.1.1.jar复制到platforms\android\libs目录下。

- 如果安卓打包出问题，可能需要：打开文件 platforms\android\build.gradle，找到android {} 段，增加以下内容：

	packagingOptions {
        exclude 'META-INF/LICENSE.txt'
        exclude 'META-INF/NOTICE.txt'
    }

- config.xml中的重点内容如下：

		<allow-navigation href="*" />
		<preference name="SplashScreen" value="screen" />
		<preference name="SplashScreenDelay" value="10000" />
		<!--preference name="ErrorUrl" value="error.html"/-->
		<preference name="ErrorUrl" value="file:///android_asset/www/error.html"/>
		<preference name="LoadingPageDialog" value="加载,正在加载..."/>
		<preference name="LoadUrlTimeoutValue" value="20000"/>
		<content src="http://yourserver.com/yourpath/m2/index.html?cordova=1" />

	它来自于xdk工程中的 {project}/intelxdk.config.additions.xml 文件，将其中的内容归并到配置文件中(确保文件config.xml 和 platforms/android/res/xml/config.xml中都有，ios工程在该文件：platforms/ios/{project}/config.xml)。
