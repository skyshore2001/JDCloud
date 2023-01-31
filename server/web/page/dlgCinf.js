function initDlgCinf()
{
	var jdlg = $(this);
	var jfrm = jdlg;
	var frm = jfrm[0];
	var jbtnEditJson = jdlg.find(".btnEditJson");
	var jval = $(frm.value);

	$(frm.name).combobox({
		valueField: "name",
		textField: "text",
		data: CinfList, // NOTE: CinfList定义在app.js中
		onUnselect: function (e) {
			jdlg.find(".valueHint").empty();
		},
		onSelect: function (e) {
			jdlg.find(".valueHint").html(e.dscr);
		},
		onChange: function (newVal, oldVal) {
			var useJson = window.DlgJson && /^conf_/.test(newVal);
			jbtnEditJson.parent().toggle(useJson);
		}
	});

	jbtnEditJson.click(btnEditJson_click);

	function btnEditJson_click(ev) {
		var url = "schema/" + $(frm.name).val() + ".js";
		DlgJson.show(url, jval.val(), onSetJson);
	}

	function onSetJson(data, doSave) {
		//jo.trigger("retdata", [data]);
		var str = JSON.stringify(data, null, 2);
		jval.val(str);

		// 保存但不关闭对话框
		if (doSave) {
			WUI.saveDlg(jdlg, true); // noCloseDlg=true
		}
	}

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

