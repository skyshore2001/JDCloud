// param: {jtblSrc}, formFilter: {cond: {obj, objId}}
function initPageObjLog(param, formFilter)
{
	var jpage = $(this);
	var jtbl = jpage.find("#tblObjLog");
	var jdlg = $("#dlgObjLog");

	// 定制工具栏增删改查按钮：r(refresh), f(find), a(add), s(set), d(del)
	jtbl.jdata().toolbar = "rf";
/*
	// 自定义按钮
	var btn1 = {text: "结算明细", iconCls:'icon-ok', handler: function () {
		var row = WUI.getRow(jtbl);
		if (row == null)
			return;
		var objParam = {closeLogId: row.id};
		WUI.showPage("pageOrder", "结算明细-" + row.id, [ objParam ]);
	}};
*/
	if (param && param.jtblSrc && formFilter && formFilter.cond && formFilter.cond.obj) {
		var map = {};
		map[formFilter.cond.obj] = getFieldMap(param.jtblSrc);
		$.extend(true, ObjLogFieldMap, map);
		console.log('fieldMap', map);
	}

	jtbl.datagrid({
		url: WUI.makeUrl("ObjLog.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "export"),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg),
		sortOrder: "desc",
		sortName: "id"
	});

	function getFieldMap(jtbl)
	{
		var map = {};
		var datagrid = WUI.isTreegrid(jtbl)? "treegrid": "datagrid";
		var opt = jtbl[datagrid]("options");
		$.each([opt.frozenColumns[0], opt.columns[0]], function (idx0, cols) {
			if (cols == null)
				return;
			$.each(cols, function (i, e) {
				if (! e.field || e.field.substr(-1) == "_")
					return;
				map[e.field] = {
					title: e.title,
					jdEnumMap: e.jdEnumMap
				};
			});
		});
		return map;
	}
}

var ObjLogObjMap = {
	Employee: "员工",
	Ordr: "订单"
};

// {field => title} OR {obj => {field => {title, jdEnumMap}}}
var ObjLogFieldMap = {
	name: "名称",
	code: "编码",
	status: "状态",
	type: "类别",
	orderId: "关联订单",
	empId: "员工"
};

var ObjLogFormatter = {
	obj: function (value, row) {
		if (value && ObjLogObjMap[value])
			return ObjLogObjMap[value];
		return value;
	},
	req: function (value, row) {
		if (!value)
			return;

		// "ac=Ordr1.set, id=1217, _app=emp-adm; batchNo=130100000201" => "批次号=130100000201"
		if (row.ac && row.ac.indexOf(row.obj) != 0) // startsWith
			return "自动关联操作";

		value = value.replace(/^.*?;\s*/, '');
		var map0 = ObjLogFieldMap;
		var map = ObjLogFieldMap[row.obj]; 
		return value.replace(/(\w+)=([^, ;]*)/g, function (m, m1, m2) {
			if (m1 == "_app")
				return "";
			if (!map || !map[m1]) {
				if (map0[m1])
					return map0[m1] + "=" + m2;
				return m;
			}
			var o = map[m1];
			var v = o.jdEnumMap? (o.jdEnumMap[m2] ||m2) : m2;
			return o.title + "=" + v;
		});
	},

	empName: function (value, row) {
		if (!value)
			return row.userId < 0? "系统": row.userId;
		return row.userId + "-" + value;
	}
}
