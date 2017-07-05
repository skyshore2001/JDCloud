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
		maxSeriesCnt: 5
	});
}
