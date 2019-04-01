function initPageUDT(name)
{
	var jpage = $(this);
	var jtbl = jpage.find("#tblUDT");
	var jdlg = $("#dlgUDT__" + name);

/*
	// 定制工具栏增删改查按钮：r(refresh), f(find), a(add), s(set), d(del)
	jtbl.jdata().toolbar = "rfs";
	// 自定义按钮
	var btn1 = {text: "结算明细", iconCls:'icon-ok', handler: function () {
		var row = WUI.getRow(jtbl);
		if (row == null)
			return;
		WUI.showPage("pageOrder", "结算明细-" + row.id + "-" + row.startDt, [ {cond: "closeLogId="+row.id} ]);
	}};
*/
	UDTGet(name, initPage);
	function initPage(udt) {
		var jtbl = jpage.find("table");
		var columns = [];

		$.each(udt.fields, function () {
			addField(jtbl, this);
		});

		jdlg.objParam = {name: udt.name, title: udt.title};
		jtbl.datagrid({
			url: WUI.makeUrl("U_" + udt.name + ".query"),
			toolbar: WUI.dg_toolbar(jtbl, jdlg, "export"),
			onDblClickRow: WUI.dg_dblclick(jtbl, jdlg),
			sortOrder: "desc",
			sortName: "id",
			columns: [ columns ]
		});

		function addField(jtbl, field) {
			var col = {
				field: field.name,
				title: field.title,
				sortable: true
			};
			if (field.type == "i" || field.type == "id") {
				col.sorter = intSort;
			}
			else if (field.type == "n") {
				col.sorter = numberSort;
			}
			// TODO: formatter
			columns.push(col);
		}
	}
}

var g_udts = {};
function UDTGet(name, fn)
{
	var data = g_udts[name];
	if (data) {
		fn(data);
		return;
	}

	var defFields = [
		{name: "id", title: "编号", type: "id"},
		{name: "tm", title: "创建时间", type: "tm"},
		{name: "updateTm", title: "更新时间", type: "tm"}
	];
	callSvr("UDT.get", {name: name}, api_UDTGet);
	function api_UDTGet(data) {
		data.fields.unshift.apply(data.fields, defFields);
		console.log(data);
		g_udts[name] = data;
		fn(data);
	}
}

