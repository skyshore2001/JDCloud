function initPageUserRegStat()
{
	var jpage = $(this);
	jpage.find(".btnStat2").click(btnStat2_Click);

	var statItf_ = WUI.initPageStat(jpage, setStatOpt);

	function setStatOpt(chartIdx, opt) 
	{
		opt.g = jpage.find("#g").val();
		opt.tmUnit = jpage.find(".btnStat2.active:visible").attr("data-tmUnit");

		// 设置图表系列的显示名，如性别sex须将M/F转换为男/女。
		// 如果转换简单，一般放前端做。如果放后端做，前端只要赋值opt.gname，后端需支持sexName字段
// 		var groupNameMap = {
// 			"sex": "sexName"
// 		};
// 		opt.gname = groupNameMap[g];

		// 前端使用opt.formatter来定制系列名称。
		opt.onLoadData = onLoadData;
		if (opt.g == "sex") {
			opt.formatter = function (value, arr, i) {
				return value=='M'?'男':'女';
			}
		}

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

