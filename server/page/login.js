function initPageLogin()
{
	var jpage = $(this);

	var jf = jpage.find("form");
	MUI.setFormSubmit(jf, handleLogin);

	setupGenCodeButton(jpage.find("#btnGenCode"), jpage.find("#txtPhone"), function () {
		// TODO: 在支持sms后取消模拟
		//if (g_data.mockMode)
		//	return;
		setTimeout(function () {
			onGenCode();
		}, 1000);
	});

	function onGenCode()
	{
		getDynCode(function(code) {
			if (code == null) {
				app_alert("未找到验证码", "w");
				return;
			}
			app_alert("收到验证码: " + code, function () {
				jf[0].code.value = code;
				jf.submit();
			});
		});
		return false;
	}
}
