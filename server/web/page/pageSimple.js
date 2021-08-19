/**
@module pageSimple

用于快捷展示报表。

## 示例1：列表页上加查看报表按钮

在订单列表上添加“月报表”按钮，点击显示订单月统计报表，并可以导出到Excel。

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

注意：调用WUI.showPage时，标题以"!"结尾表示每次调用都刷新该页面。而默认行为是如果页面已打开，就直接显示而不会刷新。

## 示例2：先弹出查询条件对话框，设置后再显示报表

常常与报表查询条件对话DlgReportCond一起使用, 先设置查询时间段，然后出报表，示例:

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

回调函数参数data是对话框中设置了name的输入字段，默认有tm1, tm2。

TODO: 允许定制查询条件对话框，如添加查询字段，可参考dlgImport.js设计，添加forXXX类。

## 示例3：菜单上增加报表，且定制报表列实现交互

允许定制表格显示参数，如

	WUI.showPage("pageSimple", "订单月报表!", [url, queryParams, onInitGrid]);

	function onInitGrid(jpage, jtbl, dgOpt, columns, data)
	{
		// dgOpt: datagrid的选项，如设置 dgOpt.onClickCell等属性
		// columns: 列数组，可设置列的formatter等属性
		// data: ajax得到的原始数据
	}

注意：关于分页：如果url中有pagesz=-1参数，则不分页。也可直接设置dgOpt.pagination指定。

示例：菜单上增加“工单工时统计”报表，在“数量”列上可以点击，点击后在新页面中显示该工单下的所有工件明细。

菜单上增加一项：

				<a href="javascript:WUI.loadScript('page/mod_工单工时统计.js')">工单工时统计</a>

用WUI.loadScript可以动态加载JS文件，web和page目录下的JS文件默认都是禁止缓存的，因此修改文件后再点菜单可立即生效无须刷新。
在文件`page/mod_工单工时统计.js`中写报表逻辑，并对“数量”列进行定制：

	function show工单工时统计()
	{
		DlgReportCond.show(function (data) {
			var queryParams = WUI.getQueryParam({createTm: [data.tm1, data.tm2]});
			var url = WUI.makeUrl("Ordr.query", { res: 'id 工单号, createTm 生产日期, itemCode 产品编码, itemName 产品名称, cate2Name 产品系列, itemCate 产品型号, qty 数量, mh 理论工时, mh1 实际工时', pagesz: -1 });
			WUI.showPage("pageSimple", "工单工时统计!", [url, queryParams, onInitGrid]);
		});

		function onInitGrid(jpage, jtbl, dgOpt, columns, data)
		{
			// dgOpt: datagrid的选项，如设置 dgOpt.onClickCell等属性
			// columns: 列数组，可设置列的formatter等属性
			// data: ajax得到的原始数据
			$.each(columns, function (i, col) {
				if (col.field == "数量")
					col.formatter = formatter_数量;
			});
			// console.log(columns);
		}

		function formatter_数量(value, row) {
			if (!value)
				return;
			return WUI.makeLink(value, function () {
				var orderId = row.工单号;
				var objParam = {orderId: orderId };
				WUI.showPage("pageSn", "工件-工单" + orderId, [ objParam ]);
			});
		}
	}
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
