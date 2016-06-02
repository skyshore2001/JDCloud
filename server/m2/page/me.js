function initPageMe()
{
	var jpage = $(this);

	jpage.on("pagebeforeshow", onPageBeforeShow);
	jpage.find("#btnLogout").click(logoutUser);

	function onPageBeforeShow()
	{
		jpage.find(".p-name").text(g_data.userInfo.name);
		jpage.find(".p-phone").text(g_data.userInfo.phone);
	}
}
