function initPageUserRegStat()
{
	var jpage = $(this);
	jpage.find(".btnStat2").click(btnStat2_Click);

	var statItf_ = WUI.initPageStat(jpage, setStatOpt);

	function setStatOpt(chartIdx, opt) 
	{
		opt.g = jpage.find("#g").val();
		opt.tmUnit = jpage.find(".btnStat2.active:visible").attr("data-tmUnit");

		var groupNameMap = {
			"sex": "sexName"
		};
		opt.gname = groupNameMap[g];
		opt.onLoadData = onLoadData;

		var chartOpt, seriesOpt;
		if (! opt.tmUnit) {
			// 不按时间展现时，显示饼图
			seriesOpt = {
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
			chartOpt = {
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
			seriesOpt = {
				type: opt.g? 'bar': 'line',
				//顶部数字
				itemStyle: {
					normal: {
						label: {  show: true }
					}
				}
			}
			if (! opt.g) {
				$.extend(seriesOpt, {
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
		}

		$.extend(true, opt, {
			chartOpt: chartOpt,
			seriesOpt: seriesOpt
		});
	}

	function onLoadData(chartIdx, statData, opt)
	{
		// x轴数据不多时全部显示
		if (opt.seriesOpt.type != 'pie' && statData.xData.length <= 20) {
			var chartOpt = {
				xAxis: {
					axisLabel: { interval: 0, rotate: 30 }
				}
			};
			$.extend(true, opt.chartOpt, chartOpt);
		}
	}

	function btnStat2_Click()
	{
		var type = this.value;
		jpage.find(".btnStat2").removeClass("active");
		$(this).addClass("active");
		statItf_.refreshStat();
	}
}

