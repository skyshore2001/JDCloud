function initPageOrders()
{
	var jpage = $(this);

	var lstIf = MUI.initPageList(jpage, {
		pageItf: PageOrders,
		navRef: ">.hd .mui-navbar",
		listRef: ">.bd .p-list",
		onGetQueryParam: function (jlst, queryParam) {
			queryParam.ac = "Ordr.query";
			queryParam.orderby = "id desc";
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

