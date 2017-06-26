function initPageUser() 
{
	var jpage = $(this);
	var jtbl = jpage.find("#tblUser");
	var jdlg = $("#dlgUser");

	jtbl.datagrid({
		url: WUI.makeUrl("User.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg)
	});
}

