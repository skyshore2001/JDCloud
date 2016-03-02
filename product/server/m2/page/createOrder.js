function initPageCreateOrder() 
{
	var jpage = $(this);

	var jf = jpage.find("form:first");
	MUI.setFormSubmit(jf, api_OrdrAdd, {validate: form_validate});

	function form_validate(jf)
	{
		var f = jf[0];
		f.amount.value = $(f.dscr).find("option:selected").data("amount");
	}
	function api_OrdrAdd(data)
	{
		app_alert("订单创建成功!", "i", function () {
			// 到新页后，点返回不允许回到当前页
			MUI.popPageStack();
			PageOrders.refresh = true;
			MUI.showPage("#orders");
		}, g_cfg.WAIT);
	}

	jpage.on("pagebeforeshow", function () {
		jf[0].reset();
	});
}
