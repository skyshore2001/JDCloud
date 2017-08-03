function initPageGenStat()
{
	var jpage = $(this);
	loadStatLib().then(init);

	var statItf_;

	function init()
	{
		statItf_ = MUI.initPageStat(jpage, setStatOpt);
		statItf_.refreshStat();

		// 下拉刷新
		var pullListOpt = {
			onLoadItem: function (isRefresh) {
				if (isRefresh)
					statItf_.refreshStat();
			}
		};
		MUI.initPullList(jpage.find(".bd")[0], pullListOpt);
	}
		
	function setStatOpt(chartIdx, opt)
	{
		var param = opt.queryParam;

		var seriesOpt;
		// 月度分析
		if (chartIdx == 0) {
			opt.tmUnit = "y,m";

			var tm = new Date().add("m", -6).format("yyyy-mm-01"); // 近6个月
			param.cond = "createTm>='" + tm + "'";
			seriesOpt = {
				//顶部数字
				itemStyle: {
					normal: {
						label: {
							show: true,
							formatter: "{c}元"
						}
					}
				}
			};
		}
		// 消费类别
		else if (chartIdx == 1) {
			var tm = new Date().format("yyyy-mm-01"); // 当前月
			param.cond = "createTm>='" + tm + "'";
			param.gres = "dscr";

			seriesOpt = {
				type: "pie"
			};
		}

		$.extend(true, opt, {
			seriesOpt: seriesOpt
		});
	}
}
