function initPageSimple(url, queryParams)
{
	var jpage = $(this);
	var jtbl = jpage.find("table:first");

	jtbl.jdata().toolbar = "r";

	var url1 = WUI.makeUrl(url, queryParams);
	callSvr(url1, function (data) {
		var columns = $.map(data.h, function (e) {
			return {field: e, title: e};
		});
		jtbl.datagrid({
			columns: [ columns ],
			data: data,
			toolbar: WUI.dg_toolbar(jtbl, null, "export")
		});
		var opt = jtbl.datagrid("options");
		opt.url = url;
		opt.queryParams = queryParams;
	});
}
