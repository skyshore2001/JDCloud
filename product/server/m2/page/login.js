function initPageLogin()
{
	var jpage = $(this);

	var jf = jpage.find("form");
	MUI.setFormSubmit(jf, handleLogin);

	setupGenCodeButton(jpage.find("#btnGenCode"), jpage.find("#txtPhone"));
}
