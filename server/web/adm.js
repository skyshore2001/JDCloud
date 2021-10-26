// ====== globals {{{
var APP_TITLE = "超级管理端";
var APP_NAME = "admin";

$.extend(WUI.options, {
	appName: APP_NAME,
	pageFolder: "adm",
	title: APP_TITLE,
	onShowLogin: showDlgLogin
});

var g_data = {}; // { userInfo={id,uname} }

// interface
var DlgImport = {
	data_: null,
	cb_: null,
	// data: {obj, ...} 对应dlgImport.html中的带name对象
	// cb: 导入成功后的回调函数
	show: function (data, cb) {
		this.data_ = data;
		this.cb_ = cb;
		WUI.showDlg("#dlgImport", {modal:false});
	}
};
//}}}

// ====== data-options {{{
var Formatter = {
	orderStatus: WUI.formatter.enum(OrderStatusMap),
	userId: WUI.formatter.linkTo("userId", "#dlgUser"),
	empId: WUI.formatter.linkTo("empId", "#dlgEmployee"),
	orderId: WUI.formatter.linkTo("orderId", "#dlgOrder")
};
Formatter = $.extend(WUI.formatter, Formatter);

var OrderColumns = {
	statusStyler: function (value, row) {
		var color;
		if (value == "CR")
			color = Color.Warning;
		else if (value == "ST")
			color = Color.Error;
		else if (value == "RE")
			color = Color.Info;
		if (color)
			return "background-color: " + color;
	}
};

var ListOptions = {
};
//}}}

// ====== functions {{{
function showDlgLogin()
{
		var jdlg = $("#dlgLogin");
		WUI.showDlg(jdlg, {
			url: WUI.makeUrl("login"),
			noCancel: true,
			okLabel: '登录',

			onOk: function (data) {
				WUI.closeDlg(jdlg);
				handleLogin(data);
			}
		});
}

function handleLogin(data)
{
	WUI.handleLogin(data);
}

function initPageHome()
{
	var jpage = $(this);

	var jtbl = jpage.find("#tblAdmin");
	jtbl.datagrid({
		data: [g_data.userInfo]
	});

	// apply permission
	$(".perm-admin").show();
}

// }}}

// ====== main {{{
function main()
{
	setAppTitle(APP_TITLE);

	WUI.tryAutoLogin(handleLogin);
}

$(main);

//}}}
