function initDlgEmployee()
{
	var jdlg = $(this);
	var jfrm = jdlg.find("form");
	jfrm.on("loaddata", function (ev, data) {
		hiddenToCheckbox(jfrm.find("#divPerms"));
	})
	.on("savedata", function (ev) {
		checkboxToHidden(jfrm.find("#divPerms"));
	});
}

