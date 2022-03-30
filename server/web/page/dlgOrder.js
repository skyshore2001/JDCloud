function initDlgOrder()
{
	var jdlg = $(this);
	var jfrm = jdlg.find("form:first");
	var frm = jfrm[0];

	jdlg.on("beforeshow", onBeforeShow)
	
	function onBeforeShow(ev, formMode, opt)
	{
		var forAdd = formMode == FormMode.forAdd;
		$(frm.status).prop("disabled", forAdd);

		setTimeout(onShow);
		function onShow() {
			if (forAdd)
				$(frm.status).val("CR");
		}
	}
}
