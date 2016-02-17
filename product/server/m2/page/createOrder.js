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
			PageHome.show(true);
		}, g_cfg.WAIT);
	}

	jpage.on("pagebeforeshow", function () {
		jf[0].reset();
	});
}
