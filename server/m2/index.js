// ====== config {{{
$.extend(MUI.options, {
	appName: "user",
	homePage: "#home",
	pageFolder: "page",
});

MUI.validateEntry([
	"#home",
	"#me",
	"#order"
]);

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
	WAIT: 3000, // 3s
};

// ---- page interface {{{
var PageOrder = {
	// PageOrder.id
	id: null, 
};

var PageOrders = {
	refresh: false
};

var PageSetUserInfo = {
	userInit: false
};

//}}}
//}}}

// ====== functions {{{
// <button id="btnGenCode">发送验证码<span class="p-prompt"></span></button>
function setupGenCodeButton(btnGenCode, txtPhone, onGenCode)
{
	btnGenCode.click(btnGenCode_click);
	function btnGenCode_click()
	{
		var phone = txtPhone.val();
		if (phone == "") {
			app_alert("填写手机号!")
			return;
		}
		var dfd = callSvr("genCode", {phone: phone}, api_genCode);
		dfd.then(onGenCode);

		function api_genCode(data)
		{
			var $btn = btnGenCode;
			$btn.prop("disabled", true);
			$btn.addClass("disabled");
			var btnText = $btn.text();

			var n = 60;
			var tv = setInterval(function () {
				var s = "";
				-- n;
				if (n > 0) 
					s = n + "秒后可用";
				else {
					clearInterval(tv);
					$btn.prop("disabled", false);
					$btn.removeClass("disabled");
					s = btnText;
				}
				$btn.text(s);
			}, 1000);
		}
	}
}

// fn(code) 找不到验证码时code=null
function getDynCode(fn)
{
	MUI.enterWaiting();
	var url = MUI.getBaseUrl() + "tool/log.php?f=ext&sz=500";
	$.get(url).then(function (data) {
		MUI.leaveWaiting();
		var m = data.match(/验证码(\d+)/);
		var ret = m? m[1]: null;
		fn(ret);
	});
}

// o: {hd?, bd?, ft?}
// return: jcell
function createCell(o)
{
	var html = "<li class=\"weui-cell\">";
	if (o.hd != null) {
		html += "<div class=\"weui-cell__hd\">" + o.hd + "</div>";
	}
	if (o.bd != null) {
		html += "<div class=\"weui-cell__bd\">" + o.bd + "</div>";
	}
	if (o.ft != null) {
		html += "<div class=\"weui-cell__ft\">" + o.ft + "</div>";
	}
	html += "</li>";
	return $(html);
}

function checkEmptyList(jlst, dscr)
{
	if (jlst[0].children.length == 0) {
		if (dscr == null)
			dscr = "空列表!";
		var ji = createCell({bd: dscr});
		ji.css("text-align", "center");
		jlst.append(ji);
	}
}

function showDlg(ref)
{
	var jdlg = MUI.activePage.find(ref);
	MUI.showDialog(jdlg);
}

function closeDlg(o)
{
	MUI.closeDialog($(o).closest(".mui-dialog"));
}
//}}}

// ====== main {{{

function handleLogin(data)
{
	MUI.handleLogin(data);
	if (data._isNew) {
		PageSetUserInfo.userInit = true;
		MUI.showPage("#setUserInfo");
	}
}

$(document).on("muiInit", myInit);

// called after page is load. called in html page.
function myInit()
{
	// MUI.initClient();
	// redirect to login if auto login fails
	MUI.tryAutoLogin(handleLogin, "User.get");
}

function logoutUser()
{
	MUI.logout();
}
// }}}

// vim: set foldmethod=marker:
