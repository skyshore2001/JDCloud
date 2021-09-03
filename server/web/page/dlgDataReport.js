function initDlgDataReport()
{
	var jdlg = $(this);
	var frm = jdlg[0];
	var jpage_ = null;
	var title0 = jdlg.attr("title");

	jdlg.on("beforeshow", onBeforeShow)
		.on("validate", onValidate);

	jdlg.on("click", ".btnAdd", btnAdd_click);
	jdlg.on("click", ".btnRemove", btnRemove_click);
	
	function onBeforeShow(ev, formMode, opt) {
		var jpage = WUI.getActivePage();
		jpage_ = jpage;
		var jtbl = jpage.find("table.datagrid-f:first");

		var param = WUI.getQueryParamFromTable(jtbl);
		console.log(param);

		opt.title = title0 + "-" + jpage.attr("title");

		var strArr = [];
		var url = jtbl.datagrid("options").url;
		if (!url) {
			app_alert("此页面不支持统计", "w");
			opt.cancel = true;
			return;
		}

		var enumMap = {};
		param.res.split(/\s*,\s*/).forEach(e => {
			var val = e.replace(/["]/g, '');
			var arr = val.split(" ");
			enumMap[val] = arr[1] || arr[0];
		});
		jdlg.find(".fields").trigger("setOption", {
			jdEnumMap: enumMap
		});
		setTimeout(onShow);

		function onShow() {
			frm.ac.value = url;
			frm.cond.value = param.cond || null;
			frm.res.value = "COUNT(*) 数量";
		}
	}

	function onValidate(ev, mode, oriData, newData) {
		var formData = WUI.getFormData(jdlg);
		var jpage = jpage_;

		formData.title = "统计报表-" + jpage.attr("title");

		var showPageArgs = $.extend([], jpage.data("showPageArgs_")); // showPage(pageName, title, [userParam, cond])
		formData.detailPageName = showPageArgs[0];
		formData.detailPageParamArr = showPageArgs[2] || [];

		console.log(formData);
		WUI.showDataReport(formData);
	}

	function btnAdd_click(ev) {
		var jtr = $(ev.target).closest("tr");
		var jtr1 = jtr.clone();
		jtr1.find("td:first").html("+").css("text-align", "right"); // 文字部分，显示一个"+"
		jtr1.find(".btnAdd").hide();
		jtr1.find(".btnRemove").show();
		jtr1.addClass("clone");

		// 插入到同类复制项的最后
		while (true) {
			var jo = jtr.next(".clone")
			if (jo.size() > 0)
				jtr = jo;
			else
				break;
		}
		jtr.after(jtr1);
	}

	function btnRemove_click(ev) {
		var jtr = $(ev.target).closest("tr");
		jtr.remove();
	}
}
