function initPageLogin1()
{
	var jpage = $(this);

	var jf = jpage.find("form");
	MUI.setFormSubmit(jf, handleLogin);
}
