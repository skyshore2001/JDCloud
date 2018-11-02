function initPage<?=$obj?>() 
{
	var jpage = $(this);
	var objId_ = 1;

	jpage.on("pagebeforeshow", onPageBeforeShow);

	// 设置下拉刷新
	var pullListOpt = {
		onLoadItem: function (isRefresh) {
			if (isRefresh)
				show<?=$obj?>();
		}
	};
	MUI.initPullList(jpage.find(".bd")[0], pullListOpt);

	function show<?=$obj?>()
	{
		callSvr("<?=$baseObj?>.get", {id: objId_}, api_<?=$baseObj?>Get);

		function api_<?=$baseObj?>Get(data)
		{
			MUI.formatField(data);
			// TODO: set fields
			// data.statusStr_ = StatusStr[data.status];

			// Use html template. Recommend lib [jquery-dataview](https://github.com/skyshore2001/jquery-dataview)
			MUI.setFormData(jpage, data);
		}
	}

	function onPageBeforeShow()
	{
/* example: handle g_args
		if (g_args.<?=$file?>Id) {
			objId_ = g_args.<?=$file?>Id;
			delete g_args.<?=$file?>Id;
		}
		else if (Page<?=$obj?>.id && objId_ != Page<?=$obj?>.id) {
			objId_ = Page<?=$obj?>.id;
		}
		else {
			if (objId_ == null)
				MUI.showHome();
			return;
		}
		MUI.setUrl("?<?=$file?>Id=" + objId_);
*/
		show<?=$obj?>();
	}

/* example: menu item
	jpage.find("#mnuRefreshOrder").click(show<?=$obj?>);

	function mnuCancelOrder_click(ev)
	{
		app_alert("取消订单?", "q", function() {
			var postParam = {status: "CA"};
			callSvr("Ordr.set", {id: objId_}, showOrder, postParam);
			PageOrders.refresh = true;
		});
	}
*/
}
/* example: page interface (move to index.js)
var Page<?=$obj?> = {
	id_: null,
	show: function (id) {
		this.id_ = id;
		MUI.showPage("<?=$file?>");
	}
};
*/
