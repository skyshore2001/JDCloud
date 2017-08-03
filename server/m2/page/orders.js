function initPageOrders()
{
	var jpage = $(this);
	var jtplOrder = $(jpage.find("#tplOrder").html());

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
		itemData.statusStr_ = StatusStr[itemData.status];

		// Use html template. Recommend lib [jquery-dataview](https://github.com/skyshore2001/jquery-dataview)
		var ji = jtplOrder.clone();
		MUI.setFormData(ji, itemData);

		/*
		var cell = {
			hd: "<i class='icon icon-dscr'></i>",
			bd: "<p><b>" + itemData.dscr + "</b></p><p>订单号: " + itemData.id + "</p>",
			ft: StatusStr[itemData.status]
		};
		var ji = createCell(cell);
		*/
		ji.appendTo(jlst);

		// ev.data = itemData
		ji.on("click", null, itemData, li_click);
	}

	function onNoItem(jlst)
	{
		var ji = createCell({bd: "没有订单"});
		ji.css("text-align", "center");
		ji.appendTo(jlst);
	}

	function li_click(ev)
	{
		var id = ev.data.id;
		PageOrder.id = id;
		MUI.showPage("#order");
		return false;
	}
}

