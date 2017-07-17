function initPageGenStat()
{
	var jpage = $(this);
	loadStatLib().then(init);

	function init()
	{
		var tm1 = new Date().add("m", -6).format("yyyy-mm-01"); // 近6个月
		var tm2 = new Date().format("yyyy-mm-01"); // 当前月
		var statItf_ = MUI.initPageStat(jpage, {
			onGetTmUnit: function () {
				var id = this.attr("id");
				if (id == "c1")
					return "y,m";
			},
			onInitChart: function (param, initChartOpt) {
				var id = this.attr("id");
				if (id == "c1") {
					param.cond = "createTm>='" + tm1 + "'";
					initChartOpt.seriesOpt = {
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
				else if (id == "c2") {
					param.cond = "createTm>='" + tm2 + "'";
					param.gres = "dscr";

					initChartOpt.seriesOpt = {
						type: "pie"
					};
				}
				
			}
		});
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
}
