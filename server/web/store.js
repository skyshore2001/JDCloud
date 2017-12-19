// ====== global {{{
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
				cond: 'storeId=' + g_data.userInfo.storeId
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
				res: 'id,name'
			}),
			formatter: function (row) { return row.id + "-" + row.name; }
		};
		return opts;
	}
};

var Formatter = {
	number: function (value)
	{
		return parseFloat(value);
	},
	pics: function (value) {
		if (value == null)
			return "(无图)";
		return value.replace(/(\d+),?/g, function (ms, picId) {
			var url = WUI.makeUrl("att", {thumbId: picId});
			return "<a target='_black' href='" + url + "'>" + picId + "</a>&nbsp;";
		});
	},
	orderId: function (value) {
		if (value != null)
		{
			return makeLinkTo("#dlgOrder", value, value);
		}
	},
	// 必须有row.empId
	empName: function (value, row) {
		if (value == null)
			return "";
		return makeLinkTo("#dlgEmployee", row.empId, value);
	},
	// 必须有row.storeId
	storeName: function (value, row) {
		if (value == null)
			return "";
		return makeLinkTo("#dlgStore", row.storeId, value);
	}
};
//}}}

// ==== column settings {{{
var EmpSigninColumns = {
	type: function (value, row) {
		if (value == 'CM')
			return "签到";
		return value;
	}
};

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
			return "";

		value = addTooltip(value, row.__tooltip);
		return makeLinkTo("#dlgEmployee", row.empId, value);
	},

	flagStyler: function (value, row) {
			if (value)
				return "background-color:" + Color.Info;
	}
};

function flagFormatter(flag)
{
	return function (value, row) {
		if (value) {
			return '是';
		}
		else {
			row[flag] = 0;
			return '否';
		}
	}
}

var OrderLogColumns = {
	actionStr: function (value, row) {
		return ActionStrs[value] || value;
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

function applyPermission(perms)
{
	// e.g. "item,mgr" - ".perm-item, .perm-mgr"
	if (perms == null)
		perms = "emp";
	var sel = perms.replace(/(\w+)/g, '.perm-$1');
	var arr = perms.split(/,/);
	if (sel) {
		$(sel).show();
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

function initDlgEmployee()
{
	var jdlg = $(this);
	var jfrm = jdlg.find("form");
	jfrm.on("loaddata", function (ev, data) {
		hiddenToCheckbox(jfrm.find("#divPerms"));
	})
	.on("savedata", function (ev) {
		checkboxToHidden(jfrm.find("#divPerms"));
	});
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
var APP_TITLE = "商户管理端";
var APP_NAME = "emp-adm";

function main()
{
	WUI.setApp({
		appName: APP_NAME,
		title: APP_TITLE,
		onShowLogin: showDlgLogin
	});
	setAppTitle(APP_TITLE);

	//WUI.initClient();
	WUI.tryAutoLogin(handleLogin, "Employee.get");
}

$(main);
//}}}

// vi: foldmethod=marker
