function initPageApiLogStat()
{
	var jpage = $(this);

	ListOptions.Ac = function () {
		var opt = {
			valueField: 'ac',
			textField:'ac',
			url:WUI.makeUrl('ApiLog.query', {res: "ac", distinct: 1, wantArray:1}),
		};
		return opt;
	};

	WUI.initPageStat(jpage, {
		maxSeriesCnt: 5,
		onGetQueryParam: function (jo, param) {
			if (param.orderby == null) {
				param.orderby = "sum DESC";
				param.pagesz = 10;
			}
		},
		chartOpt: function (param, statData) {
			var opt = {};
			// x轴数据不多时全部显示
			if (statData.xData.length <= 20) {
				opt.xAxis = {
					axisLabel: { interval: 0, rotate: 30 }
				}
			}
			return opt;
		}
	});
}
