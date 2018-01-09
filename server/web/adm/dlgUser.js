function initDlgUser()
{
	var jdlg = $(this);
	var jfrm = jdlg.find("form");
	jfrm.on("initdata", function (ev, data, formMode) {
		if (formMode != FormMode.forAdd)
			data.pwd = "****";
	});
}

