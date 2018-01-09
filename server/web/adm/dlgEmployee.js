function initDlgEmployee()
{
	var jdlg = $(this);
	var jfrm = jdlg.find("form");
	jfrm.on("initdata", function (ev, data, formMode) {
		if (formMode != FormMode.forAdd)
			data.pwd = "****";
	})
	.on("loaddata", function (ev, data, formMode) {
		hiddenToCheckbox(jfrm.find("#divPerms"));
	})
	.on("savedata", function (ev, formMode, initData) {
		checkboxToHidden(jfrm.find("#divPerms"));
	});
}

