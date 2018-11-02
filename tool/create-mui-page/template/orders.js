function initPage<?=$obj?>()
{
	var jpage = $(this);
	var jtpl<?=$obj?> = $(jpage.find("#tpl<?=$obj?>").html());

	var lstIf = MUI.initPageList(jpage, {
		// pageItf: Page<?=$obj?>,
		navRef: ">.hd .mui-navbar",
		listRef: ">.bd .p-list",
		onGetQueryParam: function (jlst, queryParam) {
			queryParam.ac = "<?=$baseObj?>.query";
			queryParam.orderby = "id desc";
		},
		onAddItem: onAddItem,
		onNoItem: onNoItem
	});

	function onAddItem(jlst, itemData)
	{
		// MUI.formatField(itemData);
		itemData.statusStr_ = StatusStr[itemData.status];

		// Use html template. Recommend lib [jquery-dataview](https://github.com/skyshore2001/jquery-dataview)
		var ji = jtpl<?=$obj?>.clone();
		MUI.setFormData(ji, itemData);
		ji.appendTo(jlst);

		// ev.data = itemData
		ji.on("click", null, itemData, li_click);
	}

	function onNoItem(jlst)
	{
		var ji = createCell({bd: "没有数据"}); // TODO
		ji.css("text-align", "center");
		ji.appendTo(jlst);
	}

	function li_click(ev)
	{
		var id = ev.data.id;
		// TODO: 显示详情页
		// Page<?=$baseObj?>.show(id);
		return false;
	}
}

