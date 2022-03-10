function initPageCinf() 
{
	var jpage = $(this);
	var jtbl = jpage.find("#tblCinf");
	var jdlg = $("#dlgCinf");

	jtbl.datagrid({
		url: WUI.makeUrl("Cinf.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "export"),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg),
		sortOrder: "desc",
		sortName: "id"
	});
}

var CinfFormatter = {
	name: function (value) {
		// NOTE: CinfList定义在app.js中
		var rv = CinfList.find(function (e) {
			return e.name == value
		});
		if (rv)
			return rv.text;
		return value;
	}
}
