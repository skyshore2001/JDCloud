function initPagePlugin1Page1()
{
	var jpage = $(this);

	jpage.on("pagebeforeshow", onPageBeforeShow);

	function onPageBeforeShow()
	{
		callSvr("svrinfo", function (data) {
			setFormData(jpage, data);
		});
	}
}
