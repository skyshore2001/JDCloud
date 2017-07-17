function initPageApiLogStat()
{
	var jpage = $(this);

	jpage.find(".btnStat2").click(btnStat2_Click);

	var statItf_ = WUI.initPageStat(jpage, {
		maxSeriesCnt: 5,
		onInitChart: function (param, initChartOpt) {
			if (param.orderby == null) {
				param.orderby = "sum DESC";
				param.pagesz = 10;
			}

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
				initChartOpt.seriesOpt = {
					//顶部数字
					itemStyle: {
						normal: {
							label: {  show: true }
						}
					}
				}
			}
		},
		onGetTmUnit: function () {
			return jpage.find(".btnStat2.active:visible").attr("data-tmUnit");
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

ListOptions.Ac = function () {
	var opt = {
		valueField: 'ac',
		textField:'ac',
		url:WUI.makeUrl('ApiLog.query', {res: "ac", distinct: 1, wantArray:1}),
	};
	return opt;
};
