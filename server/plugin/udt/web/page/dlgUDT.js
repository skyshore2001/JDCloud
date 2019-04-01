function initDlgUDT(opt)
{
	var jdlg = $(this);
	var jfrm = jdlg;
	var frm = jfrm[0];

/*
	jdlg.on("beforeshow", onBeforeShow)
		.on("validate", onValidate);
*/
	
	WUI.assert(opt.name);
	UDTGet(opt.name, initDlg);

	function initDlg(udt) {
		jfrm.attr({
			"my-obj": "U_" + udt.name,
			title: udt.title
		});
		var jtbl = $("<table class='wui-form-table'>").appendTo(jfrm);
		$.each(udt.fields, function () {
			addField(jtbl, this);
		});

		$.parser.parse(jdlg); // easyui enhancement
		WUI.enhanceWithin(jdlg);
	}

	function addField(jtbl, field) {
		var tpl = "<tr><td>{title}</td><td></td></tr>";
		var jtr = $(WUI.applyTpl(tpl, field)).appendTo(jtbl);
		var jtd = jtr.find("td:eq(1)");
		var tpl1 = '<input name="{name}">';
		var ji = $(WUI.applyTpl(tpl1, field)).appendTo(jtd);
		if (field.id == null) { // id,tm,updateTm
			ji.prop("disabled", true);
		}
		if (field.type == "date" || field.type == "tm") {
			ji.attr("placeholder", "年-月-日");
		}
	}

/*
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

