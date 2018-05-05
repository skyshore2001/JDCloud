function initPageOrder() 
{
	var jpage = $(this);
	var jtbl = jpage.find("#tblOrder");
	var jdlg = $("#dlgOrder");

	jtbl.jdata().toolbar = "rfs";

	// 当天订单
	var query1 = {cond: "createTm between '" + new Date().format("D") + "' and '" + new Date().addDay(1).format("D") + "'"};
	// 显示待服务/正在服务订单
	var query2 = {cond: "status='CR' OR status='PA' OR status='ST'"};

	function getTodoOrders()
	{
		WUI.reload(jtbl, null, query2);
	}
	function getTodayOrders()
	{
		WUI.reload(jtbl, null, query1);
	}
	var btn1 = {text: "今天订单", iconCls:'icon-search', handler: getTodayOrders};
	var btn2 = {text: "所有未完成", iconCls:'icon-search', handler: getTodoOrders};

	var dgOpt = {
		url: WUI.makeUrl("Ordr.query", {res:"*,createTm,userPhone,orderLog"}),
		queryParams: query2,
		toolbar: WUI.dg_toolbar(jtbl, jdlg, btn1, "-", btn2),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg),
		sortName: "id",
		sortOrder: "desc"
	};
	jtbl.datagrid(dgOpt);
}

