// ====== global {{{
var IsBusy = false;
var g_args = {}; // {_test, _debug, cordova}
var g_cordova = 0; // the version for the android/ios native cient. 0 means web app.
var g_prevPage;

// 应用内部共享数据
var g_data = {}; // {userInfo}
// 应用配置项
var g_cfg = {};

//}}}

// ====== app toolkit {{{
/**
@fn appendParam(url, param)

例:

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

/** @fn isWeixin */
function isWeixin()
{
	return /micromessenger/i.test(navigator.userAgent);
}

/** @fn isIOS */
function isIOS()
{
	return /iPhone|iPad/i.test(navigator.userAgent);
}

/**
@fn loadScript(url)

动态加载一个script. 如果曾经加载过, 可以重用cache.

注意: $.getScript一般不缓存(仅当跨域时才使用Script标签方法加载,这时可用缓存), 自定义方法$.getScriptWithCache与本方法类似.
*/
function loadScript(url)
{
	var script= document.createElement('script');
	script.type= 'text/javascript';
	script.src= url;
	script.async = true;
	document.body.appendChild(script);
}

/**
@fn app_abort()

中止之后的调用, 直接返回.
*/
app_abort = function () {
	throw("abort");
}
// allow throw("abort") as abort behavior.
window.onerror = function (msg) {
	if (/abort$/.test(msg))
		return true;
};

// --------- jquery {{{
/**
@fn getFormParam(jform)

取form中带name属性的控件值, 放入一个对象中, 以便手工调用callSvr.

	jf.submit(function () {
		var ac = jf.attr("action");
		callSvr(makeUrl(ac), fn, getFormParam(jf));
	});
	
 */
function getFormParam(jf)
{
	var param = {};
	jf.find("[name]").each (function () {
		param[$(this).attr("name")] = $(this).val();
	});
	return param;
}

/**
@fn $.getScriptWithCache(url, options?)
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

// }}}

// ====== app fw {{{
var E_AUTHFAIL=-1;
var E_NOAUTH=2;

/**
@module MUI

Mobile UI framework, 基于jquery mobile库的增强和工具集.

== 登录与退出 ==

框架提供MUI.showLogin/MUI.logout操作. 
调用MUI.tryAutoLogin可以支持自动登录.

== 底部导航 ==

设置id为"footer"的导航, 框架会对此做些设置: 如果当前页面为导航栏中的一项时, 就会自动显示导航栏.
例: 在html中添加底部导航:

	<div data-role="footer" id="footer" data-id="foot" data-position="fixed" data-tap-toggle="false">
		<div data-role="navbar" data-iconpos="top">
			<ul>
				<li><a href="#home" data-icon="home" class="ui-btn-footer-home ui-btn-active">主页</a></li>
				<li><a href="#orders" data-icon="bullets">订单</a></li>
				<li><a href="#me" data-icon="user" class="ui-btn-footer-me">我</a></li>
			</ul>
		</div>
	</div>

== 图片按需加载 ==

对于img标签, 可以将src属性改为data-src, 这样只有在img所在page创建时才加载, 而不是一打开应用就加载:

	<img data-src="../m/images/ui/carwash.png">

== Cordova增强 ==

ios7以上, 为状态栏留出空间. 需要在style中定义如下样式:

	#ios7statusbar {
		width:100%;
		height:20px;
		background-color:white;
		position:fixed;
		z-index:10000;
		top: 0;
	}

 */
var MUI = new nsMUI();
function nsMUI()
{

var self = this;

/**
@var MUI.m_app

参考MUI.setApp
*/
self.m_app = {
	appName: "user",
	allowedEntries: [],
	loginPage: "#login",
};

var m_onLoginOK;

// ------ jquery mobile {{{
// $pop - optional. if not assigned, check if no popup opens
function isPopupOpened($pop)
{
	if ($pop === undefined)
		return $(".ui-popup-active").size() > 0;
	return $pop.parent().hasClass("ui-popup-active");
}

/**
@fn MUI.app_alert(msg, type?=i, fn?, timeoutInterval?)
@alias app_alert
@param type "i"|"e"|"w", default="i"

使用jquerymobile popup弹出对话框.
要求定义css class "info", "warning", "error";
*/
window.app_alert = self.app_alert = app_alert;
function app_alert(msg, type, fn, timeoutInterval)
{
	type = type || "i";
	var icon = {i: "info", w: "warning", e: "error", q: "question"}[type];
	var s = {i: "提示", w: "警告", e: "出错", q: "确认"}[type];
	var s1 = "<div class='alertTitle'>" + s + "</div>";

	// 如果没有jqm, 或当前有jqm popup在显示, 使用alert (jqm不能同时开两个popup)
	if ($.mobile == null || isPopupOpened())
	{
		alert(s + ": " + msg);
		return;
	}

	var jmsg = $("#mymsgbox");
	if (jmsg.size() == 0) {
		jmsg = $(
'<div id="mymsgbox" class="ui-content">' +
	'<a href="#" class="ui-btn ui-corner-all ui-shadow ui-btn-a ui-icon-delete ui-btn-icon-notext ui-btn-right" data-rel="back">Close</a>' +
	'<h3></h3>' +
	'<span id=btns><button id="btnOK" class="ui-btn ui-corner-all ui-mini ui-btn-inline">取消订单</button>' + 
	'<button id="btnCancel" class="ui-btn ui-mini ui-btn-inline">不取消</button></span>' +
'</div>');

		jmsg.appendTo($.mobile.pageContainer);
		jmsg.find("#btnOK").click(function () {
			jmsg.data("ok", 1);
			jmsg.popup('close');
		});
		jmsg.find("#btnCancel").click(function () {
			jmsg.data("ok", 0);
			jmsg.popup('close');
		});
		// NOTE: use "theme" option, or else it's transparent on the current page.
		jmsg.popup({theme: 'a', history: false});
	}
	
	// Todo ========
	jmsg.find("h3").attr("class", icon).html(s1 + "<div class='alertInfo'>" + msg + "</div>");
	
	if (type == 'q') {
		jmsg.find("#btns").show();
	}
	else {
		jmsg.find("#btns").hide();
	}

	// NOTE:
	setTimeout(function () {
		if (timeoutInterval != null) {
			setTimeout(function() {
				jmsg.data("ok", 1);
				jmsg.popup('close');   
			}, timeoutInterval);
		}
		
		jmsg.popup('open');

		if (fn) {
			jmsg.one('popupafterclose', function() { 
				if (type == 'q') {
					if (! jmsg.data("ok"))
						return;
					jmsg.data("ok", 0);
				}
				fn(); 
			});
		}
	}, 50);
	
}

/*
从navbar移到下个页面再回来，JQM有bug会丢失上次选择．使用fixNavbarAsTab来解决．
*/
function fixNavbarAsTab(jnavbar, jpage)
{
	var jsel;
	jnavbar.find("li a").click(function () {
		jsel = $(this);
	});
	jpage.on("pagehide", function () {
		if (jsel) {
			setTimeout(function () {
				jsel.addClass("ui-btn-active");
			}, 20);
		}
	});
}

function fixNavbarAsFooter(jfooter)
{
	var jnavs = jfooter.find("li a");
	var id2nav = {};
	jnavs.each(function(i, e) {
		var m = e.href.match(/#(\w+)/);
		if (m) {
			id2nav[m[1]] = $(e);
		}
	});

	function checkNavbar(jpage)
	{
		var pageId = jpage.attr("id");
		var jnav = id2nav[pageId];
		if (jnav) {
			jnavs.removeClass("ui-btn-active");
			jnav.addClass("ui-btn-active");
			jfooter.show();
		}
		else
			jfooter.hide();
	}

	$(document).on("pagecontainerchange", function (ev, ui) {
		checkNavbar(ui.toPage);
	});

	// for init:
	var jp = $.mobile.activePage;
	if (jp == null)
		jp = $(document).find("[data-role=page]:first");
	checkNavbar(jp);
}

// TODO: 没有用到
function fixNavbarAsButton(jnavbar)
{
	jnavbar.find("li a").click(function () {
		var jsel = $(this);
		setTimeout(function () {
			jsel.removeClass("ui-btn-active");
		}, 200);
	});
}

/*
不再使用
// !!! OK button mechanism on a popup or page !!!
function enhanceOkBtn()
{
	$(".my-ok-btn").click(function () {
		var jdlg = $(this).closest("[data-role=page], [data-role=popup]");
		if (jdlg.size() == 0)
			return;

		// set flag
		jdlg.data("ok", 1);

		// clear flag
		if (jdlg.attr("data-role") == "popup") {
			jdlg.one("popupafterclose", function() {
				setTimeout(function () {
					jdlg.data("ok", 0);
				});
			});
		}
		else {
			jdlg.on("pagehide", function () {
				setTimeout(function () {
					jdlg.data("ok", 0);
				}, 20);
			});
		}
	});
}
*/

/**
@fn MUI.setupPopup(jpopup, initfn)

@return 可以不返回, 或返回一个回调函数beforeShow, 在每次Dialog显示前调用.

使用该函数可设置popup的初始化回调函数和beforeShow回调.

JQM中的popup(或称dialog)一般放置在一个page中, 设置它的初始化函数不能像设置page那样使用popupcreate回调,
因为它会在pagecreate事件后就立即调用, 而我们希望它在首次显示对话框时调用.

注意:
- 初始化回调或beforeShow回调 是通过 popupbeforeposition 事件来模拟实现的.

使用方法:

	MUI.setupPopup(jdlg, function () {
		var jdlg = this;
		jdlg.find("#btnOK").click(btnOK_click);

		function btnOK_click(ev) { }

		function beforeShow() {
			// var jdlg = this;
			var jtxt = jdlg.find("#txt1");
			callSvr(makeUrl("getxxx"), function (data) {
				jtxt.val(data);
			});
		}
		return beforeShow;
	});

*/
self.setupPopup = setupPopup;
function setupPopup(jpopup, initfn)
{
	var onBeforeShow;
	var isBeforeShow = true;
	jpopup.on("popupbeforeposition", function () {
		if (onBeforeShow == null) {
			// run only once
			onBeforeShow = initfn.call(jpopup);
			if (onBeforeShow == null)
			{
				jpopup.off("popupbeforeposition");
				return;
			}
			jpopup.on("popupafterclose", function () {
				isBeforeShow = true;
			});
		}
		if (isBeforeShow)
			onBeforeShow.call(jpopup);
		isBeforeShow = false;
	});
}

/*
不再使用, 用 $gp.controlgroup('refresh'); 替代该函数.
function refreshButtonGroup($gp)
{
	$gp.controlgroup('refresh');
// 	$gp.css("padding", "0px 2px");
// 	var vis = $.grep($gp.find("a").toArray(), function (o) {
// 		return o.style.display != "none";
// 	});
// 	var n = vis.length;
// 	$.each (vis, function (i) {
// 		var jo = $(this);
// 		if (i == 0)
// 			jo.addClass("ui-first-child");
// 		else
// 			jo.removeClass("ui-first-child");
// 
// 		if (i == n-1)
// 			jo.addClass("ui-last-child");
// 		else
// 			jo.removeClass("ui-last-child");
// 	});
}
*/

function initJQM()
{
	// flip,fade,turn,flow,slide,...
	// disable for performance
	$.mobile.defaultPageTransition = "none"; 
	$.mobile.defaultDialogTransition = "none"; 

	$.mobile.toolbar.prototype.options.position = "fixed";
	$.mobile.toolbar.prototype.options.tapToggle = false;

	$.mobile.popup.prototype.options.history = false;
	if(isIOS()){
		$.mobile.pushStateEnabled = false;
		//$.mobile.hashListeningEnabled = false;
	}
}
initJQM();

// ---- 图片按需加载 {{{
function document_pageCreate(ev)
{
	var jpage = $(ev.target);
	// 图片按需加载
	jpage.find("img[data-src]").each(function () {
		this.src = $(this).data("src");
	});

	// fix tab: 从navbar移到下个页面再回来，JQM有bug会丢失上次选择．使用fixNavbarAsTab来解决．
	var jnavbar = jpage.find("[data-role=navbar]");
	if (jnavbar.size() >0)
		fixNavbarAsTab(jnavbar, jpage);
}

$(document).on("pagecreate", document_pageCreate);
//}}}

// ---- 处理浏览器前进后退 {{{
// 注: 以下私有属性暴露出去是为了在控制台中更方便查看.
/**
@var MUI.m_pageStack
当前页面栈. 当浏览器前进后退(或调用history.back()之类方法)时, 会相应调整.
*/
self.m_pageStack = [""];

/**
@var MUI.m_SP
当前页面栈指针
*/
self.m_SP = 0;

/**
@var MUI.m_disablePageStack?=false
如果配置为true, 可比较禁用页面栈之后的效果.
*/
self.m_disablePageStack=false;

function getPageId(page)
{
	if (page == null)
		return null;
	if (page.attr)
		return page.attr("id");
	var ms = page.match(/#(\w+)$/);
	if (ms != null)
		return ms[1];
	return "";
}

/** 
@fn MUI.popPageStack(n?=1) 

离开页面时, 如果不希望在点击后退按钮后回到该页面, 可以调用

	MUI.popPageStack()

如果要在后退时忽略两个页面, 可以调用

	MUI.popPageStack(2)

如果要在后退时直接回到主页(忽略所有历史记录), 可以调用

	MUI.popPageStack(0)

*/
self.popPageStack = popPageStack;
// n?=1. n=0: 退到首层, >0: 指定pop几层
function popPageStack(n)
{
	if (n == null)
		n = 1;

	if (n == 0) {
		self.m_pageStack.splice(1);
		self.m_SP = 0;
	}
	else if (n > 0) {
		self.m_SP -= n;
		if (self.m_SP < 0)
			self.m_SP = 0;
		self.m_pageStack.splice(self.m_SP+1, n);
	}
}

var lastFrom, lastTo;
function pageContainer_beforeChange(ev, ui) 
{
	if (ui.options.role == "popup")
		return;

	// 防止调用多次
	var toPageId = getPageId(ui.toPage);
	var fromPageId = getPageId(ui.prevPage);

	if (lastFrom == fromPageId || lastTo == toPageId)
		return;
	lastFrom = fromPageId;
	lastTo = toPageId;

	// console.log("----before change-----");
	g_prevPage = ui.prevPage;
// 		console.log(ui.prevPage);
// 		console.log(ui.toPage);

	var ret = true;
	var pageStack = self.m_pageStack;

	if (ui.options.fromHashChange && ui.options.direction && !self.m_disablePageStack) { // direction判断是点击了 后退/前进 按钮
		var found = false;
		var i;
		// !!! 注意: ui.options.direction == "back"/"forward" 并不可靠, 有时点forward会当back处理, 所以不要用

		for (i=self.m_SP; i<pageStack.length; ++i) {
			if (toPageId == pageStack[i])
			{
				found = true;
				break;
				//return false;
			}
		}
		if (!found) {
			for (i=self.m_SP; i>=0; --i) {
				if (toPageId == pageStack[i])
				{
					found = true;
					break;
				}
			}
		}

		if (!found || self.m_SP == i) { // 如果回退页面和当前页面相同, 再回退一次
			// 遇到已删除的历史, 当回退处理
			if (self.m_SP > 0) {
				-- self.m_SP;
			}
			location.replace("#" + pageStack[self.m_SP]);//按了返回键: 当前的前一个页面
			//history.replaceState(null, null, "#" + pageStack[self.m_SP]);

			// 取消之后的动作
			return false;
		}
		self.m_SP = i;
		return;
	}

	if (pageStack.length == 0 || pageStack[self.m_SP] != toPageId)
	{
		++ self.m_SP;
		pageStack.splice(self.m_SP, pageStack.length, toPageId);
	}
	return ret;
}

//}}}

// ---- 处理ios7以上标题栏问题(应下移以空出状态栏)
// 需要定义css: #ios7statusbar
function handleIos7Statusbar()
{
	if(g_cordova){
		var ms = navigator.userAgent.match(/(iPad.*|iPhone.*|iPod.*);.*CPU.*OS (\d+)_\d/i);
		if(ms) {
			var ver = ms[2];
			if (ver >= 7)
				$("body").addClass("ios7").append("<div id='ios7statusbar'>");;
		}	
	}
}

// TODO: handle it in framework
window.isBackFromSubPage = isBackFromSubPage;
// add attribute "subpage=true" to a page to avoid "pagebeforeshow" action when navigate back from this page.
function isBackFromSubPage()
{
	return g_prevPage && g_prevPage.data("subpage");
}
//}}}

// ------ jquery validate {{{
/*
jquery.validate
document: http://jqueryvalidation.org/documentation/
*/
/*
if ($.validate) {
	$.validator.addMethod("uname", function(value, element) {
		return value.length >= 4;
	}, "至少4个字母或数字");
	
	$.validator.addMethod("phone", function(value, element) {
		return this.optional(element) || (value.length >= 11 && /^[0-9+-]+$/.test(value));
	}, "手机填写11位数字");

	$.validator.addMethod("pwd", function(value, element) {
		return value.length >= 4;
	}, "密码至少填写4个字符");
}
*/


/**
@fn MUI.setFormSubmit(jf, fn?, rules)
@param fn? the callback for callSvr. you can use this["userPost"] to retrieve the post param.
*/
self.setFormSubmit = setFormSubmit;
function setFormSubmit(jf, fn, rules)
{
	/*
	jf.submit(function () {
		var ac = jf.attr("action");
		callSvr(makeUrl(ac), fn, getFormParam(jf));
	});
	*/

	// use jquery.validate
	jf.validate({
		rules: rules,
		submitHandler: function (form) {
			if (fn == null)
				return;
			var ac = jf.attr("action");
			var params = getFormParam(jf);
			callSvr(makeUrl(ac), fn, params, {userPost: params});
		}
	});
}

/**
@fn MUI.showValidateErr(jvld, jo, msg)

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

// setup jquery.validate
if ($.validator) {
	$.validator.setDefaults({
		// submitHandler: function(form) { alert("submitted!");form.submit(); }
		errorPlacement: function( error, element ) {
			error.insertAfter( element.parent() );
		},
		// dont submit form
		submitHandler: function(form) { }
	// 	debug: true,
	});
}
//}}}

// ------ ajax {{{

$.ajaxSetup({
	dataType: "text",
	dataFilter: function (data, type) {
		if (type == "text") {
			rv = defDataProc.call(this, data);
			if (rv != null)
				return rv;
			app_abort();
		}
		return data;
	},

	error: defAjaxErrProc
});

$(document).on("pageshow", function () {
	if (IsBusy)
		$.mobile.loading("show");
});

/**
@fn MUI.enterWaiting()
@alias enterWaiting()
*/
window.enterWaiting = self.enterWaiting = enterWaiting;
function enterWaiting()
{
	IsBusy = true;
	if ($.mobile)
		$.mobile.loading("show");
}

/**
@fn MUI.leaveWaiting()
@alias leaveWaiting
*/
window.leaveWaiting = self.leaveWaiting = leaveWaiting;
function leaveWaiting()
{
	if ($.mobile)
		$.mobile.loading("hide");
	IsBusy = false;
}

function defAjaxErrProc(xhr, textStatus, e)
{
	if (xhr.status != 200) {
		if (xhr.status == 0) {
			app_alert("连不上服务器了，是不是网络连接不给力？", "e");
		}
		else {
			app_alert("操作失败: 服务器错误. status=" + xhr.status + "-" + xhr.statusText, "e");
		}
		leaveWaiting();
	}
}

// return: ==null: 做出错处理，不调用回调函数。
// 注意：服务端不应返回null, 否则客户回调无法执行; 习惯上返回false表示让回调处理错误。
function defDataProc(rv)
{
	try {
		rv = $.parseJSON(rv);
	}
	catch (e)
	{
		leaveWaiting();
		app_alert("服务器通讯异常: " + e);
		return;
	}

	leaveWaiting();
	if (rv && $.isArray(rv) && rv.length >= 2 && typeof rv[0] == "number") {
		if (rv[0] == 0)
			return rv[1];

		if (this.noex)
			return false;

		if (rv[0] == E_NOAUTH) {
			popPageStack(0);
			showLogin();
			return;
		}
		else if (rv[0] == E_AUTHFAIL) {
			app_alert("验证失败，请检查输入是否正确!", "e");
		}
		app_alert("操作失败：" + rv[1], "e");
	}
	else {
		app_alert("服务器通讯协议异常!", "e"); // 格式不对
	}
}

/**
@fn MUI.makeUrl(action, params)
@alias makeUrl

生成对后端调用的url. 对于GET参数(也称URL参数), 直接通过该函数生成. 对于POST参数(也称form参数), 则是通过callSvr第三个参数传递.

	var params = {id: 100};
	var postParams = {status: 2};
	var url = makeUrl("Ordr.set", params);
	callSvr(url, fn, postParams);

 */
window.makeUrl = self.makeUrl = makeUrl;
function makeUrl(action, params)
{
	if (params == null)
		params = {};
	var url;
	if (action.indexOf(".php") < 0)
	{
		var usePathInfo = true;
		if (usePathInfo) {
			url = "../api.php/" + action;
		}
		else {
			url = "../api.php";
			params.ac = action;
		}
	}
	else {
		url = action;
	}
	if (g_cordova)
		params._ver = "a/" + g_cordova;
	if (self.m_app.appName)
		params._app = self.m_app.appName;
	if (g_args._test)
		params._test = 1;
	if (g_args._debug)
		params._debug = g_args._debug;
	return appendParam(url, $.param(params)); // appendParam(url, params);
}

/**
@fn MUI.callSvr(url, fn?, data?, userOptions?, wait?)
@alias callSvr

@param url 请求地址, 一般使用makeUrl生成.
@param data 如果有该参数, 则自动使用HTTP POST请求(data作为POST内容), 否则使用HTTP GET请求.
@param userOptions 用户自定义参数, 会合并到$.ajax调用的options参数中.可在回调函数中用"this.参数名"引用. 

常用userOptions: 
- 指定{async:0}来做同步请求, 一般直接用callSvrSync调用来替代.
- 指定{noex:1}用于忽略错误处理, 当后端返回错误时, 回调函数会被调用, 且参数data=false.

	callSvr(makeUrl("User.get"), function (data) {
		if (data === false) { // 仅当设置noex且服务端返回错误时可用, 
			return;
		}
		foo(data);
	}, null, {noex:1});

TODO: wait参数

TODO: 是否合并makeUrl(以后隐藏它, 以避免手工为callSvr设置url)和callSvr为 

	callSvr([action, urlParams], fn, postParams, userOptions); 或
	callSvr(action, fn, postParams, userOptions);

*/
window.callSvr = self.callSvr = callSvr;
function callSvr(url, fn, data, userOptions, wait)
{
	wait == null || !wait ? enterWaiting() : console.log("not wait!");	// 是否需要等待
	var method = (data == null? 'GET': 'POST');
	var options = $.extend({
		url: url,
		data: data,
		type: method,
		success: fn
	}, userOptions);
	$.ajax(options);
}

/**
@fn MUI.callSvrSync(url, fn?, data?)
@alias callSvrSync

同步模式调用callSvr.
*/
window.callSvrSync = self.callSvrSync = callSvrSync;
function callSvrSync(url, fn, data)
{
	callSvr(url, fn, data, {async: false});
}

/**
@fn MUI.setupCallSvrViaForm($form, $iframe, url, fn, callOpt)

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

//}}}

// ------ cordova setup {{{
$(document).on("deviceready", function () {
	// 在home页按返回键退出应用。
	$(document).on("backbutton", function () {
		if ($.mobile.activePage.attr("id") == "home") {
			if (! confirm("退出应用?"))
				return;
			navigator.app.exitApp();
			return;
		}
		$.mobile.back();
	});

	$(document).on("menubutton", function () {
	});
});
//}}}

// ------ enter and exit {{{
/**
@fn MUI.showLogin(jpage?)
@param jpage 如果指定, 则登录成功后转向该页面; 否则转向登录前所在的页面.

显示登录页. 注意: 登录页地址通过setApp({loginPage})指定, 缺省为"#login".

	<div data-role="page" id="login">
	...
	</div>

*/
self.showLogin = showLogin;
function showLogin(jpage)
{
	var jcurPage = jpage || $.mobile.activePage;
	// back to this page after login
	if (jcurPage) {
		m_onLoginOK = function () {
			$.mobile.changePage("#" + jcurPage.attr("id"));
		}
		$.mobile.changePage(self.m_app.loginPage);
	}
	else {
		// only before jquery mobile inits
		// back to this page after login:
		var pageHash = location.hash || "#";
		m_onLoginOK = function () {
			$.mobile.changePage(pageHash);
		}
		location.href = self.m_app.loginPage;
	}
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
	callSvr(makeUrl("logout"), function () {
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
		alert("测试模式!");
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
				// to use cordova plugins like camera: require m2/cordova.js, cordova_plugins.js, plugins/...
				if (isIOS()) {
					loadScript("cordova-ios/cordova.js"); 
				}
				else {
					loadScript("cordova/cordova.js"); 
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
	if (self.m_app.appName)
		name += "_" + self.m_app.appName;
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

@param onHandleLogin Function(data). 调用后台login()成功后的回调函数(里面使用this为ajax options); 可以直接使用MUI.handleLogin
@param reuseCmd String. 当session存在时替代后台login()操作的API, 如"User.get", "Employee.get"等, 它们在已登录时返回与login相兼容的数据. 因为login操作比较重, 使用它们可减轻服务器压力. 
@param allowNoLogin Boolean. 缺省未登录时会自动跳转登录页面, 如果设置为true, 如不会自动跳转登录框, 表示该应用允许未登录时使用.

该函数应该在DOM元素加载完成后(以便显示登录页)且在$.ready之前(以便跳转到登录页)执行, 一般可以在html的结尾设置

	<script> myInit(); </script>

然后在myInit中调用:

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
	var url;

	function handleAutoLogin(data)
	{
		if (data === false) // has exception (as noex=true)
			return;
		if (onHandleLogin)
			onHandleLogin.call(this, data);
		ok = true;
	}

	// first try "User.get"
	if (reuseCmd != null) {
		url = makeUrl(reuseCmd);
		callSvr(url, handleAutoLogin, null, ajaxOpt);
	}
	if (ok)
		return;

	// then use "login(token)"
	var token = loadLoginToken();
	if (token != null)
	{
		url = makeUrl("login", {wantAll:1});
		var postData = {token: token};
		callSvr(url, handleAutoLogin, postData, ajaxOpt);
	}
	if (ok)
		return;

	if (! allowNoLogin)
		showLogin();
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
	g_data.userInfo = data;
	if (m_onLoginOK) {
		var fn = m_onLoginOK;
		m_onLoginOK = null;
		setTimeout(fn);
	}
	else {
		// 转主页
		$.mobile.changePage("#");
	}
}
//}}}

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
		if (url == null || url == location.href)
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
	// popup's header dont appear to be 'fixed'
	$("div[data-role=popup] div[data-role=header]").attr("data-position", "");

	$("#footer").toolbar({theme: "a"});
	fixNavbarAsFooter($("#footer"));

	// 标题栏点击5次, 进入测试模式
	$("div[data-role=header]").click(function (ev) { if ($(ev.target).attr("data-role") == "header") switchTestMode(this); });

	$.mobile.pageContainer.on("pagecontainerbeforechange", pageContainer_beforeChange);

	handleIos7Statusbar();
}

$(main);
//}}}

/**
@fn MUI.setApp(app)

@param app={appName?=user, allowedEntries?, loginPage?="#login"}

- appName: 用于与后端通讯时标识app.
- allowedEntries: 一个数组, 如果初始页面不在该数组中, 则自动转向主页.
- loginPage: login页面的地址, 默认为"#login"
*/
self.setApp = setApp;
function setApp(app)
{
	$.extend(self.m_app, app);

	if (app.allowedEntries)
		validateEntry(app.allowedEntries);
}

}
//}}}

// vim: set foldmethod=marker:
