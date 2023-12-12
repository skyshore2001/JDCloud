function initPageApiLogStat()
{
	var jpage = $(this);

	jpage.find(".btnStat2").click(btnStat2_Click);

	var statItf_ = WUI.initPageStat(jpage, setStatOpt);

	function setStatOpt(chartIdx, opt) 
	{
		opt.g = jpage.find("#g").val();
		opt.tmUnit = jpage.find(".btnStat2.active:visible").attr("data-tmUnit");
		if (opt.g)
			opt.maxSeriesCnt = 5;

		var param = opt.queryParam;
		if (opt.tmUnit == null) { // 在显示饼图时，取sum最大的10个显示。
			param.orderby = "sum DESC"; // 因为res中定义了字段别名为sum
			if (opt.g)
				opt.maxSeriesCnt = 10;
		}
		param.res = jpage.find("#cboRes").val();
		// 注意: cond参数会自动填写，若想追加可这样写
		// param.cond = [param.cond, "tm1 IS NOT NULL"];

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
				type: 'bar',
				// stack: 'ser', // 堆积柱状图
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
