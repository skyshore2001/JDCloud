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
			var useTmUnit = jpage.find(".btnStat2.active:visible").size() > 0;
			if (! useTmUnit) {
				// 不按时间展现时，显示饼图
				initChartOpt.seriesOpt = {
					type: 'pie',
					itemStyle: {
						normal: {
							label: {
								show: true,
								formatter: '{b}: {d}%'
							}
						}
					}
				}
			}
			else {
				initChartOpt.chartOpt = {
					toolbox: {
						show: true,
						feature: {
							dataView: {},
							magicType: {type: ['line', 'bar']},
							restore: {},
						}
					}
				};
				// 如果有分组，显示柱状图，否则折线图
				initChartOpt.seriesOpt = {
					type: param.g? 'bar': 'line',
					//顶部数字
					itemStyle: {
						normal: {
							label: {  show: true }
						}
					}
				}
				if (! param.g) {
					$.extend(initChartOpt.seriesOpt, {
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
					});
				}
			};
		},
		onLoadData: function (statData, initChartOpt) {
			// x轴数据不多时全部显示
			if (initChartOpt.seriesOpt.type != 'pie' && statData.xData.length <= 20) {
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

