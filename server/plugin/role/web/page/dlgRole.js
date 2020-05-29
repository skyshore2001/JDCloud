function initDlgRole()
{
	var jdlg = $(this);
	var jfrm = jdlg;
	var frm = jfrm[0];

	jfrm.find(".btnExample").click(function () {
		jdlg.find("#example").toggle();
		return false;
	});
/*
	jdlg.on("beforeshow", onBeforeShow)
		.on("validate", onValidate);
	
	function onBeforeShow(ev, formMode, opt) 
	{
		var objParam = opt.objParam;
		var forAdd = formMode == FormMode.forAdd;
		setTimeout(onShow);

		function onShow() {
		}
	}

	function onValidate(ev, mode, oriData, newData) 
	{
	}
*/
}

