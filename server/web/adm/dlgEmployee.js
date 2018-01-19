function initDlgEmployee()
{
	var jdlg = $(this);
	jdlg.on("beforeshow", function (ev, formMode, opt) {
		if (formMode == FormMode.forSet)
			opt.data.pwd = "****";
	})
	.on("show", function (ev, formMode, initData) {
		hiddenToCheckbox(jdlg.find("#divPerms"));
	})
	.on("validate", function (ev, formMode, initData) {
		checkboxToHidden(jdlg.find("#divPerms"));
	});
}

