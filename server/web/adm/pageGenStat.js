function initPageGenStat()
{
	var jpage = $(this);
	var jtmUnit = jpage.find("[name=tmUnit]");
	var tmType_;

	var statItf_ = WUI.initPageStat(jpage, {
		onInitChart: function (param, initChartOpt) {
			WUI.useBatchCall(); // 多个请求批量发送

			var id = this.attr("id");
			var tm = 'tm';
			if (param.ac == "User.query") {
				tm = "createTm";
			}
			else if (param.ac == "Ordr.query") {
				tm = "createTm";
			}
			// 不同的对象报表使用的时间字段不同，故用"{tm}"表示字段名并在此处替换
			param.cond = WUI.applyTpl(param.cond, {tm: tm});

			var chartOpt, seriesOpt;
			if (id == "c1") {
				chartOpt = {
					title: {
						text: tmType_ + "访问量（会话数）"
					},
					legend: null
				};
			}
			else if (id == "c2") {
				chartOpt = {
					title: {
						text: tmType_ + "活跃用户"
					},
					legend: null
				};
			}
			else if (id == "c3") {
				chartOpt = {
					title: {
						text: tmType_ + "用户增长"
					},
					legend: null
				};
			}
			else if (id == "c4") {
				chartOpt = {
					title: {
						text: tmType_ + "订单增长"
					},
					legend: null
				};
			}
			$.extend(true, initChartOpt, {
				chartOpt: chartOpt,
				seriesOpt: {}
			});
		}
	});
	jtmUnit.change(tmUnit_click);
	jtmUnit.change(); // 初始化

	function tmUnit_click(ev)
	{
		var val = this.value;
		var jopt = $(this.selectedOptions[0]);
		var rangeDesc = jopt.attr("data-range");
		tmType_ = jopt.attr("data-tmType");
		statItf_.setTmRange(rangeDesc);
		statItf_.refreshStat();
	}
}
