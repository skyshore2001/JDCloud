function initPageApiLogStat()
{
	var jpage = $(this);

	jpage.find(".btnStat2").click(btnStat2_Click);

	var statItf_ = WUI.initPageStat(jpage, setStatOpt);

	function setStatOpt(chartIdx, opt) 
	{
		opt.g = jpage.find("#g").val();
		opt.tmUnit = jpage.find(".btnStat2.active:visible").attr("data-tmUnit");
		opt.maxSeriesCnt = 5;

		var param = opt.queryParam;
		if (opt.tmUnit == null) {
			param.orderby = "sum DESC";
			param.pagesz = 10;
		}
		param.res = jpage.find("#cboRes").val() + " sum";

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
			seriesOpt = {
				//顶部数字
				itemStyle: {
					normal: {
						label: {  show: true }
					}
				}
			}
		}
		$.extend(true, opt, {
			chartOpt: chartOpt,
			seriesOpt: seriesOpt
		});
	}

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
		url:WUI.makeUrl('ApiLog.query', {res: "ac", distinct: 1, pagesz:-1}),
	};
	return opt;
};
