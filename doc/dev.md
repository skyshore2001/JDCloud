# 开发环境搭建
 
服务器共享软件的路径为 `\\server-pc\share\Software`, 请将以下`{SHARE_SVR}`替换成该地址。
外网环境使用路径[http://oliveche.com/app/tool/](http://oliveche.com/app/tool/)

(部分内部文件从ftp下载，路径为 ftp://oliveche.com:10021/software 用户名密码请询问管理员。如果访问不了，需要联系管理员添加IP到白名单)

## Windows开发环境

下面有些可直接解压的软件，一般建议安装到D盘，如果没有D盘则安装到C盘相应目录。

### 版本控制软件Git

安装git：

	{SHARE_SVR}\Git\Git-2.28.0-64-bit.exe
	{SHARE_SVR}\Git\TortoiseGit-2.10.0.2-64bit.msi

浏览器右键点菜单 TortoiseGit->Settings->(左边菜单树中选择)Git->设置 Name 和 Email, 如

	Name: xxx（改成你的名字）
	Email: xxx@126.com（改成你的邮箱地址）

在 Settings->Network 中，确认右侧 SSH Client 使用的是刚刚安装的Git中的ssh路径，如

	C:\Program Files\Git\usr\bin\ssh.exe

以下为配置登录公司相关服务器：

公司内网代码服务器为server-pc（外部访问通过映射），一般采用ssh证书登录方式（免密码登录），配置如下：

在用户主目录下(按Windows-R键打开运行对话框，输入 "." 或 "%userprofile%")，创建目录".ssh", 将 `${SHARE_SVR}\server-pc-key` 目录下的文件(config, id_rsa等)拷贝到".ssh"目录中。
如果目前下已经有同名文件，请手工修改和合并。

在文件夹空白处点右键，打开 Git Bash，尝试 ssh 是否可以自动登录到内网代码服务器:

	ssh server-pc
	(应可免密登录上, 按Ctrl-D退出)

如果在外网，使用名称olive2（它就是server-pc服务器，映射到公网的），先配置刚刚复制到.ssh目录的config文件，添加上这些：

	host olive2
	hostname oliveche.com
	port 10022

然后测试登录：

	ssh olive2

创建目录d:\project做为项目目录，进行该目录拉取代码（在git-bash中运行）：

	cd d:\project
	git clone server-pc:src/jdcloud-ganlan
	（应可免密下载项目）

(如果用olive2，则路径为 olive2:src/jdcloud-ganlan)

一般推荐使用图形工具TortoiseGit，在project目录下右键选择Git Clone.

### 数据库MYSQL

办公室环境可直接使用配置好的server-pc服务器上的数据库服务器。

为直接访问数据库，可以安装数据库客户端：

	{SHARE_SVR}\MYSQL\MySQL-Front_Setup_6.1.exe

MySQL服务端不是必装的，自己学习的话可以安装一个，注意安装的mariadb与mysql是兼容的：

	{SHARE_SVR}\MYSQL\mariadb-10.3.27-winx64.msi

配置文件：找到 {mysql安装目录}/data/my.ini
补上以下配置：

	[mysqld]
	character-set-server=utf8mb4
	lower_case_table_names=2

注意windows环境下须配置`lower_case_table_names=2`，我们的表名中有大小写，若不配置此项则表名全部为小写。

通过windows服务启动、停止mysql服务器。

测试：使用客户端连接本地mysql服务。

### 浏览器及移动设备

建议开发时使用chrome浏览器；请从网上下载并安装其最新版本。

### 编辑器

建议安装vscode编辑器和gvim编辑器。

{SHARE_SVR}下面有vscode安装包（VSCodeUserSetup-x64-1.46.1），也可从公网下载新版本。

画图（如用例图、类图等）可安装drawio插件。

安装vim: (项目有些文档必须用vim编辑; 且部署在Linux时一般只用vim，故建议安装和学习)

	{SHARE_SVR}\vim\gvim74.exe

建议安装到 `d:\vim`
安装完成后将配置文件 `{SHARE_SVR}\vim\_vimrc` 拷贝到安装目录下（如`d:\vim`目录）

### 服务器环境Apache+PHP 

安装php 5.4:

	解压 {SHARE_SVR}\php\php-5.4.31-nts-Win32-VC9-x86-xdebug.zip 到 d:\php54

将解压路径如`d:\php54`加到系统环境变量 PATH 中，以便可以直接在命令行访问 php.

测试：在`d:\project`下创建一个文件`index.php`，内容为：

	hello, jdcloud.

在cmd命令行或git-bash中，进入`d:\project`目录，测试执行这个脚本文件，

	php index.php

应能正常输出。

安装apache2: 解压`{SHARE_SVR}\Apache24-x64-vc15-fcgid.rar` 到 `d:\`，得到目录`D:\Apache24-x64-vc15`，下面以`{APACHE_HOME}`指代该目录。

检查配置文件：`{APACHE_HOME}\conf\__user.conf`（以及httpd.conf配置文件）其中各路径是否与实际文件路径相符。默认Web主目录为`d:\project`，检查php目录是否正确。

右键`{APACHE_HOME}\install.bat`，选择“以管理员权限运行”，安装服务。
双击`{APACHE_HOME}\bin\ApacheMonitor.exe`，在系统托盘中出现Apache管理图标，双击它打开可以启动、重启apache服务。修改配置文件后一般需要重启Aapche服务。

如果启动失败，常见原因是有目录配置错误，或端口80被其它程序占用，可以进入`{APACHE_HOME}\bin`目录下用命令行`httpd -X`调试启动查看错误信息。

测试：刚刚在Web主目录`d:\project`下创建过文件`index.php`，现在到chrome浏览器访问一下：

	http://localhost/

应能正常输出。

之间下载过jdcloud-ganlan项目在`d:\project`目录下，测试一下是否能正常访问：

	http://localhost/jdcloud-ganlan/server/tool/init.php

查看环境检查是否为全绿色。

### 工具软件

安装make工具：

	\\server-pc\share\software\make-mingw.zip

解压到`d:\bat`目录。如果没有该目录，创建它，并将它加入PATH路径。

检查：可运行make命令。有些文件夹下有Makefile文件，则表示可以在这个文件夹下运行make命令。

安装图片处理工具imagemagick：（比如图片压缩等）

	\\server-pc\share\software\ImageMagick-7.0.8-12-Q16-x64-dll.exe

检查：可以运行magick命令(6.x版本的命令叫convert, 现在已不再使用)。常用于图片压缩，比如将1.png转换并压缩为1.jpg，分辨率处理为长1200、宽自动：

	magick 1.png -resize 1200 -quality 80 1.jpg

还可以用`-resize 1200x1000>`表示长、宽分别不超过1200和1000，而`-resize 1200x1000!`表示拉伸至该分辨率。

安装文档生成工具pandoc：

	\\server-pc\share\software\pandoc-1.16.0.2-windows.msi

检查：可以运行pandoc命令。它常用于将markdown文档转为html，如：

	pandoc 1.md > 1.html

安装文件查找工具everything:

	\\server-pc\share\software\Everything_1.4.1.877_x64-Setup

### 运行经典筋斗云项目的工程

先从代码服务器下载代码。项目中的代码库命名规则一般如下：

{project}
: 服务端(php)、移动应用(m2)、管理端应用(web)，其中子目录`server`包含发布到线上的内容的源码。

{project}-online
: 发布版本库。常用于java+vue项目。

{project}-app
: 原生手机应用程序（应用壳）的工程。基于Cordova框架，一般包含安卓及苹果两个应用程序的工程。一般克隆自jdcloud-app项目。

{project}-test
: 自动化回归测试代码


不再使用的：
{project}-xdk
: 原生手机应用程序（应用壳）的工程，使用Intel XDK工具生成应用程序，现已不使用，由{project}-app工程取代。

{project}-ios
: 原生iOS应用程序工程。

{project}-site
: 站点主页。

下载应用代码示例：

	git clone builder@server-pc:src/{项目名}

可以在浏览器中右键选择Git Clone, 然后输入地址：`builder@server-pc:src/jdcloud-ganlan`

### 运行服务

之前已使用git下载了jdcloud-ganlan项目，请通过**init工具**创建或升级数据库。在浏览器中访问：

	http://localhost/jdcloud-ganlan/server/tool/init.php

开发环境沟上“测试模式”。其中配置管理端密码时，习惯上填写 yibo:yibo123，下面要用。
如果配置错了，可以找到`server/php/conf.user.php`文件手工修改，或删除该文件后重新用init工具配置。

配置成功后，用上面设置的用户密码打开超级管理端：

	http://localhost/jdcloud-ganlan/server/web/adm.html

可添加管理员。习惯上设置为管理员: 登录名 admin / 手机 12345678901 / 密码 1234。

用新创建的管理员登录管理端：

	http://localhost/jdcloud-ganlan/server/web/

试用移动端：

	http://localhost/jdcloud-ganlan/server/m2/

用户: 12345678901 / 验证码 080909

## Java后端开发环境

安装文件目录`\\server-pc\share\software\java`

	jdk-8u121-windows-i586.exe
	jdk-8u121-windows-x64.exe

32位 64位 都安装上。配置环境变量示例：

	JAVA_HOME=D:\jdk1.8.0_121
	JAVA_HOME_X64=D:\jdk1.8.0_121_x64
	PATH=%JAVA_HOME%\bin;...

测试：

	java -version
	（默认是32位java）

从该目录下安装eclipse和tomcat。

## App开发环境

使用Cordova框架，为安卓和IOS应用分别制作“壳”，实际仍以H5应用为核心。

### 安卓开发环境

先根据【Java后端开发环境】安装java(jdk8)。（编译安卓不需要eclipse或tomcat）

android SDK: （840M, 包含tools, platform-tools, android target-API-29等）

	\\server-pc\share\software\android\sdk-tools-windows-4333796.zip

解压到`d:\sdk-tools-windows-4333796`
配置环境变量：

	ANDROID_HOME=d:\sdk-tools-windows-4333796

安装编译工具gradle:

	\\server-pc\share\software\gradle-5.4.1.zip

解压到d:\，配置环境变量：

	GRADLE_HOME=d:\gradle-5.4.1
	PATH中添加 %GRADLE_HOME%/bin

安装nodejs/npm:

	\\server-pc\share\software\nodejs

注意设置taobao源, 下载包速度较快：

	npm config set registry https://registry.npm.taobao.org 

cordova开发环境安装（目前使用10.0版本）：

	npm install -g cordova@10.0

检查：

	cordova -v
	(应该是10.0)

其中要做图片处理，安装：

	\\server-pc\share\software\android\ImageMagick-7.0.8-12-Q16-x64-dll.exe

检查：可以运行magick命令

如果要调试安卓插件，应安装android studio，并安装Android SDK.

	\\server-pc\share\software\android

命令行编译安卓apk包, 以编译项目tomatomall-app为例：

	git clone server-pc:src/tomatomall-app
	cd tomatomall-app
	npm i
	cordova platform add android
	make

如果有错误，可以查看下少装了什么：

	cordova requirements

打开Makefile文件，修改其中的线上apk上传地址，如：

	PUB=oliveche.com:html/app/apk/tomatomall-1.0.apk

这样可以直接发布上线：

	make dist

### IOS开发环境

安装ios虚机，使用其中的xcode开发。
虚拟使用vmware:

	\\server-pc\share\software\vmware\VMware-player-16.1.0-17198959.exe

ios系统镜像：

	\\server-pc\share\_SYS
	MacOS-202012.rar 或更新版本
	
将其直接解压到你的磁盘目录下。注意文件很大（解压后上百G），确保磁盘空间足够。

运行虚机：以编译项目tomatomall-app为例：

	cd ~/project
	git clone server-pc:src/tomatomall-app
	cd tomatomall-app
	npm i
	cordova platform add ios
	make

打开xcode，加载工程（自动生成的platforms/ios/{项目名}.xcworkspace），编译、测试和发布。

如果是干净的macos系统，先从苹果应用市场或官网下载适合版本的xcode（注意xcode对macos系统版本有要求，而上架应用市场时对xcode和ios sdk版本有要求）。
然后下载nodejs（包含npm，http://nodejs.cn/），然后参考android环境的配置：

	（设置taobao源, 下载包速度较快）
	npm config set registry https://registry.npm.taobao.org 

cordova开发环境安装（目前使用10.0版本）：

	npm install -g cordova@10.0

检查：

	cordova -v
	(应该是10.0)

然后进行上面常规项目操作即可。

## 测试环境

用于自动化测试(目前很少使用，且phpunit已换成jasmine。此章节跳过。)

前提: 先配置好Windows开发环境(git/php等).

### 安装perl

(git-bash中已包含perl)
某些工具使用perl开发，所以应安装perl运行环境。

	{SHARE_SVR}\ActivePerl-5.16.3.1604-MSWin32-x86-298023.msi

### php单元测试工具phpunit

phpunit可用于对php服务端提供的接口进行测试.

安装 phpunit
- 新建目录 c:\bat 用于放置自已创建的批处理文件。将该目录c:\bat加到PATH环境变量（参考附注1）。
- 解压 `{SHARE_SVR}\php\phpunit.rar` 到c:\bat目录下，得到 c:\bat\phpunit.phar 文件
- 新建 phpunit.bat 文件，内容如下：

		@echo off
		php c:/bat/phpunit.phar %*


这时，打开一个cmd窗口，应该可以直接运行phpunit命令：

	phpunit


具体用法请参考文档[[后端框架]] 章节"测试设计" -> "回归测试".

### 安装前端自动化测试环境

（目前已不使用）

主要软件：nunit, selenium, VS.net (C#)

参考文档[[后端框架]]中的“回归测试”章节。

