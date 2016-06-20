// ====== global {{{
var IsBusy = false;
var g_args = {}; // {_test, _debug}

// 应用内部共享数据
var g_data = {}; // {userInfo}
// 应用配置项
//var g_cfg = {};

var FormMode = {
	forAdd: 0,
	forSet: 1,
	forLink: 2,
	forFind: 3,
	forDel: 4  // 该模式实际上不会打开dlg
};

var E_AUTHFAIL=-1;
var E_NOAUTH=2;
//}}}

// ====== app toolkit {{{
// for datagrid column sorter
function intSort(a, b)
{
	return parseInt(a) > parseInt(b)? 1: -1;
}

function numberSort(a, b)
{
	return parseFloat(a) > parseFloat(b)? 1: -1;
}

/**
@fn getAncestor(o, fn)

取符合条件(fn)的对象，一般可使用$.closest替代
*/
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
@fn app_abort()

中止之后的调用, 直接返回.
*/
function app_abort()
{
	throw("abort");
}

// allow throw("abort") as abort behavior.
window.onerror = function (msg) {
	if (/abort$/.test(msg))
		return true;
};

// ------ jQuery based {{{
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

/**
@fn jQuery.fn.getAncestor(expr)

取符合条件(expr)的对象，一般可使用$.closest替代
*/
$.fn.getAncestor = function (expr) {
	var jo = this;
	while (jo && !jo.is(expr)) {
		jo = jo.parent();
	}
	return jo;
}

/**
@fn row2tr(row)
@return jquery tr对象
@param row {\@cols}, col: {useTh?=false, html?, \%css?, \%attr?, \%on?}

根据row结构构造jQuery tr对象。
*/
function row2tr(row)
{
	var jtr = $("<tr></tr>");
	$.each(row.cols, function (i, col) {
		var jtd = $(col.useTh? "<th></th>": "<td></td>");
		jtd.appendTo(jtr);
		if (col.html != null)
			jtd.html(col.html);
		if (col.css != null)
			jtd.css(col.css);
		if (col.attr != null)
			jtd.attr(col.attr);
		if (col.on != null)
			jtd.on(col.on);
	});
	return jtr;
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
// }}}

//}}}

// ====== app framework {{{
/*
// ---- template for the singleton

var WUI = new nsWUI();

function nsWUI()
{
	var self = this;

	self.var1 = 100; // public var
	var m_var2 = {}; // 私有变量

	self.fn1 = fn1; // public function
	function fn1(x) 
	{
		privateFn1();
	}

	function privateFn1() {
		alert(self.var1 + m_var2);
	}
}

// ---- another template: usually for interface declaration
var WUI = {
	var1: 100,
	
	fn1: null // Function(x)

	fn2: function () {
		 this._private1();
	},

	private1_: function () {
		alert(this.var1);
	},
};

initWUI();

function initWUI()
{
	WUI.fn1 = fn1;
	function fn1()
	{
	}
}
*/

/** 
@module WUI

筋斗云前端框架-Web应用桌面版

此框架实现与筋斗云服务端接口的无缝整合。在界面上以jquery-easyui库为基础展示列表、Tab页等。
参考应用 web/store.html - 商户管理端应用。

## 对象管理功能

以订单对象Order为例：为订单对象增加“列表页”和“详情页”。

列表页应包含分页功能，默认只显示“未完成”订单。
点击列表中一项（一个订单），可显示详情页，即订单详情，并可进行查找、更新等功能。

### 定义列表页和详情页

@key #my-pages  包含所有页面、对话框定义的容器。
@key my-obj DOM属性，标识服务端对象
@key my-initfn DOM属性，标识页面或对话框的初始化函数，首次显示页面/对话框时调用。

列表页使用逻辑页面定义如下（放在div#my-pages之下），它最终展示为一个tab页：

	<div id="my-pages" style="display:none">
		...
		<div class="pageOrder" title="订单管理" my-initfn="initPageOrder">
			<table id="tblOrder" style="width:auto;height:auto">
				<thead><tr>
					<th data-options="field:'id', sortable:true, sorter:intSort">订单号</th>
					<th data-options="field:'userPhone', sortable:true">用户联系方式</th>
					<th data-options="field:'createTm', sortable:true">创建时间</th>
					<th data-options="field:'status', formatter:OrderColumns.statusStr, styler:OrderColumns.statusStyler, sortable:true">状态</th>
					<th data-options="field:'dscr', sortable:true">描述</th>
					<th data-options="field:'cmt'">用户备注</th>
				</tr></thead>
			</table>
		</div>
	</div>

注意：

- 逻辑页面div.pageOrder，属性class="pageOrder"定义了该逻辑页面的名字。它将作为页面模板，在WUI.showPage("pageOrder")时复制一份显示出来。
- 属性my-initfn定义了该页面的初始化函数. 在初次调用WUI.showPage时，会执行该初始化函数，用于初始化列表，设定事件处理等。
- 逻辑页面下包含了一个table，用于显示订单列表。里面每列对应订单的相关属性。

详情页展示为一个对话框，也将它也放在 div#my-pages 下。定义如下（此处为展示原理已简化）：

	<div id="dlgOrder" my-obj="Ordr" my-initfn="initDlgOrder" title="用户订单" style="width:520px;height:500px;">  
		<form method="POST">
			订单号：<input name="id" disabled></td>
			订单状态：
						<select name="status" style="width:150px">
							<option value="">&nbsp;</option>
							<option value="CR">未付款</option>
							<option value="PA">待服务(已付款)</option>
							<option value="ST">正在服务</option>
							<option value="RE">已服务(待评价)</option>
							<option value="RA">已评价</option>
							<option value="CA">已取消</option>
						</select>
			用户备注：<textarea name="cmt" rows=3 cols=30></textarea>
		</form>
	<div>

注意：

- 对话框div#dlgOrder. 与列表页使用class标识名称不同，详情页对话框以id标识（因为全局共用一个对话框，而列表页可以复制为多个同时显示）。
- 对话框上定义了 "my-obj"属性，用于标识它对应的服务端对象名。对象增删改查操作都会用到它。
- 对话框的属性 my-initfn 定义了初始化函数，在首次显示时调用。
- 调用 WUI.showObjDlg($("#dlgOrder"), formMode) 可显示该对话框，一般由列表页自动调用。
- 对话框中包含一个form用于向服务端发起请求。form中每个带name属性的对象，都对应订单对象的一个属性，在添加、查找、显示或更新时都将用到，除非它上面加了disabled属性（这样就不会提交该字段）
- 对话框一般不用加“提交”按钮，框架会自动为它添加“确定”、“取消”按钮。

@see WUI.showObjDlg
@see WUI.showDlg

以上定义了订单对象的列表页和详情页，围绕对象"Order", 按规范，我们定义了以下名字：

- 列表页面（Tab页） div.pageOrder，列表 table#tblOrder，页面初始化函数 initPageOrder
- 详情页（对话框）div#dlgOrder，其中包含一个form。对话框初始化函数

### 添加入口按钮

	<a href="#pageOrder" class="easyui-linkbutton" icon="icon-ok">订单管理</a><br/><br/>

### 定义页面初始化函数

订单列表页的初始化，需要将列表页(代码中jpage)、列表(代码中jtbl)与详情页(代码中jdlg)关联起来，实现对话增删改查各项功能。

	function initPageOrder() 
	{
		var jpage = $(this);
		var jtbl = jpage.find("#tblOrder");
		var jdlg = $("#dlgOrder");

		// 注意：此处定义显示哪些缺省操作按钮：
		// r-refresh/刷新, f-find/查找, s-set/更新。参考 WUI.dg_toolbar.
		// 如果不定义则所有操作按钮都展示。
		jtbl.jdata().toolbar = "rfs";

		// 当天订单
		var query1 = {cond: "createTm between '" + new Date().format("D") + "' and '" + new Date().addDay(1).format("D") + "'"};
		// 显示待服务/正在服务订单
		var query2 = {cond: "status='CR' OR status='PA' OR status='ST'"};

		function getTodoOrders()
		{
			WUI.reload(jtbl, null, query2);
		}
		function getTodayOrders()
		{
			WUI.reload(jtbl, null, query1);
		}
		var btn1 = {text: "今天订单", iconCls:'icon-search', handler: getTodayOrders};
		var btn2 = {text: "所有未完成", iconCls:'icon-search', handler: getTodoOrders};

		var dgOpt = {
			// 设置查询接口
			url: makeUrl(["Ordr", "query"], {res:"*,createTm,userPhone"}),
			// 设置缺省查询条件
			queryParams: query1,
			// 设置工具栏上的按钮，并与对话框jdlg关联。
			toolbar: WUI.dg_toolbar(jtbl, jdlg, "-", btn1, btn2),
			// 双击一行，应展示详情页对话框
			onDblClickRow: WUI.dg_dblclick(jtbl, jdlg)
		};
		jtbl.datagrid(dgOpt);
	}

@see WUI.showPage
@see WUI.dg_toolbar
@see WUI.dg_dblclick
@see WUI.makeUrl

### 定义对话框的初始化函数

默认对话框中由于设定了底层对象(my-obj)及属性关联（form中带name属性的组件，已关联对象属性），因而可自动显示和提交数据。

特别地，某些属性不宜直接展示，例如属性“人物头像”，服务器存储的是图片id(picId)，而展示时应显示为图片而不是一个数字；
或者如“权限列表”属性，服务器存储的是逗号分隔的一组权限比如"emp,mgr"，而展示时需要为每项显示一个勾选框。
这类需求就需要编码控制。

@see loaddata 对话框显示前事件，用于将服务端数据转为界面显示数据
@see savedata 对话框提交前事件，用于将界面数据转为提交数据

	function initDlgOrder()
	{
		var jdlg = $(this);
		var jfrm = jdlg.find("form");
		jfrm.on("beforeshow", function(ev, mode) {
			jdlg.find(".forFind").toggle(mode == FormMode.forFind);
			jdlg.find(".notForFind").toggle(mode != FormMode.forFind);
		})
		.on("loaddata", function (ev, data) {
			// data是列表页中一行对应的数据，框架自动根据此数据将对应属性填上值。
			// 如果界面上展示的字段无法与属性直接对应，可以在该事件回调中设置。
			// hiddenToCheckbox(jfrm.find("#divPerms"));
		})
		.on("savedata", function (ev) {
			// 在form提交时，所有带name属性且不带disabled属性的对象值会被发往服务端。
			// 此事件回调可以设置一些界面上无法与属性直接对应的内容。
			// checkboxToHidden(jfrm.find("#divPerms"));
		});
	}

TODO
@see hiddenToCheckbox
@see checkboxToHidden
@see hiddenToImg
@see imgToHidden

### 列表页中的列，以特定格式展现。例如，展示订单状态。

TODO
详情页中的填写项与数据库属性不能对应的情况。如上传图片。

### 层次结构对象展示

TODO
如商户列表中，选择一行商户，点击操作按钮，在另一个列表页展示该商户的所有在售物料。

### 关联列表制作

例如，要将订单分派给员工，需要显示员工列表。

## 对话框功能

以群发短信功能为例。

假定服务端已有以下接口：

	sendSms(phone, content)
	phone:: 手机号
	content:: 发送内容

### 定义对话框

注意：每个带name属性的组件对应接口中的参数。

	<div id="dlgSendSms" title="群发短信" style="width:500px;height:300px;">  
		<form method="POST">
			手机号：<input name="phone" data-options="required:true">
			发送内容： <textarea rows=5 cols=30 name="content"></textarea>
		</form>
	</div>

### 显示对话框

可以调用WUI.showDlg，写一个显示对话框的函数：

	function showDlgSendSms()
	{
		var jdlg = $("#dlgSendSms");
		WUI.showDlg(jdlg, {
			url: makeUrl("sendSms"),
			onOk: function (data) {
				WUI.closeDlg(jdlg);
				app_show('操作成功!');
			}
		});
	}

在showDlg的选项url中指定了接口为"sendSms"。操作成功后，显示一个消息。

@see WUI.showDlg
@see app_show

除了直接调用该函数显示对话框外，还有一种更简单的通过a标签href属性指定打开对话框的做法，如：

	<a href="?showDlgSendSms" class="easyui-linkbutton" icon="icon-ok">群发短信</a><br/><br/>

点击该按钮，即调用了showDlgSendSms函数打开对话框。
*/
var WUI = new nsWUI();
function nsWUI()
{
var self = this;

/**
@var WUI.m_app
*/
self.m_app = {
	title: "客户端",
	appName: "user",
	onShowLogin: function () { throw "NotImplemented"; },
	pageHome: "pageHome"
};

// set g_args
function parseArgs()
{
	if (location.search) {
		g_args = parseQuery(location.search.substr(1));
		if (g_args.test || g_args._test) {
			g_args._test = 1;
			alert("测试模式!");
		}
	}
}
parseArgs();

// ---- ajax setup {{{
/**
@fn WUI.enterWaiting()
@alias enterWaiting()

TODO: require #block
*/
window.enterWaiting = self.enterWaiting = enterWaiting;
function enterWaiting()
{
	IsBusy = true;
	$('#block').css({
		width: $(document).width(),
		height: $(document).height(),
		'z-index': 999999
	}).show();
}

/**
@fn WUI.leaveWaiting()
@alias leaveWaiting
*/
window.leaveWaiting = self.leaveWaiting = leaveWaiting;
function leaveWaiting()
{
	$('#block').hide();
	IsBusy = false;
}

// params: {k=>val}
function paramStr(params)
{
	var arr = [];
	for(var k in params) {
		if (typeof params[k] != "function") {
			arr.push(k + "=" + encodeURIComponent(params[k]));
		}
	}
	return arr.join("&");
}

// params: {k=>val}
function appendParam(url, params)
{
	if (params == null)
		return url;
	return url + (url.indexOf('?')>0? "&": "?") + paramStr(params);
}

/**
@fn WUI.makeUrl(action, params)
@alias makeUrl

生成对后端调用的url. 

	var params = {id: 100};
	var url = makeUrl("Ordr.set", params);

注意：调用该函数生成的url在结尾有标志字符串"zz=1", 如"../api.php/login?_app=user&zz=1"
 */
window.makeUrl = self.makeUrl = makeUrl;
function makeUrl(ac, params)
{
	// 避免重复调用
	if (ac instanceof String && ac.indexOf("zz=1") >0)
		return ac;

	if (params == null)
		params = {};

	var usePathInfo = true;
	var url;
	if (ac instanceof Array) {
		ac = ac[0] + "." + ac[1];
	}
	if (usePathInfo) {
		url = "../api.php/" + ac;
	}
	else {
		url = "../api.php?ac=" + ac;
	}

	if (self.m_app.appName)
		params._app = self.m_app.appName;
	if (g_args._test)
		params._test = 1;
	if (g_args._debug)
		params._debug = g_args._debug;

	params.zz = 1; // zz标记
	return appendParam(url, params);
}

$.ajaxSetup({
	dataType: "json",
	dataFilter: function (data, type) {
		if (type == "json" || type == "text") {
			rv = defDataProc.call(this, data);
			if (rv == null)
			{
				this.error(null, "app error", null);
				throw("abort");
			}
			return rv;
		}
		return data;
	},
	// for jquery > 1.4.2. don't convert text to json as it's processed by defDataProc.
	converters: {
		"text json": true
	},

	error: defAjaxErrProc
});

/**
@fn WUI.callSvr(ac, params?, fn?, postParams?, userOptions?)
@fn WUI.callSvr(ac, fn?, postParams?, userOptions?)
@alias callSvr

@param ac String. action, 交互接口名. 也可以是URL(比如由makeUrl生成)
@param params Object. URL参数（或称HTTP GET参数）
@param postParams Object. POST参数. 如果有该参数, 则自动使用HTTP POST请求(postParams作为POST内容), 否则使用HTTP GET请求.
@param fn Function(data). 回调函数, data参考该接口的返回值定义。
@param userOptions 用户自定义参数, 会合并到$.ajax调用的options参数中.可在回调函数中用"this.参数名"引用. 
@return XMLHttpRequest(XHR) 与$.ajax返回相同。

常用userOptions: 
- 指定{async:0}来做同步请求, 一般直接用callSvrSync调用来替代.
- 指定{noex:1}用于忽略错误处理, 当后端返回错误时, 回调函数会被调用, 且参数data=false.

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
			return;
		}
		foo(data);
	}, null, {noex:1});

*/
window.callSvr = self.callSvr = callSvr;
function callSvr(ac, params, fn, postParams, userOptions)
{
	if (params instanceof Function) {
		// 兼容格式：callSvr(url, fn?, postParams?, userOptions?);
		userOptions = postParams;
		postParams = fn;
		fn = params;
		params = null;
	}
	var url = makeUrl(ac, params);
	enterWaiting();
	var method = (postParams === undefined? 'GET': 'POST');
	var ret;
	var opt = $.extend({
		url: url,
		data: postParams,
// 		dataType: "text",
		type: method,
		success: fn,
	}, userOptions);
	return $.ajax(opt);
}

/**
@fn WUI.callSvrSync(ac, params?, fn?, postParams?, userOptions?)
@fn WUI.callSvrSync(ac, fn?, postParams?, userOptions?)
@alias callSvrSync
@return data 原型规定的返回数据

同步模式调用callSvr.

@see WUI.callSvr
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

// TODO: doc for this.lastError
// return: null/undefined - ignore processing; data - pre-processed app-level return; false - app-level failure handled by caller (and this.lastError=[code, msg, info?])
function defDataProc(rv)
{
	leaveWaiting();
	if (typeof rv !== "string")
		return rv;
	try {
		rv = $.parseJSON(rv);
	} catch (ex) {}

	if (rv && rv instanceof Array && rv.length >= 2 && typeof rv[0] == "number") {
		if (rv[0] == 0)
		{
			return rv[1];
		}

		this.lastError = rv;
		if (this.noex)
			return false;

		if (rv[0] == E_NOAUTH)
		{
			if (self.tryAutoLogin()) {
				$.ajax(this);
			}
			return;
		}

		window.showLastError = function () {
			alert(rv[2]);
		};
		app_alert("<span ondblclick='showLastError();'>操作失败(code=" + rv[0] + "): " + rv[1] + "</span>", "e");
	}
	else {
		app_alert("服务器通讯协议异常!", "e"); // 格式不对
	}
}

function defAjaxErrProc(xhr, textStatus, e)
{
	leaveWaiting();
	if (xhr && xhr.status != 200) {
		app_alert("操作失败: 服务器错误. status=" + xhr.status + "-" + xhr.statusText, "e");
	}
}
//}}}

// ---- easyui setup {{{

$.extend($.fn.combobox.defaults, {
	valueField: 'val',
	textField: 'text'
});

function dgLoadFilter(data)
{
	var ret = data;
	// support simple array
	if ($.isArray(data)) {
		ret = {
			total: data.length,
			rows: data
		}
	}
	// support my row set
	else if (data.h !== undefined)
	{
		var arr = rs2Array(data);
		ret = {
			total: data.total || arr.length,
			rows: arr
		}
	}
	var isOnePage = (ret.total == ret.rows.length);
	// 隐藏pager: 一页能显示完且不超过5条.
	$(this).datagrid("getPager").toggle(! (isOnePage && ret.total <= 5));
	// 超过1页使用remoteSort, 否则使用localSort.
	$(this).datagrid("options").remoteSort = (! isOnePage);
	return ret;
}

function resetPageNumber(jtbl)
{
	var opt = jtbl.datagrid('options');
	if (opt.pagination && opt.pageNumber)
	{
		opt.pageNumber = 1;
		var jpager = jtbl.datagrid("getPager");
		jpager.pagination("refresh", {pageNumber: opt.pageNumber});
	}
}

$.extend($.fn.datagrid.defaults, {
// 		fit: true,
// 		width: 1200,
// 		height: 800,
// 		method: 'POST',

	rownumbers:true,
	singleSelect:true,

// 	pagination: false,
	pagination: true,
	pageSize: 20,
	pageList: [20,30,50],

	loadFilter: dgLoadFilter,

	onLoadError: defAjaxErrProc,
	onBeforeSortColumn: function (sort, order) {
		var jtbl = $(this);
		resetPageNumber(jtbl);
	},

	// Decided in dgLoadFilter: 超过1页使用remoteSort, 否则使用localSort.
	// remoteSort: false

// 	// 用于单选并且不清除选择, 同时取data("sel")可取到当前所选行号idx。this = grid
// 	onSelect: function (idx, data) {
// 		$(this).data("sel", idx);
// 	},
// 	onUnselect: function (idx, data) {
// 		if (idx === $(this).data("sel"))
// 			$(this).datagrid("selectRow", idx);
// 	}
});

/*
function checkIdCard(idcard)
{
	if (idcard.length != 18)
		return false;

	if (! /\d{17}[0-9x]/i.test(idcard))
		return false;

	var a = idcard.split("");
	var w = [7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2];
	var s = 0;
	for (var i=0; i<17; ++i)
	{
		s += a[i] * w[i];
	}
	var x = "10x98765432".substr(s % 11, 1);
	return x == a[17].toLowerCase();
}
*/

var DefaultValidateRules = {
	number: {
		validator: function(v) {
			return v.length==0 || /^[0-9.-]+$/.test(v);
		},
		message: '必须为数字!'
	},
	/*
	workday: {
		validator: function(value) {
			return value.match(/^[1-7,abc]+$/);
		},
		message: '格式例："1,3a,5b"表示周一,周三上午,周五下午.'
	},
	idcard: {
		validator: checkIdCard,
		message: '18位身份证号有误!'
	},
	*/
	uname: {
		validator: function (v) {
			return v.length==0 || (v.length>=4 && v.length<=16 && /^[a-z]\w+$/i.test(v));
		},
		message: "4-16位英文字母或数字，以字母开头，不能出现符号."
	},
	pwd: {
		validator: function (v) {
			return v.length==0 || (v.length>=4 && v.length<=16) || v.length==32; // 32 for md5 result
		},
		message: "4-16位字母、数字或符号."
	},
	same: {
		validator: function (v, param) { // param: [dom_id]
			return v.length==0 || v==gi(param[0]).value;
		},
		message: "两次输入不一致."
	},
	cellphone: {
		validator: function (v) {
			return v.length==0 || (v.length==11 && !/\D/.test(v)); // "
		},
		message: "手机号为11位数字"
	},
	datetime: {
		validator: function (v) {
			return v.length==0 || /\d{4}-\d{1,2}-\d{1,2}( \d{1,2}:\d{1,2}(:\d{1,2})?)?/.test(v);
		},
		message: "格式为\"年-月-日 时:分:秒\"，时间部分可忽略"
	},
	usercode: {
		validator: function (v) {
			return v.length==0 || /^[a-zA-Z]/.test(v) || (v.length==11 && !/\D/.test(v)); 
		},
		message: "11位手机号或客户代码"
	},
};
$.extend($.fn.validatebox.defaults.rules, DefaultValidateRules);

// tabs自动记住上次选择
/*
$.extend($.fn.tabs.defaults, {
	onSelect: function (title) {
		var t = this.getAncestor(".easyui-tabs");
		var stack = t.data("stack");
		if (stack === undefined) {
			stack = [];
			t.data("stack", stack);
		}
		if (title != stack[stack.length-1]) {
			var idx = stack.indexOf(title);
			if (idx >= 0) 
				stack.splice(idx, 1);
			stack.push(title);
		}
	},
	onClose: function (title) {
		var t = this.getAncestor(".easyui-tabs");
		var stack = t.data("stack");
		var selnew = title == stack[stack.length-1];
		var idx = stack.indexOf(title);
		if (idx >= 0)
			stack.splice(idx, 1);
		if (selnew && stack.length >0) {
			// 向上找到tabs
			$(t).tabs("select", stack[stack.length-1]);
		}
	}
});
*/
// }}}

/**
@fn WUI.app_alert(msg, type?=i, fn?)
@alias app_alert
@param type String. "i"|"e"|"w"
@param fn Function(). 用户点击确定后的回调。

使用jQuery easyui弹出提示对话框.
*/
window.app_alert = self.app_alert = app_alert;
function app_alert(msg, type, fn)
{
	type = type || "i";
	var icon = {i: "info", w: "warning", e: "error"}[type];
	var s = {i: "提示", w: "警告", e: "出错"}[type];
	var s1 = "<b>[" + s + "]</b>";
	$.messager.alert(self.m_app.title + " - " + s, s1 + " " + msg, icon, fn);

	// 查看jquery-easyui对象，发现OK按钮的class=1-btn
	setTimeout(function() {
		$(".l-btn").focus();
	}, 50);
}

/**
@fn WUI.app_confirm(msg, type?=i, fn?)
@alias app_confirm
@param fn Function(). 用户点击确定后的回调。

使用jQuery easyui弹出确认对话框.
*/
window.app_confirm = self.app_confirm = app_confirm;
function app_confirm(msg, fn)
{
	var s = "<div style='font-size:10pt'>" + msg.replace(/\n/g, "<br/>") + "</div>";
	$.messager.confirm(self.m_app.title + " - " + "确认", s, fn);
}

/**
@fn WUI.app_show(msg)
@alias app_show

使用jQuery easyui弹出对话框.
*/
window.app_show = self.app_show = app_show;
function app_show(msg)
{
	$.messager.show({title: self.m_app.title, msg: msg});
}

/**
@fn WUI.makeLinkTo
@alias makeLinkTo

生成一个链接的html代码，点击该链接可以打开指定对象的对话框。
*/
window.makeLinkTo = self.makeLinkTo = makeLinkTo;
function makeLinkTo(dlg, id, text)
{
	return "<a href=\"" + dlg + "\" onclick='WUI.showObjDlg($(\"" + dlg + "\"),FormMode.forLink," + id + ");return false'>" + text + "</a>";
}

// ====== jquery plugin: mycombobox {{{
/**
@fn jQuery.fn.mycombobox
 */
var m_dataCache = {}; // url => data
$.fn.mycombobox = function () 
{
	this.each(initCombobox);

	function initCombobox(i, o)
	{
		var jo = $(o);
		if (jo.prop("_inited"))
			return;
		jo.prop("_inited", true);

		var opts = {};
		var optStr = jo.data("options");
		try {
			if (optStr != null)
			{
				if (optStr.indexOf(":") > 0) {
					opts = eval("({" + optStr + "})");
				}
				else {
					opts = eval("(" + optStr + ")");
				}
			}
		}catch (e) {
			alert("bad options for mycombobox: " + optStr);
		}
		if (opts.url) {
			loadOptions();

			function loadOptions()
			{
				jo.empty();
				// 如果设置了name属性, 一般关联字段(故可以为空), 添加空值到首行
				if (jo.attr("name"))
					$("<option value=''></option>").appendTo(jo);

				if (m_dataCache[opts.url] === undefined) {
					callSvrSync(opts.url, applyData);
				}
				else {
					applyData(m_dataCache[opts.url]);
				}

				function applyData(data) 
				{
					m_dataCache[opts.url] = data;
					function getText(row)
					{
						if (opts.formatter) {
							return opts.formatter(row);
						}
						else if (opts.textField) {
							return row[opts.textField];
						}
						return row.id;
					}
					if (opts.loadFilter) {
						data = opts.loadFilter.call(this, data);
					}
					$.each(data, function (i, row) {
						var jopt = $("<option></option>")
							.attr("value", row[opts.valueField])
							.text(getText(row))
							.appendTo(jo);
					});
				}
			}

			if (!jo.attr("ondblclick"))
			{
				jo.dblclick(function () {
					if (! confirm("刷新数据?"))
						return false;
					var val = jo.val();
					loadOptions();
					jo.val(val);
				});
			}
		}
	}
};
//}}}

// ======  UI framework {{{
// dlg中与数据库表关联的字段的name应以_开头，故调用add_转换；
// 但如果字段名中间有"__"表示非关联到表的字段，不做转换，这之后该字段不影响数据保存。
function add_(o)
{
	var ret = {};
	for (var k in o) {
		if (k.indexOf("__") < 0)
			ret[k] = o[k];
	}
	return ret;
}

function getRow(jtbl)
{
	var row = jtbl.datagrid('getSelected');   
	if (! row)
	{
		app_alert("请先选择一行。", "w");
		return null;
	}
	return row;
}

/** 
@fn WUI.reload(jtbl, url?, queryParams?) 
*/
self.reload = reload;
function reload(jtbl, url, queryParams)
{
	if (url != null || queryParams != null) {
		var opt = jtbl.datagrid("options");
		if (url != null) {
			opt.url = url;
		}
		if (queryParams != null) {
			opt.queryParams = queryParams;
		}
	}

	// 如果当前页面不是table所在页，则先切换到所在页
	if (jtbl.is(":hidden")) {
		var opage = getAncestor(jtbl[0], istab);
		if (opage && opage.title)
			$(opage).getAncestor(".easyui-tabs").tabs("select", opage.title);
	}

	resetPageNumber(jtbl);
	jtbl.datagrid('reload');
	jtbl.datagrid('clearSelections');
}

/** 
@fn WUI.reloadTmp(jtbl, url?, queryParams?) 
临时reload一下，完事后恢复原url
*/
self.reloadTmp = reloadTmp;
function reloadTmp(jtbl, url, queryParams)
{
	var opt = jtbl.datagrid("options");
	var url_bak = opt.url;
	var param_bak = opt.queryParams;

	reload(jtbl, url, queryParams);

	// restore param
	opt.url = url_bak;
	opt.queryParams = param_bak;
}

/** 
@fn WUI.reloadRow(jtbl, rowData)
@param rowData must be the original data from table row
 */
self.reloadRow = reloadRow;
function reloadRow(jtbl, rowData)
{
	jtbl.datagrid("loading");
	var opt = jtbl.datagrid("options");
	callSvr(opt.url, function (data) {
		jtbl.datagrid("loaded");
		var idx = jtbl.datagrid("getRowIndex", rowData);
		if (idx != -1 && data.length == 1) {
			// NOTE: updateRow does not work, must use the original rowData
// 			jtbl.datagrid("updateRow", {index: idx, row: data[0]});
			for (var k in rowData) 
				delete rowData[k];
			$.extend(rowData, data[0]);
			jtbl.datagrid("refreshRow", idx);
		}
	}, {cond: "id=" + rowData.id, wantArray: 1});
}

function appendRow(jtbl, id)
{
	jtbl.datagrid("loading");
	var opt = jtbl.datagrid("options");
	callSvr(opt.url, function (data) {
		jtbl.datagrid("loaded");
		var row = data[0];
		if (opt.sortOrder == "desc")
			jtbl.datagrid("insertRow", {index:0, row: row});
		else
			jtbl.datagrid("appendRow", row);
	}, {cond: "id=" + id, wantArray: 1});
}

function tabid(title)
{
	return "pg_" + title.replace(/[ ()\[\]]/g, "_");
}
function istab(o)
{
	var id = o.getAttribute("id");
	return id && id.substr(0,3) == "pg_";
}

// // 取jquery-easyui dialog 对象
// function getDlg(o)
// {
// 	return getAncestor(o, function (o) {
// 		return o.className && o.className.indexOf('window-body') >=0;
// 	});
// }

// function closePage(title)
// {
// 	var o = $("#pg_" + title).find("div");
// 	if (o.length > 0) {
// 		alert(o[0].id);
// 		o.appendTo($("#hidden_pages"));
// 		alert("restore");
// 	}
// }

// paramArr?
function callInitfn(jo, paramArr)
{
	if (jo.jdata().init)
		return;

	var attr = jo.attr("my-initfn");
	if (attr == null)
		return;

	try {
		initfn = eval(attr);
	}
	catch (e) {
		app_alert("bad initfn: " + attr, "e");
	}

	if (initfn)
	{
		initfn.apply(jo, paramArr);
	}
	jo.jdata().init = true;
}

/** 
@fn WUI.showPage(pageName, title?, paramArr?)
@param pageName 由page上的class指定。
@param title? 如果未指定，则使用page上的title属性.
@param paramArr? 调用initfn时使用的参数，是一个数组。

新页面以title作为id。
注意：每个页面都是根据pages下相应pageName复制出来的，显示在一个新的tab页中。相同的title当作同一页面。
初始化函数由page上的my-initfn属性指定。

page定义示例: 

	<div id="my-pages" style="display:none">
		<div class="pageHome" title="首页" my-initfn="initPageHome"></div>
	</div>

page调用示例:

	WUI.showPage("pageHome");
	WUI.showPage("pageHome", "首页");
	WUI.showPage("pageHome", "首页2");

*/
self.showPage = showPage;
function showPage(pageName, title, paramArr)
{
	var sel = "#my-pages > div." + pageName;
	if (title == null)
		title = $(sel).attr("title") || "无标题";

	var tt = $('#my-tabMain');   
	if (tt.tabs('exists', title)) {
		tt.tabs('select', title);
		return;
	}

	var id = tabid(title);
	var content = "<div id='" + id + "' title='" + title + "' />";
	var closable = (pageName != self.m_app.pageHome);

	tt.tabs('add',{
// 		id: id,
		title: title,
		closable: closable,
		fit: true,
		content: content
	});

	var jtab = $("#" + id);
	var jpage = $(sel);
	if (jpage.length > 0) {
		var jpageNew = jpage.clone().appendTo(jtab);
		callInitfn(jpageNew, paramArr);
	}
	else {
		jtab.append("未实现");
	}
}

/**
@fn WUI.closeDlg(jdlg) 
*/
self.closeDlg = closeDlg;
function closeDlg(jdlg)
{
	jdlg.dialog("close");
}

function openDlg(jdlg)
{
	jdlg.dialog("open");
// 	jdlg.find("a").focus(); // link button
}

function focusDlg(jdlg)
{
	var jo;
	jdlg.find(":input[type!=hidden]").each(function (i, o) {
		var jo1 = $(o);
		if (! jo1.prop("disabled") && ! jo1.prop("readonly")) {
			jo = jo1;
			return false;
		}
	});
	if (jo == null) 
		jo = jdlg.find("a button");

	// !!!! 在IE上常常focus()无效，故延迟做focus避免被别的obj抢过
	if (jo)
		setTimeout(function(){jo.focus()}, 50);
}

// setup "Enter" and "Cancel" key for OK and Cancel button on the dialog
$.fn.okCancel = function (fnOk, fnCancel) {
	this.unbind("keydown").keydown(function (e) {
		if (e.keyCode == 13 && e.target.tagName != "TEXTAREA" && fnOk) {
			fnOk();
			return false;
		}
		else if (e.keyCode == 27 && fnCancel) {
			fnCancel();
			return false;
		}
		// Ctrl-F: find mode
		else if (e.ctrlKey && e.which == 70)
		{
			showObjDlg($(this), FormMode.forFind, null);
			return false;
		}
	});
}

/**
@fn WUI.showDlg(jdlg, opt?)
@param opt?={url, buttons, noCancel=false, okLabel="确定", cancelLabel="取消", modal=true, reset=true, validate=true, data, onOk, onSubmit, onAfterSubmit}

- url: 点击确定时的操作动作。
- data: 如果是object, 则为form自动加载的数据；如果是string, 则认为是一个url, 将自动获取数据。(form的load方法一致)
- reset: 在加载数据前清空form

特殊class my-reset: 当执行form reset时会将内容清除. (适用于在forSet/forLink模式下添加显示内容, 而在forFind/forAdd模式下时清除内容)

	<div class="my-reset">...</div>

hidden上的特殊property noReset: (TODO)

 */
self.showDlg = showDlg;
function showDlg(jdlg, opt) 
{
	opt = $.extend({
		okLabel: "确定",
		cancelLabel: "取消",
		noCancel: false,
		modal: true,
		reset: true,
		validate: true
	}, opt);

	var btns = [{text: opt.okLabel, iconCls:'icon-ok', handler: fnOk}];
	if (! opt.noCancel) 
		btns.push({text: opt.cancelLabel, iconCls:'icon-cancel', handler: fnCancel})
	if ($.isArray(opt.buttons))
		btns.push.apply(btns, opt.buttons);

	callInitfn(jdlg);

	var dlgOpt = {
//		minimizable: true,
		maximizable: true,
		collapsible: true,
		resizable: true,

		// reset default pos.
		left: null,
		top: null,

		closable: ! opt.noCancel,
		modal: opt.modal,
		buttons: btns
	};
	if (jdlg.is(":visible")) {
		dlgOpt0 = jdlg.dialog("options");
		$.extend(dlgOpt, {
			left: dlgOpt0.left,
			top: dlgOpt0.top
		});
	}
	jdlg.dialog(dlgOpt);

	// !!! init combobox on necessary
	jdlg.find(".my-combobox").mycombobox();

	jdlg.okCancel(fnOk, opt.noCancel? undefined: fnCancel);

	var jfrm = jdlg.find("Form");
	if (opt.reset)
	{
		jfrm.form("reset");
		// !!! NOTE: form.reset does not reset hidden items, which causes data is not cleared for find mode !!!
		jfrm.find("[type=hidden]:not([noReset])").val("");
		jfrm.find(".my-reset").empty();
	}
	if (opt.data)
	{
		jfrm.trigger("initdata", opt.data);
		jfrm.form("load", opt.data);
		jfrm.trigger("loaddata", opt.data);
// 		// load for jquery-easyui combobox
// 		// NOTE: depend on jeasyui implementation. for ver 1.4.2.
// 		jfrm.find("[comboname]").each (function (i, e) {
// 			$(e).combobox('setValue', opt.data[$(e).attr("comboname")]);
// 		});
	}

// 	openDlg(jdlg);
	focusDlg(jdlg);

	function fnCancel() {closeDlg(jdlg)}
	function fnOk()
	{
		if (opt.url) {
			jfrm.form('submit', {
				url: opt.url,
				onSubmit: function () {
					jfrm.trigger("savedata");
					if (opt.onSubmit && opt.onSubmit(jfrm) === false)
						return false;
					var ret = opt.validate? jfrm.form("validate"): true;
					if (ret)
						enterWaiting();
					return ret;
				},
				success: function (data) {
					if (typeof data == "string")
						data = defDataProc.call(this, data);
					if (data != null && opt.onOk)
						opt.onOk.call(jdlg, data);
				}
			});
			opt.onAfterSubmit && opt.onAfterSubmit(jfrm);
		}
		else
			opt.onOk && opt.onOk.call(jdlg);
	}
}

// ---- object CRUD {{{
var BTN_TEXT = ["添加", "保存", "保存", "查找", "删除"];
// e.g. var text = BTN_TEXT[mode];

// "key= vallue"
// "key= >=vallue"
// "key= <vallue"
// "key= ~vallue"
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
*/
self.getQueryCond = getQueryCond;
function getQueryCond(kvList)
{
	var cond = '';
	$.each(kvList, function(k,v) {
		if (v == null || v === "")
			return;
		if (cond)
			cond += " AND ";
		cond += k + getop(v);
		//val[e.name] = escape(v);
		//val[e.name] = v;
	})
	return cond;
}

/**
@fn WUI.getQueryParam(kvList)
*/
self.getQueryParam = getQueryParam;
function getQueryParam(kvList)
{
	return {cond: getQueryCond(kvList)};
}

function getFindData(jfrm)
{
	var kvList = {};
	var kvList2 = {};
	jfrm.find(":input[name]").each(function(i,e) {
		if ($(e).attr("notForFind"))
			return;
		var v = $(e).val();
		if (v == null || v === "")
			return;
		if ($(e).attr("my-cond"))
			kvList2[e.name] = v;
		else
			kvList[e.name] = v;
	})
	var cond = getQueryParam(kvList);
	if (kvList2) 
		$.extend(cond, kvList2);
	return cond;
}

function saveFormFields(jfrm, data)
{
	jfrm.jdata().init_data = $.extend(true, {}, data); // clone(data);
}

function checkFormFields(jfrm)
{
	var jd = jfrm.jdata();
	jd.no_submit = [];
	jfrm.find(":input[name]").each(function (i,o) {
		var jo = $(o);
		var initval = jd.init_data[o.name];
		if (initval === undefined || initval === null)
			initval = "";
		if (jo.prop("disabled") || jo.val() !== String(initval))
			return;
		jo.prop("disabled", true);
		jd.no_submit.push(jo);
	});
}

function restoreFormFields(jfrm)
{
	var jd = jfrm.jdata();
	$.each(jd.no_submit, function(i,jo) {
		jo.prop("disabled", false);
	})
	delete jd.no_submit;
}

/**
@fn WUI.showObjDlg(jdlg, mode, id?)
@param id String. mode=link时必设，set/del如缺省则从关联的jtbl中取, add/find时不需要
@param jdbl Datagrid. dialog/form关联的datagrid -- 如果dlg对应多个tbl, 必须每次打开都设置
*/
self.showObjDlg = showObjDlg;
function showObjDlg(jdlg, mode, id)
{
// 一些参数保存在jdlg.jdata(), 
// mode: 上次的mode
// 以下参数试图分别从jdlg.jdata()和jtbl.jdata()上取. 当一个dlg对应多个tbl时，应存储在jtbl上。
// init_data: 用于add时初始化的数据 
// url_param: 除id外，用于拼url的参数
	var obj = jdlg.attr("my-obj");
	assert(obj);
	var jd = jdlg.jdata();
	var jd2 = jd.jtbl && jd.jtbl.jdata();

	// get id
	var rowData;
	if (id == null) {
		assert(mode != FormMode.forLink);
		if (mode == FormMode.forSet || mode == FormMode.forDel) // get dialog data from jtbl row, 必须关联jtbl
		{
			assert(jd.jtbl);
			rowData = getRow(jd.jtbl);
			if (rowData == null)
				return;
			id = rowData.id;
		}
	}

	var url;
	if (mode == FormMode.forAdd) {
		url = makeUrl([obj, "add"], jd.url_param);
		if (jd.jtbl) 
			jd.jtbl.datagrid("clearSelections");
	}
	else if (mode == FormMode.forSet || mode == FormMode.forLink) {
		url = makeUrl([obj, "set"], {id: id});
	}
	else if (mode == FormMode.forDel) {
		app_confirm("确定要删除一条记录?", function (b) {
			if (! b)
				return;

			url = makeUrl([obj, 'del'], {id: id});
			callSvr(url, function(data) {
				if (jd.jtbl)
					reload(jd.jtbl);
				app_show('删除成功!');
			});
		});
		return;
	}

	callInitfn(jdlg);
	var jfrm = jdlg.find("Form");

	// 设置find模式
	var doReset = ! (jd.mode == FormMode.forFind && mode == FormMode.forFind) // 一直是find, 则不清除
	if (mode == FormMode.forFind && jd.mode != FormMode.forFind) {
		jfrm.find(":input[name]").each (function (i,e) {
			var je = $(e);
			je.jdata().bak = {
				bgcolor: je.css("backgroundColor"),
				disabled: je.prop("disabled")
			}
			if (je.attr("notforFind")) {
				je.prop("disabled", true);
				je.css("backgroundColor", "");
			}
			else {
				je.prop("disabled", false);
				je.css("backgroundColor", "#ffff00"); // "yellow";
			}
		})
	}
	else if (jd.mode == FormMode.forFind && mode != FormMode.forFind) {
		jfrm.find(":input[name]").each (function (i,e) {
			var je = $(e);
			var bak = je.jdata().bak;
			je.prop("disabled", bak.disabled);
			je.css("backgroundColor", bak.bgcolor);
		})
	}

	jd.mode = mode;

	var jd_frm = jfrm.jdata();
	// load data
	var load_data;
	if (mode == FormMode.forAdd) {
		var init_data = jd.init_data || (jd2 && jd2.init_data);
		if (init_data)
			load_data = add_(init_data);
	}
	else if (mode == FormMode.forSet && rowData) {
		load_data = add_(rowData);
		
		saveFormFields(jfrm, load_data);
	}
	else if (mode == FormMode.forLink || mode == FormMode.forSet) {
		var load_url = makeUrl([obj, 'get'], {id: id});
		var data = callSvrSync(load_url);
		if (data == null)
			return;
		load_data = add_(data);
		saveFormFields(jfrm, load_data);
	}
	jfrm.trigger("beforeshow", mode);
	// open the dialog
	showDlg(jdlg, {
		url: url,
		okLabel: BTN_TEXT[mode],
		validate: mode!=FormMode.forFind,
		modal: false,  // mode == FormMode.forAdd || mode == FormMode.forSet
		reset: doReset,
		data: load_data,
		onOk: onOk,

		onSubmit: (mode == FormMode.forSet || mode == FormMode.forLink) && checkFormFields,
		onAfterSubmit: (mode == FormMode.forSet || mode == FormMode.forLink) && restoreFormFields
	});

	if (mode == FormMode.forSet || mode == FormMode.forLink)
		jfrm.form("validate");
	jfrm.trigger("show", mode);

	function onOk (retData) {
		if (mode==FormMode.forFind) {
			var param = getFindData(jfrm);
			if (! $.isEmptyObject(param)) {
				assert(jd.jtbl); // 查询结果显示到jtbl中
				reload(jd.jtbl, undefined, param);
			}
			else {
				app_alert("请输入查询条件!", "w");
			}
			return;
		}
		// add/set/link
		if (mode != FormMode.forLink && jd.jtbl) {
			if (mode == FormMode.forSet && rowData)
				reloadRow(jd.jtbl, rowData);
			else if (mode == FormMode.forAdd) {
				appendRow(jd.jtbl, retData);
			}
			else
				reload(jd.jtbl);
		}
		if (mode == FormMode.forAdd)
		{
			showObjDlg(jdlg, mode); // reset and add another
		}
		else
		{
			closeDlg(jdlg);
		}
		app_show('操作成功!');
	}
}

/**
@fn WUI.dg_toolbar(jtbl, jdlg, button_lists...)

设置easyui-datagrid上toolbar上的按钮。缺省支持的按钮有r(refresh), f(find), a(add), s(set), d(del), 可通过以下设置方式修改：

	jtbl.jdata().toolbar = "rfas"; // 没有d-删除按钮

如果要添加自定义按钮，则

	jtbl.datagrid({
		...
		toolbar: datagrid_toolbar(jtbl, jdlg, button lists...); //TODO
	})

*/
self.dg_toolbar = dg_toolbar;
function dg_toolbar(jtbl, jdlg)
{
	var toolbar = jtbl.jdata().toolbar || "rfasd";
	var btns = [];

	/*
	var org_url, org_param;

	// at this time jtbl object has not created
	setTimeout(function () {
		var jtbl_opt = jtbl.datagrid("options");
		org_url = jtbl_opt.url;
		org_param = jtbl_opt.queryParams || '';
	}, 100);
	*/

	var tb = {
		r: {text:'刷新', iconCls:'icon-reload', handler: function() { reload(jtbl); /* reload(jtbl, org_url, org_param) */ } },
		f: {text:'查询', iconCls:'icon-search', handler: function () {
			jdlg.jdata().jtbl = jtbl;
			showObjDlg(jdlg, FormMode.forFind);
		}},
		a: {text:'新增', iconCls:'icon-add', handler: function () {
			jdlg.jdata().jtbl = jtbl;
			showObjDlg(jdlg, FormMode.forAdd);
		}},
		s: {text:'修改', iconCls:'icon-edit', handler: function () {
			jdlg.jdata().jtbl = jtbl;
			showObjDlg(jdlg, FormMode.forSet);
		}}, 
		d: {text:'删除', iconCls:'icon-remove', handler: function () { 
			jdlg.jdata().jtbl = jtbl;
			showObjDlg(jdlg, FormMode.forDel);
		}}
	};
	$.each(toolbar.split(""), function(i, e) {
		if (tb[e]) {
			btns.push(tb[e]);
			btns.push("-");
		}
	});
	for (var i=2; i<arguments.length; ++i)
		btns.push(arguments[i]);

	return btns;
}

/**
@fn WUI.dg_dblclick

设置双击datagrid行的回调，功能是打开相应的dialog
*/
self.dg_dblclick = function (jtbl, jdlg)
{
	return function (idx, data) {
		jtbl.datagrid("selectRow", idx);
		jdlg.jdata().jtbl = jtbl;
		showObjDlg(jdlg, FormMode.forSet);
	}
}

//}}}

// TODO: doc for WUI
function link_onclick()
{
	var href = $(this).attr("href");
	if (href.search(/^#(page\w+)$/) >= 0) {
		var pageName = RegExp.$1;
		WUI.showPage.call(this, pageName);
		return false;
	}
	else if (href.search(/^\?(\w+)$/) >= 0) {
		var fn = RegExp.$1;
		fn = eval(fn);
		if (fn)
			fn.call(this);
		return false;
	}
	return true;
}

$(function () {
	$('.easyui-linkbutton').click(link_onclick);
	$('[data-type="easyui-linkbutton"]').click(link_onclick);
});

//}}}

// ====== login token for auto login {{{
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
@fn WUI.tryAutoLogin(onHandleLogin, reuseCmd?)

@param onHandleLogin Function(data). 调用后台login()成功后的回调函数(里面使用this为ajax options); 可以直接使用WUI.handleLogin
@param reuseCmd String. 当session存在时替代后台login()操作的API, 如"User.get", "Employee.get"等, 它们在已登录时返回与login相兼容的数据. 因为login操作比较重, 使用它们可减轻服务器压力. 
@return Boolean. true=登录成功; false=登录失败.

该函数一般在页面加载完成后调用，如

	function main()
	{
		WUI.setApp({
			appName: APP_NAME,
			title: APP_TITLE,
			onShowLogin: showDlgLogin
		});

		WUI.tryAutoLogin(WUI.handleLogin, "whoami");
	}

	$(main);

*/
self.tryAutoLogin = tryAutoLogin;
function tryAutoLogin(onHandleLogin, reuseCmd)
{
	var ok = false;
	var ajaxOpt = {async: false, noex: true};

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
		callSvr(reuseCmd, handleAutoLogin, null, ajaxOpt);
	}
	if (ok)
		return ok;

	// then use "login(token)"
	var token = loadLoginToken();
	if (token != null)
	{
		var postData = {token: token};
		callSvr("login", handleAutoLogin, postData, ajaxOpt);
	}
	if (ok)
		return ok;

	self.m_app.onShowLogin();
	return ok;
}

/**
@fn WUI.handleLogin(data)
@param data 调用API "login"成功后的返回数据.

处理login相关的操作, 如设置g_data.userInfo, 保存自动登录的token等等.

*/
self.handleLogin = handleLogin;
function handleLogin(data)
{
	g_data.userInfo = data;
	// 自动登录: http://...?autoLogin
	if (g_args.autoLogin || /android|ipad|iphone/i.test(navigator.userAgent))
		saveLoginToken(data);

	showPage(self.m_app.pageHome);
}
//}}}

/**
@fn WUI.setApp(app)

@param app={appName?=user, title?="客户端", onShowLogin, pageHome?="pageHome"}

- appName: 用于与后端通讯时标识app.
- pageHome: 首页的id, 默认为"pageHome"
*/
self.setApp = setApp;
function setApp(app)
{
	$.extend(self.m_app, app);
}

/**
@fn WUI.logout(dontReload?=0)
@param dontReload 如果非0, 则注销后不刷新页面.

注销当前登录, 成功后刷新页面(除非指定dontReload=1)
*/
self.logout = logout;
function logout(dontReload)
{
	deleteLoginToken();
	g_data.userInfo = null;
	callSvr("logout", function (data) {
		if (! dontReload)
			reloadSite();
	});
}

// ========= END OF nsWUI ============
}

// }}}

// vim: set foldmethod=marker:
