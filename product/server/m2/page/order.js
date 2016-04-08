function initPageOrder() 
{
	var jpage = $(this);
	var lastId_;

	// ==== function {{{
	function showOrder()
	{
		var jlst = $(".p-list", jpage);
		jlst.empty();
		var jlstLog = $(".p-list-log", jpage);
		jlstLog.empty();

		callSvr("Ordr.get", {id: PageOrder.id}, api_OrdrGet);

		function api_OrdrGet(data)
		{
			var arr = [
				{bd: "<h3>" + data.dscr + "</h3>"},
				{bd: "订单号", ft: data.id},
				{bd: "状态", ft: StatusStr[data.status]},
				{bd: "金额", ft: data.amount + "元"}
			];
			if (data.cmt) {
				arr.push({bd: "备注", ft: data.cmt});
			}

			$.each(arr, function (i, e) {
				var ji = createCell(e);
				ji.appendTo(jlst);
			});

			// order log
			$.each(data.orderLog, function (i, e) {
				var cell = {bd: ActionStr[e.action], ft: parseDate(e.tm).format("yyyy-mm-dd HH:MM")};
				var ji = createCell(cell);
				ji.appendTo(jlstLog);
			});

			jpage.find("#btnCancelOrder").toggle(data.status != "CA");
		}
	}

	function cancelOrder()
	{
		var postParam = {status: "CA"};
		callSvr("Ordr.set", {id: PageOrder.id}, showOrder, postParam);
		PageHome.refresh = true;
		PageOrders.refresh = true;
	}

	function pageBeforeShow()
	{
		if (lastId_ == PageOrder.id)
			return;
		lastId_ = PageOrder.id;
		showOrder();
	}
	//}}}
	
	jpage.on("pagebeforeshow", pageBeforeShow);
	jpage.find("#btnCancelOrder").click(cancelOrder);
}
