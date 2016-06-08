function initPageOrder() 
{
	var jpage = $(this);
	var lastId_;

	jpage.on("pagebeforeshow", onPageBeforeShow);
	jpage.find("#mnuCancelOrder").click(mnuCancelOrder_click);
	jpage.find("#mnuRefreshOrder").click(showOrder);

	// ==== function {{{
	function showOrder()
	{
		var jlstLog = $(".p-list-log", jpage);
		jlstLog.empty();

		callSvr("Ordr.get", {id: PageOrder.id}, api_OrdrGet);

		function api_OrdrGet(data)
		{
			data.amountStr_ = parseFloat(data.amount) + "元";
			data.statusStr_ = StatusStr[data.status];
			setFormData(jpage, data);

			jpage.find("#divCmt").toggle(!!data.cmt);

			// order log
			$.each(data.orderLog, function (i, e) {
				var cell = {bd: ActionStr[e.action], ft: parseDate(e.tm).format("yyyy-mm-dd HH:MM")};
				var ji = createCell(cell);
				ji.appendTo(jlstLog);
			});

			jpage.find("#mnuCancelOrder").toggle(data.status != "CA");
		}
	}

	function mnuCancelOrder_click(ev)
	{
		var postParam = {status: "CA"};
		callSvr("Ordr.set", {id: PageOrder.id}, showOrder, postParam);
		PageOrders.refresh = true;
	}

	function onPageBeforeShow()
	{
		if (lastId_ == PageOrder.id)
			return;
		lastId_ = PageOrder.id;
		showOrder();
	}
	//}}}
}
