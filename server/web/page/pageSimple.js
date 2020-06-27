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
