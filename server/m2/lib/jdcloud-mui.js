// jdcloud-mui version 1.1
// ====== WEBCC_BEGIN_FILE doc.js {{{
/**
@module MUI

筋斗云移动UI框架 - JDCloud Mobile UI framework

## 基于逻辑页面的单网页应用

亦称“变脸式应用”。应用程序以逻辑页面（page）为基本单位，每个页面的html/js可完全分离。主要特性：

- 基于缺页中断思想的页面路由。异步无刷新页面切换。支持浏览器前进后退操作。
- 支持页面对象模型(POM)，方便基于逻辑页面的模块化开发。支持页面html片段和js片段。
- 统一对待内部页面和外部页面（同样的方式访问，同样的行为）。开发时推荐用外部页面，发布时可打包常用页面成为内部页面。
  访问任何页面都是index.html#page1的方式，如果page1已存在则使用（内部页面），不存在则动态加载（如找到fragment/page1.html）
- 页面栈管理。可自行pop掉一些页面控制返回行为。

@see MUI.showPage
@see MUI.popPageStack

### 应用容器

@key .mui-container 应用容器。
@event muiInit() DOM事件。this为当前应用容器。

先在主应用html中，用.mui-container类标识应用容器，在运行时，所有逻辑页面都将在该对象之下。如：

	<body class="mui-container">

应用初始化时会发出muiInit事件，该事件在页面加载完成($.ready)后，显示首页前调用。在这里调用MUI.showPage可动态显示首页。

### 逻辑页面

每个逻辑页面(page)以及它对应的脚本(js)均可以独立出一个文件开发，也可以直接嵌在主页面的应用容器中。

如添加一个订单页，使用外部页面，可以添加一个order.html (html片段):

	<div mui-initfn="initPageOrder" mui-script="order.js">
		...
	</div>

如果使用内部页面，则可以写为：

	<script type="text/html" id="tpl_order">
		<div mui-initfn="initPageOrder" mui-script="order.js">
			...
		</div>
	</script>

@key .mui-page 逻辑页面。
@key mui-script DOM属性。逻辑页面对应的JS文件。
@key mui-initfn DOM属性。逻辑页面对应的初始化函数，一般包含在mui-script指定的JS文件中。

该页面代码模块（即初始化函数）可以放在一个单独的文件order.js:

	function initPageOrder() 
	{
		var jpage = this;
		jpage.on("pagebeforeshow", onBeforeShow);
		jpage.on("pageshow", onShow);
		jpage.on("pagehide", onHide);
		...
	}

逻辑页面加载过程，以加载页面"#order"为例: 

	MUI.showPage("#order");

- 检查是否已加载该页面，如果已加载则显示该页并跳到"pagebeforeshow"事件这一步。
- 检查内部模板页。如果内部页面模板中有名为"tpl_{页面名}"的对象，有则将其内容做为页面代码加载，然后跳到initPage步骤。
- 加载外部模板页。加载 {pageFolder}/{页面名}.html 作为逻辑页面，如果加载失败则报错。页面所在文件夹可通过`MUI.options.pageFolder`指定。
- initPage页面初始化. 框架自动为页面添加.mui-page类。如果逻辑页面上指定了mui-script属性，则先加载该属性指定的JS文件。然后如果设置了mui-initfn属性，则将其作为页面初始化函数调用。
- 发出pagecreate事件。
- 发出pagebeforeshow事件。
- 动画完成后，发出pageshow事件。
- 如果之前有其它页面在显示，则触发之前页面的pagehide事件。

（v3.3）页面初始化函数可返回一个新的jpage对象，从而便于与vue等库整合，如：

	function initPageOrder() 
	{
		// vue将this当作模板，创建新的DOM对象vm.$el.
		var vm = new Vue({
			el: this[0],
			data: {},
			method: {}
		});

		var jpage = $(vm.$el);
		jpage.on("pagebeforeshow", onBeforeShow);
		...
		return jpage;
	}

@event pagecreate(ev) DOM事件。this为当前页面，习惯名为jpage。
@event pagebeforeshow(ev, opt) DOM事件。this为当前页面。opt参数为`MUI.showPage(pageRef, opt?)`中的opt，如未指定则为`{}`
@event pageshow(ev, opt)  DOM事件。this为当前页面。opt参数与pagebeforeshow事件的opt参数一样。
@event pagehide(ev) DOM事件。this为当前页面。

#### 逻辑页内嵌style

逻辑页代码片段允许嵌入style，例如：

	<div mui-initfn="initPageOrder" mui-script="order.js">
	<style>
	.p-list {
		color: blue;
	}
	.p-list div {
		color: red;
	}
	</style>
	</div>

@key mui-origin

style将被插入到head标签中，并自动添加属性`mui-origin={pageId}`.

（版本v3.2)
框架在加载页面时，会将style中的内容自动添加逻辑页前缀，以便样式局限于当前页使用，相当于：

	<style>
	#order .p-list {
		color: blue;
	}
	#order .p-list div {
		color: red;
	}
	</style>

为兼容旧版本，如果css选择器以"#{pageId} "开头，则不予处理。

@key mui-nofix
如果不希望框架自动处理，可以为style添加属性`mui-nofix`:

	<style mui-nofix>
	</style>

#### 逻辑页内嵌script

逻辑页中允许但不建议内嵌script代码，js代码应在mui-script对应的脚本中。非要使用时，注意将script放到div标签内：

	<div mui-initfn="initPageOrder" mui-script="order.js">
	<script>
	// js代码
	</script>
		...
	</div>

（版本v3.2)
如果逻辑页嵌入在script模板中，这时要使用`script`, 应换用`__script__`标签，如：

	<script type="text/html" id="tpl_order">
		<div mui-initfn="initPageOrder" mui-script="order.js">
			...
		</div>
		<__script__>
		// js代码，将在逻辑页加载时执行
		</__script__>
	</script>

#### 进入应用时动态显示初始逻辑页

默认进入应用时的主页为 MUI.options.homePage. 如果要根据参数动态显示页面，应在muiInit事件中操作：

	$(document).on("muiInit", myInit);

	function myInit()
	{
		if (g_args.initPage) {
			MUI.showPage(g_args.initPage);
		}
	}

访问`http://server/app/?initPage=me`则默认访问页面"#me".

@see muiInit

#### 在showPage过程中再显示另一个逻辑页

例如，进入页面后，发现如果未登录，则自动转向登录页：

	function onPageBeforeShow(ev)
	{
		// 登录成功后一般会设置g_data.userInfo, 如果未设置，则当作未登录
		if (g_data.userInfo == null) {
			MUI.showLogin();
			return;
		}
		// 显示该页面...
	}

在pagebeforeshow事件中做页面切换，框架保证不会产生闪烁，且在新页面上点返回按钮，不会返回到旧页面。

除此之外如果多次调用showPage（包括在pageshow事件中调用），一般最终显示的是最后一次调用的页面，过程中可能产生闪烁，且可能会丢失一些pageshow/pagehide事件，应尽量避免。

### 页面路由

默认路由：

- 一般只用一级目录：`http://server/app/index.html#order`对应`{pageFolder=page}/order.html`，一般为`page/order.html`
- 也支持多级目录：`http://server/app/index.html#order-list`对应`page/order/list.html`
- 与筋斗云后端框架一起使用时，支持插件目录：`http://server/app/index.html#order-list`在存在插件'order'时，对应`{pluginFolder=../plugin}/order/m2/page/list.html`，一般为`../plugin/order/m2/page/list.html`

URL也可以显示为文件风格，比如在设置：

	<base href="./" mui-showHash="no">

之后，上面两个例子中，URL会显示为 `http://server/app/page/order.html` 和 `http://server/app/page/order/list.html`
@see MUI.options.showHash

特别地，还可以通过`MUI.setUrl(url)`或`MUI.showPage(pageRef, {url: url})`来定制URL，例如将订单id=100的逻辑页显示为RESTful风格：`http://server/app/order/100`
@see MUI.setUrl

为了刷新时仍能正常显示页面，应将页面设置为入口页，并在WEB服务器配置好URL重写规则。

## 服务端交互API

@see callSvr 系列调用服务端接口的方法。

## 登录与退出

框架提供MUI.showLogin/MUI.logout操作. 
调用MUI.tryAutoLogin可以支持自动登录.

登录后显示的主页，登录页，应用名称等应通过MUI.options.homePage/loginPage/appName等选项设置。

@see MUI.tryAutoLogin
@see MUI.showLogin
@see MUI.logout
@see MUI.options

## 常用组件

框架提供导航栏、对话框、弹出框、弹出菜单等常用组件。

### 导航栏

@key .mui-navbar 导航栏
@key .mui-navbar.noactive

默认行为是点击后添加active类（比如字体发生变化），如果不需要此行为，可再添加noactive类。

### 对话框

@key .mui-dialog 对话框

### 弹出菜单

@key .mui-menu 菜单

### 底部导航

@key #footer 底部导航栏

设置id为"footer"的导航, 框架会对此做些设置: 如果当前页面为导航栏中的一项时, 就会自动显示导航栏.
例: 在html中添加底部导航:

	<div id="footer">
		<a href="#home">订单</a>
		<a href="#me">我</a>
	</div>

如果要添加其它底部导航，可以用ft类加mui-navbar类，例如下例显示一个底部工具栏：

	<div class="ft mui-navbar noactive">
		<a href="javascript:;">添加</a>
		<a href="javascript:;">更新</a>
		<a href="javascript:;">删除</a>
	</div>

## 图片按需加载

仅当页面创建时才会加载。

	<img src="../m/images/ui/carwash.png">

## 原生应用支持

使用MUI框架的Web应用支持被安卓/苹果原生应用加载（通过cordova技术）。

设置说明：

- 在Web应用中指定正确的应用程序名(MUI.options.appName).
- App加载Web应用时在URL中添加cordova={ver}参数，就可自动加载cordova插件(m/cordova或m/cordova-ios目录下的cordova.js文件)，从而可以调用原生APP功能。
- 在App打包后，将apk包或ipa包其中的cordova.js/cordova_plugins.js/plugins文件或目录拷贝出来，合并到 cordova 或 cordova-ios目录下。
  其中，cordova_plugins.js文件应手工添加所需的插件，并根据应用名(MUI.options.appName)及版本(g_args.cordova)设置filter. 可通过 cordova.require("cordova/plugin_list") 查看应用究竟使用了哪些插件。
- 在部署Web应用时，建议所有cordova相关的文件合并成一个文件（通过Webcc打包）

不同的app大版本(通过URL参数cordova=?识别)或不同平台加载的插件是不一样的，要查看当前加载了哪些插件，可以在Web控制台中执行：

	cordova.require('cordova/plugin_list')

对原生应用的额外增强包括：

@key topic-splashScreen
@see MUI.options.manualSplash

- 应用加载完成后，自动隐藏启动画面(SplashScreen)。如果需要自行隐藏启动画面，可以设置

		MUI.options.manualSplash = true; // 可以放在H5应用的主js文件中，如index.js

	然后开发者自己加载完后隐藏SplashScreen:

		if (navigator.splashscreen && navigator.splashscreen.hide)
			navigator.splashscreen.hide();

@key topic-iosStatusBar
@see MUI.options.noHandleIosStatusBar

- ios7以上, 框架自动为顶部状态栏留出20px高度的空间. 默认为白色，可以修改类mui-container的样式，如改为黑色：

	.mui-container {
		background-color:black;
	}

如果使用了StatusBar插件, 可以取消该行为. 
先设置选项：

	MUI.options.noHandleIosStatusBar = true; // 可以放在H5应用的主js文件中，如index.js

然后在deviceready事件中自行设置样式, 如

	function muiInit() {
		$(document).on("deviceready", onSetStatusBar);
		function onSetStatusBar()
		{
			var bar = window.StatusBar;
			if (bar) {
				bar.styleLightContent();
				bar.backgroundColorByHexString("#ea8010");
			}
		}
	}

@key deviceready APP初始化后回调事件

APP初始化成功后，回调该事件。如果deviceready事件未被回调，则出现启动页无法消失、插件调用无效、退出程序时无提示等异常。
其可能的原因是：

- m/cordova/cordova.js文件版本不兼容，如创建插件cordova平台是5.0版本，而相应的cordova.js文件或接口文件版本不同。
- 在编译原生程序时未设置 <allow-navigation href="*">，或者html中CSP设置不正确。
- 主页中有跨域的script js文件无法下载。如 `<script type="text/javascript" src="http://3.3.3.3/1.js"></script>`
- 某插件的初始化过程失败（需要在原生环境下调试）

## 系统类标识

框架自动根据系统环境为应用容器(.mui-container类)增加以下常用类标识：

@key .mui-android 安卓系统
@key .mui-ios 苹果IOS系统
@key .mui-weixin 微信浏览器
@key .mui-cordova 原生环境

在css中可以利用它们做针对系统的特殊设置。

## 手势支持

如果使用了 jquery.touchSwipe 库，则默认支持手势：

- 右划：页面后退
- 左划：页面前进

@key mui-swipenav DOM属性
如果页面中某组件上的左右划与该功能冲突，可以设置属性mui-swipenav="no"来禁用该功能：

	<div mui-swipenav="no"></div>

@key .noSwipe CSS-class
左右划前进后退功能会导致横向滚动生效。可以通过添加noSwipe类（注意大小写）的方式禁用swipe事件恢复滚动功能：

	<div class="noSwipe"></div>

## 跨域前端开发支持

典型应用是, 在开发前端页面时, 本地无须运行任何后端服务器(如apache/iis/php等), 直接跨域连接远程接口进行开发.

支持直接在浏览器中打开html/js文件运行应用.
需要浏览器支持CORS相关设置. 以下以chrome为例介绍.
例如, 远程接口的基础URL地址为 http://oliveche.com/jdcloud/

- 为chrome安装可设置CORS的插件(例如ForceCORS), 并设置:

		添加URL: http://oliveche.com/*
		Access-Control-Allow-Origin: file://
		Access-Control-Allow-Credentials: true

- 打开chrome时设置参数 --allow-file-access-from-files 以允许ajax取本地文件.
- 在app.js中正确设置接口URL，如

		$.extend(MUI.options, {
			serverUrl: "http://oliveche.com/jdcloud/api.php"
			// serverUrlAc: "ac"
		});

这时直接在chrome中打开html文件即可连接远程接口运行起来.
 */
// ====== WEBCC_END_FILE doc.js }}}

// ====== WEBCC_BEGIN_FILE common.js {{{
jdModule("jdcloud.common", JdcloudCommon);
function JdcloudCommon()
{
var self = this;

/**
@fn assert(cond, dscr?)
 */
self.assert = assert;
function assert(cond, dscr)
{
	if (!cond) {
		var msg = "!!! assert fail!";
		if (dscr)
			msg += " - " + dscr;
		throw(msg);
	}
}

/**
@fn parseQuery(str)

解析url编码格式的查询字符串，返回对应的对象。

	if (location.search) {
		var queryStr = location.search.substr(1); // "?id=100&name=abc&val=3.14"去掉"?"号
		var args = parseQuery(queryStr); // {id: 100, name: "abc", val: 3.14}
	}

注意：

如果值为整数或小数，则会转成相应类型。如上例中 id为100,不是字符串"100".
 */
self.parseQuery = parseQuery;
function parseQuery(s)
{
	var ret = {};
	if (s != "")
	{
		var a = s.split('&')
		for (i=0; i<a.length; ++i) {
			var a1 = a[i].split("=");
			var val = a1[1];
			if (val === undefined)
				val = 1;
			else if (/^-?[0-9]+$/.test(val)) {
				val = parseInt(val);
			}
			else if (/^-?[0-9.]+$/.test(val)) {
				val = parseFloat(val);
			}
			else {
				val = decodeURIComponent(val);
			}
			ret[a1[0]] = val;
		}
	}
	return ret;
}

/**
@fn tobool(v)

将字符串转成boolean值。除"0", "1"外，还可以支持字符串 "on"/"off", "true"/"false"等。
*/
self.tobool = tobool;
function tobool(v)
{
	if (typeof v === "string")
		return v !== "" && v !== "0" && v.toLowerCase() !== "false" && v.toLowerCase() !== "off";
	return !!v;
}

/**
@fn reloadSite()

重新加载当前页面，但不要#hash部分。
*/
self.reloadSite = reloadSite;
function reloadSite()
{
	var href = location.href.replace(/#.+/, '#');
	location.href = href;
	location.reload();
	throw "abort";
}

// ====== Date {{{
// ***************** DATE MANIPULATION: format, addMonth, addDay, addHours ******************

function setWidth_2(number)
{
	return number < 10? ("0" + number) : ("" + number);
}

/**
@fn Date.format(fmt?=L)

日期对象格式化字符串。

@param fmt 格式字符串。由以下组成：

	yyyy - 四位年，如2008, 1999
	yy - 两位年，如 08, 99
	mm - 两位月，如 02, 12
	dd - 两位日，如 01, 30
	HH - 两位小时，如 00, 23
	MM - 两位分钟，如 00, 59
	SS - 两位秒，如 00, 59

	支持这几种常用格式：
	L - 标准日期时间，相当于 "yyyy-mm-dd HH:MM:SS"
	D - 标准日期，相当于 "yyyy-mm-dd"
	T - 标准时间，相当于 "HH:MM:SS"

示例：

	var dt = new Date();
	var dtStr1 = dt.format("D"); // "2009-10-20"
	var dtStr2 = dt.format("yyyymmdd-HHMM"); // "20091020-2038"

 */
Date.prototype.format = function(fmt)
{
	if (fmt == null)
		fmt = "L";

	switch (fmt) {
	case "L":
		fmt = "yyyy-mm-dd HH:MM:SS";
		break;
	case "D":
		fmt = "yyyy-mm-dd";
		break;
	case "T":
		fmt = "HH:MM:SS";
		break;
	}
	var year = this.getFullYear();
	return fmt.replace("yyyy", year)
	          .replace("yy", ("" + year).substring(2))
	          .replace("mm", setWidth_2(this.getMonth()+1))
	          .replace("dd", setWidth_2(this.getDate()))
	          .replace("HH", setWidth_2(this.getHours()))
	          .replace("MM", setWidth_2(this.getMinutes()))
	          .replace("SS", setWidth_2(this.getSeconds()))
			  ;
}

/** @fn Date.addDay(n) */
Date.prototype.addDay = function(iDay)
{
	this.setDate(this.getDate() + iDay);
	return this;
}

/** @fn Date.addHours(n) */
Date.prototype.addHours = function (iHours)
{
	this.setHours(this.getHours() + iHours);
	return this;
}

/** @fn Date.addMin(n) */
Date.prototype.addMin = function (iMin)
{
	this.setMinutes(this.getMinutes() + iMin);
	return this;
}

/** @fn Date.addMonth(n) */
Date.prototype.addMonth = function (iMonth)
{
	this.setMonth(this.getMonth() + iMonth);
	return this;
}

/*
// Similar to the VB interface
// the following interface conform to: dt - DateTime(DateValue(dt), TimeValue(dt)) == 0
function DateValue(dt)
{
	//return new Date(Date.parse(dt.getFullYear() + "/" + dt.getMonth() + "/" + dt.getDate()));
	return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function TimeValue(dt)
{
	return new Date(0,0,1,dt.getHours(),dt.getMinutes(),dt.getSeconds());
}

function DateTime(d, t)
{
	return new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.getHours(),t.getMinutes(),t.getSeconds());
}
*/

/**
@fn parseTime(s)

将纯时间字符串生成一个日期对象。

	var dt1 = parseTime("10:10:00");
	var dt2 = parseTime("10:11");

 */
self.parseTime = parseTime;
function parseTime(s)
{
	var a = s.split(":");
	var dt =  new Date(0,0,1, a[0],a[1]||0,a[2]||0);
	if (isNaN(dt.getYear()))
		return null;
	return dt;
}

/**
@fn parseDate(dateStr)

将日期字符串转为日期时间格式。其效果相当于`new Date(Date.parse(dateStr))`，但兼容性更好（例如在safari中很多常见的日期格式无法解析）

示例：

	var dt1 = parseDate("2012-01-01");
	var dt2 = parseDate("2012/01/01 20:00:09");
	var dt3 = parseDate("2012.1.1 20:00");

支持时区，时区格式可以是"+8", "+08", "+0800", "Z"这些，如

	parseDate("2012-01-01T09:10:20.328+0800");
	parseDate("2012-01-01T09:10:20Z");

 */
self.parseDate = parseDate;
function parseDate(str)
{
	if (str == null)
		return null;
	if (str instanceof Date)
		return str;
	if (/Z$/.test(str)) { // "2017-04-22T16:22:50.778Z", 部分浏览器不支持 "2017-04-22T00:00:00+0800"
		return new Date(str);
	}
	var ms = str.match(/^(\d+)(?:[-\/.](\d+)(?:[-\/.](\d+))?)?/);
	if (ms == null)
		return null;
	var y, m, d;
	var now = new Date();
	if (ms[3] !== undefined) {
		y = parseInt(ms[1]);
		m = parseInt(ms[2])-1;
		d = parseInt(ms[3]);
		if (y < 100)
			y += 2000;
	}
	else if (ms[2] !== undefined) {
		y = now.getFullYear();
		m = parseInt(ms[1])-1;
		d = parseInt(ms[2]);
	}
	else {
		y = now.getFullYear();
		m = now.getMonth();
		d = parseInt(ms[1]);
	}
	var h, n, s;
	h=0; n=0; s=0;
	ms = str.match(/(\d+):(\d+)(?::(\d+))?/);
	if (ms != null) {
		h = parseInt(ms[1]);
		n = parseInt(ms[2]);
		if (ms[3] !== undefined)
			s = parseInt(ms[3]);
	}
	var dt = new Date(y, m, d, h, n, s);
	if (isNaN(dt.getYear()))
		return null;
	// 时区(前面必须是时间如 00:00:00.328-02 避免误匹配 2017-08-11 当成-11时区
	ms = str.match(/:[0-9.T]+([+-])(\d{1,4})$/);
	if (ms != null) {
		var sign = (ms[1] == "-"? -1: 1);
		var cnt = ms[2].length;
		var n = parseInt(ms[2].replace(/^0+/, ''));
		if (isNaN(n))
			n = 0;
		else if (cnt > 2)
			n = Math.floor(n/100);
		var tzOffset = sign*n*60 + dt.getTimezoneOffset();
		if (tzOffset)
			dt.addMin(-tzOffset);
	}
	return dt;
}

/**
@fn Date.add(sInterval, n)

为日期对象加几天/小时等。参数n为整数，可以为负数。

@param sInterval Enum. 间隔单位. d-天; m-月; y-年; h-小时; n-分; s-秒

示例：

	var dt = new Date();
	dt.add("d", 1); // 1天后
	dt.add("m", 1); // 1个月后
	dt.add("y", -1); // 1年前
	dt.add("h", 3); // 3小时后
	dt.add("n", 30); // 30分钟后
	dt.add("s", 30); // 30秒后

@see Date.diff
 */
Date.prototype.add = function (sInterval, n)
{
	switch (sInterval) {
	case 'd':
		this.setDate(this.getDate()+n);
		break;
	case 'm':
		this.setMonth(this.getMonth()+n);
		break;
	case 'y':
		this.setFullYear(this.getFullYear()+n);
		break;
	case 'h':
		this.setHours(this.getHours()+n);
		break;
	case 'n':
		this.setMinutes(this.getMinutes()+n);
		break;
	case 's':
		this.setSeconds(this.getSeconds()+n);
		break;
	}
	return this;
}

/**
@fn Date.diff(sInterval, dtEnd)

计算日期到另一日期间的间隔，单位由sInterval指定(具体值列表参见Date.add).

	var dt = new Date();
	...
	var dt2 = new Date();
	var days = dt.diff("d", dt2); // 相隔多少天

@see Date.add
*/
Date.prototype.diff = function(sInterval, dtEnd)
{
	var dtStart = this;
	switch (sInterval) 
	{
		case 'd' :return Math.round((dtEnd - dtStart) / 86400000);
		case 'm' :return dtEnd.getMonth() - dtStart.getMonth() + (dtEnd.getFullYear()-dtStart.getFullYear())*12;
		case 'y' :return dtEnd.getFullYear() - dtStart.getFullYear();
		case 's' :return Math.round((dtEnd - dtStart) / 1000);
		case 'n' :return Math.round((dtEnd - dtStart) / 60000);
		case 'h' :return Math.round((dtEnd - dtStart) / 3600000);
	}
}

/**
@fn getTimeDiffDscr(tm, tm1)

从tm到tm1的时间差描述，如"2分钟前", "3天前"等。

tm和tm1可以为时间对象或时间字符串
*/
self.getTimeDiffDscr = getTimeDiffDscr;
function getTimeDiffDscr(tm, tm1)
{
	if (!tm || !tm1)
		return "";
	if (! (tm instanceof Date)) {
		tm = parseDate(tm);
	}
	if (! (tm1 instanceof Date)) {
		tm1 = parseDate(tm1);
	}
	var diff = (tm1 - tm) / 1000;
	if (diff < 60) {
		return "刚刚";
	}
	diff /= 60; // 分钟
	if (diff < 60) {
		return Math.floor(diff) + "分钟前";
	}
	diff /= 60; // 小时
	if (diff < 48) {
		return Math.floor(diff) + "小时前";
	}
	diff /= 24; // 天
	if (diff < 365*2)
		return Math.floor(diff) + "天前";
	diff /= 365;
	if (diff < 10)
		return Math.floor(diff) + "年前";
	return "很久前";
}

// }}}

// ====== Cookie and Storage (localStorage/sessionStorage) {{{
/**
@fn setCookie(name, value, days?=30)

设置cookie值。如果只是为了客户端长时间保存值，一般建议使用 setStorage.

@see getCookie
@see delCookie
@see setStorage
*/
self.setCookie = setCookie;
function setCookie(name,value,days)
{
	if (days===undefined)
		days = 30;
	if (value == null)
	{
		days = -1;
		value = "";
	}
	var exp  = new Date();
	exp.setTime(exp.getTime() + days*24*60*60*1000);
	document.cookie = name + "="+ escape (value) + ";expires=" + exp.toGMTString();
}

/**
@fn getCookie(name)

取cookie值。

@see setCookie
@see delCookie
*/
self.getCookie = getCookie;
function getCookie(name)
{
	var m = document.cookie.match(new RegExp("(^| )"+name+"=([^;]*)(;|$)"));
	if(m != null) {
		return (unescape(m[2]));
	} else {
		return null;
	}
}

/**
@fn delCookie(name)

删除一个cookie项。

@see getCookie
@see setCookie
*/
self.delCookie = delCookie;
function delCookie(name)
{
	if (getCookie(name) != null) {
		setCookie(name, null, -1);
	}
}

/**
@fn setStorage(name, value, useSession?=false)

使用localStorage存储(或使用sessionStorage存储, 如果useSession=true)。
注意只能存储字符串，所以value不可以为数组，对象等，必须序列化后存储。 

如果浏览器不支持Storage，则使用cookie实现.

示例：

	setStorage("id", "100");
	var id = getStorage("id");
	delStorage("id");

示例2：对象需要序列化后存储：

	var obj = {id:10, name:"Jason"};
	setStorage("obj", JSON.stringify(obj));
	var obj2 = getStorage("obj");
	alert(obj2.name);

@see getStorage
@see delStorage
*/
self.setStorage = setStorage;
function setStorage(name, value, useSession)
{
	assert(typeof value != "object", "value must be scalar!");
	if (window.localStorage == null)
	{
		setCookie(name, value);
		return;
	}
	if (useSession)
		sessionStorage.setItem(name, value);
	else
		localStorage.setItem(name, value);
}

/**
@fn getStorage(name, useSession?=false)

取storage中的一项。
默认使用localStorage存储，如果useSession=true，则使用sessionStorage存储。

如果浏览器不支持Storage，则使用cookie实现.

@see setStorage
@see delStorage
*/
self.getStorage = getStorage;
function getStorage(name, useSession)
{
	if (window.localStorage == null)
	{
		getCookie(name);
		return;
	}
	var rv;
	if (useSession)
		rv = sessionStorage.getItem(name);
	else
		rv = localStorage.getItem(name);

	// 兼容之前用setCookie设置的项
	if (rv == null)
		return getCookie(name);
	return rv;
}

/**
@fn delStorage(name)

删除storage中的一项。

@see getStorage
@see setStorage
*/
self.delStorage = delStorage;
function delStorage(name, useSession)
{
	if (window.localStorage == null)
	{
		delCookie(name);
		return;
	}
	if (useSession)
		sessionStorage.removeItem(name);
	else
		localStorage.removeItem(name);
	delCookie(name);
}
//}}}

// ====== rs object {{{
/**
@fn rs2Array(rs)

@param rs={h=[header], d=[ @row ]} rs对象(RowSet)
@return arr=[ %obj ]

rs对象用于传递表格，包含表头与表内容。
函数用于将服务器发来的rs对象转成数组。

示例：

	var rs = {
		h: ["id", "name"], 
		d: [ [100, "Tom"], [101, "Jane"] ] 
	};
	var arr = rs2Array(rs); 

	// 结果为
	arr = [
		{id: 100, name: "Tom"},
		{id: 101, name: "Jane"} 
	];

@see rs2Hash
@see rs2MultiHash
*/
self.rs2Array = rs2Array;
function rs2Array(rs)
{
	var ret = [];
	var colCnt = rs.h.length;

	for (var i=0; i<rs.d.length; ++i) {
		var obj = {};
		var row = rs.d[i];
		for (var j=0; j<colCnt; ++j) {
			obj[rs.h[j]] = row[j];
		}
		ret.push(obj);
	}
	return ret;
}

/**
@fn rs2Hash(rs, key)

@param rs={h, d}  rs对象(RowSet)
@return hash={key => %obj}

示例：

	var rs = {
		h: ["id", "name"], 
		d: [ [100, "Tom"], [101, "Jane"] ] 
	};
	var hash = rs2Hash(rs, "id"); 

	// 结果为
	hash = {
		100: {id: 100, name: "Tom"},
		101: {id: 101, name: "Jane"}
	};

@see rs2Array
*/
self.rs2Hash = rs2Hash;
function rs2Hash(rs, key)
{
	var ret = {};
	var colCnt = rs.h.length;
	for (var i=0; i<rs.d.length; ++i) {
		var obj = {};
		var row = rs.d[i];
		for (var j=0; j<colCnt; ++j) {
			obj[rs.h[j]] = row[j];
		}
		ret[ obj[key] ] = obj;
	}
	return ret;
}

/**
@fn rs2MultiHash(rs, key)

@param rs={h, d}  rs对象(RowSet)
@return hash={key => [ %obj ]}

示例：

	var rs = {
		h: ["id", "name"], 
		d: [ [100, "Tom"], [101, "Jane"], [102, "Tom"] ] 
	};
	var hash = rs2MultiHash(rs, "name");  

	// 结果为
	hash = {
		"Tom": [{id: 100, name: "Tom"}, {id: 102, name: "Tom"}],
		"Jane": [{id: 101, name: "Jane"}]
	};

@see rs2Hash
@see rs2Array
*/
self.rs2MultiHash = rs2MultiHash;
function rs2MultiHash(rs, key)
{
	var ret = {};
	var colCnt = rs.h.length;
	for (var i=0; i<rs.d.length; ++i) {
		var obj = {};
		var row = rs.d[i];
		for (var j=0; j<colCnt; ++j) {
			obj[rs.h[j]] = row[j];
		}
		if (ret[ obj[key] ] === undefined)
			ret[ obj[key] ] = [];
		ret[ obj[key] ].push(obj);
	}
	return ret;
}
//}}}

/**
@fn intSort(a, b)

整数排序. 用于datagrid column sorter:

	<th data-options="field:'id', sortable:true, sorter:intSort">编号</th>

 */
self.intSort = intSort;
function intSort(a, b)
{
	return parseInt(a) - parseInt(b);
}

/**
@fn numberSort(a, b)

小数排序. 用于datagrid column sorter:

	<th data-options="field:'score', sortable:true, sorter:numberSort">评分</th>

 */
self.numberSort = numberSort;
function numberSort(a, b)
{
	return parseFloat(a) - parseFloat(b);
}

/**
@fn getAncestor(o, fn)

取符合条件(fn)的对象，一般可使用$.closest替代
*/
self.getAncestor = getAncestor;
function getAncestor(o, fn)
{
	while (o) {
		if (fn(o))
			return o;
		o = o.parentElement;
	}
	return o;
}

/**
@fn appendParam(url, param)

示例:

	var url = "http://xxx/api.php";
	if (a)
		url = appendParam(url, "a=" + a);
	if (b)
		url = appendParam(url, "b=" + b);

	appendParam(url, $.param({a:1, b:3}));

支持url中带有"?"或"#"，如

	var url = "http://xxx/api.php?id=1#order";
	appendParam(url, "pay=1"); // "http://xxx/api.php?id=1&pay=1#order";

*/
self.appendParam = appendParam;
function appendParam(url, param)
{
	if (param == null)
		return url;
	var ret;
	var a = url.split("#");
	ret = a[0] + (url.indexOf('?')>=0? "&": "?") + param;
	if (a.length > 1) {
		ret += "#" + a[1];
	}
	return ret;
}

/**
@fn deleteParam(url, paramName)

示例:

	var url = "http://xxx/api.php?a=1&b=3&c=2";
	var url1 = deleteParam(url, "b"); // "http://xxx/api.php?a=1&c=2";

*/
self.deleteParam = deleteParam;
function deleteParam(url, paramName)
{
	var ret = url.replace(new RegExp('&?' + paramName + "=[^&#]+"), '');
	if (ret.indexOf('?&') >=0) {
		ret = ret.replace('?&', '?');
	}
	return ret;
}

/** @fn isWeixin()
当前应用运行在微信中。
*/
self.isWeixin = isWeixin;
function isWeixin()
{
	return /micromessenger/i.test(navigator.userAgent);
}

/** @fn isIOS()
当前应用运行在IOS平台，如iphone或ipad中。
*/
self.isIOS = isIOS;
function isIOS()
{
	return /iPhone|iPad/i.test(navigator.userAgent);
}

/** @fn isAndroid()
当前应用运行在安卓平台。
*/
self.isAndroid = isAndroid;
function isAndroid()
{
	return /Android/i.test(navigator.userAgent);
}

/**
@fn parseValue(str)

如果str符合整数或小数，则返回相应类型。
 */
self.parseValue = parseValue;
function parseValue(str)
{
	if (str == null)
		return str;
	var val = str;
	if (/^-?[0-9]+$/.test(str)) {
		val = parseInt(str);
	}
	if (/^-?[0-9.]+$/.test(str)) {
		val = parseFloat(str);
	}
	return val;
}

/**
@fn applyTpl(tpl, data)

对模板做字符串替换

	var tpl = "<li><p>{name}</p><p>{dscr}</p></li>";
	var data = {name: 'richard', dscr: 'hello'};
	var html = applyTpl(tpl, data);
	// <li><p>richard</p><p>hello</p></li>

*/
self.applyTpl = applyTpl;
function applyTpl(tpl, data)
{
	return tpl.replace(/{(\w+)}/g, function(m0, m1) {
		return data[m1];
	});
}

/**
@fn delayDo(fn, delayCnt?=3)

设置延迟执行。当delayCnt=1时与setTimeout效果相同。
多次置于事件队列最后，一般3次后其它js均已执行完毕，为idle状态
*/
self.delayDo = delayDo;
function delayDo(fn, delayCnt)
{
	if (delayCnt == null)
		delayCnt = 3;
	doIt();
	function doIt()
	{
		if (delayCnt == 0)
		{
			fn();
			return;
		}
		-- delayCnt;
		setTimeout(doIt);
	}
}

function initModule()
{
	// bugfix: 浏览器兼容性问题
	if (String.prototype.startsWith == null) {
		String.prototype.startsWith = function (s) { return this.substr(0, s.length) == s; }
	}

	if (window.console === undefined) {
		window.console = {
			log:function () {}
		}
	}
}
initModule();

}/*jdcloud common*/

/**
@fn jdModule(name, fn)
定义一个模块，返回该模块对象。

@fn jdModule(name)
获取模块对象。

@fn jdModule()
返回模块映射表。

*/
function jdModule(name, fn, overrideCtor)
{
	if (!window.jdModuleMap) {
		window.jdModuleMap = {};
	}

	if (name == null) {
		return window.jdModuleMap;
	}

	var ret;
	if (fn instanceof Function) {
		if (window.jdModuleMap[name]) {
			fn.call(window.jdModuleMap[name]);
		}
		else {
			window.jdModuleMap[name] = new fn();
		}
		ret = window.jdModuleMap[name];
		if (overrideCtor)
			ret.constructor = fn;
		/*
		// e.g. create window.jdcloud.common
		var arr = name.split('.');
		var obj = window;
		for (var i=0; i<arr.length; ++i) {
			if (i == arr.length-1) {
				obj[arr[i]] = ret;
				break;
			}
			if (! (arr[i] in obj)) {
				obj[arr[i]] = {};
			}
			obj = obj[arr[i]];
		}
		*/
	}
	else {
		ret = window.jdModuleMap[name];
		if (!ret) {
			throw "load module fails: " + name;
		}
	}
	return ret;
}

// vi: foldmethod=marker 
// ====== WEBCC_END_FILE common.js }}}

// ====== WEBCC_BEGIN_FILE commonjq.js {{{
jdModule("jdcloud.common", JdcloudCommonJq);
function JdcloudCommonJq()
{
var self = this;

self.assert(window.jQuery, "require jquery lib.");
/**
@fn getFormData(jo)

取DOM对象中带name属性的子对象的内容, 放入一个JS对象中, 以便手工调用callSvr.

注意: 

- 这里Form不一定是Form标签, 可以是一切DOM对象.
- 如果DOM对象有disabled属性, 则会忽略它, 这也与form提交时的规则一致.

与setFormData配合使用时, 可以只返回变化的数据.

	jf.submit(function () {
		var ac = jf.attr("action");
		callSvr(ac, fn, getFormData(jf));
	});

如果在jo对象上指定了属性enctype="multipart/form-data"，则调用getFormData会返回FormData对象而非js对象，
再调用callSvr时，会以"multipart/form-data"格式提交数据。
示例：

	<form method="POST" enctype='multipart/form-data'>
		课程文档
		<input name="pdf" type="file" accept="application/pdf">
	</form>

@see setFormData
 */
self.getFormData = getFormData;
function getFormData(jo)
{
	var data = {};
	var isFormData = false;
	if (jo.attr("enctype") == "multipart/form-data") {
		isFormData = true;
		data = new FormData();
	}
	var orgData = jo.data("origin_") || {};
	formItems(jo, function (name, content) {
		var ji = this;
		var orgContent = orgData[name];
		if (orgContent == null)
			orgContent = "";
		if (content == null)
			content = "";
		if (content !== String(orgContent)) // 避免 "" == 0 或 "" == false
		{
			if (! isFormData) {
				data[name] = content;
			}
			else {
				if (ji.is(":file")) {
					// 支持指定multiple，如  <input name="pdf" type="file" multiple accept="application/pdf">
					$.each(ji.prop("files"), function (i, e) {
						data.append(name, e);
					});
				}
				else {
					data.append(name, content);
				}
			}
		}
	});
	return data;
}

/**
@fn formItems(jo, cb)

遍历jo下带name属性的有效控件，回调cb函数。

注意:

- 忽略有disabled属性的控件
- 忽略未选中的checkbox/radiobutton

@param cb(name, val) this=ji=当前jquery对象
当cb返回false时可中断遍历。

 */
self.formItems = formItems;
function formItems(jo, cb)
{
	jo.find("[name]:not([disabled])").each (function () {
		var name = this.name;
		if (! name)
			return;

		var ji = $(this);
		var val;
		if (ji.is(":input")) {
			if (this.type == "checkbox" && !this.checked)
				return;
			if (this.type == "radio" && !this.checked)
				return;
			val = ji.val();
		}
		else {
			val = ji.html();
		}
		if (cb.call(ji, name,  val) === false)
			return false;
	});
}

/**
@fn setFormData(jo, data?, opt?)

用于为带name属性的DOM对象设置内容为data[name].
要清空所有内容, 可以用 setFormData(jo), 相当于增强版的 form.reset().

注意:
- DOM项的内容指: 如果是input/textarea/select等对象, 内容为其value值; 如果是div组件, 内容为其innerHTML值.
- 当data[name]未设置(即值为undefined, 注意不是null)时, 对于input/textarea等组件, 行为与form.reset()逻辑相同, 
 即恢复为初始化值, 除了input[type=hidden]对象, 它的内容不会变.
 对div等其它对象, 会清空该对象的内容.
- 如果对象设置有属性"noReset", 则不会对它进行设置.

@param opt {setOrigin?=false}

选项 setOrigin: 为true时将data设置为数据源, 这样在getFormData时, 只会返回与数据源相比有变化的数据.
缺省会设置该DOM对象数据源为空.

对象关联的数据源, 可以通过 jo.data("origin_") 来获取, 或通过 jo.data("origin_", newOrigin) 来设置.

示例：

	<div id="div1">
		<p>订单描述：<span name="dscr"></span></p>
		<p>状态为：<input type=text name="status"></p>
		<p>金额：<span name="amount"></span>元</p>
	</div>

Javascript:

	var data = {
		dscr: "筋斗云教程",
		status: "已付款",
		amount: "100"
	};
	var jo = $("#div1");
	var data = setFormData(jo, data); 
	$("[name=status]").html("已完成");
	var changedData = getFormData(jo); // 返回 { dscr: "筋斗云教程", status: "已完成", amount: "100" }

	var data = setFormData(jo, data, {setOrigin: true}); 
	$("[name=status]").html("已完成");
	var changedData = getFormData(jo); // 返回 { status: "已完成" }
	$.extend(jo.data("origin_"), changedData); // 合并变化的部分到数据源.

@see getFormData
 */
self.setFormData = setFormData;
function setFormData(jo, data, opt)
{
	var opt1 = $.extend({
		setOrigin: false
	}, opt);
	if (data == null)
		data = {};
	var jo1 = jo.filter("[name]:not([noReset])");
	jo.find("[name]:not([noReset])").add(jo1).each (function () {
		var ji = $(this);
		var name = ji.attr("name");
		var content = data[name];
		var isInput = ji.is(":input");
		if (content === undefined) {
			if (isInput) {
				if (ji[0].tagName === "TEXTAREA")
					content = ji.html();
				else
					content = ji.attr("value");
				if (content === undefined)
					content = "";
			}
			else {
				content = "";
			}
		}
		if (ji.is(":input")) {
			ji.val(content);
		}
		else {
			ji.html(content);
		}
	});
	jo.data("origin_", opt1.setOrigin? data: null);
}

/**
@fn loadScript(url, fnOK?, ajaxOpt?)

@param fnOK 加载成功后的回调函数
@param ajaxOpt 传递给$.ajax的额外选项。

默认未指定ajaxOpt时，简单地使用添加script标签机制异步加载。如果曾经加载过，可以重用cache。

如果指定ajaxOpt，且非跨域，则通过ajax去加载，可以支持同步调用。如果是跨域，仍通过script标签方式加载，注意加载完成后会自动删除script标签。

返回defered对象(与$.ajax类似)，可以用 dfd.then() / dfd.fail() 异步处理。

常见用法：

- 动态加载一个script，异步执行其中内容：

		loadScript("1.js", onload); // onload中可使用1.js中定义的内容
		loadScript("http://otherserver/path/1.js"); // 跨域加载

- 加载并立即执行一个script:

		loadScript("1.js", {async: false});
		// 可立即使用1.js中定义的内容

如果要动态加载script，且使用后删除标签（里面定义的函数会仍然保留），建议直接使用`$.getScript`，它等同于：

	loadScript("1.js", {cache: false});

*/
self.loadScript = loadScript;
function loadScript(url, fnOK, options)
{
	if ($.isPlainObject(fnOK)) {
		options = fnOK;
		fnOK = null;
	}
	if (options) {
		var ajaxOpt = $.extend({
			dataType: "script",
			cache: true,
			success: fnOK,
			url: url,
			error: function (xhr, textStatus, err) {
				console.log("*** loadScript fails for " + url);
				console.log(err);
			}
		}, options);

		return jQuery.ajax(ajaxOpt);
	}

	var dfd_ = $.Deferred();
	var script= document.createElement('script');
	script.type= 'text/javascript';
	script.src= url;
	// script.async = !sync; // 不是同步调用的意思，参考script标签的async属性和defer属性。
	script.onload = function () {
		if (fnOK)
			fnOK();
		dfd_.resolve();
	}
	script.onerror = function () {
		dfd_.reject();
		console.log("*** loadScript fails for " + url);
	}
	document.head.appendChild(script);
	return dfd_;
}

/**
@fn setDateBox(jo, defDateFn?)

设置日期框, 如果输入了非法日期, 自动以指定日期(如未指定, 用当前日期)填充.

	setDateBox($("#txtComeDt"), function () { return genDefVal()[0]; });

 */
self.setDateBox = setDateBox;
function setDateBox(jo, defDateFn)
{
	jo.blur(function () {
		var dt = self.parseDate(this.value);
		if (dt == null) {
			if (defDateFn)
				dt = defDateFn();
			else
				dt = new Date();
		}
		this.value = dt.format("D");
	});
}

/**
@fn setTimeBox(jo, defTimeFn?)

设置时间框, 如果输入了非法时间, 自动以指定时间(如未指定, 用当前时间)填充.

	setTimeBox($("#txtComeTime"), function () { return genDefVal()[1]; });

 */
self.setTimeBox = setTimeBox;
function setTimeBox(jo, defTimeFn)
{
	jo.blur(function () {
		var dt = self.parseTime(this.value);
		if (dt == null) {
			if (defTimeFn)
				dt = defTimeFn();
			else
				dt = new Date();
		}
		this.value = dt.format("HH:MM");
	});
}

/**
@fn waitFor(deferredObj)

用于简化异步编程. 可将不易读的回调方式改写为易读的顺序执行方式.

	var dfd = $.getScript("http://...");
	function onSubmit()
	{
		dfd.then(function () {
			foo();
			bar();
		});
	}

可改写为:

	function onSubmit()
	{
		if (waitFor(dfd)) return;
		foo();
		bar();
	}

*/
self.waitFor = waitFor;
function waitFor(dfd)
{
	if (waitFor.caller == null)
		throw "waitFor MUST be called in function!";

	if (dfd.state() == "resolved")
		return false;

	if (!dfd.isset_)
	{
		var caller = waitFor.caller;
		var args = caller.arguments;
		dfd.isset_ = true;
		dfd.then(function () { caller.apply(this, args); });
	}
	return true;
}

/**
@fn jQuery.fn.jdata(val?)

和使用$.data()差不多，更好用一些. 例：

	$(o).jdata().hello = 100;
	$(o).jdata({hello:100, world:200});

*/
$.fn.jdata = function (val) {
	if (val != null) {
		this.data("jdata", val);
		return val;
	}
	var jd = this.data("jdata");
	if (jd == null)
		jd = this.jdata({});
	return jd;
}

}
// ====== WEBCC_END_FILE commonjq.js }}}

// ====== WEBCC_BEGIN_FILE app.js {{{
function JdcloudApp()
{
var self = this;
self.ctx = self.ctx || {};

window.E_AUTHFAIL=-1;
window.E_NOAUTH=2;
window.E_ABORT=-100;

/**
@fn evalAttr(jo, name)

返回一个属性做eval后的js值。

示例：读取一个对象值：

	var opt = evalAttr(jo, "data-opt");

	<div data-opt="{id:1, name:\"data1\"}"><div>

考虑兼容性，也支持忽略括号的写法，

	<div data-opt="id:1, name:\"data1\""><div>

读取一个数组：

	var arr = evalAttr(jo, "data-arr");

	<div data-arr="['aa', 'bb']"><div>

读取一个函数名（或变量）:

	var fn = evalAttr(jo, "mui-initfn");

	<div mui-initfn="initMyPage"><div>

*/
self.evalAttr = evalAttr;
function evalAttr(jo, name, ctx)
{
	var val = jo.attr(name);
	if (val) {
		if (val[0] != '{' && val.indexOf(":")>0) {
			val1 = "({" + val + "})";
		}
		else {
			val1 = "(" + val + ")";
		}
		try {
			val = eval(val1);
		}
		catch (ex) {
			self.app_alert("属性`" + name + "'格式错误: " + val, "e");
			val = null;
		}
	}
	return val;
}

/*
如果逻辑页中的css项没有以"#{pageId}"开头，则自动添加：

	.aa { color: red} .bb p {color: blue}
	.aa, .bb { background-color: black }

=> 

	#page1 .aa { color: red} #page1 .bb p {color: blue}
	#page1 .aa, #page1 .bb { background-color: black }

注意：

- 逗号的情况；
- 有注释的情况
- 支持括号嵌套，如

		@keyframes modalshow {
			from { transform: translate(10%, 0); }
			to { transform: translate(0,0); }
		}
		
- 不处理"@"开头的选择器，如"media", "@keyframes"等。
*/
self.ctx.fixPageCss = fixPageCss;
function fixPageCss(css, selector)
{
	var prefix = selector + " ";

	var level = 1;
	var css1 = css.replace(/\/\*(.|\s)*?\*\//g, '')
	.replace(/([^{}]*)([{}])/g, function (ms, text, brace) {
		if (brace == '}') {
			-- level;
			return ms;
		}
		if (brace == '{' && level++ != 1)
			return ms;

		// level=1
		return ms.replace(/((?:^|,)\s*)([^,{}]+)/g, function (ms, ms1, sel) { 
			if (sel.startsWith(prefix) || sel[0] == '@')
				return ms;
			return ms1 + prefix + sel;
		});
	});
	return css1;
}

/**
@fn app_abort()

中止之后的调用, 直接返回.
*/
self.app_abort = app_abort;
function app_abort()
{
	throw new DirectReturn();
}

/**
@class DirectReturn

直接返回. 用法:

	throw new DirectReturn();

可直接调用app_abort();
*/
window.DirectReturn = function () {}

/**
@fn MUI.setOnError()

一般框架自动设置onerror函数；如果onerror被其它库改写，应再次调用该函数。
allow throw("abort") as abort behavior.
 */
self.setOnError = setOnError;
function setOnError()
{
	var fn = window.onerror;
	window.onerror = function (msg, script, line, col, errObj) {
		if (fn && fn.apply(this, arguments) === true)
			return true;
		if (errObj instanceof DirectReturn || /abort$/.test(msg) || (!script && !line))
			return true;
		debugger;
		var content = msg + " (" + script + ":" + line + ":" + col + ")";
		if (errObj && errObj.stack)
			content += "\n" + errObj.stack.toString();
		if (self.syslog)
			self.syslog("fw", "ERR", content);
	}
}
setOnError();

// ------ enhanceWithin {{{
/**
@var MUI.m_enhanceFn
*/
self.m_enhanceFn = {}; // selector => enhanceFn

/**
@fn MUI.enhanceWithin(jparent)
*/
self.enhanceWithin = enhanceWithin;
function enhanceWithin(jp)
{
	$.each(self.m_enhanceFn, function (sel, fn) {
		var jo = jp.find(sel);
		if (jp.is(sel))
			jo = jo.add(jp);
		if (jo.size() == 0)
			return;
		jo.each(function (i, e) {
			var je = $(e);
			var opt = getOptions(je);
			if (opt.enhanced)
				return;
			opt.enhanced = true;
			fn(je);
		});
	});
}

/**
@fn MUI.getOptions(jo)
*/
self.getOptions = getOptions;
function getOptions(jo)
{
	var opt = jo.data("muiOptions");
	if (opt === undefined) {
		opt = {};
		jo.data("muiOptions", opt);
	}
	return opt;
}

//}}}

// 参考 getQueryCond中对v各种值的定义
function getop(v)
{
	if (typeof(v) == "number")
		return "=" + v;
	var op = "=";
	var is_like=false;
	if (v.match(/^(<>|>=?|<=?)/)) {
		op = RegExp.$1;
		v = v.substr(op.length);
	}
	else if (v.indexOf("*") >= 0 || v.indexOf("%") >= 0) {
		v = v.replace(/[*]/g, "%");
		op = " like ";
	}
	v = $.trim(v);

	if (v === "null")
	{
		if (op == "<>")
			return " is not null";
		return " is null";
	}
	if (v === "empty")
		v = "";
	if (v.length == 0 || v.match(/\D/) || v[0] == '0') {
		v = v.replace(/'/g, "\\'");
// 		// ???? 只对access数据库: 支持 yyyy-mm-dd, mm-dd, hh:nn, hh:nn:ss
// 		if (!is_like && v.match(/^((19|20)\d{2}[\/.-])?\d{1,2}[\/.-]\d{1,2}$/) || v.match(/^\d{1,2}:\d{1,2}(:\d{1,2})?$/))
// 			return op + "#" + v + "#";
		return op + "'" + v + "'";
	}
	return op + v;
}

/**
@fn WUI.getQueryCond(kvList)

@param kvList {key=>value}, 键值对，值中支持操作符及通配符。也支持格式 [ [key, value] ], 这时允许key有重复。

根据kvList生成BPQ协议定义的{obj}.query的cond参数。

例如:

	var kvList = {phone: "13712345678", id: ">100", addr: "上海*", picId: "null"};
	WUI.getQueryCond(kvList);

有多项时，每项之间以"AND"相连，以上定义将返回如下内容：

	"phone='13712345678' AND id>100 AND addr LIKE '上海*' AND picId IS NULL"

示例二：

	var kvList = [ ["phone", "13712345678"], ["id", ">100"], ["addr", "上海*"], ["picId", "null"] ];
	WUI.getQueryCond(kvList); // 结果同上。


设置值时，支持以下格式：

- {key: "value"} - 表示"key=value"
- {key: ">value"} - 表示"key>value", 类似地，可以用 >=, <, <=, <> 这些操作符。
- {key: "value*"} - 值中带通配符，表示"key like 'value%'" (以value开头), 类似地，可以用 "*value", "*value*", "*val*ue"等。
- {key: "null" } - 表示 "key is null"。要表示"key is not null"，可以用 "<>null".
- {key: "empty" } - 表示 "key=''".

支持简单的and/or查询，但不支持在其中使用括号:

- {key: ">value and <=value"}  - 表示"key>'value' and key<='value'"
- {key: "null or 0 or 1"}  - 表示"key is null or key=0 or key=1"

在详情页对话框中，切换到查找模式，在任一输入框中均可支持以上格式。
*/
self.getQueryCond = getQueryCond;
function getQueryCond(kvList)
{
	var condArr = [];
	if ($.isPlainObject(kvList)) {
		$.each(kvList, handleOne);
	}
	else if ($.isArray(kvList)) {
		$.each(kvList, function (i, e) {
			handleOne(e[0], e[1]);
		});
	}

	function handleOne(k,v) {
		if (v == null || v === "")
			return;
		var arr = v.split(/\s+(and|or)\s+/i);
		var str = '';
		var bracket = false;
		$.each(arr, function (i, v1) {
			if ( (i % 2) == 1) {
				str += ' ' + v1.toUpperCase() + ' ';
				bracket = true;
				return;
			}
			str += k + getop(v1);
		});
		if (bracket)
			str = '(' + str + ')';
		condArr.push(str);
		//val[e.name] = escape(v);
		//val[e.name] = v;
	}
	return condArr.join(' AND ');
}

/**
@fn WUI.getQueryParam(kvList)

根据键值对生成BQP协议中{obj}.query接口需要的cond参数.

示例：

	WUI.getQueryParam({phone: '13712345678', id: '>100'})
	返回
	{cond: "phone='13712345678' AND id>100"}

@see WUI.getQueryCond
*/
self.getQueryParam = getQueryParam;
function getQueryParam(kvList)
{
	return {cond: getQueryCond(kvList)};
}

}
// vi: foldmethod=marker
// ====== WEBCC_END_FILE app.js }}}

// ====== WEBCC_BEGIN_FILE callSvr.js {{{
function JdcloudCall()
{
var self = this;
var mCommon = jdModule("jdcloud.common");

/**
@var MUI.lastError = ctx

出错时，取出错调用的上下文信息。

ctx: {ac, tm, tv, ret}

- ac: action 调用接口名
- tm: start time 开始调用时间
- tv: time interval 从调用到返回的耗时
- ret: return value 调用返回的原始数据
*/
self.lastError = null;
var m_tmBusy;
var m_manualBusy = 0;
var m_appVer;

/**
@var MUI.disableBatch ?= false

设置为true禁用batchCall, 仅用于内部测试。
*/
self.disableBatch = false;

/**
@var MUI.m_curBatch

当前batchCall对象，用于内部调试。
*/
var m_curBatch = null;
self.m_curBatch = m_curBatch;

/**
@var MUI.mockData  模拟调用后端接口。

在后端接口尚无法调用时，可以配置MUI.mockData做为模拟接口返回数据。
调用callSvr时，会直接使用该数据，不会发起ajax请求。

mockData={ac => data/fn}  

mockData中每项可以直接是数据，也可以是一个函数：fn(param, postParam)->data

例：模拟"User.get(id)"和"User.set()(key=value)"接口：

	var user = {
		id: 1001,
		name: "孙悟空",
	};
	MUI.mockData = {
		// 方式1：直接指定返回数据
		"User.get": [0, user],

		// 方式2：通过函数返回模拟数据
		"User.set": function (param, postParam) {
			$.extend(user, postParam);
			return [0, "OK"];
		}
	}

	// 接口调用：
	var user = callSvrSync("User.get");
	callSvr("User.set", {id: user.id}, function () {
		alert("修改成功！");
	}, {name: "大圣"});

实例详见文件 mockdata.js。

在mockData的函数中，可以用this变量来取ajax调用参数。
要取HTTP动词可以用`this.type`，值为GET/POST/PATCH/DELETE之一，从而可模拟RESTful API.

可以通过MUI.options.mockDelay设置模拟调用接口的网络延时。
@see MUI.options.mockDelay

模拟数据可直接返回[code, data]格式的JSON数组，框架会将其序列化成JSON字符串，以模拟实际场景。
如果要查看调用与返回数据日志，可在浏览器控制台中设置 MUI.options.logAction=true，在控制台中查看日志。

如果设置了MUI.callSvrExt，调用名(ac)中应包含扩展(ext)的名字，例：

	MUI.callSvrExt['zhanda'] = {...};
	callSvr(['token/get-token', 'zhanda'], ...);

要模拟该接口，应设置

	MUI.mockData["zhanda:token/get-token"] = ...;

@see MUI.callSvrExt

也支持"default"扩展，如：

	MUI.callSvrExt['default'] = {...};
	callSvr(['token/get-token', 'default'], ...);
	或
	callSvr('token/get-token', ...);

要模拟该接口，可设置

	MUI.mockData["token/get-token"] = ...;

*/
self.mockData = {};

var ajaxOpt = {
	beforeSend: function (xhr) {
		// 保存xhr供dataFilter等函数内使用。
		this.xhr_ = xhr;
	},
	//dataType: "text",
	dataFilter: function (data, type) {
		if (this.jdFilter !== false && (type == "json" || type == "text")) {
			rv = defDataProc.call(this, data);
			if (rv != null)
				return rv;
			-- $.active; // ajax调用中断,这里应做些清理
			self.app_abort();
		}
		return data;
	},
	// for jquery > 1.4.2. don't convert text to json as it's processed by defDataProc.
	converters: {
		"text json": true
	},

	error: defAjaxErrProc
};
if (location.protocol == "file:") {
	ajaxOpt.xhrFields = { withCredentials: true};
}
$.ajaxSetup(ajaxOpt);

/**
@fn MUI.enterWaiting(ctx?)
@param ctx {ac, tm, tv?, tv2?, noLoadingImg?}
@alias enterWaiting()
*/
self.enterWaiting = enterWaiting;
function enterWaiting(ctx)
{
	if (self.isBusy == 0) {
		m_tmBusy = new Date();
	}
	self.isBusy = 1;
	if (ctx == null || ctx.isMock)
		++ m_manualBusy;
	// 延迟执行以防止在page show时被自动隐藏
	//mCommon.delayDo(function () {
	if (!(ctx && ctx.noLoadingImg))
	{
		setTimeout(function () {
			if (self.isBusy)
				self.showLoading();
		}, 200);
	}
// 		if ($.mobile && !(ctx && ctx.noLoadingImg))
// 			$.mobile.loading("show");
	//},1);
}

/**
@fn MUI.leaveWaiting(ctx?)
@alias leaveWaiting
*/
self.leaveWaiting = leaveWaiting;
function leaveWaiting(ctx)
{
	if (ctx == null || ctx.isMock)
	{
		if (-- m_manualBusy < 0)
			m_manualBusy = 0;
	}
	// 当无远程API调用或js调用时, 设置isBusy=0
	mCommon.delayDo(function () {
		if (self.options.logAction && ctx && ctx.ac && ctx.tv) {
			var tv2 = (new Date() - ctx.tm) - ctx.tv;
			ctx.tv2 = tv2;
			console.log(ctx);
		}
		if ($.active <= 0 && self.isBusy && m_manualBusy == 0) {
			$.active = 0;
			self.isBusy = 0;
			var tv = new Date() - m_tmBusy;
			m_tmBusy = 0;
			console.log("idle after " + tv + "ms");

			// handle idle
			self.hideLoading();
// 			if ($.mobile)
// 				$.mobile.loading("hide");
		}
	});
}

function defAjaxErrProc(xhr, textStatus, e)
{
	//if (xhr && xhr.status != 200) {
		var ctx = this.ctx_ || {};
		ctx.status = xhr.status;
		ctx.statusText = xhr.statusText;

		if (xhr.status == 0) {
			self.app_alert("连不上服务器了，是不是网络连接不给力？", "e");
		}
		else if (this.handleHttpError) {
			var data = xhr.responseText;
			var rv = defDataProc.call(this, data);
			if (rv != null)
				this.success && this.success(rv);
			return;
		}
		else {
			self.app_alert("操作失败: 服务器错误. status=" + xhr.status + "-" + xhr.statusText, "e");
		}

		leaveWaiting(ctx);
	//}
}

/**
@fn MUI.defDataProc(rv)

@param rv BQP协议原始数据，如 "[0, {id: 1}]"，一般是字符串，也可以是JSON对象。
@return data 按接口定义返回的数据对象，如 {id: 1}. 如果返回==null，调用函数应直接返回，不回调应用层。

注意：服务端不应返回null, 否则客户回调无法执行; 习惯上返回false表示让回调处理错误。

*/
self.defDataProc = defDataProc;
function defDataProc(rv)
{
	var ctx = this.ctx_ || {};
	var ext = ctx.ext;

	// ajax-beforeSend回调中设置
	if (this.xhr_ && ext == null) {
		var val = this.xhr_.getResponseHeader("X-Daca-Server-Rev");
		if (val && g_data.serverRev != val) {
			if (g_data.serverRev) {
				mCommon.reloadSite();
			}
			console.log("Server Revision: " + val);
			g_data.serverRev = val;
		}
		val = mCommon.parseValue(this.xhr_.getResponseHeader("X-Daca-Test-Mode"));
		if (g_data.testMode != val) {
			g_data.testMode = val;
			if (g_data.testMode)
				self.app_alert("测试模式!", {timeoutInterval:2000});
		}
		val = mCommon.parseValue(this.xhr_.getResponseHeader("X-Daca-Mock-Mode"));
		if (g_data.mockMode != val) {
			g_data.mockMode = val;
			if (g_data.mockMode)
				self.app_alert("模拟模式!", {timeoutInterval:2000});
		}
	}

	try {
		if (rv !== "" && typeof(rv) == "string")
			rv = $.parseJSON(rv);
	}
	catch (e)
	{
		leaveWaiting(ctx);
		self.app_alert("服务器数据错误。");
		return;
	}

	if (ctx.tm) {
		ctx.tv = new Date() - ctx.tm;
	}
	ctx.ret = rv;

	leaveWaiting(ctx);

	if (ext) {
		var filter = self.callSvrExt[ext] && self.callSvrExt[ext].dataFilter;
		if (filter) {
			var ret = filter.call(this, rv);
			if (ret == null || ret === false)
				self.lastError = ctx;
			return ret;
		}
	}

	if (rv && $.isArray(rv) && rv.length >= 2 && typeof rv[0] == "number") {
		if (rv[0] == 0)
			return rv[1];

		if (this.noex)
		{
			this.lastError = rv;
			self.lastError = ctx;
			return false;
		}

		if (rv[0] == E_NOAUTH) {
			if (self.tryAutoLogin()) {
				$.ajax(this);
			}
// 				self.popPageStack(0);
// 				self.showLogin();
			return;
		}
		else if (rv[0] == E_AUTHFAIL) {
			var errmsg = rv[1] || "验证失败，请检查输入是否正确!";
			self.app_alert(errmsg, "e");
			return;
		}
		else if (rv[0] == E_ABORT) {
			console.log("!!! abort call");
			return;
		}
		logError();
		self.app_alert("操作失败：" + rv[1], "e");
	}
	else {
		logError();
		self.app_alert("服务器通讯协议异常!", "e"); // 格式不对
	}

	function logError()
	{
		self.lastError = ctx;
		console.log("failed call");
		console.log(ctx);
	}
}

/**
@fn MUI.getBaseUrl()

取服务端接口URL对应的目录。可用于拼接其它服务端资源。
相当于dirname(MUI.options.serverUrl);

例如：

serverUrl为"../jdcloud/api.php" 或 "../jdcloud/"，则MUI.baseUrl返回 "../jdcloud/"
serverUrl为"http://myserver/myapp/api.php" 或 "http://myserver/myapp/"，则MUI.baseUrl返回 "http://myserver/myapp/"
 */
self.getBaseUrl = getBaseUrl;
function getBaseUrl()
{
	return self.options.serverUrl.replace(/\/[^\/]+$/, '/');
}

/**
@fn MUI.makeUrl(action, params?)

生成对后端调用的url. 

	var params = {id: 100};
	var url = MUI.makeUrl("Ordr.set", params);

注意：函数返回的url是字符串包装对象，可能含有这些属性：{makeUrl=true, action?, params?}
这样可通过url.action得到原始的参数。

支持callSvr扩展，如：

	var url = MUI.makeUrl('zhanda:login');

(deprecated) 为兼容旧代码，action可以是一个数组，在WUI环境下表示对象调用:

	WUI.makeUrl(['Ordr', 'query']) 等价于 WUI.makeUrl('Ordr.query');

在MUI环境下表示callSvr扩展调用:

	MUI.makeUrl(['login', 'zhanda']) 等价于 MUI.makeUrl('zhanda:login');

@see MUI.callSvrExt
 */
self.makeUrl = makeUrl;
function makeUrl(action, params)
{
	var ext;
	if ($.isArray(action)) {
		if (window.MUI) {
			ext = action[1];
			action = action[0];
		}
		else {
			ext = "default";
			action = action[0] + "." + action[1];
		}
	}
	else {
		var m = action.match(/^(\w+):(\w.*)/);
		if (m) {
			ext = m[1];
			action = m[2];
		}
		else {
			ext = "default";
		}
	}

	// 有makeUrl属性表示已调用过makeUrl
	if (action.makeUrl || /^http/.test(action)) {
		if (params == null)
			return action;
		var url = mCommon.appendParam(action, $.param(params));
		return makeUrlObj(url);
	}

	if (params == null)
		params = {};

	var url;
	var fnMakeUrl = self.callSvrExt[ext] && self.callSvrExt[ext].makeUrl;
	if (fnMakeUrl) {
		url = fnMakeUrl(action, params);
	}
	// 缺省接口调用：callSvr('login') 或 callSvr('php/login.php');
	else if (action.indexOf(".php") < 0)
	{
		var opt = self.options;
		var usePathInfo = !opt.serverUrlAc;
		if (usePathInfo) {
			if (opt.serverUrl.slice(-1) == '/')
				url = opt.serverUrl + action;
			else
				url = opt.serverUrl + "/" + action;
		}
		else {
			url = opt.serverUrl;
			params[opt.serverUrlAc] = action;
		}
	}
	else {
		if (location.protocol == "file:") {
			url = getBaseUrl() + action;
		}
		else
			url = action;
	}
	if (window.g_cordova) {
		if (m_appVer === undefined)
		{
			var platform = "n";
			if (mCommon.isAndroid()) {
				platform = "a";
			}
			else if (mCommon.isIOS()) {
				platform = "i";
			}
			m_appVer = platform + "/" + g_cordova;
		}
		params._ver = m_appVer;
	}
	if (self.options.appName)
		params._app = self.options.appName;
	if (g_args._debug)
		params._debug = g_args._debug;
	var ret = mCommon.appendParam(url, $.param(params));
	return makeUrlObj(ret);

	function makeUrlObj(url)
	{
		var o = new String(url);
		o.makeUrl = true;
		if (action.makeUrl) {
			o.action = action.action;
			o.params = $.extend({}, action.params, params);
		}
		else {
			o.action = action;
			o.params = params;
		}
		return o;
	}
}

/**
@fn MUI.callSvr(ac, [params?], fn?, postParams?, userOptions?) -> deferredObject
@alias callSvr

@param ac String. action, 交互接口名. 也可以是URL(比如由makeUrl生成)
@param params Object. URL参数（或称HTTP GET参数）
@param postParams Object. POST参数. 如果有该参数, 则自动使用HTTP POST请求(postParams作为POST内容), 否则使用HTTP GET请求.
@param fn Function(data). 回调函数, data参考该接口的返回值定义。
@param userOptions 用户自定义参数, 会合并到$.ajax调用的options参数中.可在回调函数中用"this.参数名"引用. 

常用userOptions: 

- 指定{async:0}来做同步请求, 一般直接用callSvrSync调用来替代.
- 指定{noex:1}用于忽略错误处理。
- 指定{noLoadingImg:1}用于忽略loading图标. 要注意如果之前已经调用callSvr显示了图标且图标尚未消失，则该选项无效，图标会在所有调用完成之后才消失(leaveWaiting)。
 要使隐藏图标不受本次调用影响，可在callSvr后手工调用`--$.active`。

想为ajax选项设置缺省值，可以用callSvrExt中的beforeSend回调函数，也可以用$.ajaxSetup，
但要注意：ajax的dataFilter/beforeSend选项由于框架已用，最好不要覆盖。

@see MUI.callSvrExt[].beforeSend(opt) 为callSvr选项设置缺省值

@return deferred对象，与$.ajax相同。
例如，

	var dfd = callSvr(ac, fn1);
	dfd.then(fn2);

	function fn1(data) {}
	function fn2(data) {}

在接口调用成功后，会依次回调fn1, fn2.

@key callSvr.noex 调用接口时忽略出错，可由回调函数fn自己处理错误。

当后端返回错误时, 回调`fn(false)`（参数data=false）. 可通过 MUI.lastError.ret 或 this.lastError 取到返回的原始数据。

示例：

	callSvr("logout");
	callSvr("logout", api_logout);
	function api_logout(data) {}

	callSvr("login", {wantAll:1}, api_login);
	function api_login(data) {}

	callSvr("info/hotline.php", {q: '大众'}, api_hotline);
	function api_hotline(data) {}

	// 也可使用makeUrl生成的URL如:
	callSvr(MUI.makeUrl("logout"), api_logout);
	callSvr(MUI.makeUrl("logout", {a:1}), api_logout);

	callSvr("User.get", function (data) {
		if (data === false) { // 仅当设置noex且服务端返回错误时可返回false
			// var originalData = MUI.lastError.ret; 或
			// var originalData = this.lastError;
			return;
		}
		foo(data);
	}, null, {noex:1});

@see MUI.lastError 出错时的上下文信息

## 调用监控

框架会自动在ajaxOption中增加ctx_属性，它包含 {ac, tm, tv, tv2, ret} 这些信息。
当设置MUI.options.logAction=1时，将输出这些信息。
- ac: action
- tm: start time
- tv: time interval (从发起请求到服务器返回数据完成的时间, 单位是毫秒)
- tv2: 从接到数据到完成处理的时间，毫秒(当并发处理多个调用时可能不精确)

## 文件上传支持(FormData)

callSvr支持FormData对象，可用于上传文件等场景。示例如下：

@key example-upload

HTML:

	file: <input id="file1" type="file" multiple>
	<button type="button" id="btn1">upload</button>

JS:

	jpage.find("#btn1").on('click', function () {
		var fd = new FormData();
		$.each(jpage.find('#file1')[0].files, function (i, e) {
			fd.append('file' + (i+1), e);
		});
		callSvr('upload', api_upload, fd);

		function api_upload(data) { ... }
	});

## callSvr扩展

@key MUI.callSvrExt

当调用第三方API时，也可以使用callSvr扩展来代替$.ajax调用以实现：
- 调用成功时直接可操作数据，不用每次检查返回码；
- 调用出错时可以统一处理。

例：合作方接口使用HTTP协议，格式如（以生成token调用为例）

	http://<Host IP Address>:<Host Port>/lcapi/token/get-token?user=用户名&password=密码

返回格式为：{code, msg, data}

成功返回：

	{
		"code":"0",
		"msg":"success",
		"data":[ { "token":"xxxxxxxxxxxxxx" } ]
	}

失败返回：

	{
		"code":"4001",
		"msg":"invalid username or password",
		"data":[]
	}

callSvr扩展示例：

	MUI.callSvrExt['zhanda'] = {
		makeUrl: function(ac, param) {
			return 'http://hostname/lcapi/' + ac;
		},
		dataFilter: function (data) {
			if ($.isPlainObject(data) && data.code !== undefined) {
				if (data.code == 0)
					return data.data;
				if (this.noex)
					return false;
				app_alert("操作失败：" + data.msg, "e");
			}
			else {
				app_alert("服务器通讯协议异常!", "e"); // 格式不对
			}
		}
	};

在调用时，ac参数传入一个数组：

	callSvr(['token/get-token', 'zhanda'], {user: 'test', password: 'test123'}, function (data) {
		console.log(data);
	});

@key MUI.callSvrExt[].makeUrl(ac, param)

根据调用名ac生成url, 注意无需将param放到url中。

注意：
对方接口应允许JS跨域调用，或调用方支持跨域调用。

@key MUI.callSvrExt[].dataFilter(data) = null/false/data

对调用返回数据进行通用处理。返回值决定是否调用callSvr的回调函数以及参数值。

	callSvr(ac, callback);

- 返回data: 回调应用层的实际有效数据: `callback(data)`.
- 返回null: 一般用于报错后返回。不会回调`callback`.
- 返回false: 一般与callSvr的noex选项合用，如`callSvr(ac, callback, postData, {noex:1})`，表示由应用层回调函数来处理出错: `callback(false)`。

当返回false时，应用层可以通过`MUI.lastError.ret`来获取服务端返回数据。

@see MUI.lastError 出错时的上下文信息

@key MUI.callSvrExt['default']

(支持版本: v3.1)
如果要修改callSvr缺省调用方法，可以改写 MUI.callSvrExt['default'].
例如，定义以下callSvr扩展：

	MUI.callSvrExt['default'] = {
		makeUrl: function(ac) {
			return '../api.php/' + ac;
		},
		dataFilter: function (data) {
			var ctx = this.ctx_ || {};
			if (data && $.isArray(data) && data.length >= 2 && typeof data[0] == "number") {
				if (data[0] == 0)
					return data[1];

				if (this.noex)
				{
					return false;
				}

				if (data[0] == E_NOAUTH) {
					// 如果支持自动重登录
					//if (MUI.tryAutoLogin()) {
					//	$.ajax(this);
					//}
					// 不支持自动登录，则跳转登录页
					MUI.popPageStack(0);
					MUI.showLogin();
					return;
				}
				else if (data[0] == E_AUTHFAIL) {
					app_alert("验证失败，请检查输入是否正确!", "e");
					return;
				}
				else if (data[0] == E_ABORT) {
					console.log("!!! abort call");
					return;
				}
				logError();
				app_alert("操作失败：" + data[1], "e");
			}
			else {
				logError();
				app_alert("服务器通讯协议异常!", "e"); // 格式不对
			}

			function logError()
			{
				console.log("failed call");
				console.log(ctx);
			}
		}
	};

这样，以下调用

	callSvr(['login', 'default']);

可以简写为：

	callSvr('login');

@key MUI.callSvrExt[].beforeSend(opt) 为callSvr或$.ajax选项设置缺省值

如果有ajax选项想设置，可以使用beforeSend回调，例如POST参数使用JSON格式：

	MUI.callSvrExt['default'] = {
		beforeSend: function (opt) {
			// 示例：设置contentType
			if (opt.contentType == null) {
				opt.contentType = "application/json;charset=utf-8";
				if (opt.data) {
					opt.data = JSON.stringify(opt.data);
				}
			}
			// 示例：添加HTTP头用于认证
			if (g_data.auth) {
				if (opt.headers == null)
					opt.headers = {};
				opt.headers["Authorization"] = "Basic " + g_data.auth;
			}
		}
	}

如果要设置请求的HTTP headers，可以用`opt.headers = {header1: "value1", header2: "value2"}`.
更多选项参考jquery文档：jQuery.ajax的选项。

## 适配RESTful API

接口示例：更新订单

	PATCH /orders/{ORDER_ID}

	调用成功仅返回HTTP状态，无其它内容："200 OK" 或 "204 No Content"
	调用失败返回非2xx的HTTP状态及错误信息，无其它内容，如："400 bad id"

为了处理HTTP错误码，应设置：

	MUI.callSvrExt["default"] = {
		beforeSend: function (opt) {
			opt.handleHttpError = true;
		},
		dataFilter: function (data) {
			var ctx = this.ctx_;
			if (ctx && ctx.status) {
				if (this.noex)
					return false;
				app_alert(ctx.statusText, "e");
				return;
			}
			return data;
		}
	}

- 在beforeSend回调中，设置handleHttpError为true，这样HTTP错误会由dataFilter处理，而非框架自动处理。
- 在dataFilter回调中，如果this.ctx_.status非空表示是HTTP错误，this.ctx_.statusText为错误信息。
- 如果操作成功但无任何返回数据，回调函数fn(data)中data值为undefined（当HTTP状态码为204）或空串（非204返回）
- 不要设置ajax调用失败的回调，如`$.ajaxSetup({error: fn})`，`$.ajax({error: fn})`，它会覆盖框架的处理.

如果接口在出错时，返回固定格式的错误对象如{code, message}，可以这样处理：

	MUI.callSvrExt["default"] = {
		beforeSend: function (opt) {
			opt.handleHttpError = true;
		},
		dataFilter: function (data) {
			var ctx = this.ctx_;
			if (ctx && ctx.status) {
				if (this.noex)
					return false;
				if (data && data.message) {
					app_alert(data.message, "e");
				}
				else {
					app_alert("操作失败: 服务器错误. status=" + ctx.status + "-" + ctx.statusText, "e");
				}
				return;
			}
			return data;
		}
	}

调用接口时，HTTP谓词可以用callSvr的userOptions中给定，如：

	callSvr("orders/" + orderId, fn, postParam, {type: "PATCH"});
	
这种方式简单，但因调用名ac是变化的，不易模拟接口。
如果要模拟接口，可以保持调用名ac不变，像这样调用：

	callSvr("orders/{id}", {id: orderId}, fn, postParam, {type: "PATCH"});

于是可以这样做接口模拟：

	MUI.mockData = {
		"orders/{id}": function (param, postParam) {
			var ret = "OK";
			// 获取资源
			if (this.type == "GET") {
				ret = orders[param.id];
			}
			// 更新资源
			else if (this.type == "PATCH") {
				$.extend(orders[param.id], postParam);
			}
			// 删除资源
			else if (this.type == "DELETE") {
				delete orders[param.id];
			}
			return [0, ret];
		}
	};

不过这种写法需要适配，以生成正确的URL，示例：

	MUI.callSvrExt["default"] = {
		makeUrl: function (ac, param) {
			ac = ac.replace(/\{(\w+)\}/g, function (m, m1) {
				var ret = param[m1];
				assert(ret != null, "缺少参数");
				delete param[m1];
				return ret;
			});
			return "./api.php/" + ac;
		}
	}

*/
self.callSvr = callSvr;
self.callSvrExt = {};
function callSvr(ac, params, fn, postParams, userOptions)
{
	if (params instanceof Function) {
		// 兼容格式：callSvr(url, fn?, postParams?, userOptions?);
		userOptions = postParams;
		postParams = fn;
		fn = params;
		params = null;
	}
	mCommon.assert(ac != null, "*** bad param `ac`");

	var ext = null;
	var ac0 = ac.action || ac; // ac可能是makeUrl生成过的
	var m;
	if ($.isArray(ac)) {
		// 兼容[ac, ext]格式, 不建议使用，可用"{ext}:{ac}"替代
		mCommon.assert(ac.length == 2, "*** bad ac format, require [ac, ext]");
		ext = ac[1];
		if (ext != 'default')
			ac0 = ext + ':' + ac[0];
		else
			ac0 = ac[0];
	}
	// "{ext}:{ac}"格式，注意区分"http://xxx"格式
	else if (m = ac.match(/^(\w+):(\w.*)/)) {
		ext = m[1];
	}
	else if (self.callSvrExt['default']) {
		ext = 'default';
	}

	var isSyncCall = (userOptions && userOptions.async == false);
	if (m_curBatch && !isSyncCall)
	{
		return m_curBatch.addCall({ac: ac, get: params, post: postParams}, fn, userOptions);
	}

	var url = makeUrl(ac, params);
	var ctx = {ac: ac0, tm: new Date()};
	if (userOptions && userOptions.noLoadingImg)
		ctx.noLoadingImg = 1;
	if (ext) {
		ctx.ext = ext;
	}
	if (self.mockData && self.mockData[ac0]) {
		ctx.isMock = true;
		ctx.getMockData = function () {
			var d = self.mockData[ac0];
			var param1 = $.extend({}, url.params);
			var postParam1 = $.extend({}, postParams);
			if ($.isFunction(d)) {
				d = d(param1, postParam1);
			}
			if (self.options.logAction)
				console.log({ac: ac0, ret: d, params: param1, postParams: postParam1, userOptions: userOptions});
			return d;
		}
	}
	enterWaiting(ctx);

	var callType = "call";
	if (isSyncCall)
		callType += "-sync";
	if (ctx.isMock)
		callType += "-mock";

	var method = (postParams == null? 'GET': 'POST');
	var opt = {
		dataType: 'text',
		url: url,
		data: postParams,
		type: method,
		success: fn,
		ctx_: ctx
	};
	if (ext) {
		// 允许跨域
		opt.xhrFields = {
			withCredentials: true
		};
	}
	// support FormData object.
	if (window.FormData && postParams instanceof FormData) {
		opt.processData = false;
		opt.contentType = false;
	}
	$.extend(opt, userOptions);
	if (ext && self.callSvrExt[ext].beforeSend) {
		self.callSvrExt[ext].beforeSend(opt);
	}

	console.log(callType + ": " + opt.type + " " + ac0);
	if (ctx.isMock)
		return callSvrMock(opt, isSyncCall);
	return $.ajax(opt);
}

// opt = {success, .ctx_={isMock, getMockData} }
function callSvrMock(opt, isSyncCall)
{
	var dfd_ = $.Deferred();
	var opt_ = opt;
	if (isSyncCall) {
		callSvrMock1();
	}
	else {
		setTimeout(callSvrMock1, self.options.mockDelay);
	}
	return dfd_;

	function callSvrMock1() 
	{
		var data = opt_.ctx_.getMockData();
		if (typeof(data) != "string")
			data = JSON.stringify(data);
		var rv = defDataProc.call(opt_, data);
		if (rv != null)
		{
			opt_.success && opt_.success(rv);
			dfd_.resolve(rv);
			return;
		}
		self.app_abort();
	}
}

/**
@fn MUI.callSvrSync(ac, [params?], fn?, postParams?, userOptions?)
@alias callSvrSync
@return data 原型规定的返回数据

同步模式调用callSvr.

@see callSvr
*/
self.callSvrSync = callSvrSync;
function callSvrSync(ac, params, fn, postParams, userOptions)
{
	var ret;
	if (params instanceof Function) {
		userOptions = postParams;
		postParams = fn;
		fn = params;
		params = null;
	}
	userOptions = $.extend({async: false}, userOptions);
	var dfd = callSvr(ac, params, fn, postParams, userOptions);
	dfd.then(function(data) {
		ret = data;
	});
	return ret;
}

/**
@fn MUI.setupCallSvrViaForm($form, $iframe, url, fn, callOpt)

该方法已不建议使用。上传文件请用FormData。
@see example-upload,callSvr

@param $iframe 一个隐藏的iframe组件.
@param callOpt 用户自定义参数. 参考callSvr的同名参数. e.g. {noex: 1}

一般对后端的调用都使用callSvr函数, 但像上传图片等操作不方便使用ajax调用, 因为要自行拼装multipart/form-data格式的请求数据. 
这种情况下可以使用form的提交和一个隐藏的iframe来实现类似的调用.

先定义一个form, 在其中放置文件上传控件和一个隐藏的iframe. form的target属性设置为iframe的名字:

	<form data-role="content" action="upload" method=post enctype="multipart/form-data" target="ifrUpload">
		<input type=file name="file[]" multiple accept="image/*">
		<input type=submit value="上传">
		<iframe id='ifrUpload' name='ifrUpload' style="display:none"></iframe>
	</form>

然后就像调用callSvr函数一样调用setupCallSvrViaForm:

	var url = MUI.makeUrl("upload", {genThumb: 1});
	MUI.setupCallSvrViaForm($frm, $frm.find("iframe"), url, onUploadComplete);
	function onUploadComplete(data) 
	{
		alert("上传成功");
	}

 */
self.setupCallSvrViaForm = setupCallSvrViaForm;
function setupCallSvrViaForm($form, $iframe, url, fn, callOpt)
{
	$form.attr("action", url);

	$iframe.on("load", function () {
		var data = this.contentDocument.body.innerText;
		if (data == "")
			return;
		var rv = defDataProc.call(callOpt, data);
		if (rv == null)
			self.app_abort();
		fn(rv);
	});
}

/**
@class MUI.batchCall(opt?={useTrans?=0})

批量调用。将若干个调用打包成一个特殊的batch调用发给服务端。
注意：

- 同步调用callSvrSync不会加入批处理。
- 对特别几个不符合BPQ协议输出格式规范的接口不可使用批处理，如upload, att等接口。
- 如果MUI.disableBatch=true, 表示禁用批处理。

示例：

	var batch = new MUI.batchCall();
	callSvr("Family.query", {res: "id,name"}, api_FamilyQuery);
	callSvr("User.get", {res: "id,phone"}, api_UserGet);
	batch.commit();

以上两条调用将一次发送到服务端。
在批处理中，默认每条调用是一个事务，如果想把批处理中所有调用放到一个事务中，可以用useTrans选项：

	var batch = new MUI.batchCall({useTrans: 1});
	callSvr("Attachment.add", api_AttAdd, {path: "path-1"});
	callSvr("Attachment.add", api_AttAdd, {path: "path-2"});
	batch.commit();

在一个事务中，所有调用要么成功要么都取消。
任何一个调用失败，会导致它后面所有调用取消执行，且所有已执行的调用会回滚。

参数中可以引用之前结果中的值，引用部分需要用"{}"括起来，且要在opt.ref参数中指定哪些参数使用了引用：

	var batch = new MUI.batchCall({useTrans: 1});
	callSvr("Attachment.add", api_AttAdd, {path: "path-1"}); // 假如返回 22
	var opt = {ref: ["id"]};
	callSvr("Attachment.get", {id: "{$1}"}, api_AttGet, null, opt); // {$1}=22, 假如返回 {id: 22, path: '/data/1.png'}
	opt = {ref: ["cond"]};
	callSvr("Attachment.query", {res: "count(*) cnt", cond: "path='{$-1.path}'"}, api_AttQuery, null, opt); // {$-1.path}计算出为 '/data/1.png'
	batch.commit();

以下为引用格式示例：

	{$-2} // 前2次的结果。
	{$2[0]} // 取第2次结果（是个数组）的第0个值。
	{$-1.path} // 取前一次结果的path属性
	{$2 -1}  // 可以做简单的计算

如果值计算失败，则当作"null"填充。

@see MUI.useBatchCall
@see MUI.disableBatch
@see MUI.m_curBatch

*/
self.batchCall = batchCall;
function batchCall(opt)
{
	mCommon.assert(m_curBatch == null, "*** multiple batch call!");
	this.opt_ = opt;
	this.calls_ = [];
	this.callOpts_ = [];
	if (! self.disableBatch)
		m_curBatch = this;
}

batchCall.prototype = {
	// obj: { opt_, @calls_, @callOpts_ }
	// calls_: elem={ac, get, post}
	// callOpts_: elem={fn, opt, dfd}

	//* batchCall.addCall(call={ac, get, post}, fn, opt)
	addCall: function (call0, fn, opt0) {
		var call = $.extend({}, call0);
		var opt = $.extend({}, opt0);
		if (opt.ref) {
			call.ref = opt.ref;
		}
		this.calls_.push(call);

		var callOpt = {
			fn: fn,
			opt: opt,
			dfd: $.Deferred()
		};
		this.callOpts_.push(callOpt);
		return callOpt.dfd;
	},
	//* batchCall.dfd()
	deferred: function () {
		return this.dfd_;
	},
	//* @fn batchCall.commit()
	commit: function () {
		if (m_curBatch == null)
			return;
		m_curBatch = null;

		if (this.calls_.length <= 1) {
			console.log("!!! warning: batch has " + this.calls_.length + " calls!");
		}
		var batch_ = this;
		var postData = JSON.stringify(this.calls_);
		callSvr("batch", this.opt_, api_batch, postData, {
			contentType: "application/json"
		});

		function api_batch(data)
		{
			var ajaxCtx_ = this;
			$.each(data, function (i, e) {
				var callOpt = batch_.callOpts_[i];
				// simulate ajaxCtx_, e.g. for {noex, userPost}
				var extendCtx = false;
				if (callOpt.opt && !$.isEmptyObject(callOpt.opt)) {
					extendCtx = true;
					$.extend(ajaxCtx_, callOpt.opt);
				}

				var data1 = defDataProc.call(ajaxCtx_, e);
				if (data1 != null) {
					if (callOpt.fn) {
						callOpt.fn.call(ajaxCtx_, data1);
					}
					callOpt.dfd.resolve(data1);
				}

				// restore ajaxCtx_
				if (extendCtx) {
					$.each(Object.keys(callOpt.opt), function () {
						ajaxCtx_[this] = null;
					});
				}
			});
		}
	},
	//* @fn batchCall.cancel()
	cancel: function () {
		m_curBatch = null;
	}
}

/**
@fn MUI.useBatchCall(opt?={useTrans?=0}, tv?=0)

之后的callSvr调用都加入批量操作。例：

	MUI.useBatchCall();
	callSvr("Family.query", {res: "id,name"}, api_FamilyQuery);
	callSvr("User.get", {res: "id,phone"}, api_UserGet);

可指定多少毫秒以内的操作都使用批处理，如10ms内：

	MUI.useBatchCall(null, 10);

如果MUI.disableBatch=true, 该函数不起作用。

@see MUI.batchCall
@see MUI.disableBatch
*/
self.useBatchCall = useBatchCall;
function useBatchCall(opt, tv)
{
	if (self.disableBatch)
		return;
	if (m_curBatch != null)
		return;
	tv = tv || 0;
	var batch = new self.batchCall(opt);
	setTimeout(function () {
		batch.commit();
	}, tv);
}

}
// ====== WEBCC_END_FILE callSvr.js }}}

// ====== WEBCC_BEGIN_FILE mui-showPage.js {{{
/*
页面管理器。提供基于逻辑页面的单网页应用，亦称“变脸式应用”。

该类作为MUI模块的基类，仅供内部使用，但它提供showPage等操作，以及pageshow等各类事件。

@param opt {homePage?="#home", pageFolder?="page"}

页面跳转测试用例：

- 使用MUI.showPage进行页面切换，如A->B->C，再通过浏览器返回、前进按钮查看跳转及切换动画是否正确
- 在控制台调用history.back/forward/go是否能正常工作。或左右划动页面查看前进后退是否正确。
- 在控制台调用location.hash="#xx"是否能正确切换页面。
- MUI.popPageStack()是否能正常工作。
- 在muiInit事件中调用MUI.showPage。
- 在A页面的pagebeforeshow事件中调用MUI.showPage(B)，不会闪烁，且点返回时不应回到A页面
 */
function JdcloudMuiPage()
{
var self = this;
var mCommon = jdModule("jdcloud.common");
	
/**
@var MUI.activePage

当前页面。

注意：

- 在初始化过程中，值可能为null;
- 调用MUI.showPage后，该值在新页面加载之后，发出pageshow事件之前更新。因而在pagebeforeshow事件中，MUI.activePage尚未更新。

要查看从哪个页面来，可以用 MUI.prevPageId。
要查看最近一次调用MUI.showPage转向的页面，可以用 MUI.getToPageId().

@see MUI.prevPageId
@see MUI.getToPageId()

*/
self.activePage = null;

/**
@var MUI.prevPageId

上一个页面的id, 首次进入时为空.
*/
self.prevPageId = null;

/**
@var MUI.container

应用容器，一般就是`$(document.body)`

@see .mui-container
*/
self.container = null;

/**
@var MUI.showFirstPage?=true

如果为false, 则必须手工执行 MUI.showPage 来显示第一个页面。
*/
self.showFirstPage = true;

var m_jstash; // 页面暂存区; 首次加载页面后可用
var m_jLoader;

// null: 未知
// true: back操作;
// false: forward操作, 或进入新页面
var m_isback = null; // 在changePage之前设置，在changePage中清除为null

// 调用showPage后，将要显示的页; 用于判断showPage过程中是否再次调用showPage.
var m_toPageId = null;
var m_lastPageRef = null;

var m_curState = null; // 替代history.state, 因为有的浏览器不支持。

var m_pageUrlMap = null; // {pageRef => url}

// @class PageStack {{{
var m_fn_history_go = history.go;
var m_appId = Math.ceil(Math.random() *10000);
function PageStack()
{
	// @var PageStack.stack_ - elem: {pageRef, id, isPoped?=0}
	this.stack_ = [];
	// @var PageStack.sp_
	this.sp_ = -1;
	// @var PageStack.nextId_
	this.nextId_ = 1;
}
PageStack.prototype = {
	// @fn PageStack.push(state={pageRef});
	push: function (state) {
		if (this.sp_ < this.stack_.length-1) {
			this.stack_.splice(this.sp_+1);
		}
		state.id = this.nextId_;
		++ this.nextId_;
		this.stack_.push(state);
		++ this.sp_;
	},
	// @fn PageStack.pop(n?=1); 
	// n=0: 清除到首页; n>1: 清除指定页数
	// 注意：pop时只做标记，没有真正做pop动作，没有改变栈指针sp_. 只有调用go才会修改栈指针。
	pop: function (n) {
		if (n === 0) {
			// pop(0): 保留第一个未pop的页面，其它全部标记为poped.
			var firstFound = false;
			for (var i=0; i<this.sp_; ++i) {
				if (! firstFound) {
					if (! this.stack_[i].isPoped)
						firstFound = true;
					continue;
				}
				this.stack_[i].isPoped = true;
			}
			return;
		}
		if (n == null || n < 0)
			n = 1;
		if (n > this.sp_) {
			n = this.sp_ + 1;
		}
		for (var i=0; i<n; ++i) {
			this.stack_[this.sp_ -i].isPoped = true;
		}
	},
	// @fn PageStack.go(n?=0);
	// 移动指定步数(忽略标记isPoped的页面以及重复页面)，返回实际步数. 0表示不可移动。
	go: function (n) {
		if (n == 0)
			return 0;
		var curState = this.stack_[this.sp_];
		do {
			var sp = this.sp_ + n;
			if (sp < 0 || sp >= this.stack_.length)
				return 0;
			if (! this.stack_[sp].isPoped && this.stack_[sp].pageRef != curState.pageRef)
				break;
			if (n < 0) {
				-- n;
			}
			else {
				++ n;
			}
		} while (1);
		this.sp_ = sp;
		return n;
	},
	// @fn PageStack.findCurrentState() -> n
	// Return: n - 当前状态到sp的偏移，可用 this.go(n) 移动过去。
	findCurrentState: function () {
		var found = false;
		var sp = this.sp_;
		var state = m_curState; //history.state;
		for (var i=this.stack_.length-1; i>=0; --i) {
			if (state.id == this.stack_[i].id)
			{
				sp = i;
				found = true;
				break;
			}
		}
		if (!found)
			throw "history not found";
		return sp - this.sp_;
	},
	// @fn PageStack.walk(fn)
	// @param fn Function(state={pageRef, isPoped}).  返回false则停止遍历。
	walk: function (fn) {
		for (var i=this.sp_; i>=0; --i) {
			var state = this.stack_[i];
			if (!state.isPoped && fn(state) === false)
				break;
		}
	}
};
//}}}

function getHash()
{
	//debugger;
	if (m_curState)
		return m_curState.pageRef;

	if (location.hash == "")
		return self.options.homePage;
	return location.hash;
}

// return pi=pageInfo={pageId, pageFile, templateRef?}
function setHash(pageRef, url)
{
	/*
m_curState.pageRef == pi.pageRef：history操作
m_curState==null: 首次进入，或hash改变
	 */
	//debugger;
	var pi = getPageInfo(pageRef);

	// 首次进入使用location.search
	if (m_pageUrlMap == null) {
		m_pageUrlMap = {};
		url = location.search;
	}
	if (url) {
		m_pageUrlMap[pageRef] = url;
	}
	else {
		url = m_pageUrlMap[pageRef];
	}
	if (self.options.showHash) {
		if (url == null) {
			url = pi.pageRef;
		}
		else if (url[0] == "?") {
			url = url + pi.pageRef;
		}
	}
	else {
		if (url == null) {
			url = pi.pageFile;
		}
		else if (url[0] == "?") {
			url = pi.pageFile + url;
		}
	}

	if (m_curState == null || m_curState.pageRef != pi.pageRef)
	{
		var newState = {pageRef: pi.pageRef, appId: m_appId, url: url};
		self.m_pageStack.push(newState);
		if (m_curState != null)
			history.pushState(newState, null, url);
		else
			history.replaceState(newState, null, url);
		m_curState = newState;
	}
	else if (m_curState.url != url) {
		history.replaceState(m_curState, null, url);
		m_curState.url = url;
	}
	return pi;
}

/**
@fn MUI.setUrl(url)

设置当前地址栏显示的URL. 如果url中不带hash部分，会自动加上当前的hash.

	MUI.setUrl("page/home.html"); // 设置url
	MUI.setUrl("?a=1&b=2"); // 设置url参数
	MUI.setUrl("?"); // 清除url参数部分。

如果要设置或删除参数，建议使用：

	MUI.setUrlParam("a", 1); // 如果参数存在，则会自动覆盖。
	MUI.deleteUrlParam("a"); // 从url中删除参数a部分，如果g_args中有参数a，也同时删除。

一般用于将应用程序内部参数显示到URL中，以便在刷新页面时仍然可显示相同的内容，或用于分享链接给别人。

例如订单页的URL为`http://server/app/#order`，现在希望：

- 要显示`id=100`的订单，在URL中显示`http://server/app/?orderId=100#order`
- 刷新该URL或分享给别人，均能正确打开`id=100`的订单。

示例：在逻辑页`order`的`pagebeforeshow`回调函数中，处理内部参数`opt`或URL参数`g_args`：

	function initPageOrder()
	{
		var jpage = this;
		var orderId_;
		jpage.on("pagebeforeshow", onPageBeforeShow);

		function onPageBeforeShow(ev, opt)
		{
			// 如果orderId_未变，不重新加载
			var skip = false;
			if (g_args.orderId) {
				orderId_ = g_args.orderId;
				// 只在初始进入时使用一次，用后即焚
				delete g_args.orderId;
			}
			else if (opt.orderId) {
				orderId_ = opt.orderId;
			}
			else {
				skip = true;
			}
			if (! orderId_) { // 参数不合法时跳回主页。
				MUI.showHome();
				return;
			}
			if (skip)
				return;
			MUI.setUrl("?orderId=" + orderId_);
			app_alert("show order " + orderId_);
		}
	}

在例子中，`opt`为`MUI.showPage()`时指定的参数，如调用`MUI.showPage("#order", {orderId: 100});`时，`opt.orderId=100`.
而`g_args`为全局URL参数，如打开 `http://server/app/index.html?orderId=100#order`时，`g_args.orderId=100`.

注意逻辑页`#order`应允许作为入口页进入，否则刷新时会跳转回主页。可在index.js中的validateEntry参数中加上逻辑页：

	MUI.validateEntry([
		...,
		"#order"
	]);

注意setUrl中以"?"开头，表示添加到URL参数中，保持URL主体部分不变。

如果`MUI.options.showHash=false`，则`MUI.setUrl("?orderId=100")`会将URL设置为`http://server/app/page/order.html?orderId=100`.
我们甚至可以设置RESTful风格的URL: `MUI.setUrl("order/100")` 会将URL设置为 `http://server/app/order/100`.

在上面两个例子中，为了确保刷新URL时能正常显示，必须在Web服务器上配置URL重写规则，让它们都重定向到 `http://server/app/?orderId=100#order`.
 */
self.setUrl = setUrl;
function setUrl(url)
{
	if (m_curState == null)
	{
		if (url.indexOf("#") < 0 && location.hash)
			url += location.hash;
		history.replaceState(null, null, url);
		return;
	}
	setHash(m_curState.pageRef, url);
}

/**
@fn MUI.deleteUrlParam(param)

自动修改g_args全局变量和当前url（会调用MUI.setUrl方法）。

	MUI.deleteUrlParam("wxpay");
	// 原先url为 http://myserver/myapp/index.html?wxpay=ORDR-11&storeId=1
	// 调用后为 http://myserver/myapp/index.html?storeId=1

 */
self.deleteUrlParam = deleteUrlParam;
function deleteUrlParam(param)
{
	delete g_args[param];
	var search = mCommon.deleteParam(location.search, param);
	MUI.setUrl(search);
}

/**
@fn MUI.setUrlParam(param, val)

修改当前url，添加指定参数。
e.g. 

	MUI.setUrlParam("wxauth", 1);

@see MUI.deleteUrlParam,MUI.appendParam
 */
self.setUrlParam = setUrlParam;
function setUrlParam(param, val)
{
	var search = location.search;
	if (search.indexOf(param + "=") >= 0) {
		search = mCommon.deleteParam(search, param);
	}
	search = mCommon.appendParam(search, param + "=" + val);
	if (search.indexOf('?&') >=0) {
		search = search.replace('?&', '?');
	}
	MUI.setUrl(search);
}

function callInitfn(jo, paramArr)
{
	var ret = jo.data("mui.init");
	if (ret !== undefined)
		return ret;

	var initfn = self.evalAttr(jo, "mui-initfn");
	if (initfn == null)
		return;

	if (initfn && $.isFunction(initfn))
	{
		ret = initfn.apply(jo, paramArr) || true;
	}
	jo.data("mui.init", ret);
	return ret;
}

// 页面栈处理 {{{
// return: false表示忽略之后的处理
function handlePageStack(pageRef)
{
	if (m_isback !== null)
		return;

	// 浏览器后退前进时, 同步m_pageStack, 并可能修正错误(忽略poped页面)
	var n = self.m_pageStack.findCurrentState();
	var n1 = self.m_pageStack.go(n);
	if (n != n1) {
		setTimeout(function () {
			m_fn_history_go.call(window.history, n1-n);
		});
		return false;
	}
	m_isback = n < 0;
}

function initPageStack()
{
	// 重写history的前进后退方法
	history.back = function () {
		return history.go(-1);
	};
	history.forward = function () {
		return history.go(1);
	};
	history.go = function (n) {
		var n = self.m_pageStack.go(n);
		if (n == 0)
			return false;
		m_isback = n < 0;
		// history.go原函数
		return m_fn_history_go.call(this, n);
	};

	// 在移动端，左右划动页面可前进后退
	// 依赖jquery.touchSwipe组件
	if ('ontouchstart' in window && $.fn.swipe) {
		function swipeH(ev, direction, distance, duration, fingerCnt, fingerData, currentDirection) {
			var o = ev.target;
			while (o) {
				if ($(o).attr('mui-swipenav') === 'no')
					return;
				o = o.parentElement;
			}
			if (direction == 'right')
			{
				history.back();
			}
			else if (direction == 'left')
			{
				history.forward();
			}
		}
		$(document).swipe({
			excludedElements: "input,select,textarea,.noSwipe", // 与缺省相比，去掉了a,label,button
			swipeLeft: swipeH,
			swipeRight: swipeH,
			threshold: 100, // default=75
			// bug has fixed in jquery.touchSwipe.js, option preventDefaultEvents uses default=true, or else some device does not work
		});
	}
}
initPageStack();
// }}}

// "#"/"" => {pageId: "home", pageRef: "#home", pageFile: "{pageFolder}/home.html", templateRef: "#tpl_home"}
// "#aaa" => {pageId: "aaa", pageRef: "#aaa", pageFile: "{pageFolder}/aaa.html", templateRef: "#tpl_aaa"}
// "#xx/aaa.html" => {pageId: "aaa", pageRef: "#aaa", pageFile: "xx/aaa.html"}
// "#plugin1-page1" => 支持多级目录，如果plugin1不是一个插件：{pageId: "plugin1-page1", pageFile: "{pageFolder}/plugin1/page1.html"}
// "#plugin1-page1" => 如果plugin1是一个插件：{pageId: "plugin1-page1", pageFile: "{pluginFolder}/plugin1/m2/page/page1.html"}
function getPageInfo(pageRef)
{
	if (pageRef == "#" || pageRef == "" || pageRef == null)
		pageRef = self.options.homePage;
	var pageId = pageRef[0] == '#'? pageRef.substr(1): pageRef;
	var ret = {pageId: pageId, pageRef: pageRef};
	var p = pageId.lastIndexOf(".");
	if (p == -1) {
		p = pageId.lastIndexOf('-');
		if (p != -1) {
			var plugin = pageId.substr(0, p);
			var pageId2 = pageId.substr(p+1);
			if (Plugins.exists(plugin)) {
				ret.pageFile = self.options.pluginFolder + '/' + plugin + '/m2/page/' + pageId2 + '.html';
			}
		}
		ret.templateRef = "#tpl_" + pageId;
	}
	else {
		ret.pageFile = pageId;
		ret.pageId = pageId.match(/[^.\/]+(?=\.)/)[0];
	}
	if (ret.pageFile == null) 
		ret.pageFile = self.options.pageFolder + '/' + pageId.replace(/-/g, '/') + ".html";
	return ret;
}

/**
@fn MUI.showPage(pageRef, opt)

@param pageId String. 页面名字. 仅由字母、数字、"_"等字符组成。
@param pageRef String. 页面引用（即location.hash），以"#"开头，后面可以是一个pageId（如"#home"）或一个相对页的地址（如"#info.html", "#emp/info.html"）。
@param opt {ani?, url?}  (v3.3) 该参数会传递给pagebeforeshow/pageshow回调函数。

opt.ani:: String. 动画效果。设置为"none"禁用动画。

opt.url:: String. 指定在地址栏显示的地址。如 `showPage("#order", {url: "?id=100"})` 可设置显示的URL为 `page/order.html?id=100`.
@see MUI.setUrl

在应用内无刷新地显示一个页面。

例：

	MUI.showPage("#order");
	
显示order页，先在已加载的DOM对象中找id="order"的对象，如果找不到，则尝试找名为"tpl_home"的模板DOM对象，如果找不到，则以ajax方式动态加载页面"page/order.html"。

注意：

- 在加载页面时，只会取第一个DOM元素作为页面。

加载成功后，会将该页面的id设置为"order"，然后依次：

	调用 mui-initfn中指定的初始化函数，如 initPageOrder
	触发pagecreate事件
	触发pagebeforeshow事件
	触发pageshow事件

动态加载页面时，缺省目录名为`page`，如需修改，应在初始化时设置pageFolder选项：

	MUI.options.pageFolder = "mypage";

也可以显示一个指定路径的页面：

	MUI.showPage("#page/order.html");

由于它对应的id是order, 在显示时，先找id="order"的对象是否存在，如果不存在，则动态加载页面"page/order.html"并为该对象添加id="order".

在HTML中, 如果<a>标签的href属性以"#"开头，则会自动以showPage方式无刷新显示，如：

	<a href="#order">order</a>
	<a href="#emp/empinfo.html">empinfo</a>

可以通过`mui-opt`属性设置showPage的参数(若有多项，以逗号分隔)，如：

	<a href="#me" mui-opt="ani:'none'">me</a>

如果不想在应用内打开页面，只要去掉链接中的"#"即可：

	<a href="emp/empinfo.html">empinfo</a>

特别地，如果href属性以"#dlg"开头，则会自动以showDialog方式显示对话框，如

	<a href="#dlgSetUserInfo">set user info</a>

点击后相当于调用：

	MUI.showDialog(MUI.activePage.find("#dlgSetUserInfo"));

(v3.3) opt参数会传递到pagebeforeshow/pageshow参数中，如

	MUI.showPage("order", {orderId: 100});

	function initPageOrder()
	{
		var jpage = this;
		jpage.on("pagebeforeshow", function (ev, opt) {
			// opt={orderId: 100}
		});
		jpage.on("pageshow", function (ev, opt) {
			// opt={orderId: 100}
		});
	}
*/
self.showPage = showPage;
function showPage(pageRef, opt)
{
	if (self.container == null)
		return;

	if (pageRef == null)
		pageRef = getHash();
	else if (pageRef == "#")
		pageRef = self.options.homePage;
	else if (pageRef[0] != "#")
		pageRef = "#" + pageRef; // 为了兼容showPage(pageId), 新代码不建议使用

	// 避免hashchange重复调用
	if (m_lastPageRef == pageRef)
	{
		m_isback = null; // reset!
		return;
	}
	if (m_curState == null || m_curState.appId != m_appId) {
		m_isback = false; // 新页面
		//self.m_pageStack.push(pageRef);
	}

	var showPageOpt_ = $.extend({
		ani: self.options.ani
	}, opt);

	var ret = handlePageStack(pageRef);
	if (ret === false)
		return;

	m_lastPageRef = pageRef;

	var pi = setHash(pageRef, showPageOpt_.url);

	// find in document
	var pageId = pi.pageId;
	m_toPageId = pageId;
	var jpage = self.container.find("#" + pageId + ".mui-page");
	// find in template
	if (jpage.size() > 0)
	{
		changePage(jpage);
		return;
	}

	var jtpl = pi.templateRef? $(pi.templateRef): null;
	if (jtpl && jtpl.size() > 0) {
		var html = jtpl.html();
		// webcc内嵌页面时，默认使用script标签（因为template尚且普及），其中如果有script都被替换为__script__, 这里做还原。
		if (jtpl[0].tagName == 'SCRIPT') {
			html = html.replace(/__script__/g, 'script');
		}
		// bugfix: 用setTimeout解决微信浏览器切页动画显示异常
		setTimeout(function () {
			loadPage(html, pageId);
		});
	}
	else {
		self.enterWaiting(); // NOTE: leaveWaiting in initPage
		var m = pi.pageFile.match(/(.+)\//);
		var path = m? m[1]: "";
		$.ajax(pi.pageFile, {error: null}).then(function (html) {
			loadPage(html, pageId, path);
		}).fail(function () {
			self.leaveWaiting();
			self.app_alert("找不到页面: " + pageId, "e");
			history.back();
			return false;
		});
	}

	// path?=self.options.pageFolder
	function loadPage(html, pageId, path)
	{
		// 放入dom中，以便document可以收到pagecreate等事件。
		if (m_jstash == null) {
			m_jstash = $("<div id='muiStash' style='display:none'></div>").appendTo(self.container);
		}
		// 注意：如果html片段中有script, 在append时会同步获取和执行(jquery功能)
		var jpage = $(html).filter("div");
		if (jpage.size() > 1 || jpage.size() == 0) {
			console.log("!!! Warning: bad format for page '" + pageId + "'. Element count = " + jpage.size());
			jpage = jpage.filter(":first");
		}

		// 限制css只能在当前页使用
		jpage.find("style:not([mui-nofix])").each(function () {
			$(this).html( self.ctx.fixPageCss($(this).html(), "#" + pageId) );
		});
		// bugfix: 加载页面页背景图可能反复被加载
		jpage.find("style").attr("mui-origin", pageId).appendTo(document.head);
		jpage.attr("id", pageId).addClass("mui-page")
			.hide().appendTo(self.container);

		var val = jpage.attr("mui-script");
		if (val != null) {
			if (path == null)
				path = self.options.pageFolder;
			if (path != "")
				val = path + "/" + val;
			var dfd = mCommon.loadScript(val, initPage);
			dfd.fail(function () {
				self.app_alert("加载失败: " + val);
				self.leaveWaiting();
				history.back();
			});
		}
		else {
			initPage();
		}

		function initPage()
		{
			// 检测运营商js劫持，并自动恢复。
			var fname = jpage.attr("mui-initfn");
			if (fname && window[fname] == null) {
				// 10s内重试
				var failTry_ = jpage.data("failTry_");
				var dt = new Date();
				if (failTry_ == null) {
					self.app_alert("逻辑页错误，或页面被移动运营商劫持! 正在重试...");
					failTry_ = dt;
					jpage.data("failTry_", failTry_);
				}
				if (dt - failTry_ < 10000)
					setTimeout(initPage, 200);
				else
					console.log("逻辑页加载失败: " + jpage.attr("id"));
				return;
			}

			self.enhanceWithin(jpage);
			var ret = callInitfn(jpage);
			if (ret instanceof jQuery)
				jpage = ret;
			jpage.trigger("pagecreate");
			changePage(jpage);
			self.leaveWaiting();
		}
	}

	function changePage(jpage)
	{
		// TODO: silde in for goback
		if (self.activePage && self.activePage[0] === jpage[0])
			return;

		var oldPage = self.activePage;
		if (oldPage) {
			self.prevPageId = oldPage.attr("id");
		}
		var toPageId = jpage.attr("id");
		jpage.trigger("pagebeforeshow", [showPageOpt_]);
		// 如果在pagebeforeshow中调用showPage显示其它页，则不显示当前页，避免页面闪烁。
		if (toPageId != m_toPageId)
		{
			// 类似于调用popPageStack(), 避免返回时再回到该页面
			var pageRef = "#" + toPageId;
			self.m_pageStack.walk(function (state) {
				if (state.pageRef == pageRef) {
					state.isPoped = true;
					return false;
				}
			});
			return;
		}

		var enableAni = showPageOpt_.ani !== 'none'; // TODO
		var slideInClass = m_isback? "slideIn1": "slideIn";
		m_isback = null;
		self.container.show(); // !!!! 
		jpage.css("z-index", 1).show();
		if (oldPage)
			oldPage.css("z-index", "-1");
		if (enableAni) {
			jpage.addClass(slideInClass);
			jpage.one("animationend", onAnimationEnd)
				.one("webkitAnimationEnd", onAnimationEnd);

// 				if (oldPage)
// 					oldPage.addClass("slideOut");
		}
		self.activePage = jpage;
		fixPageSize();
		var title = jpage.find(".hd h1, .hd h2").filter(":first").text() || self.title || jpage.attr("id");
		setDocTitle(title);

		if (!enableAni) {
			onAnimationEnd();
		}
		function onAnimationEnd()
		{
			if (enableAni) {
				// NOTE: 如果不删除，动画效果将导致fixed position无效。
				jpage.removeClass(slideInClass);
// 					if (oldPage)
// 						oldPage.removeClass("slideOut");
			}
			if (toPageId != m_toPageId)
				return;
			jpage.trigger("pageshow", [showPageOpt_]);
			if (oldPage) {
				oldPage.trigger("pagehide");
				oldPage.hide();
			}
		// TODO: destroy??
// 				if (oldPage.attr("autoDestroy")) {
// 					oldPage.remove();
// 				}
		}
	}
}

/**
@fn MUI.setDocTitle(title)

设置文档标题。默认在切换页面时，会将文档标题设置为逻辑页的标题(`hd`块中的`h1`或`h2`标签)。
*/
self.setDocTitle = setDocTitle;
function setDocTitle(newTitle)
{
	document.title = newTitle;
	if(mCommon.isIOS() && mCommon.isWeixin()) {
		document.title = newTitle;
		var $iframe = $('<iframe src="/favicon.ico"></iframe>');
		$iframe.one('load',function() {
			setTimeout(function() {
				$iframe.remove();
			}, 0);
		}).appendTo(self.container);
	}
}

/**
@fn MUI.unloadPage(pageRef?)

@param pageRef 如未指定，表示当前页。

删除一个页面。
*/
self.unloadPage = unloadPage;
function unloadPage(pageRef)
{
	var jo = null;
	var pageId = null;
	if (pageRef == null) {
		jo = self.activePage;
		pageId = jo.attr("id");
		pageRef = "#" + pageId;
	}
	else {
		if (pageRef[0] == "#") {
			pageId = pageRef.substr(1);
		}
		else {
			pageId = pageRef;
			pageRef = "#" + pageId;
		}
		jo = $(pageRef);
	}
	if (jo.find("#footer").size() > 0)
		jo.find("#footer").appendTo(m_jstash);
	jo.remove();
	$("style[mui-origin=" + pageId + "]").remove();
}

/**
@fn MUI.reloadPage(pageRef?, opt?)

@param pageRef 如未指定，表示当前页。
@param opt 传递给MUI.showPage的opt参数。参考MUI.showPage.

重新加载指定页面。不指定pageRef时，重加载当前页。
*/
self.reloadPage = reloadPage;
function reloadPage(pageRef, opt)
{
	if (pageRef == null)
		pageRef = "#" + self.activePage.attr("id");
	unloadPage(pageRef);
	m_lastPageRef = null; // 防止showPage中阻止运行
	showPage(pageRef, opt);
}

/**
@var MUI.m_pageStack

页面栈，MUI.popPageStack对它操作
*/
self.m_pageStack = new PageStack();

/** 
@fn MUI.popPageStack(n?=1) 

n=0: 退到首层, >0: 指定pop几层

常用场景：

添加订单并进入下个页面后, 点击后退按钮时避免再回到添加订单页面, 应调用

	MUI.popPageStack(); // 当前页（提交订单页）被标记poped
	MUI.showPage("#xxx"); // 进入下一页。之后回退时，可跳过被标记的前一页

如果添加订单有两步（两个页面），希望在下个后面后退时跳过前两个页面, 可以调用

	MUI.popPageStack(2);
	MUI.showPage("#xxx");

如果想在下个页面后退时直接回到初始进入应用的逻辑页（不一定是首页）, 可以调用：（注意顺序！）

	MUI.showPage("#xxx");
	MUI.popPageStack(0); // 标记除第一页外的所有页为poped, 所以之后回退时直接回到第一页。

如果只是想立即跳回两页，不用调用popPageStack，而应调用：

	history.go(-2);

*/
self.popPageStack = popPageStack;
function popPageStack(n)
{
	self.m_pageStack.pop(n);
}

$(window).on('popstate', function (ev) {
	m_curState = ev.originalEvent.state;
	showPage();
});


$(window).on('orientationchange', fixPageSize);
$(window).on('resize'           , fixPageSize);

function fixPageSize()
{
	if (self.activePage) {
		var jpage = self.activePage;
		var H = self.container.height();
		var jo, hd, ft;
		jo= jpage.find(">.hd");
		hd = (jo.size() > 0 && jo.css("display") != "none")? jo.height() : 0;
		jo = jpage.find(">.ft");
		ft = (jo.size() > 0 && jo.css("display") != "none")? jo.height() : 0;
		jpage.height(H);
		jpage.find(">.bd").css({
			top: hd,
			bottom: ft
		});
	}
}

/**
@fn MUI.getToPageId()

返回最近一次调用MUI.showPage时转向页面的Id.

@see MUI.prevPageId
 */
self.getToPageId = getToPageId;
function getToPageId()
{
	return m_toPageId;
}

// ------- ui: navbar and footer {{{

self.m_enhanceFn["#footer"] = enhanceFooter;
self.m_enhanceFn[".mui-navbar"] = enhanceNavbar;

function activateElem(jo)
{
	if (jo.hasClass("active"))
		return;

	var jo1 = jo.parent().find(">*.active").removeClass("active");
	jo.addClass("active");

	handleLinkto(jo, true);
	handleLinkto(jo1, false);

	function handleLinkto(jo, active)
	{
		var ref = jo.attr("mui-linkto");
		if (ref) {
			var jlink = jo.closest(".mui-page").find(ref); // DONT use self.activePage that may be wrong on pagebeforeshow
			jlink.toggle(active);
			jlink.toggleClass("active", active);
		}
	}
}

function enhanceNavbar(jo)
{
	// 如果有noactive类，则不自动点击后active
	if (jo.hasClass("noactive"))
		return;

	// 确保有且只有一个active
	var ja = jo.find(">.active");
	if (ja.size() == 0) {
		ja = jo.find(">:first").addClass("active");
	}
	else if (ja.size() > 1) {
		ja.filter(":not(:first)").removeClass("active");
		ja = ja.filter(":first");
	}

	var jpage_ = null;
	jo.find(">*").on('click', function () {
		activateElem($(this));
	})
	// 确保mui-linkto指向对象active状态与navbar一致
	.each (function () {
		var ref = $(this).attr("mui-linkto");
		if (ref) {
			if (jpage_ == null)
				jpage = jo.closest(".mui-page");
			var active = $(this).hasClass("active");
			var jlink = jpage.find(ref);
			jlink.toggle(active);
			jlink.toggleClass("active", active);
		}
	});
}

function enhanceFooter(jfooter)
{
	enhanceNavbar(jfooter);
	jfooter.addClass("ft").addClass("mui-navbar");
	var jnavs = jfooter.find(">a");
	var id2nav = {};
	jnavs.each(function(i, e) {
		var m = e.href.match(/#(\w+)/);
		if (m) {
			id2nav[m[1]] = e;
		}
	});
	$(document).on("pagebeforeshow", function (ev) {
		var jpage = $(ev.target);
		var pageId = jpage.attr("id");
		if (m_toPageId != pageId)
			return;
		var e = id2nav[pageId];
		if (e === undefined)
		{
			if (jfooter.parent()[0] !== m_jstash[0])
				jfooter.appendTo(m_jstash);
			return;
		}
		jfooter.appendTo(jpage);
		activateElem($(e));
	});
}

//}}}
// ------- ui: dialog {{{

self.m_enhanceFn[".mui-dialog, .mui-menu"] = enhanceDialog;

function enhanceDialog(jo)
{
	jo.wrap("<div class=\"mui-mask\" style=\"display:none\"></div>");
	var isMenu = jo[0].classList.contains("mui-menu");
	jo.parent().click(function (ev) {
		if (!isMenu && this !== ev.target)
			return;
		closeDialog(jo);
	});
}

/**
@fn MUI.showDialog(jdlg)
*/
self.showDialog = showDialog;
function showDialog(jdlg)
{
	if (jdlg.constructor === String) {
		jdlg = MUI.activePage.find(jdlg);
	}
	var opt = self.getOptions(jdlg);
	if (opt.initfn) {
		opt.onBeforeShow = opt.initfn.call(jdlg);
		opt.initfn = null;
	}
	if (opt.onBeforeShow)
		opt.onBeforeShow.call(jdlg);
	jdlg.show();
	jdlg.parent().show();
	//bugfix: 如果首页未显示就出错，app_alert无法显示
	self.container.show(); 
}

/**
@fn MUI.closeDialog(jdlg, remove=false)
*/
self.closeDialog = closeDialog;
function closeDialog(jdlg, remove)
{
	if (remove) {
		jdlg.parent().remove();
		return;
	}
	jdlg.parent().hide();
}

/**
@fn MUI.setupDialog(jdlg, initfn)

@return 可以不返回, 或返回一个回调函数beforeShow, 在每次Dialog显示前调用.

使用该函数可设置dialog的初始化回调函数和beforeShow回调.

使用方法:

	MUI.setupDialog(jdlg, function () {
		var jdlg = this;
		jdlg.find("#btnOK").click(btnOK_click);

		function btnOK_click(ev) { }

		function beforeShow() {
			// var jdlg = this;
			var jtxt = jdlg.find("#txt1");
			callSvr("getxxx", function (data) {
				jtxt.val(data);
			});
		}
		return beforeShow;
	});

*/
self.setupDialog = setupDialog;
function setupDialog(jdlg, initfn)
{
	self.getOptions(jdlg).initfn = initfn;
}

/**
@fn MUI.app_alert(msg, [type?=i], [fn?], opt?={timeoutInterval?, defValue?, onCancel()?})
@alias app_alert
@param type 对话框类型: "i": info, 信息提示框; "e": error, 错误框; "w": warning, 警告框; "q": question, 确认框(会有"确定"和"取消"两个按钮); "p": prompt, 输入框
@param fn Function(text?) 回调函数，当点击确定按钮时调用。当type="p" (prompt)时参数text为用户输入的内容。
@param opt Object. 可选项。 timeoutInterval表示几秒后自动关闭对话框。defValue用于输入框(type=p)的缺省值.

onCancel: 用于"q", 点取消时回调.

示例:

	// 信息框，3s后自动点确定
	app_alert("操作成功", function () {
		MUI.showPage("#orders");
	}, {timeoutInterval: 3000});

	// 错误框
	app_alert("操作失败", "e");

	// 确认框(确定/取消)
	app_alert("立即付款?", "q", function () {
		MUI.showPage("#pay");
	});

	// 输入框
	app_alert("输入要查询的名字:", "p", function (text) {
		callSvr("Book.query", {cond: "name like '%" + text + "%'});
	});

可自定义对话框，接口如下：

- 对象id为muiAlert, class包含mui-dialog.
- .p-title用于设置标题; .p-msg用于设置提示文字
- 两个按钮 #btnOK, #btnCancel，仅当type=q (question)时显示btnCancel.
- 输入框 #txtInput，仅当type=p (prompt)时显示。

示例：

	<div id="muiAlert" class="mui-dialog">
		<h3 class="p-title"></h3>
		<div class="p-msg"></div>
		<input type="text" id="txtInput"> <!-- 当type=p时才会显示 -->
		<div>
			<a href="javascript:;" id="btnOK" class="mui-btn primary">确定</a>
			<a href="javascript:;" id="btnCancel" class="mui-btn">取消</a>
		</div>
	</div>

app_alert一般会复用对话框 muiAlert, 除非层叠开多个alert, 这时将clone一份用于显示并在关闭后删除。

*/
window.app_alert = self.app_alert = app_alert;
function app_alert(msg)
{
	var type = "i";
	var fn = null;
	var alertOpt = {};

	for (var i=1; i<arguments.length; ++i) {
		var arg = arguments[i];
		if ($.isFunction(arg)) {
			fn = arg;
		}
		else if ($.isPlainObject(arg)) {
			alertOpt = arg;
		}
		else if (typeof(arg) === "string") {
			type = arg;
		}
	}


	//var cls = {i: "mui-info", w: "mui-warning", e: "mui-error", q: "mui-question", p: "mui-prompt"}[type];
	var s = {i: "提示", w: "警告", e: "出错了", q: "确认", p: "输入"}[type];

	var jdlg = self.container.find("#muiAlert");
	if (jdlg.size() == 0) {
		var html = '' + 
'<div id="muiAlert" class="mui-dialog">' + 
'	<h3 class="hd p-title"></h3>' + 
'	<div class="sp p-msg"></div>' +
'	<input type="text" id="txtInput" style="border:1px solid #bbb; line-height:1.5">' +
'	<div class="sp nowrap">' +
'		<a href="javascript:;" id="btnOK" class="mui-btn primary">确定</a>' +
'		<a href="javascript:;" id="btnCancel" class="mui-btn">取消</a>' +
'	</div>' +
'</div>'
		jdlg = $(html);
		self.enhanceWithin(jdlg);
		jdlg.parent().appendTo(self.container);
	}

	var isClone = false;
	// 如果正在显示，则使用clone
	if (jdlg.parent().is(":visible")) {
		var jo = jdlg.parent().clone().appendTo(self.container);
		jdlg = jo.find(".mui-dialog");
		isClone = true;
	}
	var opt = self.getOptions(jdlg);
	if (opt.type == null) {
		jdlg.find("#btnOK, #btnCancel").click(app_alert_click);
		jdlg.keydown(app_alert_keydown);
	}
	opt.type = type;
	opt.fn = fn;
	opt.alertOpt = alertOpt;
	opt.isClone = isClone;

	jdlg.find("#btnCancel").toggle(type == "q" || type == "p");
	var jtxt = jdlg.find("#txtInput");
	jtxt.toggle(type == "p");
	if (type == "p") {
		jtxt.val(alertOpt.defValue);
		setTimeout(function () {
			jtxt.focus();
		});
	}

	jdlg.find(".p-title").html(s);
	jdlg.find(".p-msg").html(msg);
	self.showDialog(jdlg);

	if (alertOpt.timeoutInterval != null) {
		opt.timer = setTimeout(function() {
			// 表示上次显示已结束
			jdlg.find("#btnOK").click();
		}, alertOpt.timeoutInterval);
	}
}

// jdlg.opt: {fn, type, alertOpt, timer, isClone}
function app_alert_click(ev)
{
	var jdlg = $(this).closest("#muiAlert");
	mCommon.assert(jdlg.size()>0);
	var opt = self.getOptions(jdlg);
	if (opt.timer) {
		clearInterval(opt.timer);
		opt.timer = null;
	}
	var btnId = this.id;
	if (opt.fn && btnId == "btnOK") {
		if (opt.type == "p") {
			var text = jdlg.find("#txtInput").val();
			if (text != "") {
				opt.fn(text);
			}
			else if (opt.alertOpt.onCancel) {
				opt.alertOpt.onCancel();
			}
		}
		else {
			opt.fn();
		}
	}
	else if (btnId == "btnCancel" && opt.alertOpt.onCancel) {
		opt.alertOpt.onCancel();
	}
	self.closeDialog(jdlg, opt.isClone);
}

function app_alert_keydown(ev)
{
	if (ev.keyCode == 13) {
		return $(this).find("#btnOK").click();
	}
	else if (ev.keyCode == 27) {
		return $(this).find("#btnCancel").click();
	}
}

/**
@fn MUI.showLoading()
*/
self.showLoading = showLoading;
function showLoading()
{
	if (m_jLoader == null) {
		m_jLoader = $("<div class='mui-loader'></div>");
	}
	m_jLoader.appendTo(document.body);
}
	
/**
@fn MUI.hideLoading()
*/
self.hideLoading = hideLoading;
function hideLoading()
{
	if (m_jLoader)
		m_jLoader.remove();
}

//}}}
// ------- ui: anchor {{{

self.m_enhanceFn["a[href^=#]"] = enhanceAnchor;

function enhanceAnchor(jo)
{
	if (jo.attr("onclick"))
		return;
	// 使用showPage, 与直接链接导致的hashchange事件区分
	jo.click(function (ev) {
		ev.preventDefault();
		var href = jo.attr("href");
		// 如果名字以 "#dlgXXX" 则自动打开dialog
		if (href.substr(1,3) == "dlg") {
			var jdlg = self.activePage.find(href);
			self.showDialog(jdlg);
			return;
		}
		var opt = self.evalAttr(jo, "mui-opt");
		self.showPage(href, opt);
	});
}
//}}}

// ------ main
	
function main()
{
	self.title = document.title;
	self.container = $(".mui-container");
	if (self.container.size() == 0)
		self.container = $(document.body);
	self.enhanceWithin(self.container);

	// 在muiInit事件中可以调用showPage.
	self.container.trigger("muiInit");

	// 根据hash进入首页
	if (self.showFirstPage)
		showPage();
}

$(main);

}
// ====== WEBCC_END_FILE mui-showPage.js }}}

// ====== WEBCC_BEGIN_FILE mui.js {{{
jdModule("jdcloud.mui", JdcloudMui);
function JdcloudMui()
{
var self = this;
var mCommon = jdModule("jdcloud.common");

// 子模块
JdcloudApp.call(self);
JdcloudCall.call(self);
JdcloudMuiPage.call(self);

// ====== global {{{
/**
@var isBusy

标识应用当前是否正在与服务端交互。一般用于自动化测试。
*/
self.isBusy = false;

/**
@var g_args

应用参数。

URL参数会自动加入该对象，例如URL为 `http://{server}/{app}/index.html?orderId=10&dscr=上门洗车`，则该对象有以下值：

	g_args.orderId=10; // 注意：如果参数是个数值，则自动转为数值类型，不再是字符串。
	g_args.dscr="上门洗车"; // 对字符串会自动进行URL解码。

此外，框架会自动加一些参数：

@var g_args._app?="user" 应用名称，由 WUI.options.appName 指定。

@see parseQuery URL参数通过该函数获取。
*/
window.g_args = {}; // {_test, _debug, cordova}

/**
@var g_cordova

值是一个整数，默认为0. 
如果非0，表示WEB应用在苹果或安卓APP中运行，且数值代表原生应用容器的大版本号。

示例：检查用户APP版本是否可以使用某些插件。

	if (g_cordova) { // 在原生APP中。可以使用插件。
		// 假如在IOS应用的大版本3中，加入了某插件，如果用户未升级，可提示他升级：
		if (g_cordova < 3 && isIOS()) {
			app_alert("您的版本太旧，XX功能无法使用，请升级到最新版本");
		}
	}

TODO: MUI.cordova
*/
window.g_cordova = 0; // the version for the android/ios native cient. 0 means web app.

/**
@var g_data = {userInfo?, serverRev?, initClient?}

应用全局共享数据。

在登录时，会自动设置userInfo属性为个人信息。所以可以通过 g_data.userInfo==null 来判断是否已登录。

serverRev用于标识服务端版本，如果服务端版本升级，则应用可以实时刷新以更新到最新版本。

@key g_data.userInfo
@key g_data.serverRev
@key g_data.initClient
应用初始化时，调用initClient接口得到的返回值，通常为{plugins, ...}

@key g_data.testMode,g_data.mockMode 测试模式和模拟模式

TODO: MUI.data
*/
window.g_data = {}; // {userInfo, serverRev?, initClient?, testMode?, mockMode?}

//}}}

/**
@var MUI.options

可用的选项如下。

@key MUI.options.appName?=user  应用名称

用于与后端通讯时标识app.

@key MUI.options.loginPage?="#login"  login逻辑页面的地址
@key MUI.options.homePage?="#home"  首页地址
@key MUI.options.pageFolder?="page" 逻辑页面文件(html及js)所在文件夹

@key MUI.options.noHandleIosStatusBar?=false

@see topic-iosStatusBar

@key MUI.options.manualSplash?=false
@see topic-splashScreen

@var MUI.options.logAction?=false  Boolean. 是否显示详细日志。
可用于交互调用的监控。

@var MUI.options.PAGE_SZ?=20  分页大小，下拉列表每次取数据的缺省条数。

@var MUI.options.mockDelay?=50  模拟调用后端接口的延迟时间，单位：毫秒。仅对异步调用有效。

@see MUI.mockData 模拟调用后端接口

@var MUI.options.serverUrl?="./"  服务端接口地址设置。
@var MUI.options.serverUrlAc  表示接口名称的URL参数。

示例：

	$.extend(MUI.options, {
		serverUrl: "http://myserver/myapp/api.php",
		serverUrlAc: "ac"
	});

接口"getuser(id=10)"的HTTP请求为：

	http://myserver/myapp/api.php?ac=getuser&id=10
	
如果不设置serverUrlAc（默认为空），则HTTP请求为：

	http://myserver/myapp/api.php/getuser?id=10

支持上面这种URL的服务端，一般配置过pathinfo机制。
再进一步，如果服务端设置了rewrite规则可以隐藏api.php，则可设置：

	$.extend(MUI.options, {
		serverUrl: "http://myserver/myapp/", // 最后加一个"/"
	});

这样发起的HTTP请求为：

	http://myserver/myapp/getuser?id=10

@var MUI.options.pluginFolder?="../plugin" 指定筋斗云插件目录

筋斗云插件提供具有独立接口的应用功能模块，包括前端、后端实现。

@var MUI.options.showHash?=true

默认访问逻辑页面时，URL地址栏显示为: "index.html#me"

只读，如果值为false, 则地址栏显示为: "index.html/page/me.html".

注意：该选项不可通过js设置为false，而应在主页面中设置：

	<base href="./" mui-showHash="no">

在showHash=false时，必须设置base标签, 否则逻辑页将无法加载。
*/
	var m_opt = self.options = {
		appName: "user",
		loginPage: "#login",
		homePage: "#home",
		pageFolder: "page",
		serverUrl: "./",

		logAction: false,
		PAGE_SZ: 20,
		manualSplash: false,
		mockDelay: 50,

		pluginFolder: "../plugin",
		showHash: ($("base").attr("mui-showHash") != "no"),
	};

	var m_onLoginOK;
	var m_allowedEntries;

// ---- 通用事件 {{{
function document_pageCreate(ev)
{
	var jpage = $(ev.target);

	var jhdr = jpage.find("> .hd");
	// 标题栏空白处点击5次, 进入测试模式
	jhdr.click(function (ev) {
		// 注意避免子元素bubble导致的事件
		if ($(ev.target).hasClass("hd") || ev.target.tagName == "H1" || ev.target.tagName == "H2")
			switchTestMode(this); 
	});
}

$(document).on("pagecreate", document_pageCreate);

// ---- 处理ios7以上标题栏问题(应下移以空出状态栏)
// 需要定义css: #ios7statusbar
function handleIos7Statusbar()
{
	if(g_cordova){
		var ms = navigator.userAgent.match(/(iPad.*|iPhone.*|iPod.*);.*CPU.*OS (\d+)_\d/i);
		if(ms) {
			var ver = ms[2];
			if (ver >= 7) {
				self.container.css("margin-top", "20px");
			}
		}	
	}
}

/**
@fn MUI.setFormSubmit(jf, fn?, opt?={validate?, onNoAction?})

@param fn Function(data); 与callSvr时的回调相同，data为服务器返回的数据。
函数中可以使用this["userPost"] 来获取post参数。

@param opt.validate: Function(jf, queryParam={ac?,...}). 如果返回false, 则取消submit. queryParam为调用参数，可以修改。

form提交时的调用参数, 如果不指定, 则以form的action属性作为queryParam.ac发起callSvr调用.
form提交时的POST参数，由带name属性且不带disabled属性的组件决定, 可在validate回调中设置．

设置POST参数时，固定参数可以用`<input type="hidden">`标签来设置，自动计算的参数可以先放置一个隐藏的input组件，然后在validate回调中来设置。
示例：

	<form action="fn1">
		<input name="name" value="">
		<input name="type" value="" style="display:none">
		<input type="hidden" name="wantAll" value="1">
	</form>

	MUI.setFormSubmit(jf, api_fn1, {
		validate: function(jf, queryParam) {
			// 检查字段合法性
			if (! isValidName(jf[0].name.value)) {
				app_alert("bad name");
				return false;
			}
			// 设置GET参数字段"cond"示例
			queryParam.cond = "id=1";

			// 设置POST参数字段"type"示例
			jf[0].type.value = ...;
		}
	});

如果之前调用过setFormData(jo, data, {setOrigin:true})来展示数据, 则提交时，只会提交被修改过的字段，否则提交所有字段。

@param opt.onNoAction: Function(jf). 当form中数据没有变化时, 不做提交. 这时可调用该回调函数.

*/
self.setFormSubmit = setFormSubmit;
function setFormSubmit(jf, fn, opt)
{
	opt = opt || {};
	jf.submit(function (ev) {
		ev.preventDefault();

		var queryParam = {ac: jf.attr("action")};
		if (opt.validate) {
			if (false === opt.validate(jf, queryParam))
				return false;
		}
		var postParam = mCommon.getFormData(jf);
		if (! $.isEmptyObject(postParam)) {
			var ac = queryParam.ac;
			delete queryParam.ac;
			self.callSvr(ac, queryParam, fn, postParam, {userPost: postParam});
		}
		else if (opt.onNoAction) {
			opt.onNoAction(jf);
		}
		return false;
	});
}
//}}}

// ------ cordova setup {{{
$(document).on("deviceready", function () {
	var homePageId = m_opt.homePage.substr(1); // "#home"
	// 在home页按返回键退出应用。
	$(document).on("backbutton", function () {
		if (self.activePage.attr("id") == homePageId) {
			self.app_alert("退出应用?", 'q', function () {
				navigator.app.exitApp();
			});
			return;
		}
		history.back();
	});

	$(document).on("menubutton", function () {
	});

	if (!m_opt.manualSplash && navigator.splashscreen && navigator.splashscreen.hide)
	{
		// 成功加载后稍等一会(避免闪烁)后隐藏启动图
		$(function () {
			setTimeout(function () {
				navigator.splashscreen.hide();
			}, 500);
		});
	}
});

//}}}

// ------ enter and exit {{{
// 所有登录页都应以app.loginPage指定内容作为前缀，如loginPage="#login", 
// 则登录页面名称可以为：#login, #login1, #loginByPwd等
function isLoginPage(pageRef)
{
	if (/^\w/.test(pageRef)) {
		pageRef = "#" + pageRef;
	}
	if (pageRef.indexOf(m_opt.loginPage) != 0)
		return false;
	return true;
}

// page: pageRef/jpage/null
function getPageRef(page)
{
	var pageRef = page;
	if (page == null) {
		if (self.activePage) {
			pageRef = "#" + self.activePage.attr("id");
		}
		else {
			// only before jquery mobile inits
			// back to this page after login:
			pageRef = location.hash || m_opt.homePage;
		}
	}
	else if (page instanceof jQuery) {
		pageRef = "#" + page.attr("id");
	}
	else if (page === "#" || page === "") {
		pageRef = m_opt.homePage;
	}
	return pageRef;
}

/**
@fn MUI.showLogin(page?)
@param page=pageRef/jpage 如果指定, 则登录成功后转向该页面; 否则转向登录前所在的页面.

显示登录页. 注意: 登录页地址通过MUI.options.loginPage指定, 缺省为"#login".

	<div data-role="page" id="login">
	...
	</div>

注意：

- 登录成功后，会自动将login页面清除出页面栈，所以登录成功后，点返回键，不会回到登录页。
- 如果有多个登录页（如动态验证码登录，用户名密码登录等），其它页的id起名时，应以app.loginPage指定内容作为前缀，
  如loginPage="#login", 则登录页面名称可以为：#login(缺省登录页), #login1, #loginByPwd等；否则无法被识别为登录页，导致登录成功后按返回键仍会回到登录页

*/
self.showLogin = showLogin;
function showLogin(page)
{
	var pageRef = getPageRef(page);
	m_onLoginOK = function () {
		// 如果当前仍在login系列页面上，则跳到指定页面。这样可以在handleLogin中用MUI.showPage手工指定跳转页面。
		if (MUI.activePage && isLoginPage(MUI.getToPageId()))
			MUI.showPage(pageRef);
	}
	MUI.showPage(m_opt.loginPage);
}

/**
@fn MUI.showHome()

显示主页。主页是通过 MUI.options.homePage 来指定的，默认为"#home".

要取主页名可以用：

	var jpage = $(MUI.options.homePage);

@see MUI.options.homePage
*/
self.showHome = showHome;
function showHome()
{
	self.showPage(m_opt.homePage);
}

/**
@fn MUI.logout(dontReload?)
@param dontReload 如果非0, 则注销后不刷新页面.

注销当前登录, 成功后刷新页面(除非指定dontReload=1)
*/
self.logout = logout;
function logout(dontReload)
{
	deleteLoginToken();
	g_data.userInfo = null;
	self.callSvr("logout", function () {
		if (! dontReload)
			mCommon.reloadSite();
	});
}

/**
@fn MUI.validateEntry(@allowedEntries) 入口页检查

设置入口页，allowedEntries是一个数组, 如果初始页面不在该数组中, 则URL中输入该逻辑页时，会自动转向主页。

示例：

	MUI.validateEntry([
		"#home",
		"#me",
	]);

*/
self.validateEntry = validateEntry;
// check if the entry is in the entry list. if not, refresh the page without search query (?xx) or hash (#xx)
function validateEntry(allowedEntries)
{
	if (allowedEntries == null)
		return;
	m_allowedEntries = allowedEntries;

	if (/*location.search != "" || */
			(location.hash && location.hash != "#" && allowedEntries.indexOf(location.hash) < 0) ) {
		location.href = location.pathname + location.search;
		self.app_abort();
	}
}

// set g_args
function parseArgs()
{
	if (location.search)
		g_args = mCommon.parseQuery(location.search.substr(1));

	if (g_args.cordova || mCommon.getStorage("cordova")) {
		if (g_args.cordova === 0) {
			mCommon.delStorage("cordova");
		}
		else {
			g_cordova = parseInt(g_args.cordova || mCommon.getStorage("cordova"));
			g_args.cordova = g_cordova;
			mCommon.setStorage("cordova", g_cordova);
			$(function () {
				var path = './';
				if (mCommon.isIOS()) {
					mCommon.loadScript(path + "cordova-ios/cordova.js?__HASH__,.."); 
				}
				else {
					mCommon.loadScript(path + "cordova/cordova.js?__HASH__,.."); 
				}
			});
		}
	}
}
parseArgs();

// ---- login token for auto login {{{
function tokenName()
{
	var name = "token";
	if (m_opt.appName)
		name += "_" + m_opt.appName;
	return name;
}

function saveLoginToken(data)
{
	if (data._token)
	{
		mCommon.setStorage(tokenName(), data._token);
	}
}

function loadLoginToken()
{
	return mCommon.getStorage(tokenName());
}

function deleteLoginToken()
{
	mCommon.delStorage(tokenName());
}

/**
@fn MUI.tryAutoLogin(onHandleLogin, reuseCmd?, allowNoLogin?=false)

尝试自动登录，如果失败则转到登录页（除非allowNoLogin=true）。

@param onHandleLogin Function(data). 调用后台login()成功后的回调函数(里面使用this为ajax options); 可以直接使用MUI.handleLogin
@param reuseCmd String. 当session存在时替代后台login()操作的API, 如"User.get", "Employee.get"等, 它们在已登录时返回与login相兼容的数据. 因为login操作比较重, 使用它们可减轻服务器压力. 
@param allowNoLogin Boolean. 缺省未登录时会自动跳转登录页面, 如果设置为true, 如不会自动跳转登录框, 表示该应用允许未登录时使用.
@return Boolean. true=登录成功; false=登录失败.

该函数应该在muiInit事件中执行, 以避免框架页面打开主页。

	$(document).on("muiInit", myInit);

	function myInit()
	{
		// redirect to login if auto login fails
		MUI.tryAutoLogin(handleLogin, "User.get");
	}

	function handleLogin(data)
	{
		MUI.handleLogin(data);
		// g_data.userInfo已赋值
	}

*/
self.tryAutoLogin = tryAutoLogin;
function tryAutoLogin(onHandleLogin, reuseCmd, allowNoLogin)
{
	var ok = false;
	var ajaxOpt = {async: false, noex: true};

	function handleAutoLogin(data)
	{
		if (data === false) // has exception (as noex=true)
			return;

		g_data.userInfo = data;
		if (onHandleLogin)
			onHandleLogin.call(this, data);
		ok = true;
	}

	// first try "User.get"
	if (reuseCmd != null) {
		self.callSvr(reuseCmd, handleAutoLogin, null, ajaxOpt);
	}
	if (ok)
		return ok;

	// then use "login(token)"
	var token = loadLoginToken();
	if (token != null)
	{
		var param = {wantAll:1};
		var postData = {token: token};
		self.callSvr("login", param, handleAutoLogin, postData, ajaxOpt);
	}
	if (ok)
		return ok;

	if (! allowNoLogin)
	{
		self.showFirstPage = false;
		showLogin();
	}
	return ok;
}

/**
@fn MUI.handleLogin(data)
@param data 调用API "login"成功后的返回数据.

处理login相关的操作, 如设置g_data.userInfo, 保存自动登录的token等等.

*/
self.handleLogin = handleLogin;
function handleLogin(data)
{
	saveLoginToken(data);
	if (data.id == null)
		return;
	g_data.userInfo = data;

	// 登录成功后点返回，避免出现login页
	var popN = 0;
	self.m_pageStack.walk(function (state) {
		if (! isLoginPage(state.pageRef))
			return false;
		++ popN;
	});
	if (popN > 0)
		self.popPageStack(popN);

	if (m_onLoginOK) {
		var fn = m_onLoginOK;
		m_onLoginOK = null;
		setTimeout(fn);
	}
}
//}}}
//}}}

// ------ plugins {{{
/**
@fn MUI.initClient(param?)
*/
self.initClient = initClient;
var plugins_ = {};
function initClient(param)
{
	self.callSvrSync('initClient', param, function (data) {
		g_data.initClient = data;
		plugins_ = data.plugins || {};
		$.each(plugins_, function (k, e) {
			if (e.js) {
				// "plugin/{pluginName}/{plugin}.js"
				var js = m_opt.pluginFolder + '/' + k + '/' + e.js;
				mCommon.loadScript(js, {async: true});
			}
		});
	});
}

/**
@class Plugins
*/
window.Plugins = {
/**
@fn Plugins.exists(pluginName)
*/
	exists: function (pname) {
		return plugins_[pname] !== undefined;
	},

/**
@fn Plugins.list()
*/
	list: function () {
		return plugins_;
	}
};
//}}}

// ------ main {{{

// 单击5次，每次间隔不大于2s
function switchTestMode(obj)
{
	var INTERVAL = 4; // 2s
	var MAX_CNT = 5;
	var f = switchTestMode;
	var tm = new Date();
	// init, or reset if interval 
	if (f.cnt == null || f.lastTm == null || tm - f.lastTm > INTERVAL*1000 || f.lastObj != obj)
	{
		f.cnt = 0;
		f.lastTm = tm;
		f.lastObj = obj;
	}
//	console.log("switch: " + f.cnt);
	if (++ f.cnt >= MAX_CNT) {
		f.cnt = 0;
		f.lastTm = tm;
		var url = prompt("切换URL?", location.href);
		if (url == null || url === "" || url == location.href)
			return;
		if (url[0] == "/") {
			url = "http://" + url;
		}
		location.href = url;
		self.app_abort();
	}
}

function main()
{
	var jc = self.container;
	if (mCommon.isIOS()) {
		jc.addClass("mui-ios");
	}
	else if (mCommon.isAndroid()) {
		jc.addClass("mui-android");
	}

	if (g_cordova) {
		jc.addClass("mui-cordova");
	}
	if (mCommon.isWeixin()) {
		jc.addClass("mui-weixin");
	}
	console.log(jc.attr("class"));

	if (! m_opt.noHandleIosStatusBar)
		handleIos7Statusbar();
}

$(main);
//}}}

/**
@fn filterCordovaModule(module)

原生插件与WEB接口版本匹配。
在cordova_plugins.js中使用，用于根据APP版本与当前应用标识，过滤当前Web可用的插件。

例如，从客户端（应用标识为user）版本2.0，商户端（应用标识为store）版本3.0开始，添加插件 geolocation，可配置filter如下：

	module.exports = [
		...
		{
			"file": "plugins/cordova-plugin-geolocation/www/android/geolocation.js",
			"id": "cordova-plugin-geolocation.geolocation",
			"clobbers": [
				"navigator.geolocation"
			],
			"filter": [ ["user",2], ["store",3] ] // 添加filter
		}
	];

	filterCordovaModule(module); // 过滤模块

配置后，尽管WEB已更新，但旧版本应用程序不会具有该接口。

filter格式: [ [app1, minVer?=1, maxVer?=9999], ...], 仅当app匹配且版本在minVer/maxVer之间才使用
如果未指定filter, 表示总是使用
app标识由应用定义，常用如: "user"-客户端;"store"-商户端

*/
self.filterCordovaModule = filterCordovaModule;
function filterCordovaModule(module)
{
	var plugins = module.exports;
	module.exports = [];

	var app = (window.g_args && MUI.options.appName) || 'user';
	var ver = (window.g_args && g_args.cordova) || 1;
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
	if (plugins.metadata)
		module.exports.metadata = plugins.metadata;
}

/**
@fn MUI.formatField(obj) -> obj

对obj中的以字符串表示的currency/date等类型进行转换。
判断类型的依据是属性名字，如以Tm结尾的属性（也允许带数字后缀）为日期属性，如"tm", "tm2", "createTm"都会被当作日期类型转换。

注意：它将直接修改传入的obj，并最终返回该对象。

	obj = {id: 1, amount: "15.0000", payAmount: "10.0000", createTm: "2016-01-11 11:00:00"}
	var order = MUI.formatField(obj); // obj会被修改，最终与order相同
	// order = {id: 1, amount: 15, payAmount: 10, createTm: (datetime类型)}
*/
var RE_CurrencyField = /(?:^(?:amount|price|total|qty)|(?:Amount|Price|Total|Qty))\d*$/;
var RE_DateField = /(?:^(?:dt|tm)|(?:Dt|Tm))\d*$/;
self.formatField = formatField;
function formatField(obj)
{
	for (var k in obj) {
		if (obj[k] == null || typeof obj[k] !== 'string')
			continue;
		if (RE_DateField.test(k))
			obj[k] = mCommon.parseDate(obj[k]);
		else if (RE_CurrencyField.test(k))
			obj[k] = parseFloat(obj[k]);
	}
	return obj;
}

/**
@fn hd_back(pageRef?)

返回操作，类似history.back()，但如果当前页是入口页时，即使没有前一页，也可转向pageRef页（未指定时为首页）。
一般用于顶部返回按钮：

	<div class="hd">
		<a href="javascript:hd_back();" class="icon icon-back"></a>
		<h2>个人信息</h2>
	</div>

*/
window.hd_back = hd_back;
function hd_back(pageRef)
{
	var n = 0;
	MUI.m_pageStack.walk(function (state) {
		if (++ n > 1)
			return false;
	});
	// 页面栈顶
	if (n <= 1) {
		if (pageRef == null)
			pageRef = MUI.options.homePage;
		//if (m_allowedEntries==null || m_allowedEntries.indexOf("#" + MUI.activePage.attr("id")) >=0)
		if (! isLoginPage(MUI.activePage.attr("id")))
			MUI.showPage(pageRef);
		return;
	}
	history.back();
}

/**
@fn MUI.syslog(module, pri, content)

向后端发送日志。后台必须已添加syslog插件。
日志可在后台Syslog表中查看，客户端信息可查看ApiLog表。

注意：如果操作失败，本函数不报错。
 */
self.syslog = syslog;
function syslog(module, pri, content)
{
	if (! Plugins.exists("syslog"))
		return;

	try {
		var postParam = {module: module, pri: pri, content: content};
		self.callSvr("Syslog.add", $.noop, postParam, {noex:1, noLoadingImg:1});
	} catch (e) {
		console.log(e);
	}
}

}
// vi: foldmethod=marker
// ====== WEBCC_END_FILE mui.js }}}

// ====== WEBCC_BEGIN_FILE initPageList.js {{{
jdModule("jdcloud.mui", JdcloudListPage);
function JdcloudListPage()
{
var self = this;
var mCommon = jdModule("jdcloud.common");

/**
@fn initPullList(container, opt)

为列表添加下拉刷新和上拉加载功能。

例：页面元素如下：

	<div mui-initfn="initPageOrders" mui-script="orders.js">
		<div class="bd">
			<div class="p-list"></div>
		</div>
	</div>

设置下拉列表的示例代码如下：

	var pullListOpt = {
		onLoadItem: showOrderList
	};
	var container = jpage.find(".bd")[0];
	initPullList(container, pullListOpt);

	var nextkey;
	function showOrderList(isRefresh)
	{
		var jlst = jpage.find(".p-list");
		var param = {res: "id desc", cond: "status=1"};
		if (nextkey == null)
			isRefresh = true;
		if (isRefresh)
			jlst.empty();
		param.pagekey = nextkey;

		callSvr("Ordr.query", param, function (data) {
			// create items and append to jlst
			// ....
			if (data.nextkey)
				nextkey = data.nextkey;
			// TODO: 处理分页结束即nextkey为空的情况。
		});
	}

注意：

- 由于page body的高度自动由框架设定，所以可以作为带滚动条的容器；如果是其它容器，一定要确保它有限定的宽度，以便可以必要时出现滚动条。
- *** 由于处理分页的逻辑比较复杂，请调用 initPageList替代, 即使只有一个list；它会屏蔽nextkey, refresh等细节，并做一些优化。像这样调用：

		initPageList(jpage, {
			pageItf: PageOrders,
			navRef: null,
			listRef: jlst,
			onGetQueryParam: ...
			onAddItem: ...
		});

本函数参数如下：

@param container 容器，它的高度应该是限定的，因而当内部内容过长时才可出现滚动条
@param opt {onLoadItem, autoLoadMore?=true, threshold?=180, onHint?, onPull?}

@param opt.onLoadItem function(isRefresh)

在合适的时机，它调用 onLoadItem(true) 来刷新列表，调用 onLoadItem(false) 来加载列表的下一页。在该回调中this为container对象（即容器）。实现该函数时应当自行管理当前的页号(pagekey)

@param opt.autoLoadMore 当滑动到页面下方时（距离底部TRIGGER_AUTOLOAD=30px以内）自动加载更多项目。

@param threshold 像素值。

手指最少下划或上划这些像素后才会触发实际加载动作。

@param opt.onHint function(ac, dy, threshold)

	ac  动作。"D"表示下拉(down), "U"表示上拉(up), 为null时应清除提示效果.
	dy,threshold  用户移动偏移及临界值。dy>threshold时，认为触发加载动作。

提供提示用户刷新或加载的动画效果. 缺省实现是下拉或上拉时显示提示信息。

@param opt.onHintText function(ac, uptoThreshold)

修改用户下拉/上拉时的提示信息。仅当未设置onHint时有效。onHint会生成默认提示，如果onHintText返回非空，则以返回内容替代默认内容。
内容可以是一个html字符串，所以可以加各种格式。

	ac:: String. 当前动作，"D"或"U".
	uptoThreshold:: Boolean. 是否达到阈值

@param opt.onPull function(ev)

如果返回false，则取消上拉加载或下拉刷新行为，采用系统默认行为。

*/
self.initPullList = initPullList;
function initPullList(container, opt)
{
	var opt_ = $.extend({
		threshold: 180,
		onHint: onHint,
		autoLoadMore: true,
	}, opt);
	var cont_ = container;

	var touchev_ = null; // {ac, x0, y0}
	var mouseMoved_ = false;
	var SAMPLE_INTERVAL = 200; // ms
	var TRIGGER_AUTOLOAD = 30; // px

	var lastUpdateTm_ = new Date();
	var dy_ = 0; // 纵向移动。<0为上拉，>0为下拉

	window.requestAnimationFrame = window.requestAnimationFrame || function (fn) {
		setTimeout(fn, 1000/60);
	};

	if ("ontouchstart" in window) {
		cont_.addEventListener("touchstart", touchStart);
		cont_.addEventListener("touchmove", touchMove);
		cont_.addEventListener("touchend", touchEnd);
		cont_.addEventListener("touchcancel", touchCancel);
	}
	else {
		cont_.addEventListener("mousedown", mouseDown);
	}
	if ($(cont_).css("overflowY") == "visible") {
		cont_.style.overflowY = "auto";
	}

	function getPos(ev)
	{
		var t = ev;
		if (ev.changedTouches) {
			t = ev.changedTouches[0];
		}
		return [t.pageX, t.pageY];
	}

	var jo_;
	function onHint(ac, dy, threshold)
	{
		var msg = null;
		if (jo_ == null) {
			jo_ = $("<div class='mui-pullPrompt'></div>");
		}

		var uptoThreshold = dy >= threshold;
		if (ac == "U") {
			msg = uptoThreshold? "<b>松开加载~~~</b>": "即将加载...";
		}
		else if (ac == "D") {
			msg = uptoThreshold? "<b>松开刷新~~~</b>": "即将刷新...";
		}
		if (opt_.onHintText) {
			var rv = opt_.onHintText(ac, uptoThreshold);
			if (rv != null)
				msg = rv;
		}
		var height = Math.min(dy, 100, 2.0*Math.pow(dy, 0.7));

		if (msg == null) {
			jo_.height(0).remove();
			return;
		}
		jo_.html(msg);
		jo_.height(height).css("lineHeight", height + "px");
			
		if (ac == "D") {
			var c = cont_.getElementsByClassName("mui-pullHint")[0];
			if (c)
				jo_.appendTo(c);
			else
				jo_.prependTo(cont_);
		}
		else if (ac == "U") {
			jo_.appendTo(cont_);
		}
	}

	// ac为null时，应清除提示效果
	function updateHint(ac, dy)
	{
		if (ac == null || dy == 0 || (opt_.autoLoadMore && ac == 'U')) {
			ac = null;
		}
		else {
			dy = Math.abs(dy);
		}
		opt_.onHint.call(this, ac, dy, opt_.threshold);
	}

	function touchStart(ev)
	{
		if (opt_.onPull && opt_.onPull(ev) === false) {
			ev.cancelPull_ = true;
			return;
		}

		var p = getPos(ev);
		touchev_ = {
			ac: null,
			// 原始top位置
			top0: cont_.scrollTop,
			// 原始光标位置
			x0: p[0],
			y0: p[1],
			// 总移动位移
			dx: 0,
			dy: 0,

			// 用于惯性滚动: 每SAMPLE_INTERVAL取样时最后一次时间及光标位置(用于计算初速度)
			momentum: {
				x0: p[0],
				y0: p[1],
				startTime: new Date()
			}
		};
		//ev.preventDefault(); // 防止click等事件无法触发
	}

	function mouseDown(ev)
	{
		mouseMoved_ = false;
		touchStart(ev);
		if (ev.cancelPull_ === true)
			return;
		// setCapture
		window.addEventListener("mousemove", mouseMove, true);
		window.addEventListener("mouseup", mouseUp, true);
		window.addEventListener("click", click, true);
	}

	// 防止拖动后误触发click事件
	function click(ev)
	{
		window.removeEventListener("click", click, true);
		if (mouseMoved_)
		{
			ev.stopPropagation();
			ev.preventDefault();
		}
	}

	function mouseMove(ev)
	{
		touchMove(ev);
		if (touchev_ == null)
			return;

		if (touchev_.dx != 0 || touchev_.dy != 0)
			mouseMoved_ = true;
		ev.stopPropagation();
		ev.preventDefault();
	}

	function mouseUp(ev)
	{
		touchEnd(ev);
		window.removeEventListener("mousemove", mouseMove, true);
		window.removeEventListener("mouseup", mouseUp, true);
		ev.stopPropagation();
		ev.preventDefault();
	}

	function touchMove(ev)
	{
		if (touchev_ == null)
			return;
		var p = getPos(ev);
		var m = touchev_.momentum;
		if (m) {
			var now = new Date();
			if ( now - m.startTime > SAMPLE_INTERVAL ) {
				m.startTime = now;
				m.x0 = p[0];
				m.y0 = p[1];
			}
		}

		touchev_.dx = p[0] - touchev_.x0;
		touchev_.dy = p[1] - touchev_.y0;
		dy_ = touchev_.dy;

		// 如果不是竖直下拉，则取消
		if (touchev_.dy == 0 || Math.abs(touchev_.dx) > Math.abs(touchev_.dy)) {
			touchCancel();
			return;
		}

		cont_.scrollTop = touchev_.top0 - touchev_.dy;
		var dy = touchev_.dy + (cont_.scrollTop - touchev_.top0);
		touchev_.pully = dy;

		if (cont_.scrollTop <= 0 && dy > 0) {
			touchev_.ac = "D";
		}
		else if (dy < 0 && cont_.scrollTop >= cont_.scrollHeight - cont_.clientHeight) {
			touchev_.ac = "U";
		}
		updateHint(touchev_.ac, dy);
		ev.preventDefault();
	}

	function touchCancel(ev)
	{
		touchev_ = null;
		updateHint(null, 0);
	}

	function momentumScroll(ev, onScrollEnd)
	{
		if (touchev_ == null || touchev_.momentum == null)
			return;

		// 惯性滚动
		var m = touchev_.momentum;
		var dt = new Date();
		var duration = dt - m.startTime;
		if (duration > SAMPLE_INTERVAL) {
			onScrollEnd && onScrollEnd();
			return;
		}

		var p = getPos(ev);
		var v0 = (p[1]-m.y0) / duration;
		if (v0 == 0) {
			onScrollEnd && onScrollEnd();
			return;
		}

		v0 *= 2.5;
		var deceleration = 0.0005;

		window.requestAnimationFrame(moveNext);
		function moveNext() 
		{
			// 用户有新的点击，则取消动画
			if (touchev_ != null)
				return;

			var dt1 = new Date();
			var t = dt1 - dt;
			dt = dt1;
			var s = v0 * t / 2;
			var dir = v0<0? -1: 1;
			v0 -= deceleration * t * dir;
			// 变加速运动
			deceleration *= 1.1;

			var top = cont_.scrollTop;
			cont_.scrollTop = top - s;
			if (v0 * dir > 0 && top != cont_.scrollTop) {
				window.requestAnimationFrame(moveNext);
			}
			else {
				onScrollEnd && onScrollEnd();
			}
		}
	}

	function touchEnd(ev)
	{
		updateHint(null, 0);
		if (touchev_ == null || touchev_.ac == null || Math.abs(touchev_.pully) < opt_.threshold)
		{
			momentumScroll(ev, onScrollEnd);
			touchev_ = null;
			return;
		}
		console.log(touchev_);
		doAction(touchev_.ac);
		dy_ = 0;
		touchev_ = null;

		function doAction(ac)
		{
			// pulldown
			if (ac == "D") {
				console.log("refresh");
				opt_.onLoadItem.call(cont_, true);
			}
			else if (ac == "U") {
				console.log("load more");
				opt_.onLoadItem.call(cont_, false);
			}
		}

		function onScrollEnd()
		{
			if (opt_.autoLoadMore && dy_ < -20) {
				var distanceToBottom = cont_.scrollHeight - cont_.clientHeight - cont_.scrollTop;
				if (distanceToBottom <= TRIGGER_AUTOLOAD) {
					doAction("U");
				}
			}
			dy_ = 0;
		}
	}
}

/**
@fn initPageList(jpage, opt) -> PageListInterface
@alias initNavbarAndList

列表页逻辑框架.

对一个导航栏(class="mui-navbar")及若干列表(class="p-list")的典型页面进行逻辑封装；也可以是若干button对应若干div-list区域，一次只显示一个区域；
特别地，也可以是只有一个list，并没有button或navbar对应。

它包括以下功能：

1. 首次进入页面时加载默认列表
2. 任一列表支持下拉刷新，上拉加载（自动管理刷新和分页）
3. 点击导航栏自动切换列表，仅当首次显示列表时刷新数据
4. 支持强制刷新所有列表的控制，一般定义在page接口中，如 PageOrders.refresh

## 例：一个navbar与若干list的组合

基本页面结构如下：

	<div mui-initfn="initPageOrders" mui-script="orders.js">
		<div class="hd">
			<h2>订单列表</h2>
			<div class="mui-navbar">
				<a href="javascript:;" class="active" mui-linkto="#lst1">待服务</a>
				<a href="javascript:;" mui-linkto="#lst2">已完成</a>
			</div>
		</div>

		<div class="bd">
			<div id="lst1" class="p-list active" data-cond="status='PA'"></div>
			<div id="lst2" class="p-list" data-cond="status='RE'"></div>
		</div>
	</div>

上面页面应注意：

- navbar在header中，不随着滚动条移动而改变位置
- 默认要显示的list应加上active类，否则自动取第一个显示列表。
- mui-navbar在点击一项时，会在对应的div组件（通过被点击的<a>按钮上mui-linkto属性指定链接到哪个div）添加class="active"。非active项会自动隐藏。

js调用逻辑示例：

	var lstItf = initPageList(jpage, {
		pageItf: PageOrders,

		//以下两项是缺省值：
		//navRef: ">.hd .mui-navbar",
		//listRef: ">.bd .p-list",
		
		// 设置查询参数，静态值一般通过在列表对象上设置属性 data-ac, data-cond以及data-queryParam等属性来指定更方便。
		onGetQueryParam: function (jlst, queryParam) {
			queryParam.ac = "Ordr.query";
			queryParam.orderby = "id desc";
			// queryParam.cond 已在列表data-cond属性中指定
		},
		onAddItem: function (jlst, itemData) {
			var ji = $("<li>" + itemData.title + "</li>");
			ji.appendTo(jlst);
		},
		onNoItem: function (jlst) {
			var ji = $("<li>没有订单</li>");
			ji.appendTo(jlst);
		}
	});

由于指定了pageItf属性，当外部页面设置了 PageOrders.refresh = true后，再进入本页面，所有关联的列表会在展现时自动刷新。且PageOrders.refresh会被自动重置为false.

## 例：若干button与若干list的组合

一个button对应一个list; 打开页面时只展现一个列表，点击相应按钮显示相应列表。

如果没有用navbar组件，而是一组button对应一组列表，点一个button显示对应列表，也可以使用本函数。页面如下：

	<div mui-initfn="initPageOrders" mui-script="orders.js">
		<div class="hd">
			<h2>订单列表</h2>
		</div>

		<div class="bd">
			<div class="p-panelHd">待服务</div>
			<div class="p-panel">
				<div id="lst1" class="p-list active"></div>
			</div>

			<div class="p-panelHd">已完成</div>
			<div class="p-panel">
				<div id="lst2" class="p-list"></div>
			</div>
		</div>
	</div>

js调用逻辑示例：

	jpage.find(".p-panel").height(500); // !!! 注意：必须为list container指定高度，否则无法出现下拉列表。一般根据页高自动计算。

	var lstItf = initPageList(jpage, {
		pageItf: PageOrders,
		navRef: ".p-panelHd", // 点标题栏，显示相应列表区
		listRef: ".p-panel .p-list", // 列表区
		...
	});

注意：navRef与listRef中的组件数目一定要一一对应。除了使用选择器，也可以直接用jQuery对象为navRef和listRef赋值。

## 例：只有一个list

只有一个list 的简单情况，也可以调用本函数简化分页处理.
仍考虑上例，假如那两个列表需要进入页面时就同时显示，那么可以分开一一设置如下：

	jpage.find(".p-panel").height(500); // 一定要为容器设置高度

	var lstItf = initPageList(jpage, {
		pageItf: PageOrders,
		navRef: "", // 置空，表示不需要button链接到表，下面listRef中的多表各自显示不相关。
		listRef: ".p-panel .p-list", // 列表区
		...
	});

上例中，listRef参数也可以直接使用jQuery对象赋值。
navRef是否为空的区别是，如果非空，则表示listRef是一组互斥的列表，点击哪个button，就会设置哪个列表为active列表。当切到当前页时，只显示或刷新active列表。

如果是只包含一个列表的简单页面：

	<div mui-initfn="initPageOrders" mui-script="orders.js">
		<div class="hd">
			<h2>订单列表</h2>
		</div>

		<div class="bd">
			<div class="p-list"></div>
		</div>
	</div>

由于bd对象的高度已自动设置，要设置p-list对象支持上下拉加载，可以简单调用：

	var lstItf = initPageList(jpage, {
		pageItf: PageOrders,
		navRef: "", // 一定置空，否则默认值是取mui-navbar
		listRef: ".p-list"
		...
	});

## 框架基本原理

原理是在合适的时机，自动调用类似这样的逻辑：

	var queryParam = {ac: "Ordr.query"};
	opt.onGetQueryParam(jlst, queryParam);
	callSvr(queryParam.ac, queryParam, function (data) {
		$.each(rs2Array(data), function (i, itemData) {
			opt.onAddItem(jlst, itemData);
		});
		if (data.d.length == 0)
			opt.onNoItem(jlst);
	});

## 参数说明

@param opt {onGetQueryParam?, onAddItem?, onNoItem?, pageItf?, navRef?=">.hd .mui-navbar", listRef?=">.bd .p-list", onBeforeLoad?, onLoad?, onGetData?, canPullDown?=true, onRemoveAll?}
@param opt 分页相关 { pageszName?="pagesz", pagekeyName?="pagekey" }

@param opt.onGetQueryParam Function(jlst, queryParam/o)

queryParam: {ac?, res?, cond?, ...}

框架在调用callSvr之前，先取列表对象jlst上的data-queryParam属性作为queryParam的缺省值，再尝试取data-ac, data-res, data-cond, data-orderby属性作为queryParam.ac等参数的缺省值，
最后再回调 onGetQueryParam。

	<ul data-queryParam="{q: 'famous'}" data-ac="Person.query" data-res="*,familyName" data-cond="status='PA' and name like '王%'">
	</ul>

此外，框架将自动管理 queryParam.pagekey/pagesz 参数。

@param opt.onAddItem (jlst, itemData, param)

param={idx, arr, isFirstPage}

框架调用callSvr之后，处理每条返回数据时，通过调用该函数将itemData转换为DOM item并添加到jlst中。
判断首页首条记录，可以用

	param.idx == 0 && param.isFirstPage

这里无法判断是否最后一页（可在onLoad回调中判断），因为有可能最后一页为空，这时无法回调onAddItem.

@param opt.onNoItem (jlst)

当没有任何数据时，可以插入提示信息。

@param opt.pageItf - page interface {refresh?/io}

在订单页面(PageOrder)修改订单后，如果想进入列表页面(PageOrders)时自动刷新所有列表，可以设置 PageOrders.refresh = true。
设置opt.pageItf=PageOrders, 框架可自动检查和管理refresh变量。

@param opt.navRef,opt.listRef  指定navbar与list，可以是选择器，也可以是jQuery对象；或是一组button与一组div，一次显示一个div；或是navRef为空，而listRef为一个或多个不相关联的list.

@param opt.onBeforeLoad(jlst, isFirstPage)->Boolean  如果返回false, 可取消load动作。参数isFirstPage=true表示是分页中的第一页，即刚刚加载数据。
@param opt.onLoad(jlst, isLastPage)  参数isLastPage=true表示是分页中的最后一页, 即全部数据已加载完。

@param opt.onGetData(data, pagesz, pagekey?) 每次请求获取到数据后回调。pagesz为请求时的页大小，pagekey为页码（首次为null）

@param opt.onRemoveAll(jlst) 清空列表操作，默认为 jlst.empty()

@return PageListInterface={refresh, markRefresh, loadMore}

- refresh: Function(), 刷新当前列表
- markRefresh: Function(jlst?), 刷新指定列表jlst或所有列表(jlst=null), 下次浏览该列表时刷新。
- loadMore: Function(), 加载下一页数据

## css类

可以对以下两个CSS class指定样式：

@key mui-pullPrompt CSS-class 下拉刷新提示块
@key mui-loadPrompt CSS-class 自动加载提示块

## 列表页用于选择

@key example-list-choose

常见需求：在一个页面上，希望进入另一个列表页，选择一项后返回。

可定义页面接口如下（主要是choose方法和onChoose回调）：

	var PageOrders = {
		...
		// onChoose(order={id,dscr,...})
		choose: function (onChoose) {
			this.chooseOpt_ = {
				onChoose: onChoose
			}
			MUI.showPage('#orders');
		},

		chooseOpt_: null // {onChoose}
	};

在被调用页面上：

- 点击一个列表项时，调用onChoose回调
- 页面隐藏时，清空chooseOpt_参数。

示例：

	function initPageOrders()
	{
		jpage.on("pagehide", onPageHide);

		function li_click(ev)
		{
			var order = $(this).data('obj');
			if (PageOrders.chooseOpt_) {
				PageOrders.chooseOpt_.onChoose(order);
				return false;
			}

			// 正常点击操作 ...
		}

		function onPageHide()
		{
			PageOrders.chooseOpt_ = null;
		}
	}

在调用时：

	PageOrders.choose(onChoose);

	function onChoose(order)
	{
		// 处理order
		history.back(); // 由于进入列表选择时会离开当前页面，这时应返回
	}

## 分页机制与后端接口适配

默认按BQP协议的分页机制访问服务端，其规则是：

- 请求通过 pagesz 参数指定页大小
- 如果不是最后一页，服务端应返回nextkey字段；返回列表的格式可以是 table格式如 

		{
			h: [ "field1","field2" ],
			d: [ ["val1","val2"], ["val3","val4"], ... ]
			nextkey: 2
		}

	也可以用list参数指定列表，如

		{
			list: [
				{field1: "val1", field2: "val2"},
				{field1: "val3", field2: "val4"},
			],
			nextkey: 2
		}

- 请求下一页时，设置参数pagekey = nextkey，直到服务端不返回 nextkey 字段为止。

例1：假定后端分页机制为(jquery-easyui datagrid分页机制):

- 请求时通过参数page, rows分别表示页码，页大小，如 `page=1&rows=20`
- 返回数据通过字段total表示总数, rows表示列表数据，如 `{ total: 83, rows: [ {...}, ... ] }`

适配方法为：

	var listItf = initPageList(jpage, {
		...

		pageszName: 'rows',
		pagekeyName: 'page',

		// 设置 data.list, data.nextkey (如果是最后一页则不要设置); 注意pagekey可以为空
		onGetData: function (data, pagesz, pagekey) {
			data.list = data.rows;
			if (pagekey == null)
				pagekey = 1;
			if (data.total >  pagesz * pagekey)
				data.nextkey = pagekey + 1;
		}
	});

@key initPageList.options initPageList默认选项

如果需要作为全局默认设置可以这样：

	$.extend(initPageList.options, {
		pageszName: 'rows', 
		...
	});

例2：假定后端分页机制为：

- 请求时通过参数curPage, maxLine分别表示页码，页大小，如 `curPage=1&maxLine=20`
- 返回数据通过字段curPage, countPage, investList 分别表示当前页码, 总页数，列表数据，如 `{ curPage:1, countPage: 5, investList: [ {...}, ... ] }`

	var listItf = initPageList(jpage, {
		...

		pageszName: 'maxLine',
		pagekeyName: 'curPage',

		// 设置 data.list, data.nextkey (如果是最后一页则不要设置); 注意pagekey可以为空
		onGetData: function (data, pagesz, pagekey) {
			data.list = data.investList;
			if (data.curPage < data.countPage)
				data.nextkey = data.curPage + 1;
		}
	});

例3：假定后端就返回一个列表如`[ {...}, {...} ]`，不支持分页。
什么都不用设置，仍支持下拉刷新，因为刚好会当成最后一页处理，上拉不再加载。

## 下拉刷新提示信息

@key .mui-pullHint 指定下拉提示显示位置
显示下拉刷新提示时，默认是在列表所在容器的最上端位置显示的。如果需要指定显示位置，可使用css类"mui-pullHint"，示例如下：

	<div class="bd">
		<div>下拉列表演示</div>
		<div class="mui-pullHint"></div> <!-- 如果没有这行，则下拉提示会在容器最上方，即"下拉列表演示"这行文字的上方-->
		<div id="lst1"></div>
		<div id="lst2"></div>
	</div>

## 禁止下拉和上拉行为

例：在多页列表中，有一些页只做静态展示使用，不需要上拉或下拉：

	<div mui-initfn="initPageOrders" mui-script="orders.js">
		<div class="hd">
			<h2>订单列表</h2>
			<div class="mui-navbar">
				<a href="javascript:;" class="active" mui-linkto="#lst1">待服务</a>
				<a href="javascript:;" mui-linkto="#lst2">已完成</a>
				<a href="javascript:;" mui-linkto="#lst3">普通页</a>
			</div>
		</div>

		<div class="bd">
			<div id="lst1" class="p-list active" data-cond="status='PA'"></div>
			<div id="lst2" class="p-list" data-cond="status='RE'"></div>
			<div id="lst3" class="mui-noPull">
				<p>本页面没有下拉加载或上拉刷新功能</p>
			</div>
		</div>
	</div>

例子中使用了类"mui-noPull"来标识一个TAB页不是列表页，无需分页操作。

@key .mui-noPull 如果一个列表页项的class中指定了此项，则显示该列表页时，不允许下拉。

还可以通过设置onPull选项来灵活设置，例：

	var listItf = initPageList(jpage, ...,
		onPull(ev, jlst) {
			if (jlst.attr("id") == "lst3")
				return false;
		}
	);

@param opt.onPull function(ev, jlst)

jlst:: 当前活动页。函数如果返回false，则取消所有上拉加载或下拉刷新行为，使用系统默认行为。

## 仅自动加载，禁止下拉刷新行为

有时不想为列表容器指定固定高度，而是随着列表增长而自动向下滚动，在滚动到底时自动加载下一页。
这时可禁止下拉刷新行为：

	var listItf = initPageList(jpage, 
		...,
		canPullDown: false,
	);

@param opt.canPullDown?=true  是否允许下拉刷新

设置为false时，当列表到底部时，可以自动加载下一页，但没有下拉刷新行为，这时页面容器也不需要确定高度。

 */
self.initPageList = initPageList;
function initPageList(jpage, opt)
{
	var opt_ = $.extend({}, initPageList.options, opt);
	var jallList_ = opt_.listRef instanceof jQuery? opt_.listRef: jpage.find(opt_.listRef);
	var jbtns_ = opt_.navRef instanceof jQuery? opt_.navRef: jpage.find(opt_.navRef);
	var firstShow_ = true;
	var busy_ = false;

	if (jbtns_.hasClass("mui-navbar")) {
		jbtns_ = jbtns_.find("a");
	}
	else {
		linkNavbarAndList(jbtns_, jallList_);
	}
	if (jallList_.size() == 0)
		throw "bad list";

	init();

	function linkNavbarAndList(jbtns, jlsts)
	{
		jbtns.each(function (i, e) {
			$(e).data("linkTo", jlsts[i]);
		});
		jbtns.click(function () {
			jlsts.removeClass("active");

			var lst = $(this).data("linkTo");
			$(lst).addClass("active");
		});
	}

	function init()
	{
		jpage.on("pagebeforeshow", pagebeforeshow);

		function pagebeforeshow()
		{
			if (opt_.pageItf && opt_.pageItf.refresh) {
				jallList_.data("nextkey_", null);
				opt_.pageItf.refresh = false;
				firstShow_ = true;
			}
			if (firstShow_ ) {
				// 以便用户代码可以通过click方法调整显示哪个tab页
				setTimeout(function () {
					showOrderList(false, false);
				});
			}
		}

		jbtns_.click(function (ev) {
			// 让系统先选中tab页再操作
			setTimeout(function () {
				showOrderList(false, true);
			});
		});

		if (opt_.canPullDown) {
			var pullListOpt = {
				onLoadItem: showOrderList,
				//onHint: $.noop,
				onHintText: onHintText,
				onPull: function (ev) {
					var jlst = getActiveList();
					if (jlst.is(".mui-noPull") || 
						(opt_.onPull && opt_.onPull(ev, jlst) === false)) {
						return false;
					}
				}
			};

			jallList_.parent().each(function () {
				var container = this;
				initPullList(container, pullListOpt);
			});
		}
		else {
			jallList_.parent().scroll(function () {
				var container = this;
				//var distanceToBottom = cont_.scrollHeight - cont_.clientHeight - cont_.scrollTop;
				if (! busy_ && container.scrollTop / (container.scrollHeight - container.clientHeight) >= 0.95) {
					console.log("load more");
					loadMore();
				}
			});
		}

		// 如果调用init时页面已经显示，则补充调用一次。
		if (MUI.activePage && MUI.activePage.attr("id") == jpage.attr("id")) {
			pagebeforeshow();
		}
	}

	// return jlst. (caller need check size>0)
	function getActiveList()
	{
		if (jallList_.size() <= 1)
			return jallList_;
		var jlst = jallList_.filter(".active");
		if (jlst.size() == 0)
			jlst = jallList_.filter(":first");
		return jlst;
	}

	function onHintText(ac, uptoThreshold)
	{
		if (ac == "D") {
			var jlst = getActiveList();
			if (jlst.size() == 0)
				return;

			var tm = jlst.data("lastUpdateTm_");
			if (! tm)
				return;
			var diff = mCommon.getTimeDiffDscr(tm, new Date());
			var str = diff + "刷新";
			if (uptoThreshold) {
				msg = "<b>" + str + "~~~</b>";
			}
			else {
				msg = str;
			}
			return msg;
		}
	}

	// (isRefresh?=false, skipIfLoaded?=false)
	function showOrderList(isRefresh, skipIfLoaded)
	{
		// nextkey=null: 新开始或刷新
		// nextkey=-1: 列表完成
		var jlst = getActiveList();
		if (jlst.is(".mui-noPull"))
			return;
		if (jlst.size() == 0)
			return;

		if (busy_) {
			var tm = jlst.data("lastCallTm_");
			if (tm && new Date() - tm <= 5000)
			{
				console.log('!!! ignore duplicated call');
				return;
			}
			// 5s后busy_标志还未清除，则可能是出问题了，允许不顾busy_标志直接进入。
		}

		var nextkey = jlst.data("nextkey_");
		if (isRefresh) {
			nextkey = null;
		}
		if (nextkey == null) {
			opt_.onRemoveAll(jlst); // jlst.empty();
		}
		else if (nextkey === -1)
			return;

		if (skipIfLoaded && nextkey != null)
			return;

		var queryParam = self.evalAttr(jlst, "data-queryParam") || {};
		$.each(["ac", "res", "cond", "orderby"], function () {
			var val = jlst.attr("data-" + this);
			if (val)
				queryParam[this] = val;
		});

		if (opt_.onBeforeLoad) {
			var rv = opt_.onBeforeLoad(jlst, nextkey == null);
			if (rv === false)
				return;
		}

		if (opt_.onGetQueryParam) {
			opt_.onGetQueryParam(jlst, queryParam);
		}

		if (!queryParam[opt_.pageszName])
			queryParam[opt_.pageszName] = MUI.options.PAGE_SZ; // for test, default 20.
		if (nextkey)
			queryParam[opt_.pagekeyName] = nextkey;

		var loadMore_ = !!nextkey;
		var joLoadMore_;
		if (loadMore_) {
			if (joLoadMore_ == null) {
				joLoadMore_ = $("<div class='mui-loadPrompt'>正在加载...</div>");
			}
			joLoadMore_.appendTo(jlst);
			// scroll to bottom
			var cont = jlst.parent()[0];
			cont.scrollTop = cont.scrollHeight;
		}
		else {
			jlst.data("lastUpdateTm_", new Date());
		}
		jlst.data("lastCallTm_", new Date());
		busy_ = true;
		var ac = queryParam.ac;
		mCommon.assert(ac != null, "*** queryParam `ac` is not defined");
		delete queryParam.ac;
		self.callSvr(ac, queryParam, api_OrdrQuery);

		function api_OrdrQuery(data)
		{
			busy_ = false;
			firstShow_ = false;
			if (loadMore_) {
				joLoadMore_.remove();
			}
			if (opt_.onGetData) {
				var pagesz = queryParam[opt_.pageszName];
				var pagekey = queryParam[opt_.pagekeyName];
				opt_.onGetData(data, pagesz, pagekey);
			}
			var arr = data;
			if ($.isArray(data.h) && $.isArray(data.d)) {
				arr = mCommon.rs2Array(data);
			}
			else if ($.isArray(data.list)) {
				arr = data.list;
			}
			mCommon.assert($.isArray(arr), "*** initPageList error: no list!");

			var isFirstPage = (nextkey == null);
			var isLastPage = (data.nextkey == null);
			var param = {arr: arr, isFirstPage: isFirstPage};
			$.each(arr, function (i, itemData) {
				param.idx = i;
				opt_.onAddItem && opt_.onAddItem(jlst, itemData, param);
			});
			if (! isLastPage)
				jlst.data("nextkey_", data.nextkey);
			else {
				if (jlst[0].children.length == 0) {
					opt_.onNoItem && opt_.onNoItem(jlst);
				}
				jlst.data("nextkey_", -1);
			}
			opt_.onLoad && opt_.onLoad(jlst, isLastPage);
		}
	}

	function refresh()
	{
		// (isRefresh?=false, skipIfLoaded?=false)
		showOrderList(true, false);
	}

	function loadMore()
	{
		// (isRefresh?=false, skipIfLoaded?=false)
		showOrderList(false);
	}

	function markRefresh(jlst)
	{
		if (jlst)
			jlst.data("nextkey_", null);
		else
			jallList_.data("nextkey_", null);
	}

	var itf = {
		refresh: refresh,
		markRefresh: markRefresh,
		loadMore: loadMore,
	};
	return itf;
}

initPageList.options = {
	navRef: ">.hd .mui-navbar",
	listRef: ">.bd .p-list",
	pageszName: "pagesz",
	pagekeyName: "pagekey",
	canPullDown: true,
	onRemoveAll: function (jlst) {
		jlst.empty();
	}
};

}
// ====== WEBCC_END_FILE initPageList.js }}}

// ====== WEBCC_BEGIN_FILE initPageDetail.js {{{
jdModule("jdcloud.mui", JdcloudDetailPage);
function JdcloudDetailPage()
{
var self = this;
var mCommon = jdModule("jdcloud.common");

/**
@var FormMode

FormMode.forAdd/forSet/forFind.

TODO: example
 */
window.FormMode = {
	forAdd: "A",
	forSet: "S",
	//forView: "V",
	forFind: "F"
};

/**
@fn showByFormMode(jo, formMode)

根据当前formMode自动显示或隐藏jo下的DOM对象.

示例: 对以下DOM对象

	<div id="div1">
		<div id="div2"></div>
		<div id="div3" class="forAdd"></div>
		<div id="div4" class="forSet"></div>
		<div id="div5" class="forSet forAdd"></div>
	</div>

调用showByFormMode(jo, FormMode.forAdd)时, 显示 div2, div3, div5;
调用showByFormMode(jo, FormMode.forSet)时, 显示 div2, div4, div5;
 */
function showByFormMode(jo, formMode)
{
	jo.find(".forSet, .forAdd").each(function () {
		var cls = null;
		if (formMode == FormMode.forSet) {
			cls = "forSet";
		}
		else if (formMode == FormMode.forAdd) {
			cls = "forAdd";
		}
		if (cls)
			$(this).toggle($(this).hasClass(cls));
	});
}

/**
@fn initPageDetail(jpage, opt) -> PageDetailInterface={refresh(), del()}

详情页框架. 用于对象的添加/查看/更新多合一页面.
form.action为对象名.

@param opt {pageItf, jform?=jpage.find("form:first"), onValidate?, onGetData?, onNoAction?=history.back, onAdd?, onSet?, onGet?, onDel?}

pageItf: {formMode, formData}; formData用于forSet模式下显示数据, 它必须有属性id. 
Form将则以pageItf.formData作为源数据, 除非它只有id一个属性(这时将则调用callSvr获取源数据)

onValidate: Function(jform, queryParam); 提交前的验证, 或做字段补全的工作, 或补全调用参数。queryParam是查询参数，它可能包含{ac?, res?, ...}，可以进行修改。
onGetData: Function(jform, queryParam); 在forSet模式下，如果需要取数据，则回调该函数，获取get调用的参数。
onNoAction: Function(jform); 一般用于更新模式下，当没有任何数据更改时，直接点按钮提交，其实不做任何调用, 这时将回调 onNoAction，缺省行为是返回上一页。
onAdd: Function(id); 添加完成后的回调. id为新加数据的编号. 
onSet: Function(data); 更新完成后的回调, data为更新后的数据.
onGet: Function(data); 获取数据后并调用setFormData将数据显示到页面后，回调该函数, 可用于显示特殊数据.
onDel: Function(); 删除对象后回调.

示例：制作一个人物详情页PagePerson：

- 在page里面包含form，form的action属性标明对象名称，method属性不用。form下包含各展示字段，各字段以name属性标识。
- 可以用 forAdd, forSet 等class标识对象只在添加或更新时显示。
- 一个或多个提交按钮，触发提交事件。
- 对于不想展示但需要提交的字段，可以用设置为隐藏的input[type=text]对象，或是input[type=hidden]对象；如果字段会变化应使用前者，type=hidden对象内容设置后不会变化(如调用setFormData不修改hidden对象)

逻辑页面（html片段）示例如下：

	<div mui-initfn="initPagePerson" mui-script="person.js">
		...
		<div class="bd">
			<form action="Person">
				<input name="name" required placeholder="输入名称">
				<textarea name="dscr" placeholder="写点简介"></textarea>
				<div class="forSet">人物标签</div>

				<button type="submit" id="btnOK">确定</button>
				<input type="text" style="display:none" name="familyId">

			</form>
		</div>
	</div>

调用initPageDetail使它成为支持添加、查看和更新的详情页：

	var PagePerson = {
		showForAdd: function (formData) ...
		showForSet: function (formData) ...
	};

	function initPagePerson()
	{
		var jpage = this;
		var pageItf = PagePerson;
		initPageDetail(jpage, {
			pageItf: pageItf, // 需要页面接口提供 formMode, formData等属性。
			onValidate: function (jf) {
				// 补足字段和验证字段，返回false则取消form提交。
				if (pageItf.formMode == FormMode.forAdd) {
					...
				}
			},
			onAdd: function (id) {
				PagePersons.show({refresh: true}); // 添加成功后跳到列表页并刷新。
			},
			onSet: function (data) {
				app_alert("更新成功!", history.back); // 更新成功后提示信息，然后返回前一页。
			},
			onDel: function () {
				PagePersons.show({refresh: true});
			},
		});
	}

	// 其它页调用它：
	PagePerson.showForAdd({familyId: 1}); // 添加人物，已设置familyId为1
	PagePerson.showForSet(person); // 以person对象内容显示人物，可更新。
	PagePerson.showForSet({id: 3}); // 以id=3查询人物并显示，可更新。

页面接口常常实现如下：

	var PagePerson = {
		// @fn PagePerson.showForAdd(formData?)
		// formData={familyId, parentId?, parentOf?}
		showForAdd: function(formData) {
			this.formMode = FormMode.forAdd;
			this.formData = formData;
			MUI.showPage("#person");
		},
		// @fn PagePerson.showForSet(formData)
		// formData={id,...}
		showForSet: function (formData) {
			this.formMode = FormMode.forSet;
			this.formData = formData;
			MUI.showPage("#person");
		},

		formMode: null,
		formData: null,
	};

对于forSet模式，框架先检查formData中是否只有id属性，如果是，则在进入页面时会自动调用{obj}.get获取数据.

	<form action="Person">
		<div name=familyName></div>
		...
	</form>

如果formData中有多个属性，则自动以formData的内容作为数据源显示页面，不再发起查询。

*/
self.initPageDetail = initPageDetail;
function initPageDetail(jpage, opt)
{
	var pageItf = opt.pageItf;
	if (! pageItf)
		throw("require opt.pageItf");
	var jf = opt.jform || jpage.find("form:first");
	var obj_ = jf.attr("action");
	if (!obj_ || /\W/.test(obj_)) 
		throw("bad object: form.action=" + obj_);

	jpage.on("pagebeforeshow", onPageBeforeShow);

	MUI.setFormSubmit(jf, api_Ordr, {
		validate: onValidate,
		onNoAction: opt.onNoAction || history.back,
	});

	function onValidate(jf, queryParam)
	{
		var ac;
		if (pageItf.formMode == FormMode.forAdd) {
			ac = "add";
		}
		else if (pageItf.formMode == FormMode.forSet) {
			ac = "set";
			queryParam.id = pageItf.formData.id;
		}
		queryParam.ac = obj_ + "." + ac;

		var ret;
		if (opt.onValidate) {
			ret = opt.onValidate(jf, queryParam);
		}
		return ret;
	}

	function api_Ordr(data)
	{
		if (pageItf.formMode == FormMode.forAdd) {
			// 到新页后，点返回不允许回到当前页
			MUI.popPageStack();
			opt.onAdd && opt.onAdd(data);
		}
		else if (pageItf.formMode == FormMode.forSet) {
			var originData = jf.data("origin_");
			$.extend(originData, this.userPost); // update origin data
			opt.onSet && opt.onSet(originData);
		}
	}

	function onPageBeforeShow() 
	{
		if (pageItf.formMode == FormMode.forAdd) {
			mCommon.setFormData(jf, pageItf.formData); // clear data
		}
		else if (pageItf.formMode == FormMode.forSet) {
			showObject();
		}
		else if (pageItf.formMode == FormMode.forFind) {
			// TODO: 之前不是forFind则应清空
			mCommon.setFormData(jf); // clear data
		}
		showByFormMode(jpage, pageItf.formMode);
	}

	// refresh?=false
	function showObject(refresh)
	{
		var data = pageItf.formData;
		if (data == null || data.id == null) {
			console.log("!!! showObject: no obj or obj.id");
			return;
		}

		// 如果formData中只有id属性，则发起get查询；否则直接用此数据。
		var needGet = true;
		if (! refresh) {
			for (var prop in data) {
				if (prop == "id" || $.isFunction(data[prop]))
					continue;
				needGet = false;
				break;
			}
		}
		if (! needGet) {
			onGet(data);
		}
		else {
			var queryParam = {
				ac: obj_ + ".get",
				id: data.id
			};
			opt.onGetData && opt.onGetData(jf, queryParam);
			var ac = queryParam.ac;
			delete queryParam.ac;
			self.callSvr(ac, queryParam, onGet);
		}

		function onGet(data)
		{
			mCommon.setFormData(jf, data, {setOrigin: true});
			opt.onGet && opt.onGet(data);
		}
	}

	function delObject()
	{
		var data = pageItf.formData;
		if (data == null || data.id == null) {
			console.log("!!! delObject: no obj or obj.id");
			return;
		}
		var ac = obj_ + ".del";
		self.callSvr(ac, {id: data.id}, opt.onDel);
	}

	var itf = {
		refresh: function () {
			showObject(true);
		},
		del: delObject
	}
	return itf;
}

}
// ====== WEBCC_END_FILE initPageDetail.js }}}

// ====== WEBCC_BEGIN_FILE mui-name.js {{{
jdModule("jdcloud.mui", JdcloudMuiName);
function JdcloudMuiName()
{
var self = this;
var mCommon = jdModule("jdcloud.common");

window.MUI = self;
$.extend(MUI, mCommon);

$.each([
	"intSort",
	"numberSort",
	"callSvr",
	"callSvrSync",
	"app_alert",
], function () {
	window[this] = MUI[this];
});


}
// ====== WEBCC_END_FILE mui-name.js }}}

// Generated by webcc_merge
// vi: foldmethod=marker
