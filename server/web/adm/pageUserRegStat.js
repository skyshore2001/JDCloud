function initPageUserRegStat()
{
	var jpage = $(this);
	WUI.initPageStat(jpage, {
		groupNameMap: {
			"sex": "sexName"
		},
		seriesOpt: {
			// type:'line',
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
		}
	});
}

