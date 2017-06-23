function initPageEmployee() 
{
	var jpage = $(this);
	var jtbl = jpage.find("#tblEmployee");
	var jdlg = $("#dlgEmployee");

	jtbl.datagrid({
		url: WUI.makeUrl("Employee.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg)
	});
}

