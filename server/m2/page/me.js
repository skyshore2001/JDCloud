function initPageMe()
{
	var jpage = $(this);

	jpage.on("pagebeforeshow", onPageBeforeShow);
	jpage.find("#btnLogout").click(logoutUser);

	function onPageBeforeShow()
	{
		applyNamedData(jpage, g_data.userInfo);
	}
}
