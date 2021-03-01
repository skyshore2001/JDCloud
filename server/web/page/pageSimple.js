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

常常与报表条件对话框DlgReportCond一起使用, 示例:

	var btnStat1 = {text: "月统计", iconCls:'icon-ok', handler: function () {
		DlgReportCond.show(function (data) {
			var queryParams = WUI.getQueryParam({dt: [data.tm1, data.tm2]});
			var url = WUI.makeUrl("Capacity.query", { gres: 'y 年,m 月, name 员工', res: 'SUM(mh) 总工时, SUM(mhA) 总加班', pagesz: -1 });
			WUI.showPage("pageSimple", "出勤月统计!", [url, queryParams]);
		});
	}};
	jtbl.datagrid({
		toolbar: WUI.dg_toolbar(jtbl, jdlg, ..., btnStat1),
		...
	});

允许定制表格显示参数，如

	WUI.showPage("pageSimple", "订单月报表!", [url, queryParams, onInitGrid]);

	function onInitGrid(jpage, jtbl, dgOpt, columns, data)
	{
		// dgOpt: datagrid的选项，如设置 dgOpt.onClickCell等属性
		// columns: 列数组，可设置列的formatter等属性
		// data: ajax得到的原始数据
	}

注意：关于分页：如果url中有pagesz=-1参数，则不分页。也可直接设置dgOpt.pagination指定。
*/
function initPageSimple(url, queryParams, onInitGrid)
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
		var pagesz = url.params && url.params.pagesz;
		var dgOpt = {
			columns: [ columns ],
			data: data,
			pagination: pagesz !== -1,
			toolbar: WUI.dg_toolbar(jtbl, null, btnExport)
		};
		onInitGrid && onInitGrid(jpage, jtbl, dgOpt, columns, data);
		jtbl.datagrid(dgOpt);
		var opt = jtbl.datagrid("options");
		opt.url = url;
		opt.queryParams = queryParams;
	});
}
