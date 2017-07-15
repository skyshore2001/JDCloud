function initPageUserRegStat()
{
	var jpage = $(this);
	jpage.find(".btnStat2").click(btnStat2_Click);

	var statItf_ = WUI.initPageStat(jpage, {
		groupNameMap: {
			"sex": "sexName"
		},
		onGetTmUnit: function () {
			return jpage.find(".btnStat2.active:visible").attr("data-tmUnit");
		},
		onInitChart: function (param, initChartOpt) {
			initChartOpt.seriesOpt = {
				// type:'line',
				markPoint: {
					data: [
						{type: 'max', name: '最大值'},
						{type: 'min', name: '最小值'}
					]
				},
				markLine: {
					data: [
						{type: 'average', name: '平均值'}
					]
				}
			};
		},
		onLoadData: function (statData, initChartOpt) {
			// x轴数据不多时全部显示
			if (statData.xData.length <= 20) {
				var chartOpt = {
					xAxis: {
						axisLabel: { interval: 0, rotate: 30 }
					}
				};
				$.extend(true, initChartOpt.chartOpt, chartOpt);
			}
		}
	});

	function btnStat2_Click()
	{
		var type = this.value;
		jpage.find(".btnStat2").removeClass("active");
		$(this).addClass("active");
		statItf_.refreshStat();
	}
}

