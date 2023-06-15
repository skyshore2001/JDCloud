/**
@module pageObjLog 操作日志

- 在表头右键菜单中可选择“操作日志”，支持对话框中的子表
- 表中如果有选择行（支持单行或多行, 按Ctrl或Shift点选可多选），则查所选择行的操作记录；如果没有选择行，则查该表全部操作记录（注：刷新一下或Ctrl-点选可以取消选择）。

表中显示的操作数据做了字段映射处理，即将内部字段尽量转换为表中的标题。
对于表名，以及表中未出现的字段，可在pageObjLog.js中统一定义映射：ObjLogObjMap和ObjLogFieldMap

 */
// param: {jtblSrc}, formFilter: {cond: {obj, objId}}
function initPageObjLog(param, formFilter)
{
	var jpage = $(this);
	var jtbl = jpage.find("#tblObjLog");
	var jdlg = $("#dlgObjLog");

	// 定制工具栏增删改查按钮：r(refresh), f(find), a(add), s(set), d(del)
	jtbl.jdata().toolbar = "rf";

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
		return value.replace(/([\w\u4e00-\u9fa5]+)=([^, ;]*)|"([\w\u4e00-\u9fa5]+)":"([^"]*)"/g, function (m, m1, m2, m3, m4) {
			if (m1 == "_app")
				return "";
			var k = m1 || m3;
			var v = m2 || m4;
			if (!map || !map[k]) {
				if (map0[k])
					return map0[k] + "=" + v;
				return k + "=" + v;
			}
			var o = map[k];
			var v = o.jdEnumMap? (o.jdEnumMap[v] ||v) : v;
			return o.title + "=" + v;
		});
	},

	empName: function (value, row) {
		if (!value)
			return row.userId < 0? "系统": row.userId;
		return row.userId + "-" + value;
	}
}
