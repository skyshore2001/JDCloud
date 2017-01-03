// ====== global {{{
/**
@var IsBusy

标识应用当前是否正在与服务端交互。一般用于自动化测试。
*/
var IsBusy = 0;

/**
@var g_args

应用参数。

URL参数会自动加入该对象，例如URL为 `http://{server}/{app}/index.html?orderId=10&dscr=上门洗车`，则该对象有以下值：

	g_args.orderId=10; // 注意：如果参数是个数值，则自动转为数值类型，不再是字符串。
	g_args.dscr="上门洗车"; // 对字符串会自动进行URL解码。

此外，框架会自动加一些参数：

@var g_args._app?="user" 应用名称，由setApp({appName})指定。

@see parseQuery URL参数通过该函数获取。
*/
var g_args = {}; // {_test, _debug, cordova}

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
*/
var g_cordova = 0; // the version for the android/ios native cient. 0 means web app.

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

*/
var g_data = {}; // {userInfo, serverRev?, initClient?, testMode?, mockMode?}

/**
@var g_cfg

应用配置项。

@var g_cfg.logAction?=false  Boolean. 是否显示详细日志。
@var g_cfg.PAGE_SZ?=20  分页大小，作为每次调用{obj}.query的缺省值。

@var g_cfg.mockDelay? = 50  模拟调用后端接口的延迟时间，单位：毫秒。仅对异步调用有效。
@see MUI.mockData 模拟调用后端接口
*/

var DEF_CFG = {
	logAction: false,
	PAGE_SZ: 20,
	manualSplash: false,
	mockDelay: 50
};
setTimeout(function () {
	window.g_cfg = $.extend({}, DEF_CFG, window.g_cfg);
});

var m_appVer;

/**
@var BASE_URL

设置应用的基本路径, 应以"/"结尾.

当用于本地调试网页时, 可以临时修改它, 比如在app.js中临时设置:

	var BASE_URL = "http://oliveche.com/jdcloud/";

*/
var BASE_URL = "../";
//}}}

// ====== app toolkit {{{
/**
@fn appendParam(url, param)

示例:

	var url = "http://xxx/api.php";
	if (a)
		url = appendParam(url, "a=" + a);
	if (b)
		url = appendParam(url, "b=" + b);

*/
function appendParam(url, param)
{
	if (param == null)
		return url;
	return url + (url.indexOf('?')>0? "&": "?") + param;
}

/** @fn isWeixin()
当前应用运行在微信中。
*/
function isWeixin()
{
	return /micromessenger/i.test(navigator.userAgent);
}

/** @fn isIOS()
当前应用运行在IOS平台，如iphone或ipad中。
*/
function isIOS()
{
	return /iPhone|iPad/i.test(navigator.userAgent);
}

/** @fn isAndroid()
当前应用运行在安卓平台。
*/
function isAndroid()
{
	return /Android/i.test(navigator.userAgent);
}
/**
@fn loadScript(url, fnOK)

动态加载一个script. 如果曾经加载过, 可以重用cache.

注意: $.getScript一般不缓存(仅当跨域时才使用Script标签方法加载,这时可用缓存), 自定义方法$.getScriptWithCache与本方法类似.

loadScript无法用于同步调用，如需要同步调用可以：

	$.getScriptWithCache("1.js", {async: false});
	// 这时可立即使用1.js中定义的内容

@see $.getScriptWithCache
*/
function loadScript(url, fnOK)
{
	var script= document.createElement('script');
	script.type= 'text/javascript';
	script.src= url;
	// script.async = !sync; // 不是同步调用的意思，参考script标签的async属性和defer属性。
	if (fnOK)
		script.onload = fnOK;
	document.body.appendChild(script);
}

// --------- jquery {{{
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

@see setFormData
 */
function getFormData(jo)
{
	var data = {};
	var orgData = jo.data("origin_") || {};
	jo.find("[name]:not([disabled])").each (function () {
		var ji = $(this);
		var name = ji.attr("name");
		var content;
		if (ji.is(":input"))
			content = ji.val();
		else
			content = ji.html();

		var orgContent = orgData[name];
		if (orgContent == null)
			orgContent = "";
		if (content == null)
			content = "";
		if (content !== String(orgContent)) // 避免 "" == 0 或 "" == false
			data[name] = content;
	});
	return data;
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
@fn $.getScriptWithCache(url, options?)

@param options? 传递给$.ajax的选项。

@see loadScript
*/
$.getScriptWithCache = function(url, options) 
{
	// allow user to set any option except for dataType, cache, and url
	options = $.extend(options || {}, {
		dataType: "script",
		cache: true,
		url: url
	});

	// Use $.ajax() since it is more flexible than $.getScript
	// Return the jqXHR object so we can chain callbacks
	return jQuery.ajax(options);
};

/**
@fn setDateBox(jo, defDateFn?)

设置日期框, 如果输入了非法日期, 自动以指定日期(如未指定, 用当前日期)填充.

	setDateBox($("#txtComeDt"), function () { return genDefVal()[0]; });

 */
function setDateBox(jo, defDateFn)
{
	jo.blur(function () {
		var dt = parseDate(this.value);
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
function setTimeBox(jo, defTimeFn)
{
	jo.blur(function () {
		var dt = parseTime(this.value);
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

//}}}

if (window.console === undefined) {
	window.console = {
		log:function () {}
	}
}

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
			app_alert("属性`" + name + "'格式错误: " + val, "e");
			val = null;
		}
	}
	return val;
}

/**
@fn getTimeDiffDscr(tm, tm1)

从tm到tm1的时间差描述，如"2分钟前", "3天前"等。

tm和tm1可以为时间对象或时间字符串
*/
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

/**
@fn parseValue(str)

如果str符合整数或小数，则返回相应类型。
 */
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
function filterCordovaModule(module)
{
	var plugins = module.exports;
	module.exports = [];

	var app = (window.g_args && g_args._app) || 'user';
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
@fn applyTpl(tpl, data)

对模板做字符串替换

	var tpl = "<li><p>{name}</p><p>{dscr}</p></li>";
	var data = {name: 'richard', dscr: 'hello'};
	var html = applyTpl(tpl, data);
	// <li><p>richard</p><p>hello</p></li>

*/
function applyTpl(tpl, data)
{
	return tpl.replace(/{(\w+)}/g, function(m0, m1) {
		return data[m1];
	});
}

// bugfix: 浏览器兼容性问题
if (String.prototype.startsWith == null) {
	String.prototype.startsWith = function (s) { return this.substr(0, s.length) == s; }
}
// }}}

// ====== app fw {{{
var E_AUTHFAIL=-1;
var E_NOAUTH=2;
var E_ABORT=-100;

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
@see CPageManager

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
		var jpage = $(this);
		jpage.on("pagebeforeshow", onBeforeShow);
		jpage.on("pageshow", onShow);
		jpage.on("pagehide", onHide);
		...
	}

逻辑页面加载过程，以加载页面"#order"为例: 

	MUI.showPage("#order");

- 检查是否已加载该页面，如果已加载则显示该页并跳到"pagebeforeshow"事件这一步。
- 检查内部模板页。如果内部页面模板中有名为"tpl_{页面名}"的对象，有则将其内容做为页面代码加载，然后跳到initPage步骤。
- 加载外部模板页。加载 {pageFolder}/{页面名}.html 作为逻辑页面，如果加载失败则报错。页面所在文件夹可通过 MUI.setApp({pageFolder})指定。
- initPage页面初始化. 框架自动为页面添加.mui-page类。如果逻辑页面上指定了mui-script属性，则先加载该属性指定的JS文件。然后如果设置了mui-initfn属性，则将其作为页面初始化函数调用。
- 发出pagecreate事件。
- 发出pagebeforeshow事件。
- 动画完成后，发出pageshow事件。
- 如果之前有其它页面在显示，则触发之前页面的pagehide事件。

@event pagecreate() DOM事件。this为当前页面jpage。
@event pagebeforeshow() DOM事件。this为当前页面jpage。
@event pageshow()  DOM事件。this为当前页面jpage。
@event pagehide() DOM事件。this为当前页面jpage。

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

## 服务端交互API

@see callSvr 系列调用服务端接口的方法。
@see CComManager

## 登录与退出

框架提供MUI.showLogin/MUI.logout操作. 
调用MUI.tryAutoLogin可以支持自动登录.

登录后显示的主页，登录页，应用名称等均通过MUI.setApp设置。

@see MUI.tryAutoLogin
@see MUI.showLogin
@see MUI.logout
@see MUI.setApp

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
		<a href="#home">订单</a></li>
		<a href="#me">我</a>
	</div>

如果要添加其它底部导航，可在page内放置如下部件：

	<div class="ft mui-navbar">
		<a href="#home" class="active">订单</a></li>
		<a href="#me">我</a>
	</div>

注意：mui-navbar与ft类并用后，在点击后不会自动设置active类，请自行添加。

## 图片按需加载

仅当页面创建时才会加载。

	<img src="../m/images/ui/carwash.png">

## 原生应用支持

使用MUI框架的Web应用支持被安卓/苹果原生应用加载（通过cordova技术）。

设置说明：

- 在Web应用中指定正确的应用程序名appName (参考MUI.setApp方法), 该名字将可在g_args._app变量中查看。
- App加载Web应用时在URL中添加cordova={ver}参数，就可自动加载cordova插件(m/cordova或m/cordova-ios目录下的cordova.js文件)，从而可以调用原生APP功能。
- 在App打包后，将apk包或ipa包其中的cordova.js/cordova_plugins.js/plugins文件或目录拷贝出来，合并到 cordova 或 cordova-ios目录下。
  其中，cordova_plugins.js文件应手工添加所需的插件，并根据应用(g_args._app)及版本(g_args.cordova)设置filter. 可通过 cordova.require("cordova/plugin_list") 查看应用究竟使用了哪些插件。
- 在部署Web应用时，建议所有cordova相关的文件合并成一个文件（通过Webcc打包）

不同的app大版本(通过URL参数cordova=?识别)或不同平台加载的插件是不一样的，要查看当前加载了哪些插件，可以在Web控制台中执行：

	cordova.require('cordova/plugin_list')

对原生应用的额外增强包括：

@key g_cfg.manualSplash

- 应用加载完成后，自动隐藏启动画面(SplashScreen)。如果需要自行隐藏启动画面，可以设置

		var g_cfg = {
			manualSplash: true
			...
		}

	然后开发者自己加载完后隐藏SplashScreen:

		if (navigator.splashscreen && navigator.splashscreen.hide)
			navigator.splashscreen.hide();

- ios7以上, 框架自动为顶部状态栏留出20px高度的空间. 默认为白色，可以修改类mui-container的样式，如改为黑色：

	.mui-container {
		background-color:black;
	}

如果使用了StatusBar插件, 可以取消该行为. 
先在setApp中设置, 如

	MUI.setApp({noHandleIosStatusBar: true, ...});

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
- 在app.js中修改BASE_URL:

	var BASE_URL = "http://oliveche.com/jdcloud/";

这时直接在chrome中打开html文件即可连接远程接口运行起来.
 */


// ------ CPageManager {{{
/**
@class CPageManager(app)

页面管理器。提供基于逻辑页面的单网页应用，亦称“变脸式应用”。

该类作为MUI模块的基类，仅供内部使用，但它提供showPage等操作，以及pageshow等各类事件。

@param app IApp={homePage?="#home", pageFolder?="page"}

 */
function CPageManager(app)
{
	var self = this;
	
	var m_app = app;
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

现在为$(document.body)
*/
	self.container = null;

/**
@var MUI.showFirstPage?=true

如果为false, 则必须手工执行 MUI.showPage 来显示第一个页面。
*/
	self.showFirstPage = true;

/**
@var MUI.options

缺省配置项：

	{
		ani: 'auto' // 缺省切页动画效果. 'none'表示无动画。
	}

*/
	self.options = {
		ani: 'auto',
	};

	var m_jstash; // 页面暂存区; 首次加载页面后可用

	// false: 来自浏览器前进后退操作，或直接输入hash值, 或调用history.back/forward/go操作
	// true: 来自内部页面跳转(showPage)
	var m_fromShowPage = false;

	// null: 未知
	// true: back操作;
	// false: forward操作, 或进入新页面
	var m_isback = null; // 在changePage之前设置，在changePage中清除为null

	// 调用showPage_后，将要显示的页
	var m_toPageId = null;
	var m_lastPageRef = null;

	// @class PageStack {{{
	var m_fn_history_go = history.go;
	var m_appId = Math.ceil(Math.random() *10000);
	function PageStack()
	{
		// @var PageStack.stack_ - elem: {pageRef, isPoped?=0}
		this.stack_ = [];
		// @var PageStack.sp_
		this.sp_ = -1;
		// @var PageStack.nextId_
		this.nextId_ = 1;
	}
	PageStack.prototype = {
		// @fn PageStack.push(pageRef);
		push: function (pageRef) {
			if (this.sp_ < this.stack_.length-1) {
				this.stack_.splice(this.sp_+1);
			}
			var state = {pageRef: pageRef, id: this.nextId_, appId: m_appId};
			++ this.nextId_;
			this.stack_.push(state);
			++ this.sp_;
			history.replaceState(state, null);
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
			var state = history.state;
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

	function callInitfn(jo, paramArr)
	{
		var ret = jo.data("mui.init");
		if (ret !== undefined)
			return ret;

		var initfn = evalAttr(jo, "mui-initfn");
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
		if (m_fromShowPage) {
			m_fromShowPage = false;
			return;
		}

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
		m_isback = n <= 0;
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

	// "#aaa" => {pageId: "aaa", pageFile: "{pageFolder}/aaa.html", templateRef: "#tpl_aaa"}
	// "#xx/aaa.html" => {pageId: "aaa", pageFile: "xx/aaa.html"}
	// "#plugin1-page1" => {pageId: "plugin1-page1", pageFile: "../plugin/plugin1/m2/page/page1.html"}
	function getPageInfo(pageRef)
	{
		var pageId = pageRef[0] == '#'? pageRef.substr(1): pageRef;
		var ret = {pageId: pageId};
		var p = pageId.lastIndexOf(".");
		if (p == -1) {
			p = pageId.lastIndexOf('-');
			if (p != -1) {
				var plugin = pageId.substr(0, p);
				var pageId2 = pageId.substr(p+1);
				if (Plugins.exists(plugin)) {
					ret.pageFile = '../plugin/' + plugin + '/m2/page/' + pageId2 + '.html';
				}
			}
			ret.templateRef = "#tpl_" + pageId;
		}
		else {
			ret.pageFile = pageId;
			ret.pageId = pageId.match(/[^.\/]+(?=\.)/)[0];
		}
		if (ret.pageFile == null) 
			ret.pageFile = m_app.pageFolder + '/' + pageId + ".html";
		return ret;
	}
	function showPage_(pageRef, opt)
	{
		var showPageOpt_ = $.extend({
			ani: self.options.ani
		}, opt);

		// 避免hashchange重复调用
		if (m_lastPageRef == pageRef)
		{
			m_isback = null; // reset!
			return;
		}
		var ret = handlePageStack(pageRef);
		if (ret === false)
			return;
		location.hash = pageRef;
		m_lastPageRef = pageRef;

		// find in document
		var pi = getPageInfo(pageRef);
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
			enterWaiting(); // NOTE: leaveWaiting in initPage
			var m = pi.pageFile.match(/(.+)\//);
			var path = m? m[1]: "";
			$.ajax(pi.pageFile).then(function (html) {
				loadPage(html, pageId, path);
			}).fail(function () {
				leaveWaiting();
			});
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
		function fixPageCss(css, pageId)
		{
			var prefix = "#" + pageId + " ";

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

		// path?=m_app.pageFolder
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
				$(this).html( fixPageCss($(this).html(), pageId) );
			});
			// bugfix: 加载页面页背景图可能反复被加载
			jpage.find("style").attr("mui-origin", pageId).appendTo(document.head);
			jpage.attr("id", pageId).addClass("mui-page")
				.hide().appendTo(self.container);

			var val = jpage.attr("mui-script");
			if (val != null) {
				if (path == null)
					path = m_app.pageFolder;
				if (path != "")
					val = path + "/" + val;
				loadScript(val, initPage);
			}
			else {
				initPage();
			}

			function initPage()
			{
				callInitfn(jpage);
				jpage.trigger("pagecreate");
				changePage(jpage);
				leaveWaiting();
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
			var toPageId = m_toPageId;
			jpage.trigger("pagebeforeshow");
			// 如果在pagebeforeshow中调用showPage显示其它页，则不显示当前页，避免页面闪烁。
			if (toPageId != m_toPageId)
			{
				// NOTE: 如果toPageId与当前页面栈不一致，说明之前page还没入栈.
				var doAdjustStack = self.m_pageStack.stack_[self.m_pageStack.sp_].pageRef != "#" + toPageId;
				if (doAdjustStack) {
					self.m_pageStack.push("#" + toPageId);
				}
				self.popPageStack(1);
				// 调整栈后，新页面之后在hashchange中将无法入栈，故手工入栈。
				// TODO: 如果在beforeShow中调用了多次showPage, 则仍有可能出故障。
				if (doAdjustStack) {
					self.m_pageStack.push("#" + m_toPageId);
				}

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
			document.title = title;

			if (!enableAni) {
				onAnimationEnd();
			}
			function onAnimationEnd()
			{
				jpage.trigger("pageshow");

				if (enableAni) {
					// NOTE: 如果不删除，动画效果将导致fixed position无效。
					jpage.removeClass(slideInClass);
// 					if (oldPage)
// 						oldPage.removeClass("slideOut");
				}
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

	function applyHashChange()
	{
		var pageRef = location.hash;
		if (pageRef == "") {
			pageRef = m_app.homePage;
			location.hash = pageRef;
		}
		if (history.state == null || history.state.appId != m_appId) {
			m_isback = false; // 新页面
			self.m_pageStack.push(pageRef);
		}
		showPage_(pageRef);
	}

/**
@fn MUI.unloadPage(pageId?)

@param pageId 如未指定，表示当前页。

删除一个页面。
*/
	self.unloadPage = unloadPage;
	function unloadPage(pageId)
	{
		var jo = null;
		if (pageId == null) {
			jo = self.activePage;
			pageId = jo.attr("id");
		}
		else {
			jo = $("#" + pageId);
		}
		jo.remove();
		$("style[mui-origin=" + pageId + "]").remove();
	}

/**
@fn MUI.reloadPage(pageId?)

@param pageId 如未指定，表示当前页。

重新加载指定页面。不指定pageId时，重加载当前页。
*/
	self.reloadPage = reloadPage;
	function reloadPage(pageId)
	{
		if (pageId == null)
			pageId = self.activePage.attr("id");
		unloadPage(pageId);
		m_lastPageRef = null; // 防止showPage_中阻止运行
		showPage_("#"+pageId);
	}

/**
@var MUI.m_pageStack

页面栈，MUI.popPageStack对它操作
*/
	self.m_pageStack = new PageStack();

/** 
@fn MUI.popPageStack(n?=1) 

n=0: 退到首层, >0: 指定pop几层

离开页面时, 如果不希望在点击后退按钮后回到该页面, 可以调用

	MUI.popPageStack()

如果要在后退时忽略两个页面, 可以调用

	MUI.popPageStack(2)

如果要在后退时直接回到主页(忽略所有历史记录), 可以调用

	MUI.popPageStack(0)

*/
	self.popPageStack = popPageStack;
	function popPageStack(n)
	{
		self.m_pageStack.pop(n);
	}

	$(window).on('hashchange', applyHashChange);

/**
@fn MUI.showPage(pageId/pageRef, opt)

@param pageId String. 页面名字. 仅由字母、数字、"_"等字符组成。
@param pageRef String. 页面引用（即location.hash），以"#"开头，后面可以是一个pageId（如"#home"）或一个相对页的地址（如"#info.html", "#emp/info.html"）。
@param opt {ani?}

ani:: String. 动画效果。设置为"none"禁用动画。

在应用内无刷新地显示一个页面。

例：

	MUI.showPage("order");  // 或者
	MUI.showPage("#order");
	
显示order页，先在已加载的DOM对象中找id="order"的对象，如果找不到，则尝试找名为"tpl_home"的模板DOM对象，如果找不到，则以ajax方式动态加载页面"page/order.html"。

注意：

- 在加载页面时，只会取第一个DOM元素作为页面。

加载成功后，会将该页面的id设置为"order"，然后依次：

	调用 mui-initfn中指定的初始化函数，如 initPageOrder
	触发pagecreate事件
	触发pagebeforeshow事件
	触发pageshow事件

动态加载页面时，缺省目录名为`page`，如需修改，应在初始化时设置app.pageFolder属性：

	MUI.setApp({pageFolder: "mypage"}) 

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

*/
	self.showPage = showPage;
	function showPage(pageRef, opt)
	{
		if (pageRef[0] !== '#')
			pageRef = '#' + pageRef;
		else if (pageRef === '#') 
			pageRef = m_app.homePage;
		m_fromShowPage = true;
		showPage_(pageRef, opt);
	}

	$(window).on('orientationchange', fixPageSize);
	$(window).on('resize'           , fixPageSize);

	function fixPageSize()
	{
		if (self.activePage) {
			var jpage = self.activePage;
			var H = self.container.height();
			var hd = jpage.find(">.hd").height() || 0;
			var ft = jpage.find(">.ft").height() || 0;
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

	$(document).on("pagecreate", function (ev) {
		var jpage = $(ev.target);
		enhanceWithin(jpage);
	});
//}}}

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
				var jlink = self.activePage.find(ref);
				jlink.toggle(active);
				jlink.toggleClass("active", active);
			}
		}
	}

	function enhanceNavbar(jo)
	{
		// 如果有ft类，则不自动点击后active (#footer是特例)
		if (jo.hasClass("ft") || jo.hasClass("noactive"))
			return;
		jo.find(">*").on('click', function () {
			activateElem($(this));
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

	// 信息框
	app_alert("操作成功", function () {
		MUI.showPage("#orderInfo");
	}, {timeoutInterval: 3});

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

		var jmsg = $("#muiAlert");
		if (jmsg.size() == 0) {
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
			jmsg = $(html);
			self.enhanceWithin(jmsg);
			jmsg.parent().appendTo(self.container);
		}

		var isClone = false;
		// 如果正在显示，则使用clone
		if (jmsg.parent().is(":visible")) {
			var jo = jmsg.parent().clone().appendTo(self.container);
			jmsg = jo.find(".mui-dialog");
			isClone = true;
		}
		var opt = self.getOptions(jmsg);
		opt.type = type;
		opt.fn = fn;
		opt.alertOpt = alertOpt;
		var rand = Math.random();
		opt.rand_ = rand;
		if (! opt.inited) {
			jmsg.find("#btnOK, #btnCancel").click(function () {
				if (opt.fn && this.id == "btnOK") {
					var param;
					if (opt.type == "p") {
						param = jmsg.find("#txtInput").val();
					}
					opt.fn(param);
				}
				else if (this.id == "btnCancel" && opt.alertOpt.onCancel) {
					opt.alertOpt.onCancel();
				}
				opt.rand_ = 0;
				self.closeDialog(jmsg, isClone);
			});
			opt.inited = true;
		}

		jmsg.find("#btnCancel").toggle(type == "q" || type == "p");
		var jtxt = jmsg.find("#txtInput");
		jtxt.toggle(type == "p");
		if (type == "p") {
			jtxt.val(alertOpt.defValue);
		}

		jmsg.find(".p-title").html(s);
		jmsg.find(".p-msg").html(msg);
		self.showDialog(jmsg);

		if (alertOpt.timeoutInterval != null) {
			setTimeout(function() {
				// 表示上次显示已结束
				if (rand == opt.rand_)
					jmsg.find("#btnOK").click();
			}, opt.timeoutInterval);
		}
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
			var opt = evalAttr(jo, "mui-opt");
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
		enhanceWithin(self.container);

		// 在muiInit事件中可以调用showPage.
		self.container.trigger("muiInit");

		// 根据hash进入首页
		if (self.showFirstPage)
			applyHashChange();
	}

	$(main);
}
//}}}

// ------ CComManager {{{
/**
@class CComManager
@param app IApp={appName?=user}

提供callSvr等与后台交互的API.

@see MUI.callSvr
@see MUI.useBatchCall
@see MUI.setupCallSvrViaForm
*/
function CComManager(app)
{
	var self = this;

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
	var m_app = app;
	var m_tmBusy;
	var m_manualBusy = 0;
	var m_jLoader;

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
fn(param, postParam)->data

例：模拟"User.get(id)"和"User.set()(key=value)"接口：

	var user = {
		id: 1001,
		name: "孙悟空",
	};
	g_cfg.mockData = {
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

可以通过g_cfg.mockDelay设置模拟调用接口的网络延时。
@see g_cfg.mockDelay

如果设置了MUI.callSvrExt，调用名(ac)中应包含扩展(ext)的名字，例：

	MUI.callSvrExt['zhanda'] = {...};
	callSvr(['token/get-token', 'zhanda'], ...);

要模拟该接口，应设置

	MUI.mockData["zhanda.token/get-token"] = ...;

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

/**
@fn app_abort()

中止之后的调用, 直接返回.
*/
	window.app_abort = app_abort;
	function app_abort()
	{
		throw("abort");
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
			callSvr("Syslog.add", $.noop, postParam, {noex:1, noLoadingImg:1});
		} catch (e) {
			console.log(e);
		}
	}

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
			if (/abort$/.test(msg))
				return true;
			debugger;
			var content = msg + " (" + script + ":" + line + ":" + col + ")";
			if (errObj && errObj.stack)
				content += "\n" + errObj.stack.toString();
			syslog("fw", "ERR", content);
		}
	}
	setOnError();

	var ajaxOpt = {
		beforeSend: function (xhr) {
			// 保存xhr供dataFilter等函数内使用。
			this.xhr_ = xhr;
		},
		//dataType: "text",
		dataFilter: function (data, type) {
			if (type == "text") {
				rv = defDataProc.call(this, data);
				if (rv != null)
					return rv;
				-- $.active; // ajax调用中断,这里应做些清理
				app_abort();
			}
			return data;
		},

		error: defAjaxErrProc
	};
	if (location.protocol == "file:") {
		ajaxOpt.xhrFields = { withCredentials: true};
	}
	$.ajaxSetup(ajaxOpt);

	// $(document).on("pageshow", function () {
	// 	if (IsBusy)
	// 		$.mobile.loading("show");
	// });

/**
@fn delayDo(fn, delayCnt?=3)

设置延迟执行。当delayCnt=1时与setTimeout效果相同。
多次置于事件队列最后，一般3次后其它js均已执行完毕，为idle状态
*/
	window.delayDo = delayDo;
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

/**
@fn MUI.enterWaiting(ctx?)
@param ctx {ac, tm, tv?, tv2?, noLoadingImg?}
@alias enterWaiting()
*/
	window.enterWaiting = self.enterWaiting = enterWaiting;
	function enterWaiting(ctx)
	{
		if (IsBusy == 0) {
			m_tmBusy = new Date();
		}
		IsBusy = 1;
		if (ctx == null)
			++ m_manualBusy;
		// 延迟执行以防止在page show时被自动隐藏
		//delayDo(function () {
		if (!(ctx && ctx.noLoadingImg))
		{
			setTimeout(function () {
				if (IsBusy)
					showLoading();
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
	window.leaveWaiting = self.leaveWaiting = leaveWaiting;
	function leaveWaiting(ctx)
	{
		if (ctx == null)
		{
			if (-- m_manualBusy < 0)
				m_manualBusy = 0;
		}
		// 当无远程API调用或js调用时, 设置IsBusy=0
		delayDo(function () {
			if (g_cfg.logAction && ctx && ctx.ac && ctx.tv) {
				var tv2 = (new Date() - ctx.tm) - ctx.tv;
				ctx.tv2 = tv2;
				console.log(ctx);
			}
			if ($.active == 0 && IsBusy && m_manualBusy == 0) {
				IsBusy = 0;
				var tv = new Date() - m_tmBusy;
				m_tmBusy = 0;
				console.log("idle after " + tv + "ms");

				// handle idle
				hideLoading();
	// 			if ($.mobile)
	// 				$.mobile.loading("hide");
			}
		});
	}

	function defAjaxErrProc(xhr, textStatus, e)
	{
		if (xhr && xhr.status != 200) {
			if (xhr.status == 0) {
				app_alert("连不上服务器了，是不是网络连接不给力？", "e");
			}
			else {
				app_alert("操作失败: 服务器错误. status=" + xhr.status + "-" + xhr.statusText, "e");
			}
			var ctx = this._ctx || {};
			leaveWaiting(ctx);
		}
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
					reloadSite();
				}
				console.log("Server Revision: " + val);
				g_data.serverRev = val;
			}
			val = parseValue(this.xhr_.getResponseHeader("X-Daca-Test-Mode"));
			if (g_data.testMode != val) {
				g_data.testMode = val;
				if (g_data.testMode)
					alert("测试模式!");
			}
			val = parseValue(this.xhr_.getResponseHeader("X-Daca-Mock-Mode"));
			if (g_data.mockMode != val) {
				g_data.mockMode = val;
				if (g_data.mockMode)
					alert("模拟模式!");
			}
		}

		try {
			if (typeof(rv) == "string")
				rv = $.parseJSON(rv);
		}
		catch (e)
		{
			leaveWaiting(ctx);
			app_alert("服务器通讯异常: " + e);
			return;
		}

		if (ctx.tm) {
			ctx.tv = new Date() - ctx.tm;
		}
		ctx.ret = rv;

		leaveWaiting(ctx);

		if (ext) {
			var filter = self.callSvrExt[ext] && self.callSvrExt[ext].dataFilter;
			assert(filter, "*** missing dataFilter for callSvrExt: " + ext);
			var ret = filter.call(this, rv);
			if (ret == null || ret === false)
				self.lastError = ctx;
			return ret;
		}

		if (rv && $.isArray(rv) && rv.length >= 2 && typeof rv[0] == "number") {
			if (rv[0] == 0)
				return rv[1];

			if (this.noex)
			{
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
				app_alert("验证失败，请检查输入是否正确!", "e");
				return;
			}
			else if (rv[0] == E_ABORT) {
				console.log("!!! abort call");
				return;
			}
			logError();
			app_alert("操作失败：" + rv[1], "e");
		}
		else {
			logError();
			app_alert("服务器通讯协议异常!", "e"); // 格式不对
		}

		function logError()
		{
			self.lastError = ctx;
			console.log("failed call");
			console.log(ctx);
		}
	}

/**
@fn MUI.makeUrl(action, params)
@alias makeUrl

生成对后端调用的url. 

	var params = {id: 100};
	var url = makeUrl("Ordr.set", params);

注意：调用该函数生成的url在结尾有标志字符串"zz=1", 如"../api.php/login?_app=user&zz=1"

支持callSvr扩展，这时action可以是一个数组，如：

	var url = MUI.makeUrl(['login', 'zhanda']);

@see MUI.callSvrExt
 */
	window.makeUrl = self.makeUrl = makeUrl;
	function makeUrl(action, params)
	{
		if (/^http/.test(action)) {
			return appendParam(action, $.param(params));
		}

		// 避免重复调用
		if (action.indexOf("zz=1") >0)
			return action;

		if (params == null)
			params = {};
		var url;

		// 扩展接口调用：callSvr(['login', 'zhanda'])，需定义 MUI.callSvrExt[ext]
		if ($.isArray(action)) {
			var ext = action[1];
			var extMakeUrl = self.callSvrExt[ext] && self.callSvrExt[ext].makeUrl;
			assert(extMakeUrl, "*** missing makeUrl for callSvrExt: " + ext);
			url = extMakeUrl(action[0]);
		}
		// 自定义缺省接口调用：callSvr('login')，需定义 MUI.callSvrExt['default']
		else if (self.callSvrExt['default']) {
			var extMakeUrl = self.callSvrExt['default'].makeUrl;
			assert(extMakeUrl, "*** missing makeUrl for callSvrExt['default'].");
			url = extMakeUrl(action);
		}
		// 缺省接口调用：callSvr('login') 或 callSvr('php/login.php');
		else if (action.indexOf(".php") < 0)
		{
			var usePathInfo = true;
			if (usePathInfo) {
				if (params.ac != null) {
					action = params.ac;
					delete(params.ac);
				}
				url = BASE_URL + "api.php/" + action;
			}
			else {
				url = BASE_URL + "api.php";
				params.ac = action;
			}
		}
		else {
			if (location.protocol == "file:")
				url = BASE_URL + "m2/" + action;
			else
				url = action;
		}
		if (g_cordova) {
			if (m_appVer === undefined)
			{
				var platform = "n";
				if (isAndroid()) {
					platform = "a";
				}
				else if (isIOS()) {
					platform = "i";
				}
				m_appVer = platform + "/" + g_cordova;
			}
			params._ver = m_appVer;
		}
		if (m_app.appName)
			params._app = m_app.appName;
		if (g_args._test)
			params._test = 1;
		if (g_args._debug)
			params._debug = g_args._debug;
		params.zz = 1; // zz标记
		return appendParam(url, $.param(params)); // appendParam(url, params);
	}

/**
@fn MUI.callSvr(ac, [param?], fn?, postParams?, userOptions?)
@alias callSvr

@param ac String. action, 交互接口名. 也可以是URL(比如由makeUrl生成)
@param param Object. URL参数（或称HTTP GET参数）
@param postParams Object. POST参数. 如果有该参数, 则自动使用HTTP POST请求(postParams作为POST内容), 否则使用HTTP GET请求.
@param fn Function(data). 回调函数, data参考该接口的返回值定义。
@param userOptions 用户自定义参数, 会合并到$.ajax调用的options参数中.可在回调函数中用"this.参数名"引用. 

常用userOptions: 
- 指定{async:0}来做同步请求, 一般直接用callSvrSync调用来替代.
- 指定{noex:1}用于忽略错误处理。
- 指定{noLoadingImg:1}用于忽略loading图标.

@return deferred对象，与$.ajax相同。
例如，

	var dfd = callSvr(ac, fn1);
	dfd.then(fn2);

	function fn1(data) {}
	function fn2(data) {}

在接口调用成功后，会依次回调fn1, fn2.

@key callSvr.noex 调用接口时忽略出错，可由回调函数fn自己处理错误。

当后端返回错误时, 回调`fn(false)`（参数data=false）. 可通过 MUI.lastError.ret 取到返回的原始数据。

例：

	callSvr("logout");
	callSvr("logout", api_logout);
	callSvr("login", {wantAll:1}, api_login);
	callSvr("info/hotline.php", {q: '大众'}, api_hotline);

	// 也兼容使用makeUrl的旧格式如:
	callSvr(makeUrl("logout"), api_logout);
	callSvr(makeUrl("logout", {a:1}), api_logout);

	callSvr("User.get", function (data) {
		if (data === false) { // 仅当设置noex且服务端返回错误时可返回false
			// var originalData = MUI.lastError.ret;
			return;
		}
		foo(data);
	}, null, {noex:1});

@see MUI.lastError 出错时的上下文信息

## 调用监控

@var g_cfg.logAction

框架会自动在ajaxOption中增加ctx_属性，它包含 {ac, tm, tv, tv2, ret} 这些信息。
当设置g_cfg.logAction=1时，将输出这些信息。
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
		makeUrl: function(ac) {
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

@key MUI.callSvrExt[].makeUrl(ac)

根据调用名ac生成url.

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

*/
	window.callSvr = self.callSvr = callSvr;
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

		var ext = null;
		var ac0 = ac;
		if ($.isArray(ac)) {
			assert(ac.length == 2, "*** bad ac format, require [ac, ext]");
			ext = ac[1];
			if (ext != 'default')
				ac0 = ext + '.' + ac[0];
			else
				ac0 = ac[0];
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
		var ctx = {ac: ac, tm: new Date()};
		if (userOptions && userOptions.noLoadingImg)
			ctx.noLoadingImg = 1;
		if (ext) {
			ctx.ext = ext;
		}
		enterWaiting(ctx);

		var callType = "call";
		if (isSyncCall)
			callType += "-sync";
		if (self.mockData && self.mockData[ac0]) {
			callType += "-mock";
			console.log(callType + " " + ac0);
			return callSvrMock({
				data: self.mockData[ac0],
				param: params,
				postParam: postParams,
				fn: fn,
				ctx: ctx,
				isSyncCall: isSyncCall
			});
		}

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
		console.log(callType + " " + ac0);
		return $.ajax(opt);
	}

	// opt={data, isSyncCall, ctx, fn, param, postParam}
	function callSvrMock(opt)
	{
		var dfd_ = $.Deferred();
		if (opt.isSyncCall) {
			callSvrMock1();
		}
		else {
			setTimeout(callSvrMock1, g_cfg.mockDelay);
		}
		return dfd_;

		function callSvrMock1() 
		{
			leaveWaiting();
			if ($.isFunction(opt.data)) {
				opt.data = opt.data(opt.param, opt.postParam);
			}
			var rv = defDataProc.call({ctx_: opt.ctx}, opt.data);
			if (rv != null)
			{
				opt.fn && opt.fn(rv);
				dfd_.resolve(rv);
				return;
			}
			app_abort();
		}
	}

/**
@fn MUI.callSvrSync(ac, params?, fn?, postParams?, userOptions?)
@fn MUI.callSvrSync(ac, fn?, postParams?, userOptions?)
@alias callSvrSync
@return data 原型规定的返回数据

同步模式调用callSvr.

@see callSvr
*/
	window.callSvrSync = self.callSvrSync = callSvrSync;
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

	var url = makeUrl("upload", {genThumb: 1});
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
				app_abort();
			fn(rv);
		});
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
		assert(m_curBatch == null, "*** multiple batch call!");
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
		var batch = new MUI.batchCall(opt);
		setTimeout(function () {
			batch.commit();
		}, tv);
	}

}
//}}}

// ------ MUI {{{
var MUI = new nsMUI();
function nsMUI()
{
	var self = this;

/**
@var MUI.m_app

参考MUI.setApp
*/
	var m_app = self.m_app = {
		appName: "user",
		allowedEntries: [],
		loginPage: "#login",
		homePage: "#home",
		pageFolder: "page",
	};

	CPageManager.call(this, m_app);
	CComManager.call(this, m_app);

	var m_onLoginOK;

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
@fn MUI.setFormSubmit(jf, fn?, opt?={rules, validate?, onNoAction?})

@param fn? Function(data); 与callSvr时的回调相同，data为服务器返回的数据。
函数中可以使用this["userPost"] 来获取post参数。

opt.rules: 参考jquery.validate文档
opt.validate: Function(jf, queryParam={ac?,res?,...}). 如果返回false, 则取消submit. queryParam为调用参数，可以修改。

form提交时的调用参数, 如果不指定, 则以form的action属性作为queryParam.ac发起callSvr调用.
form提交时的POST参数，由带name属性且不带disabled属性的组件决定, 可在validate回调中设置．
如果之前调用过setFormData(jo, data, {setOrigin:true})来展示数据, 则提交时会只加上修改的字段．

opt.onNoAction: Function(jf). 当form中数据没有变化时, 不做提交. 这时可调用该回调函数.

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
		var postParam = getFormData(jf);
		if (! $.isEmptyObject(postParam))
			callSvr(queryParam.ac, queryParam, fn, postParam, {userPost: postParam});
		else if (opt.onNoAction) {
			opt.onNoAction(jf);
		}
		return false;
	});
}

/**
@fn MUI.showValidateErr(jvld, jo, msg)

TODO: remove
show error using jquery validator's method by jo's name
*/
self.showValidateErr = showValidateErr;
function showValidateErr(jvld, jo, msg)
{
	var opt = {};
	opt[jo.attr("name")] = msg;
	jvld.showErrors(opt);
	jo.focus();
}

//}}}

// ------ cordova setup {{{
$(document).on("deviceready", function () {
	var homePageId = m_app.homePage.substr(1); // "#home"
	// 在home页按返回键退出应用。
	$(document).on("backbutton", function () {
		if (self.activePage.attr("id") == homePageId) {
			app_alert("退出应用?", 'q', function () {
				navigator.app.exitApp();
			});
			return;
		}
		history.back();
	});

	$(document).on("menubutton", function () {
	});

	if (!g_cfg.manualSplash && navigator.splashscreen && navigator.splashscreen.hide)
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
	if (pageRef.indexOf(m_app.loginPage) != 0)
		return false;
	return true;
}

/**
@fn MUI.showLogin(jpage?)
@param jpage 如果指定, 则登录成功后转向该页面; 否则转向登录前所在的页面.

显示登录页. 注意: 登录页地址通过setApp({loginPage})指定, 缺省为"#login".

	<div data-role="page" id="login">
	...
	</div>

注意：

- 登录成功后，会自动将login页面清除出页面栈，所以登录成功后，点返回键，不会回到登录页。
- 如果有多个登录页（如动态验证码登录，用户名密码登录等），其它页的id起名时，应以app.loginPage指定内容作为前缀，
  如loginPage="#login", 则登录页面名称可以为：#login(缺省登录页), #login1, #loginByPwd等；否则无法被识别为登录页，导致登录成功后按返回键仍会回到登录页

*/
self.showLogin = showLogin;
function showLogin(jpage)
{
	var jcurPage = jpage || MUI.activePage;
	// back to this page after login
	var toPageHash;
	if (jcurPage) {
		toPageHash = "#" + jcurPage.attr("id");
	}
	else {
		// only before jquery mobile inits
		// back to this page after login:
		toPageHash = location.hash || m_app.homePage;
	}
	m_onLoginOK = function () {
		// 如果当前仍在login系列页面上，则跳到指定页面。这样可以在handleLogin中用MUI.showPage手工指定跳转页面。
		if (MUI.activePage && isLoginPage(MUI.getToPageId()))
			MUI.showPage(toPageHash);
	}
	MUI.showPage(m_app.loginPage);
}

/**
@fn MUI.showHome()

显示主页。主页是通过 MUI.setApp({homePage: '#home'}); 来指定的，默认为"#home".

要取主页名可以用：

	var jpage = $(MUI.m_app.homePage);

@see MUI.setApp
*/
self.showHome = showHome;
function showHome()
{
	self.showPage(self.m_app.homePage);
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
	callSvr("logout", function () {
		if (! dontReload)
			reloadSite();
	});
}

// check if the entry is in the entry list. if not, refresh the page without search query (?xx) or hash (#xx)
function validateEntry(allowedEntries)
{
	if (allowedEntries == null)
		return;

	if (/*location.search != "" || */
			(location.hash && location.hash != "#" && allowedEntries.indexOf(location.hash) < 0) ) {
		location.href = location.pathname + location.search;
		app_abort();
	}
}

// set g_args
function parseArgs()
{
	if (location.search)
		g_args = parseQuery(location.search.substr(1));

	if (g_args.test || g_args._test) {
		g_args._test = 1;
	}

	if (g_args.cordova || getStorage("cordova")) {
		if (g_args.cordova === 0) {
			delStorage("cordova");
		}
		else {
			g_cordova = parseInt(g_args.cordova || getStorage("cordova"));
			g_args.cordova = g_cordova;
			setStorage("cordova", g_cordova);
			$(function () {
				var path = './';
				if (isIOS()) {
					loadScript(path + "cordova-ios/cordova.js?__HASH__,.."); 
				}
				else {
					loadScript(path + "cordova/cordova.js?__HASH__,.."); 
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
	if (m_app.appName)
		name += "_" + m_app.appName;
	if (g_args._test)
		name += "_test";
	return name;
}

function saveLoginToken(data)
{
	if (data._token)
	{
		setStorage(tokenName(), data._token);
	}
}

function loadLoginToken()
{
	return getStorage(tokenName());
}

function deleteLoginToken()
{
	delStorage(tokenName());
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
		callSvr(reuseCmd, handleAutoLogin, null, ajaxOpt);
	}
	if (ok)
		return ok;

	// then use "login(token)"
	var token = loadLoginToken();
	if (token != null)
	{
		var param = {wantAll:1};
		var postData = {token: token};
		callSvr("login", param, handleAutoLogin, postData, ajaxOpt);
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
	callSvrSync('initClient', param, function (data) {
		g_data.initClient = data;
		plugins_ = data.plugins || {};
		$.each(plugins_, function (k, e) {
			if (e.js) {
				// plugin dir
				var js = BASE_URL + 'plugin/' + k + '/' + e.js;
				loadScript(js, null, true);
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
		app_abort();
	}
}

function main()
{
	var jc = self.container;
	if (isIOS()) {
		jc.addClass("mui-ios");
	}
	else if (isAndroid()) {
		jc.addClass("mui-android");
	}

	if (g_cordova) {
		jc.addClass("mui-cordova");
	}
	if (isWeixin()) {
		jc.addClass("mui-weixin");
	}
	console.log(jc.attr("class"));

	if (! self.m_app.noHandleIosStatusBar)
		handleIos7Statusbar();
}

$(main);
//}}}

/**
@fn MUI.setApp(app)

@param app={appName?=user, allowedEntries?, loginPage?="#login", homePage?="#home", pageFolder?="page", noHandleIosStatusBar?=false}

- appName: 用于与后端通讯时标识app.
- allowedEntries: 一个数组, 如果初始页面不在该数组中, 则自动转向主页.
- loginPage: login页面的地址, 默认为"#login"
- homePage: 首页的地址, 默认为"#home"
- pageFolder: 页面文件(html及js)所在文件夹，默认为"page"
*/
self.setApp = setApp;
function setApp(app)
{
	$.extend(m_app, app);
	g_args._app = app.appName;

	if (app.allowedEntries)
		validateEntry(app.allowedEntries);
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
			obj[k] = parseDate(obj[k]);
		else if (RE_CurrencyField.test(k))
			obj[k] = parseFloat(obj[k]);
	}
	return obj;
}

}
//}}}

//}}}

// ====== app fw: list page {{{
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
		param._pagekey = nextkey;

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
@param opt {onLoadItem, autoLoadMore?=true, threshold?=180, onHint?}

@param onLoadItem function(isRefresh)

在合适的时机，它调用 onLoadItem(true) 来刷新列表，调用 onLoadItem(false) 来加载列表的下一页。在该回调中this为container对象（即容器）。实现该函数时应当自行管理当前的页号(pagekey)

@param autoLoadMore 当滑动到页面下方时（距离底部TRIGGER_AUTOLOAD=30px以内）自动加载更多项目。

@param threshold 像素值。

手指最少下划或上划这些像素后才会触发实际加载动作。

@param onHint function(ac, dy, threshold)

	ac  动作。"D"表示下拉(down), "U"表示上拉(up), 为null时应清除提示效果.
	dy,threshold  用户移动偏移及临界值。dy>threshold时，认为触发加载动作。

提供提示用户刷新或加载的动画效果. 缺省实现是下拉或上拉时显示提示信息。

@param onHintText function(ac, uptoThreshold)

修改用户下拉/上拉时的提示信息。仅当未设置onHint时有效。onHint会生成默认提示，如果onHintText返回非空，则以返回内容替代默认内容。
内容可以是一个html字符串，所以可以加各种格式。

	ac:: String. 当前动作，"D"或"U".
	uptoThreshold:: Boolean. 是否达到阈值

*/
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
	var dy_; // 纵向移动。<0为上拉，>0为下拉

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
		touchev_ = null;

		function doAction(ac)
		{
			// pulldown
			if (ac == "D") {
				console.log("refresh");
				opt_.onLoadItem.call(cont_, true);
			}
			else if (ac == "U") {
				console.log("loaditem");
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
			<div id="lst2" class="p-list" data-cond="status='RE'" style="display:none"></div>
		</div>
	</div>

上面页面应注意：

- navbar在header中，不随着滚动条移动而改变位置
- 默认要显示的list应加上active类，否则自动取第一个显示列表。
- mui-navbar在点击一项时，会在对应的div组件（通过被点击的<a>按钮上mui-linkto属性指定链接到哪个div）添加class="active"。

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
				<div id="lst2" class="p-list" style="display:none"></div>
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

@param opt {onGetQueryParam?, onAddItem?, onNoItem?, pageItf?, navRef?=">.hd .mui-navbar", listRef?=">.bd .p-list", onBeforeLoad?, onLoad?, onGetData?}
@param opt 分页相关 { pageszName?="_pagesz", pagekeyName?="_pagekey" }

@param onGetQueryParam Function(jlst, queryParam/o)

queryParam: {ac?, res?, cond?, ...}

框架在调用callSvr之前，先取列表对象jlst上的data-queryParam属性作为queryParam的缺省值，再尝试取data-ac, data-res, data-cond, data-orderby属性作为queryParam.ac等参数的缺省值，
最后再回调 onGetQueryParam。

	<ul data-queryParam="{q: 'famous'}" data-ac="Person.query" data-res="*,familyName" data-cond="status='PA' and name like '王%'">
	</ul>

此外，框架将自动管理 queryParam._pagekey/_pagesz 参数。

@param onAddItem (jlst, itemData, param)

param={idx, arr, isFirstPage}

框架调用callSvr之后，处理每条返回数据时，通过调用该函数将itemData转换为DOM item并添加到jlst中。
判断首页首条记录，可以用

	param.idx == 0 && param.isFirstPage

这里无法判断是否最后一页（可在onLoad回调中判断），因为有可能最后一页为空，这时无法回调onAddItem.

@param onNoItem (jlst)

当没有任何数据时，可以插入提示信息。

@param pageItf - page interface {refresh?/io}

在订单页面(PageOrder)修改订单后，如果想进入列表页面(PageOrders)时自动刷新所有列表，可以设置 PageOrders.refresh = true。
设置opt.pageItf=PageOrders, 框架可自动检查和管理refresh变量。

@param navRef,listRef  指定navbar与list，可以是选择器，也可以是jQuery对象；或是一组button与一组div，一次显示一个div；或是navRef为空，而listRef为一个或多个不相关联的list.

@param onBeforeLoad(jlst, isFirstPage)->Boolean  如果返回false, 可取消load动作。参数isFirstPage=true表示是分页中的第一页，即刚刚加载数据。
@param onLoad(jlst, isLastPage)  参数isLastPage=true表示是分页中的最后一页, 即全部数据已加载完。

@param onGetData(data, pagesz, pagekey?) 每次请求获取到数据后回调。pagesz为请求时的页大小，pagekey为页码（首次为null）

@return PageListInterface={refresh, markRefresh}

refresh: Function(), 刷新当前列表
markRefresh: Function(jlst?), 刷新指定列表jlst或所有列表(jlst=null), 下次浏览该列表时刷新。

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
			MUI.showPage('orders');
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

- 请求通过 _pagesz 参数指定页大小
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

- 请求下一页时，设置参数_pagekey = nextkey，直到服务端不返回 nextkey 字段为止。

例1：假定后端分页机制为(jquery-easyui datagrid分页机制):

- 请求时通过参数page, rows分别表示页码，页大小，如 `page=1&rows=20`
- 返回数据通过字段total表示总数, rows表示列表数据，如 `{ total: 83, rows: [ {...}, ... ] }`

适配方法为：

	var lstIf = initPageList(jpage, {
		...

		pageszName: 'rows',
		pagekeyName: 'total',

		// 设置 data.list, data.nextkey (如果是最后一页则不要设置); 注意pagekey可以为空
		onGetData: function (data, pagesz, pagekey) {
			data.list = data.rows;
			if (pagekey == null)
				pagekey = 1;
			if (data.total >  pagesz * pagekey)
				data.nextkey = pagekey + 1;
		}
	});

例2：假定后端分页机制为：

- 请求时通过参数curPage, maxLine分别表示页码，页大小，如 `curPage=1&maxLine=20`
- 返回数据通过字段curPage, countPage, investList 分别表示当前页码, 总页数，列表数据，如 `{ curPage:1, countPage: 5, investList: [ {...}, ... ] }`

	var lstIf = initPageList(jpage, {
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

 */
window.initNavbarAndList = initPageList;
function initPageList(jpage, opt)
{
	var opt_ = $.extend({
		navRef: ">.hd .mui-navbar",
		listRef: ">.bd .p-list",
		pageszName: "_pagesz",
		pagekeyName: "_pagekey",
	}, opt);
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
				showOrderList(false, false);
			}
		}

		jbtns_.click(function (ev) {
			// 让系统先选中tab页再操作
			setTimeout(function () {
				showOrderList(false, true);
			});
		});

		var pullListOpt = {
			onLoadItem: showOrderList,
			//onHint: $.noop,
			onHintText: onHintText,
		};

		jallList_.parent().each(function () {
			var container = this;
			initPullList(container, pullListOpt);
		});

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
			var diff = getTimeDiffDscr(tm, new Date());
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
		if (jlst.size() == 0)
			return;
		var nextkey = jlst.data("nextkey_");
		if (isRefresh) {
			nextkey = null;
		}
		if (nextkey == null) {
			jlst.empty();
		}
		else if (nextkey === -1)
			return;

		if (skipIfLoaded && nextkey != null)
			return;

		if (busy_) {
			var tm = jlst.data("lastUpdateTm_");
			if (tm && new Date() - tm <= 5000)
			{
				console.log('!!! pulldown too fast');
				return;
			}
			// 5s后busy_标志还未清除，则可能是出问题了，允许不顾busy_标志直接进入。
		}

		var queryParam = evalAttr(jlst, "data-queryParam") || {};
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
			queryParam[opt_.pageszName] = g_cfg.PAGE_SZ; // for test, default 20.
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
		busy_ = true;
		callSvr(queryParam.ac, queryParam, api_OrdrQuery);

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
				arr = rs2Array(data);
			}
			else if ($.isArray(data.list)) {
				arr = data.list;
			}
			assert($.isArray(arr), "*** initPageList error: no list!");

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

	function markRefresh(jlst)
	{
		if (jlst)
			jlst.data("nextkey_", null);
		else
			jallList_.data("nextkey_", null);
	}

	var itf = {
		refresh: refresh,
		markRefresh: markRefresh
	};
	return itf;
}

//}}}

// ====== app fw: detail page {{{
var FormMode = {
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

对于forSet模式，框架先检查formData中是否只有id属性，如果是，则在进入页面时会自动调用{obj}.get获取数据.

	<form action="Person">
		<div name=familyName></div>
		...
	</form>

如果formData中有多个属性，则自动以formData的内容作为数据源显示页面，不再发起查询。

*/

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
			setFormData(jf, pageItf.formData); // clear data
		}
		else if (pageItf.formMode == FormMode.forSet) {
			showObject();
		}
		else if (pageItf.formMode == FormMode.forFind) {
			// TODO: 之前不是forFind则应清空
			setFormData(jf); // clear data
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
			callSvr(queryParam.ac, queryParam, onGet);
		}

		function onGet(data)
		{
			setFormData(jf, data, {setOrigin: true});
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
		callSvr(ac, {id: data.id}, opt.onDel);
	}

	var itf = {
		refresh: function () {
			showObject(true);
		},
		del: delObject
	}
	return itf;
}
//}}}

// vim: set foldmethod=marker:
