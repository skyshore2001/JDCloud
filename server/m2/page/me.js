function initPageMe()
{
	var jpage = $(this);

	jpage.on("pagebeforeshow", function () {
		jpage.find(".p-name").text(g_data.userInfo.name);
		jpage.find(".p-phone").text(g_data.userInfo.phone);
	});

	jpage.find("#btnLogout").click(logoutUser);
}
