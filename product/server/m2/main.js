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
	PAGE_SZ: 20,
	WAIT: 3000, // 3s
};

// ---- interface {{{
var PageHome = {
	// PageHome.show
	show: null, // Function(reload?=false)
	userInit: false, // Boolean. show dlgUserInit
	refresh: false, // Boolean
};

var PageOrder = {
	// PageOrder.id
	id: null, 
};
//}}}
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

// o: {hd?, bd?, ft?}
// return: jcell
function createCell(o)
{
	var html = "<li class=\"weui_cell\">";
	if (o.hd) {
		html += "<div class=\"weui_cell_hd\">" + o.hd + "</div>";
	}
	if (o.bd) {
		html += "<div class=\"weui_cell_bd weui_cell_primary\">" + o.bd + "</div>";
	}
	if (o.ft) {
		html += "<div class=\"weui_cell_ft\">" + o.ft + "</div>";
	}
	html += "</li>";
	return $(html);
}

function checkEmptyList(jlst, dscr)
{
	if (jlst.find("li").size() == 0) {
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
	if (data._isNew)
		PageHome.userInit = true;
	MUI.handleLogin(data);
}

$(document).on("muiInit", myInit);

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

// vim: set foldmethod=marker:
