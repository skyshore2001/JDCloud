function initPageCinf() 
{
	var jpage = $(this);
	var jtbl = jpage.find("#tblCinf");
	var jdlg = $("#dlgCinf");

/*
	// 定制工具栏增删改查按钮：r(refresh), f(find), a(add), s(set), d(del)
	jtbl.jdata().toolbar = "rfs";
	// 自定义按钮
	var btn1 = {text: "结算明细", iconCls:'icon-ok', handler: function () {
		var row = WUI.getRow(jtbl);
		if (row == null)
			return;
		var pageFilter = {cond: {closeLogId: row.id}};
		WUI.showPage("pageOrder", "结算明细-订单" + row.id, [ null, pageFilter ]);
	}};
*/

	jtbl.datagrid({
		url: WUI.makeUrl("Cinf.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "export"),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg),
		sortOrder: "desc",
		sortName: "id"
	});
}

var CinfFormatter = {
	name: function (value) {
		// NOTE: CinfList定义在app.js中
		var rv = CinfList.find(function (e) {
			return e.name == value
		});
		if (rv)
			return rv.text;
		return value;
	}
}
