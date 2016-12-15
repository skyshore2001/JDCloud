function initPageSetUserInfo()
{
	var jpage = $(this);

	jpage.on("pagebeforeshow", onPageBeforeShow);

	var jf = jpage.find("form");
	MUI.setFormSubmit(jf, api_UserSet, {validate: onValidate});

	function onValidate()
	{
		var jpwd = jpage.find("#txtPwd");
		if (jpwd.is(":visible")) {
			var pwd = jpwd.val();
			if (pwd != "") {
				jpwd.val("");
				// 调用handleLogin保存token.
				callSvr("chpwd", {pwd: pwd, oldpwd: "_none"}, handleLogin);
			}
		}
	}

	function api_UserSet(data)
	{
		callSvr("User.get", function (data) {
			g_data.userInfo = data;
		});
		jpage.find("#divPwd").hide();
		jpage.find("#txtPwd").prop("disabled", true);
		MUI.showHome();
	}

	function onPageBeforeShow(ev)
	{
		var form = jf[0];
		form.reset();
		if (PageSetUserInfo.userInit) {
			jpage.find("#divPwd").show();
			jpage.find("#txtPwd").prop("disabled", false);
			PageSetUserInfo.userInit = false;
		}
		form.name.value = g_data.userInfo.name;
	}
}
