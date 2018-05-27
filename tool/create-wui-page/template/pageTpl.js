function initPage<?=$obj?>() 
{
	var jpage = $(this);
	var jtbl = jpage.find("#tbl<?=$obj?>");
	var jdlg = $("#dlg<?=$obj?>");

	// 定制工具栏增删改查按钮：r(refresh), f(find), a(add), s(set), d(del)
	// jtbl.jdata().toolbar = "rfs";

	jtbl.datagrid({
		url: WUI.makeUrl("<?=$baseObj?>.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "export"),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg),
		//sortOrder: "desc",
		sortName: "id"
	});
}

