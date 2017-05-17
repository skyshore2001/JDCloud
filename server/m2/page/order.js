function initPageOrder() 
{
	var jpage = $(this);
	var orderId_;

	jpage.on("pagebeforeshow", onPageBeforeShow);
	jpage.find("#mnuCancelOrder").click(mnuCancelOrder_click);
	jpage.find("#mnuRefreshOrder").click(showOrder);

	// 设置下拉刷新
	var pullListOpt = {
		onLoadItem: function (isRefresh) {
			if (isRefresh)
				showOrder();
		}
	};
	MUI.initPullList(jpage.find(".bd")[0], pullListOpt);

	// ==== function {{{
	function showOrder()
	{
		var jlstLog = $(".p-list-log", jpage);
		jlstLog.empty();

		callSvr("Ordr.get", {id: orderId_}, api_OrdrGet);

		function api_OrdrGet(data)
		{
			data.amountStr_ = parseFloat(data.amount) + "元";
			data.statusStr_ = StatusStr[data.status];
			MUI.setFormData(jpage, data);

			jpage.find("#divCmt").toggle(!!data.cmt);

			// order log
			$.each(data.orderLog, function (i, e) {
				var cell = {
					hd: '<i class="icon icon-dscr"></i>',
					bd: ActionStr[e.action],
					ft: MUI.parseDate(e.tm).format("yyyy-mm-dd HH:MM")
				};
				var ji = createCell(cell);
				ji.appendTo(jlstLog);
			});

			jpage.find("#mnuCancelOrder").toggle(data.status != "CA");
		}
	}

	function mnuCancelOrder_click(ev)
	{
		app_alert("取消订单?", "q", function() {
			var postParam = {status: "CA"};
			callSvr("Ordr.set", {id: orderId_}, showOrder, postParam);
			PageOrders.refresh = true;
		});
	}

	function onPageBeforeShow()
	{
		if (g_args.orderId) {
			orderId_ = g_args.orderId;
			delete g_args.orderId;
		}
		else if (PageOrder.id && orderId_ != PageOrder.id) {
			orderId_ = PageOrder.id;
		}
		else {
			if (orderId_ == null)
				MUI.showHome();
			return;
		}

		MUI.setUrl("?orderId=" + orderId_);
		showOrder();
	}
	//}}}
}
