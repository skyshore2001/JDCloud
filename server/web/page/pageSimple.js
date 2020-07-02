/*
用于快捷展示报表。示例：在订单列表上添加“月报表”按钮，点击显示订单月统计报表，并可以导出到Excel。

	// function initPageCusOrder()
	var btnStat1 = {text: "月报表", "wui-perm": "导出", iconCls:'icon-ok', handler: function () {
		var queryParams = jtbl.datagrid("options").queryParams;
		var url = WUI.makeUrl("Ordr.query", {
			gres:"y 年,m 月, userId",
			res:"userName 客户, COUNT(*) 订单数, SUM(amount) 总金额",
			hiddenFields: "userId",
			orderby: "总金额 DESC"
		});
		WUI.showPage("pageSimple", "订单月报表!", [url, queryParams]);
	}};
	jtbl.datagrid({
		toolbar: WUI.dg_toolbar(jtbl, jdlg, ..., btnStat1),
		...
	});

*/
function initPageSimple(url, queryParams)
{
	var jpage = $(this);
	var jtbl = jpage.find("table:first");

	WUI.assert(url.makeUrl, "url须由makeUrl生成");
	jtbl.jdata().toolbar = "r";
	// 这里未直接用"export"而是重新定义，是为了禁止WUI.getExportHandler自动生成res参数。
	var btnExport = {text:'导出', iconCls:'icon-save', handler: WUI.getExportHandler(jtbl, null, {res: url.params.res || null}) };

	var url1 = WUI.makeUrl(url, queryParams);
	callSvr(url1, function (data) {
		var columns = $.map(data.h, function (e) {
			return {field: e, title: e};
		});
		jtbl.datagrid({
			columns: [ columns ],
			data: data,
			toolbar: WUI.dg_toolbar(jtbl, null, btnExport)
		});
		var opt = jtbl.datagrid("options");
		opt.url = url;
		opt.queryParams = queryParams;
	});
}
