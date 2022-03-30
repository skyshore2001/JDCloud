function initDlgCinf()
{
	var jdlg = $(this);
	var jfrm = jdlg;
	var frm = jfrm[0];

	$(frm.name).combobox({
		valueField: "name",
		textField: "text",
		data: CinfList, // NOTE: CinfList定义在app.js中
		onUnselect: function (e) {
			jdlg.find(".valueHint").empty();
		},
		onSelect: function (e) {
			jdlg.find(".valueHint").html(e.dscr);
		}
	});

/*
	WUI.setDlgLogic(jdlg, "code", {
		readonlyForSet: true
	});

	jdlg.on("beforeshow", onBeforeShow)
		.on("validate", onValidate);
	
	function onBeforeShow(ev, formMode, opt) {
		var objParam = opt.objParam;
		var forAdd = formMode == FormMode.forAdd;
		setTimeout(onShow);

		function onShow() {
		}
	}

	function onValidate(ev, mode, oriData, newData) {
	}
*/
}

