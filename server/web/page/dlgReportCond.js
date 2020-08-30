function initDlgReportCond()
{
	var jdlg = $(this);
	var jfrm = jdlg;
	var frm = jfrm[0];

	var txtTmRange = jdlg.find(".cboTmRange");
	txtTmRange.change(function () {
		var range = WUI.getTmRange(this.value);
		if (range) {
			WUI.setFormData(jfrm, {tm1: range[0], tm2: range[1]});
		}
	});
	setTimeout(function () {
		txtTmRange.change();
	});

	jdlg.on("validate", onValidate);
	
	function onValidate(ev, mode, oriData, newData) 
	{
		var data = WUI.getFormData(jfrm);
		DlgReportCond.cb_ && DlgReportCond.cb_(data);
	}
}

