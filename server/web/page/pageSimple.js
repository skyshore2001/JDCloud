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
			orderby: "总金额 DESC",
			pagesz: -1
		});
		WUI.showPage("pageSimple", "订单月报表!", [url, queryParams]);
	}};
	jtbl.datagrid({
		toolbar: WUI.dg_toolbar(jtbl, jdlg, ..., btnStat1),
		...
	});

注意：调用WUI.showPage时，标题以"!"结尾表示每次调用都刷新该页面。而默认行为是如果页面已打开，就直接显示而不会刷新。

注意：用`pagesz:-1`表示不分页，加载所有数据(实际上受限于后端，默认1000条)。

如果要支持分页，必须指定页码参数：`page:1`，如：

	var url = WUI.makeUrl("Sn.query", {
		res: 'id 工件编号, code 序列号, code2 设备号, actualTm 工单开工, actualTm1 工单完工, itemName 产品名称, cateName 产品型号, ec 相关工程变更', 
		page: 1
	});
	WUI.showPage("pageSimple", "工件列表!", [url]);

url中接口调用返回的数据支持query接口常用的hd/list/array格式。

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

允许定制查询条件对话框，如添加查询字段，详见dlgReportCond对话框文档。

@see dlgReportCond

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

			// var btn = { text: "XX", iconCts: "icon-search", handler: ... };
			// 替换工具栏按钮
			// dgOpt.toolbar = WUI.dg_toolbar(jtbl, null, btn1);
			// 或是：追加工具栏按钮
			// dgOpt.toolbar.push.apply(dgOpt.toolbar, WUI.dg_toolbar(jtbl, null, btn1));
			// 不要工具栏
			// dgOpt.toolbar = null;
		}

		function formatter_数量(value, row) {
			if (!value)
				return;
			return WUI.makeLink(value, function () {
				var orderId = row.工单号;
				var pageFilter = {cond: {orderId: orderId }};
				WUI.showPage("pageSn", {title: "工件-工单" + orderId, pageFilter: pageFilter});
			});
		}
	}

## 辅助列

以下划线结尾的列不显示，也不导出。

示例：显示工艺并可点击打开工艺对话框。

	var url = WUI.makeUrl("Ordr.query", { res: 'id 工单号, flowId flowId_, flowName 工艺' });
	WUI.showPage("pageSimple", "工单工时统计!", [url, null, onInitGrid]);

	function onInitGrid(jpage, jtbl, dgOpt, columns, data)
	{
		$.each(columns, function (i, col) {
			if (col.field == "工艺")
				col.formatter = Formatter.linkTo("flowId_", "#dlgFlow");
		});
	}

上面flowId字段只用于链接，不显示，也不会导出。

## 显示统计图

在显示表格同时可以显示统计图。它与表格共用数据源。

	// 也可以与pageSimple列表页结合，同时显示列表页和统计图：
	var url = WUI.makeUrl("Ordr.query", {
		gres: "y 年,m 月",
		res: "count(*) 总数",
		orderby: "y,m"
	});
	var showChartParam = [ {tmUnit: "y,m"} ];
	WUI.showPage("pageSimple", "订单统计!", [url, null, null, showChartParam]);

其中showChartParam必须指定为一个数组，即WUI.showDlgChart函数的后三个参数：[rs2StatOpt, seriesOpt, chartOpt]

@see showDlgChart 显示统计图

## 冻结列/固定列

如果列很多，会显示滚动条。
通过在queryParams中设置frozon，可指定前几列可以设置为冻结列，不跟随滚动条。

示例：

	WUI.showPage("pageSimple", "订单月报表!", [WUI.makeUrl("Ordr.query"), {frozen: 1}]);

类似地，若要冻结前2列，则指定`{frozen: 2}`。
*/
function initPageSimple(url, queryParams, onInitGrid, showChartParam)
{
	var jpage = $(this);
	var jtbl = jpage.find("table:first");

	WUI.assert(url.makeUrl, "url须由makeUrl生成");
	jtbl.jdata().toolbar = "r";
	// 这里未直接用"export"而是重新定义，是为了禁止WUI.getExportHandler自动生成res参数。
	var handler = WUI.getExportHandler(jtbl, null, {res: filterRes(url.params.res)});
	var btnExport = {text:'导出', class: 'splitbutton', iconCls:'icon-save', handler: handler, menu: WUI.createExportMenu(handler) };

	var url1 = WUI.makeUrl(url, queryParams);
	var columns = null;
	var jdlg = null;
	var dfd = callSvr(url1, function (data) {
		var h = data.h;
		if (h == null) {
			h = [];
			var arr = data.list || data;
			if ($.isArray(arr) && $.isPlainObject(arr[0])) {
				h = Object.keys(arr[0]);
			}
		}
		columns = $.map(h, function (e) {
			if (e.substr(-1) == "_")
				return;
			return {field: e, title: e};
		});
		var pagesz = url.params && url.params.pagesz;
		var dgOpt = {
			columns: [ columns ],
			data: data,
			pagination: pagesz !== -1,
			toolbar: WUI.dg_toolbar(jtbl, null, btnExport),
			onDblClickRow: onDblClickRow,
			quickAutoSize: true // WUI对easyui-datagrid的扩展属性，用于大量列时提升性能. 参考: jquery.easyui.min.js
		};
		if (pagesz && pagesz !== -1) {
			dgOpt.pageSize = pagesz;
			dgOpt.pageList = [pagesz];
		}
		onInitGrid && onInitGrid(jpage, jtbl, dgOpt, columns, data);
		if (queryParams && queryParams.frozen) { // 冻结列
			var cnt = queryParams.frozen;
			dgOpt.frozenColumns = [columns.slice(0, cnt)];
			dgOpt.columns = [columns.slice(cnt)];
			dgOpt.quickAutoSize = false; // TODO: 暂不支持性能优化，数据很多（比如几百行，且列很多）时会慢
			delete queryParams.frozen;
		}
		jtbl.datagrid(dgOpt);
		var opt = jtbl.datagrid("options");
		opt.url = url;
		delete opt.data;
		opt.queryParams = queryParams;
	});
	if ($.isArray(showChartParam)) {
		showChartParam.unshift(dfd);
		WUI.showDlgChart.apply(this, showChartParam);
	}

	function filterRes(res) {
		if (!res)
			return null;
		var arr = $.map(res.split(/\s*,\s*/), function (e) {
			return e.substr(-1) != "_"? e: null;
		});
		return arr.join(',');
	}

	function onDblClickRow(idx, data) {
		if (jdlg == null) {
			var itemArr = $.map(columns, function (e) {
				// title, dom, hint?
				var dom;
				if (e.field == 'id') {
					dom = "<input name='" + e.field + "' readonly>";
				}
				else {
					dom = "<textarea name='" + e.field + "' style='height: 30px' readonly></textarea>";
				}
				return {title: e.title, dom: dom};
			});
			var dialogTitle = WUI.getPageOpt(jpage).title;
			jdlg = WUI.showDlgByMeta(itemArr, {
				title: dialogTitle,
				modal: false,
				onOk: 'close',
				data: data
			});
		}
		else {
			WUI.showDlg(jdlg, {
				data: data
			});
		}
	}
}
