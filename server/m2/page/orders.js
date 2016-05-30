function initPageOrders()
{
	var jpage = $(this);

	initNavbarAndList(jpage, {
		pageItf: PageOrders,
		onGetQueryParam: function (jlst, callParam) {
			callParam.ac = "Ordr.query";
			var param = callParam.queryParam;
			param.orderby = "id desc";
			param.cond = jlst.attr("data-cond");
		},
		onAddItem: onAddItem,
		onNoItem: onNoItem,
	});

	function onAddItem(jlst, itemData)
	{
		var cell = {
			bd: "<p><b>" + itemData.dscr + "</b></p><p>订单号: " + itemData.id + "</p>",
			ft: StatusStr[itemData.status]
		};
		var ji = createCell(cell);
		ji.appendTo(jlst);

		// ev.data = itemData.id
		ji.on("click", null, itemData.id, li_click);
	}

	function onNoItem(jlst)
	{
		var ji = createCell({bd: "没有订单"});
		ji.css("text-align", "center");
		ji.appendTo(jlst);
	}

	function li_click(ev)
	{
		var id = ev.data;
		PageOrder.id = id;
		MUI.showPage("#order");
		return false;
	}
}

/*
// 如果不调用 initNavbarAndList, 则需要自行调用 initPullList，管理分页和按需刷新等复杂逻辑。示例代码如下：

function initPageOrders()
{
	var jpage = $(this);

	var opt = {
		maxMargin: 50,
		onLoadItem: showOrderList,
		//onHint: $.noop
	};
	var jcont = jpage.find(">.bd");
	initPullList(jcont[0], opt);

	function showOrderList(isRefresh, skipIfLoaded)
	{
		// nextkey=null: 新开始或刷新
		// nextkey=-1: 列表完成
		if (PageOrders.refresh) {
			jpage.find(".p-list").data("nextkey", null);
			PageOrders.refresh = false;
		}
		var jlst = jpage.find(".p-list.active");
		var nextkey = jlst.data("nextkey");
		if (isRefresh || nextkey == null) {
			nextkey = null;
			jlst.empty();
		}
		else if (nextkey === -1)
			return;
		if (skipIfLoaded && nextkey != null)
			return;
		var param = {orderby: "id desc"};
		param._pagesz = g_cfg.PAGE_SZ; // for test, default 20.
		if (nextkey) {
			param._pagekey = nextkey;
		}
		param.cond = jlst.attr("data-cond");
		callSvr("Ordr.query", param, api_OrdrQuery);

		function api_OrdrQuery(data)
		{
			$.each(rs2Array(data), function (i, e) {
				var cell = {
					bd: "<p><b>" + e.dscr + "</b></p><p>订单号: " + e.id + "</p>",
					ft: StatusStr[e.status]
				};
				var ji = createCell(cell);
				ji.appendTo(jlst);

				// ev.data = e.id
				ji.on("click", null, e.id, li_click);
			});
			if (data.nextkey)
				jlst.data("nextkey", data.nextkey);
			else
				jlst.data("nextkey", -1);
		}

		function li_click(ev)
		{
			var id = ev.data;
			PageOrder.id = id;
			MUI.showPage("#order");
			return false;
		}
	}

	jpage.on("pagebeforeshow", function () {
		if (PageOrders.refresh) {
			showOrderList();
		}
	});
	showOrderList();

	jpage.find(".hd .mui-navbar a").click(function (ev) {
		// 让系统先选中tab页再操作
		setTimeout(function () {
			showOrderList(false, true);
		});
	});
}
*/

