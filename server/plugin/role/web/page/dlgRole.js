function initDlgRole()
{
	var jdlg = $(this);
	var jfrm = jdlg;
	var frm = jfrm[0];

	jfrm.find(".perms a").click(function () {
		var perm = $(this).text();
		if (frm.perms.value.indexOf(perm) < 0) {
			frm.perms.value += ' ' + perm;
		}
		else {
			frm.perms.value = frm.perms.value.replace(' ' + perm, '').replace(perm, '');
		}
	});
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

