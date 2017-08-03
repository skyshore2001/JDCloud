function initPageUser() 
{
	var jpage = $(this);
	var jtbl = jpage.find("#tblUser");
	var jdlg = $("#dlgUser");

	jtbl.datagrid({
		url: WUI.makeUrl("User.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg, {text:'导出', iconCls:'icon-save', handler: WUI.getExportHandler(jtbl, "User.query") }),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg)
	});
}

