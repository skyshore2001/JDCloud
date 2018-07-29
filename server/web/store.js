// ====== global {{{
var APP_TITLE = "商户管理端";
var APP_NAME = "emp-adm";

$.extend(WUI.options, {
	appName: APP_NAME,
	title: APP_TITLE,
	onShowLogin: showDlgLogin
});

var g_data = {}; // {userInfo={id, storeId, perms,...}, hasPerm(perm)}
//}}}

// ====== functions {{{

// ==== data-options {{{
var ListOptions = {
	// ListOptions.Emp()
	Emp: function () {
		var opts = {
			valueField: "id",
			textField: "name",
			url: WUI.makeUrl('Employee.query', {
				res: 'id,name,uname',
				cond: 'storeId=' + g_data.userInfo.storeId,
				pagesz: -1
			}),
			formatter: function (row) { return row.name + '(' + row.uname + ')'; }
		};
		return opts;
	},

	// ListOptions.Store()
	Store: function () {
		var opts = {
			valueField: "id",
			textField: "name",
			url: WUI.makeUrl('Store.query', {
				res: 'id,name',
				pagesz: -1
			}),
			formatter: function (row) { return row.id + "-" + row.name; }
		};
		return opts;
	}
};

var Formatter = {
	orderStatus: WUI.formatter.enum(OrderStatusMap),
	userId: WUI.formatter.linkTo("userId", "#dlgUser"),
	empId: WUI.formatter.linkTo("empId", "#dlgEmployee"),
	orderId: WUI.formatter.linkTo("orderId", "#dlgOrder")
};
Formatter = $.extend(WUI.formatter, Formatter);
//}}}

// ==== column settings {{{
// formatters and styler. Note: for one cell, styler executes prior to formatter
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
	},

	empName: function (value, row) {
		if (value == null)
			return;
		value = addTooltip(value, row.tooltip_);
		return makeLinkTo("#dlgEmployee", row.empId, value);
	},

	flagStyler: function (value, row) {
		if (value)
			return "background-color:" + Color.Info;
	}
};

// }}}

// ==== init page and dialog {{{
function handleLogin(data)
{
	WUI.handleLogin(data);
}

function initPageHome()
{
	var jpage = $(this);
	var jtbl = jpage.find("#tblMe");
	var jdlg = $("#dlgEmployee");

	jtbl.datagrid({
		url: WUI.makeUrl("Employee.query", {cond: "id=" + g_data.userInfo.id}),
		onLoadSuccess: function(data) {
			applyPermission(data.rows[0].perms);
		}
	});
}

/*
根据用户权限，如"item,mgr"等，菜单中有perm-xxx类的元素会显示，有nperm-xxx类的元素会隐藏

示例：只有mgr权限显示

	<div class="perm-mgr" style="display:none"></div>

示例：bx权限不显示（其它权限可显示）

	<a href="#pageItem" class="nperm-bx">商品管理</a>

可通过 g_data.hasPerm(perm) 查询是否有某项权限。
 */
function applyPermission(perms)
{
	// e.g. "item,mgr" - ".perm-item, .perm-mgr"
	if (perms == null)
		perms = "emp";
	var sel = perms.replace(/(\w+)/g, '.perm-$1');
	var arr = perms.split(/,/);
	if (sel) {
		$(sel).show();
		var sel2 = sel.replace(/perm/g, 'nperm');
		$(sel2).hide();
	}

	g_data.hasPerm = function (perm) {
		var found = false;
		$.each(arr, function (i, e) {
				if (e == perm) {
					found = true;
					return false;
				}
		});
		return found;
	}
}

// init functions }}}

// ==== show dialog {{{
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

function showDlgChpwd()
{
	var jdlg = $("#dlgChpwd");
	WUI.showDlg(jdlg, {
		url: WUI.makeUrl("chpwd"),

		onOk: function (data) {
			WUI.closeDlg(jdlg);
			app_show('密码修改成功!');
		}
	});
}

function showDlgSendSms()
{
	var jdlg = $("#dlgSendSms");
	WUI.showDlg(jdlg, {
		url: WUI.makeUrl("sendSms"),
		reset: false,
		onOk: function (data) {
			WUI.closeDlg(jdlg);
			app_show('操作成功!');
		}
	});
}
// show dialog }}}

//}}}

// ====== main {{{
function main()
{
	setAppTitle(APP_TITLE);

	//WUI.initClient();
	WUI.tryAutoLogin(handleLogin, "Employee.get");
}

$(main);
//}}}

// vi: foldmethod=marker
