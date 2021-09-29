// ====== global {{{
var APP_TITLE = "商户管理端";
var APP_NAME = "emp-adm";

$.extend(WUI.options, {
	appName: APP_NAME,
	title: APP_TITLE,
	onShowLogin: showDlgLogin
});

var g_data = {}; // {userInfo={id, storeId, perms,...}, hasPerm(perm)}

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

var DlgReportCond = {
	// cb(data): 回调函数, meta: 动态字段(参考WUI.showByMeta), inst: 实例名
	show: function (cb, meta, inst) {
		var dlg = "#dlgReportCond";
		if (inst)
			dlg += "_inst_" + inst;
		WUI.showDlg(dlg, {modal:false, reset:false, onOk: cb, meta: meta});
	}
};
//}}}

// ====== functions {{{

// ==== data-options {{{
var ListOptions = {
	Employee: function () {
		var opts = {
			valueField: "id",
			url: WUI.makeUrl('Employee.query', {
				res: 'id,name',
				pagesz: -1
			}),
			formatter: function (row) { return row.id + '-' + row.name; }
		};
		return opts;
	},
	UserGrid: function () {
		var opts = {
			jd_vField: "userName",
			panelWidth: 450,
			width: '95%',
			textField: "name",
			columns: [[
				{field:'id',title:'编号',width:80},
				{field:'name',title:'名称',width:120},
				{field:'phone',title:'手机号',width:120}
			]],
			url: WUI.makeUrl('User.query', {
				res: 'id,name,phone',
			})
		};
		return opts;
	},
	Role: function () {
		var opts = {
			valueField: "name",
			textField: "name",
			url: WUI.makeUrl('Role.query', {
				res: 'name',
				pagesz: -1
			})
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
		data: [g_data.userInfo]
	});
	WUI.applyPermission();
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

	WUI.initClient();
	WUI.tryAutoLogin(handleLogin, "Employee.get");
}

$(main);
//}}}

// vi: foldmethod=marker
