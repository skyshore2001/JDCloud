/*
对话框应支持两种模式：

- 基于某列表页，通过WUI.getParamFromTable(jtbl)从数据表取到字段列表、查询条件等；
 在调用showDataReport后将所有参数保存到统计页数据表的showDataReportOpt中；
- 基于某统计页打开，通过jtbl.data("showDataReportOpt")取到字段列表(resFields)、查询条件(cond)、用户追加的条件(userCondArr)、行列统计字段(gres/gres2)等，
 显示到对话框上，用户可修改参数后重新运行。
 */
function initDlgDataReport()
{
	var jdlg = $(this);
	var frm = jdlg[0];
	var jpage_ = null;
	var param_ = null;  // WUI.showDataReport({ title, ac, res, cond, cond2, tmField, @gres, @gres2, showChart, detailPageName, detailPageParamArr, resFields, tmField, userCondArr })
	var enumMap_ = null;
	var title0 = jdlg.attr("title");

	var tmUnitArr = [
		{name: "y,m,d", value: "y 年,m 月,d 日", title: "时间-年月日"},
		{name: "y,m,d,h", value: "y 年,m 月,d 日,h 时", title: "时间-年月日时"},
		{name: "y,m", value: "y 年,m 月", title: "时间-年月"},
		{name: "y,q", value: "y 年,q 季度", title: "时间-年季度"},
		{name: "y,w", value: "y 年,w 周", title: "时间-年周"}
	];

	var jtplCond = $(jdlg.find("#tplCond").html());
	var jtplGres = $(jdlg.find("#tplGres").html());
	var jtplGres2 = $(jdlg.find("#tplGres2").html());

	jdlg.on("beforeshow", onBeforeShow)
		.on("validate", onValidate);

	jdlg.on("click", ".btnAddGres, .btnAddGres2", btnAddGres_click);
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
		var jo = jtplCond.clone();
		$.parser.parse(jo); // easyui enhancement
		WUI.enhanceWithin(jo); // init mycombobox
		jo.find(".condValue")
			.addClass("wui-find-field")
			.attr("title", WUI.queryHint);
		jo.find(".fields").trigger("setOption", {
			jdEnumMap: enumMap_
		});

		// 插入到同类复制项的最后
		jdlg.find(".trCond:last").after(jo);
	});

	function onBeforeShow(ev, formMode, opt) {
		var jpage = WUI.getActivePage();
		jpage_ = jpage;
		enumMap_ = null;

		var jtbl = jpage.find("table.datagrid-f:first");
		var param =  jtbl.data("showDataReportOpt");
		if (!param) {
			var datagrid = WUI.isTreegrid(jtbl)? "treegrid": "datagrid";
			var url = jtbl[datagrid]("options").url;
			if (!url) {
				app_alert("此页面不支持统计", "w");
				opt.cancel = true;
				return;
			}

			var param1 = WUI.getQueryParamFromTable(jtbl);
			param = {
				title: "统计报表-" + jpage.attr("title"),
				ac: url,
				res: null,
				cond: param1.cond,
				resFields: param1.res,
				tmField: null
			};

			var showPageArgs = $.extend([], jpage.data("showPageArgs_")); // showPage(pageName, title, [userParam, cond])
			param.detailPageName = showPageArgs[0];
			param.detailPageParamArr = showPageArgs[2] || [];
		}
		console.log(param);
		opt.data = param_ = param;
		opt.title = title0 + "-" + jpage.attr("title");

		setTimeout(onShow);

		function onShow() {
			if (!param.res) {
				setSumField();
			}
			setFields($(frm.tmField).val());
			setUserCond();

			array2Fields(param.gres, "[name='gres[]']", function () {
				jdlg.find(".btnAddGres").click();
			});
			array2Fields(param.gres2, "[name='gres2[]']", function () {
				jdlg.find(".btnAddGres2").click();
			});
		}
	}

	// 将arr中每一项赋值到selector对应的DOM中; 如果缺少DOM，用onAddField创建; onGetValue定制如何从数组一项中取值，可缺省。
	function array2Fields(arr, selector, onAddField, onGetValue) {
		if (!arr || arr.length == 0)
			return;
		var jo = jdlg.find(selector);
		for (var i=jo.size(); i<arr.length; ++i) {
			onAddField();
		}
		jo = jdlg.find(selector);
		jo.each(function (i, e) {
			if (i < arr.length) {
				var val = onGetValue? onGetValue(arr[i]): arr[i];
				$(this).val(val);
			}
		});
	}

	function setFields(tmField) {
		var enumMap = {};
		var enumMap_tm = {};
		param_.resFields.split(/\s*,\s*/).forEach(e => {
			var val = e.replace(/["]/g, '');
			var arr = val.split(" ");
			enumMap[val] = arr[1] || arr[0];
			if (/Tm|Dt|Date|Time|时间|日期/.test(val))
				enumMap_tm[val] = arr[1] || arr[0];
		});

		if (tmField) {
			$.each(tmUnitArr, function (i, e) {
				enumMap[e.value] = e.title;
			});
			$.extend(enumMap, {
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
		jdlg.find(".fields-tm").trigger("setOption", {
			jdEnumMap: enumMap_tm
		});
	}

	function setUserCond() {
		var kvarr = param_.userCondArr; // elem: [key, value]
		jdlg.find(".trCond:not(:first)").remove();
		if (!kvarr || kvarr.length == 0)
			return;

		array2Fields(kvarr, ".trCond .condKey", function () {
			jdlg.find(".btnAddCond").click();
		}, e => e[0]);
		array2Fields(kvarr, ".trCond .condValue", function () {
			jdlg.find(".btnAddCond").click();
		}, e => e[1]);
	}
	function getUserCond(param) {
		var kv = {};
		var kvarr = [];
		jdlg.find(".trCond:not(:first)").each(function () {
			var key = $(this).find(".condKey").val();
			var val = $(this).find(".condValue").val();
			kvarr.push([key, val]); // 用于显示对话框时恢复条件
			key = key.split(' ')[0]; // field name
			kv[key] = val; // 用于查询
		});
		param.cond2 = WUI.getQueryCond(kv);
		param.userCondArr = kvarr;
	}

	function onValidate(ev, mode, oriData, newData) {
		var formData = WUI.getFormData(jdlg, true);
		var param = param_;
		$.extend(param, formData);
		param.showChart = formData.showChart;
		param.gres = param.gres.filter(e => e);
		param.gres2 = param.gres2.filter(e => e);
		getUserCond(param);

		var autoSet = false;
		if (param.showChart) {
			if (param.gres.length == 1) {
				var g0 = param.gres[0];
				$.each(tmUnitArr, function (i, e) {
					if (g0 == e.value) {
						param.tmUnit = e.name; // "y 年,m 月" -> "y,m"
						param.orderby = e.name; 
						autoSet = true;
						return false;
					}
				});
			}
			// 饼图自动倒排序
			if (!autoSet && param.gres2.length == 0) {
				delete param.tmUnit;
				var res1 = param.res.split(',')[0];
				var resTitle = res1.split(' ')[1];
				param.orderby = resTitle + " DESC";
				autoSet = true;
			}
		}
		if (!autoSet) {
			delete param.tmUnit;
			delete param.orderby;
		}

		console.log(param);
		WUI.showDataReport(param);
	}

	function btnAddGres_click(ev) {
		var isGres = $(this).hasClass("btnAddGres");
		var jo = isGres? jtplGres.clone(): jtplGres2.clone();

		$.parser.parse(jo); // easyui enhancement
		WUI.enhanceWithin(jo); // init mycombobox
		jo.find(".fields").trigger("setOption", {
			jdEnumMap: enumMap_
		});

		// 插入到同类复制项的最后
		jdlg.find(isGres?".trGres:last":".trGres2:last").after(jo);
	}

	function btnRemove_click(ev) {
		var jtr = $(this).closest("tr");
		jtr.remove();
	}

	function setSumField() {
		var sum = jdlg.find(".cboSum").val() || "COUNT 总数";
		var sumArr = sum.split(' '); // ["COUNT", "总数"]
		var sumField = jdlg.find(".cboSumField").val() || "1";
		sumField = sumField.split(' ')[0];
		var val = sumArr[0] + "(" + sumField + ")" + " " + sumArr[1];
		$(frm.res).val(val);
	}
}
