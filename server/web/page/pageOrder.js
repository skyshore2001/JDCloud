function initPageOrder() 
{
	var jpage = $(this);
	var jtbl = jpage.find("#tblOrder");
	var jdlg = $("#dlgOrder");

//	jtbl.jdata().toolbar = "rfs";

	// 当天订单
	var query1 = {cond: "createTm between '" + new Date().format("D") + "' and '" + new Date().addDay(1).format("D") + "'"};
	function getTodayOrders()
	{
		WUI.reload(jtbl, null, query1);
	}
	var btn1 = {text: "今天订单", iconCls:'icon-search', handler: getTodayOrders};

	var dgOpt = {
		url: WUI.makeUrl("Ordr.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg, btn1, "export", "report", "qsearch"),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg),
		sortName: "id",
		sortOrder: "desc"
	};
	jtbl.datagrid(dgOpt);
}

