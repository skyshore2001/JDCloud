function initPage<?=$obj?>()
{
	var jpage = $(this);
	var jtpl<?=$baseObj?> = $(jpage.find("#tpl<?=$baseObj?>").html());

	var lstIf = MUI.initPageList(jpage, {
		pageItf: Page<?=$obj?>,
		navRef: "",
		listRef: ">.bd .p-list",
		onGetQueryParam: function (jlst, queryParam) {
			queryParam.ac = "<?=$baseObj?>.query";
			queryParam.orderby = "id desc";
		},
		onAddItem: onAddItem
	});

	function onAddItem(jlst, itemData)
	{
		// MUI.formatField(itemData);
		// itemData.statusStr_ = StatusStr[itemData.status];

		var ji = jtpl<?=$baseObj?>.clone();
		MUI.setFormData(ji, itemData);
		ji.appendTo(jlst);

		// ev.data = itemData
		ji.on("click", null, itemData, li_click);
	}

	function li_click(ev)
	{
		var id = ev.data.id;
		// TODO: 显示详情页
		// Page<?=$baseObj?>.show(id);
		return false;
	}
}

// TODO: move page interface to the main js file
var Page<?=$obj?> = {
	refresh: null,
	// Page<?=$obj?>.show(refresh?)
	show: function (refresh) {
		if (refresh != null)
			this.refresh = refresh;
		MUI.showPage("#<?=lcfirst($obj)?>");
	}
};

