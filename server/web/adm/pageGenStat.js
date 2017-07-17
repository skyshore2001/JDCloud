function initPageGenStat()
{
	var jpage = $(this);
	var jtmUnit = jpage.find("#tmUnit");

	var statItf_ = WUI.initPageStat(jpage, setStatOpt);
	jtmUnit.change(tmUnit_click);
	jtmUnit.change(); // 初始化
	
	function setStatOpt(chartIdx, opt) 
	{
		opt.tmUnit = jtmUnit.val();
		var param = opt.queryParam;
		var tm = 'tm';
		if (param.ac == "User.query") {
			tm = "createTm";
		}
		else if (param.ac == "Ordr.query") {
			tm = "createTm";
		}
		// 不同的对象报表使用的时间字段不同，故用"{tm}"表示字段名并在此处替换
		param.cond = WUI.applyTpl(param.cond, {tm: tm});

		var jopt = $(jtmUnit[0].selectedOptions[0]);
		var tmType = jopt.attr("data-tmType");

		var chartOpt, seriesOpt;
		if (chartIdx == 0) {
			param.cond += " and app='user'";
			chartOpt = {
				title: {
					text: tmType + "访问量（会话数）"
				},
				legend: null
			};
		}
		else if (chartIdx == 1) {
			chartOpt = {
				title: {
					text: tmType + "活跃用户"
				},
				legend: null
			};
		}
		else if (chartIdx == 2) {
			chartOpt = {
				title: {
					text: tmType + "用户增长"
				},
				legend: null
			};
		}
		else if (chartIdx == 3) {
			chartOpt = {
				title: {
					text: tmType + "订单增长"
				},
				legend: null
			};
		}
		$.extend(true, opt, {
			chartOpt: chartOpt,
			seriesOpt: seriesOpt,
		});
	}

	function tmUnit_click(ev)
	{
		var val = this.value;
		var jopt = $(this.selectedOptions[0]);
		var rangeDesc = jopt.attr("data-range");
		statItf_.setTmRange(rangeDesc);
		statItf_.refreshStat();
	}
}
