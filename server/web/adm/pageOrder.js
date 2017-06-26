function initPageOrder() 
{
	var jpage = $(this);
	var jtbl = jpage.find("#tblOrder");
	var jdlg = $("#dlgOrder");

	jtbl.datagrid({
		url: WUI.makeUrl("Ordr.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg),
		sortName:'id',
		sortOrder:'desc'
	});
}

