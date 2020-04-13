function initDlgImport()
{
	var jdlg = $(this);
	jdlg.on("beforeshow", onBeforeShow)
		.on("validate", onValidate);
	jdlg.find("#btnExport").click(btnExport_click);

	var frm = jdlg.find("form:first")[0];

	$(frm.obj).change(cboObj_change);
	
	function cboObj_change()
	{
		var obj = frm.obj.value;
		var text = jdlg.find(".tpl" + obj).html().trim();
		if (text[0] == "!") {
			// 首行以!开头表示参数指定, 如 "!title=a,b,c&type=CK"
			var pos = text.indexOf("\n");
			WUI.assert(pos>0);
			var firstRow = text.substr(1, pos).trim();
			frm.content.param_ = WUI.parseQuery(firstRow);
			frm.content.value_ = text.substr(pos+1).trim();
		}
		else {
			frm.content.param_ = null;
			frm.content.value_ = text;
		}
		frm.content.value = frm.content.value_;
		jdlg.find(".optional").hide();
		jdlg.find(".for" + obj).show();
	}
	
	function onBeforeShow(ev, formMode, opt) 
	{
		jdlg.find(".optional").hide();
		setTimeout(onShow);

		function onShow() {
			if (window.DlgImport && DlgImport.data_) {
				WUI.setFormData($(frm), DlgImport.data_);
				DlgImport.data_ = null;
				$(frm.obj).change();
			}
		}
	}

	function onValidate(ev, mode, oriData, newData) 
	{
		var obj = frm.obj.value;
		var text = frm.content.value;
		var files = frm.file.files;
		if (!obj) {
			app_alert("请选择导入类型!", "w");
			return;
		}
		if (!text && files.length == 0) {
			app_alert("请输入内容或选择文件!", "w");
			return;
		}

		var param = {};
		var ok = true;
		jdlg.find(".for" + obj).find("[name]").each(function (i, e) {
			var je = $(this);
			var val = je.val();
			if (je.attr("required") != null && !val) {
				app_alert("带*的内容为必填，请检查。", "w");
				ok = false;
				return false;
			}
			var name = $(e).attr("name");
			var val = $(e).val();
			if (name == "obj_") {
				obj = val;
			}
			else if (name == "params_") {
				$.extend(param, WUI.parseQuery(val));
			}
			else {
				param[name] = val;
			}
		});
		if (!ok)
			return;

		app_confirm("确定批量导入数据?", function (yes) {
			if (yes)
				batchAdd();
		});

		function batchAdd() {
			$.extend(param, frm.content.param_);
			if (files.length) {
				var fd = new FormData();
				fd.append("file", files[0]);
				callSvr(obj + ".batchAdd", param, api_batchAdd, fd, {
					//contentType: ""
				});
			}
			else {
				callSvr(obj + ".batchAdd", param, api_batchAdd, text, {
					contentType: "text/plain"
				});
			}
		}
	}

	function api_batchAdd(data) {
		var objDscr = frm.obj.selectedOptions[0].text;
		app_alert("成功添加 " + data.cnt + " 条" + objDscr + "记录!", function () {
			if (DlgImport.cb_) {
				DlgImport.cb_();
				DlgImport.cb_ = null;
			}
			WUI.closeDlg(jdlg);
		});
	}

	function btnExport_click(ev) {
		if (frm.obj.value == "")
			return;
		var text = frm.content.value_.replace(/\t/g, ',');
		if (text == "")
			return;
		var fname = frm.obj.selectedOptions[0].text + ".csv";
		window.open(WUI.makeUrl("export", {fname:fname, enc: "gbk", str: text}));
	}
}

/* 
// 主JS页中包含外部接口，以便从外部打开和设置批量导入框
var DlgImport = {
	data_: null,
	cb_: null,
	// data: {obj, ...} 对应dlgImport.html中的带name对象
	// cb: 导入成功后的回调函数
	show: function (data, cb) {
		this.data_ = data;
		this.cb_ = cb;
		WUI.showDlg("#dlgImport", {modal:false});
	}
};

示例: 供应商管理，在列表页工具栏中添加“导入”菜单：

	var btn1 = {text: "导入", iconCls:'icon-add', handler: function () {
		DlgImport.show({obj: "Vendor"});
	}};

	jtbl.datagrid({
		url: WUI.makeUrl("Vendor.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "export", btn1),
		...
	});

示例2：订单管理，根据当前行订单来导入订单子任务：

	var btn1 = {text: "导入任务", iconCls:'icon-add', handler: function () {
		var row = WUI.getRow(jtbl);
		if (row == null)
			return;
		DlgImport.show({obj:"Task", orderId: row.id});
	}};
*/
