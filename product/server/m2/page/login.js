function initPageLogin()
{
	var jpage = $(this);

	var jf = jpage.find("form");
	MUI.setFormSubmit(jf, handleLogin);

	setupGenCodeButton(jpage.find("#btnGenCode"), jpage.find("#txtPhone"));
	jpage.find("#btnShowCode").click(function () {
		getDynCode(function(code) {
			if (code == null) {
				app_alert("未找到验证码", "w");
				return;
			}
			jf[0].code.value = code;
			app_alert("最新验证码为: " + code);
		});
	});
}
