function initPageMe()
{
	var jpage = $(this);

	jpage.on("pagebeforeshow", onPageBeforeShow);
	jpage.find("#btnLogout").click(logoutUser);

	function onPageBeforeShow()
	{
		setFormData(jpage, g_data.userInfo);
	}
}
