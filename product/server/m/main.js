// ====== config {{{
var MyApp = {
	appName: "user",
	allowedEntries: [
		"#me"
	]
}
MUI.setApp(MyApp);

var StatusStr = {
	CR: "待服务",
	RE: "已服务",
	CA: "已取消"
};

var ActionStr = {
	CR: "创建",
	RE: "服务",
	CA: "取消"
};
// }}}

// ====== global {{{

var g_data = {
	userInfo : null, // {id, name, uname=phone}
};

var g_cfg = {
	PAGE_SZ: 20
};
//}}}

// ====== functions {{{
// <button id="btnGenCode">发送验证码<span class="p-prompt"></span></button>
function setupGenCodeButton(btnGenCode, txtPhone)
{
	btnGenCode.click(btnGenCode_click);
	function btnGenCode_click()
	{
		var phone = txtPhone.val();
		if (phone == "") {
			app_alert("填写手机号!")
			return;
		}
		callSvr("genCode", {phone: phone});

		var $btn = $(this);
		$btn.attr("disabled", true);

		var n = 60;
		var tv = setInterval(function () {
			var s = "";
			-- n;
			if (n > 0) 
				s = "(" + n + "秒后可用)";
			else {
				clearInterval(tv);
				$btn.attr("disabled", false);
			}
			btnGenCode.find(".p-prompt").text(s);
		}, 1000);
	}
}

//}}}

// ====== main {{{

function handleLogin(data)
{
	MUI.handleLogin(data);
}

// called after page is load. called in html page.
function myInit()
{
	// redirect to login if auto login fails
	MUI.tryAutoLogin(handleLogin, "User.get");
}

function logoutUser()
{
	MUI.logout();
}
// }}}

// ====== page home {{{
var PageHome = {
	// PageHome.show
	show: null // Function(reload?=false)
};

$(document).on("pagecreate", "#home", initPageHome);
function initPageHome()
{
	var jpage = $(this);
	var jlst = jpage.find(".p-list");

	// ==== function {{{
	function refreshOrderList()
	{
		showOrderList(jlst);
	}

	// cond?
	// nextkey?: true to append more records;
	function showOrderList(jlst, cond, nextkey)
	{
		var param = {};
		param._pagesz = g_cfg.PAGE_SZ; // for test, default 20.
// 		var cond = "status<>'CA'";
		if (cond)
			param.cond = cond;

		if (nextkey == null)
			jlst.empty();
		else {
			param._pagekey = nextkey;
			jlst.find(".nextpage").remove();
		}
		callSvr("Ordr.query", param, api_OrdrQuery);
		
		function api_OrdrQuery(data) 
		{
			$.each(rs2Array(data), function (i, e) {
				var ji = $("<li><a><h2>" + e.dscr + "</h2>" + 
					"<p>订单号: " + e.id + "</p>" +
					"<p class=\"ui-li-aside\">状态: " + StatusStr[e.status] + "</p>" +
					"</a></li>");
				ji.appendTo(jlst);

				ji.click(function () {
					PageOrder.id = e.id;
					$.mobile.changePage("#order");
					return false;
				});
			});
			if (data.nextkey) {
				ji = $("<li class='nextpage'>点击查看更多...</li>").appendTo(jlst);
				ji.click(function() {
					showOrderList(jlst, cond, data.nextkey);
				});
			}
			else {
				checkEmptyList(jlst);
			}
			jlst.listview('refresh');
		}
	}
	// }}}
	
	jpage.find("#btnRefreshList").click(refreshOrderList);
	refreshOrderList();

	PageHome.show = function(reload)
	{
		$.mobile.changePage("#home");
		if (reload)
			refreshOrderList();
	}
}

//}}}

// ====== page login {{{

$(document).on("pagecreate", "#login", initPageLogin);
function initPageLogin()
{
	var jpage = $(this);

	var jf = jpage.find("form");
	MUI.setFormSubmit(jf, handleLogin);

	setupGenCodeButton(jpage.find("#btnGenCode"), jpage.find("#txtPhone"));
}

$(document).on("pagecreate", "#login1", initPageLogin1);

function initPageLogin1()
{
	var jpage = $(this);

	var jf = jpage.find("form");
	MUI.setFormSubmit(jf, handleLogin);
}
//}}}

// ====== page me {{{

$(document).on("pagecreate", "#me", initPageMe);
function initPageMe()
{
	var jpage = $(this);

	jpage.on("pagebeforeshow", function () {
		jpage.find(".p-name").text(g_data.userInfo.name);
		jpage.find(".p-phone").text(g_data.userInfo.phone);
	});

	jpage.find("#btnLogout").click(logoutUser);
}

//}}}

// ====== page order {{{
var PageOrder = {
	// PageOrder.id
	id: null, 
}

$(document).on("pagecreate", "#order", initPageOrder);
function initPageOrder() 
{
	var jpage = $(this);

	// ==== function {{{
	function showOrder()
	{
		var jlst = $(".p-list", jpage);
		jlst.empty();

		callSvr("Ordr.get", {id: PageOrder.id}, api_OrdrGet);

		function api_OrdrGet(data)
		{
			var arr = [
				"<h3>" + data.dscr + "</h3>",
				"订单号: " + data.id,
				"金额: " + data.amount + "元",
			];
			if (data.cmt) {
				arr.push("备注: " + data.cmt);
			}

			$.each(arr, function (i, e) {
				var ji = $("<li>" + e + "</li>");
				ji.appendTo(jlst);
			});

			// order log
			var div = $("<div><h4>订单日志</h4></div>").appendTo(jlst);
			var ul_log = $("<ul></ul>").appendTo(div);
			$.each(data.orderLog, function (i, e) {
				var ji = $("<li>" + ActionStr[e.action] + "- " + e.tm + "</li>");
				ji.appendTo(ul_log);
			});
			ul_log.listview();
			div.collapsible();

			jlst.listview().listview('refresh');
		}
	}
	//}}}
	
	jpage.on("pagebeforeshow", showOrder);
}
//}}}

// ====== page createOrder {{{
$(document).on("pagecreate", "#createOrder", initPageCreateOrder);
function initPageCreateOrder() 
{
	var jpage = $(this);

	var jf = jpage.find("form");
	MUI.setFormSubmit(jf, api_OrdrAdd, {validate: form_validate});

	function form_validate(jf)
	{
		var f = jf[0];
		f.amount.value = $(f.dscr).find("option:selected").data("amount");
	}
	function api_OrdrAdd(data)
	{
		app_alert("订单创建成功!", "i", function () {
			PageHome.show(true);
		});
	}
}
//}}}

// vim: set foldmethod=marker:
