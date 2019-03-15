function initDlgEmployee()
{
	var jdlg = $(this);
	jdlg.on("beforeshow", function (ev, formMode, opt) {
		if (formMode == FormMode.forSet)
			opt.data.pwd = "****";
	});
}

