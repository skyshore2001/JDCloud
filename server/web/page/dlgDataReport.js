function initDlgDataReport()
{
	var jdlg = $(this);
	var frm = jdlg[0];
	var jpage_ = null;
	var param_ = null;
	var enumMap_ = null;
	var title0 = jdlg.attr("title");

	jdlg.on("beforeshow", onBeforeShow)
		.on("validate", onValidate);

	jdlg.on("click", ".btnAdd", btnAdd_click);
	jdlg.on("click", ".btnRemove", btnRemove_click);

	$(frm.tmField).on("change", function (ev) {
		setFields(this.value);
	});

	jdlg.find(".btnForSum").click(function (ev) {
		jdlg.find(".forSum").toggle();
	});
	jdlg.find(".cboSum, .cboSumField").change(function (ev) {
		setSumField();
	});

	jdlg.find(".btnAddCond").click(function (ev) {
		var jtpl = jdlg.find(".forCond:first");
		var jo = jtpl.clone();
		WUI.enhanceWithin(jo);
		jo.show();
		jo.find(".condValue")
			.addClass("wui-find-field")
			.attr("title", WUI.queryHint);
		jo.find(".fields").trigger("setOption", {
			jdEnumMap: enumMap_
		});

		// 插入到同类复制项的最后
		while (true) {
			var j1 = jtpl.next(".forCond");
			if (j1.size() > 0)
				jtpl = j1;
			else
				break;
		}
		jtpl.after(jo);
	});

	function onBeforeShow(ev, formMode, opt) {
		var jpage = WUI.getActivePage();
		jpage_ = jpage;
		enumMap_ = null;

		var jtbl = jpage.find("table.datagrid-f:first");

		var param = WUI.getQueryParamFromTable(jtbl);
		console.log(param);
		param_ = param;

		opt.title = title0 + "-" + jpage.attr("title");

		var strArr = [];
		var url = jtbl.datagrid("options").url;
		if (!url) {
			app_alert("此页面不支持统计", "w");
			opt.cancel = true;
			return;
		}

		setTimeout(onShow);

		function onShow() {
			frm.ac.value = url;
			frm.cond.value = param.cond || null;
			setSumField();
			setFields(frm.tmField.value);
		}
	}

	function setFields(tmField) {
		var enumMap = {};
		param_.res.split(/\s*,\s*/).forEach(e => {
			var val = e.replace(/["]/g, '');
			var arr = val.split(" ");
			enumMap[val] = arr[1] || arr[0];
		});

		if (tmField) {
			$.extend(enumMap, {
				"y 年,m 月,d 日": "时间-年月日",
				"y 年,m 月": "时间-年月",
				"y 年,w 周": "时间-年周",
				"y 年": "时间-年",
				"m 月": "时间-月",
				"d 日": "时间-日",
				"h 时": "时间-小时",
				"q 季度": "时间-季度",
				"w 周": "时间-周",
				"wd 周几": "时间-周几"
			});
		}
		enumMap_ = enumMap;
		jdlg.find(".fields").trigger("setOption", {
			jdEnumMap: enumMap
		});
	}

	function getUserCond() {
		var kv = {};
		jdlg.find(".forCond").each(function () {
			var key = $(this).find(".condKey").val();
			key = key.split(' ')[0]; // field name
			var val = $(this).find(".condValue").val();
			kv[key] = val;
		});
		return WUI.getQueryCond(kv);
	}

	function onValidate(ev, mode, oriData, newData) {
		var formData = WUI.getFormData(jdlg);
		var cond = getUserCond();
		if (cond) {
			if (formData.cond)
				formData.cond += " AND (" + cond + ")";
			else
				formData.cond = cond;
		}

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

	function setSumField() {
		var sum = jdlg.find(".cboSum").val() || "COUNT";
		var sumField = jdlg.find(".cboSumField").val() || "1";
		sumField = sumField.split(' ')[0];
		var title = sum=="COUNT"? "总数": "总和";
		var val = sum + "(" + sumField + ")" + " " + title;
		$(frm.res).val(val);
	}
}
