/**
@module JdcloudStat

按日期进行数据分析统计

@see initPageStat
 */

JdcloudStat.call(window.WUI || window.MUI);
function JdcloudStat()
{
var self = this;
var WUI = self;

// 用于统计汇总字段显示
if (self.options == null)
	self.options = {};

/**
@var WUI.options.statFormatter
 */
var weekdayNames_ = "日一二三四五六日";
var sumName_ = "累计";
self.options.statFormatter = {
	sum: function (value, arr, i) {
		return sumName_;
	},
	wd: function (value, arr, i) {
		return '周' + weekdayNames_[value];
	},
	h: function (value, arr, i) {
		return value + "时";
	}
};

/**
@key JdcloudStat.tmUnit 按时间维度分析

tmUnit指定时间维度分析的类型，目前支持以下维度：

	"y,m"     年月
	"y,m,d"   年月日
	"y,m,d,h" 年月日时
	"y,w"     年周

 */

/*
@fn makeTm(tmUnit, tmArr) -> tmStr

示例：

	var tmArr = [2016, 6, 1];
	var tmStr = makeTm('y,m,d', tmArr); // '2016-6-1'

	var tmArr = [2016, 6, 1, 11];
	var tmStr = makeTm('y,m,d,h', tmArr); // '6-1 11:00'

	// 年/周，换算时，用 当年第一个周日 + 7 * 周数
	var tmArr = [2016, 23];
	var tmStr = makeTm('y,w', tmArr); // '2016-6-12'

 */
function makeTm(tmUnit, tmArr)
{
	var ret;
	if (tmUnit == 'y,m,d' || tmUnit == 'y,m') {
		ret = tmArr.join('-');
	}
	else if (tmUnit == 'y,m,d,h') {
		ret = tmArr[1] + "-" + tmArr[2] + " " + tmArr[3] + ":00";
	}
	else if (tmUnit == 'y,w') {
		// 当年第一个周一 + 7 * (周数-1), 对应mysql week()函数模式7
		var dt = firstWeek(tmArr[0]);
		var days = 7 * (parseInt(tmArr[1])-1);
		dt.addDay(days);
		ret = dt.getFullYear() + "-" + (dt.getMonth()+1) + "-" + dt.getDate();
	}
	else {
		throw "*** unknown tmUnit=" + tmUnit;
	}
	return ret;
}

// 返回该年第一个周一的日期
function firstWeek(year)
{
	var dt = new Date(year, 0, 1);
	dt.addDay( (8-dt.getDay())%7 ); // 至下周1
	return dt;
}

/*
@fn nextTm(tmUnit, tmArr) -> nextTmArr

@param tmUnit Enum('y,m,d'|'y,m,d,h'|'y,w')
@param tmArr  与tmUnit对应的时间数组。

示例：

	// 年月日
	var tmArr = [2016, 6, 1];
	var tmArr2 = nextTm('y,m,d', tmArr);
	// tmArr2 = [2016, 6, 2];

	var tmArr = [2016, 6, 30];
	var tmArr2 = nextTm('y,m,d', tmArr);
	// tmArr2 = [2016, 7, 1];

	// 年月日时
	var tmArr = [2016, 6, 30, 23];
	var tmArr2 = nextTm('y,m,d,h', tmArr);
	// tmArr2 = [2016, 7, 1, 0];

	// 年周
	var tmArr = [2016, 10];
	var tmArr2 = nextTm('y,w', tmArr);
	// tmArr2 = [2016, 11];
*/
function nextTm(tmUnit, tmArr)
{
	var tmArr2;
	if (tmUnit == 'y,m,d') {
		var dt = new Date(tmArr[0], tmArr[1]-1, tmArr[2] +1);
		tmArr2 = [ dt.getFullYear(), dt.getMonth()+1, dt.getDate() ];
	}
	else if (tmUnit == 'y,m,d,h') {
		var dt = new Date(tmArr[0], tmArr[1]-1, tmArr[2], tmArr[3] +1);
		tmArr2 = [ dt.getFullYear(), dt.getMonth()+1, dt.getDate(), dt.getHours() ];
	}
	else if (tmUnit == 'y,w') {
		// NOTE: 在makeTm中有换算，会自动计年，这时不做处理。
		tmArr2 = [ tmArr[0], tmArr[1]+1 ];
	}
	else if (tmUnit == 'y,m') {
		var dt = new Date(tmArr[0], tmArr[1]-1+1);
		tmArr2 = [ dt.getFullYear(), dt.getMonth()+1 ];
	}
	else {
		throw "*** unknown tmUnit=" + tmUnit;
	}
	return tmArr2;
}

/**
@fn WUI.rs2Stat(rs, opt?) -> statData

将table格式数据({h,d})，转换成显示统计图需要的格式。尤其是支持按时间维度组织数据，生成折线图/柱状图。

@param rs {@h, @d} RowSet数据。筋斗云框架标准数据表格式。
@param opt {formatter?=WUI.options.statFormatter[groupKey], maxSeriesCnt?, tmUnit?}  

## 有时间维度的统计数据

对于折线图/柱状图，支持由opt.tmUnit指定时间维度来组织数据，这时需要对所给数据中缺失的时间自动补全。

对输入数据rs的要求为，rs.h表头格式为 [ 时间字段, 汇总字段?, 汇总显示字段?, sum, ... ]

rs.h中前面几个为时间字段，必须与opt.tmUnit指定相符，一般是以下字段组合："y"(年),"m"(月),"d"(日),"h"(小时),"w"(周)。
例如opt.tmUnit值为"y,m,d"，则rs.h中前几个字段必须为["y","m","d"]

汇总字段0到1个，汇总显示字段0到1个。如果有汇总字段，则以“系列”的方式显示。
例如rs.h中有汇总字段和汇总显示字段["cityId", "cityName"], 则会将"北京"，"上海"这些"cityName"作为图表“系列”展示。

sum为累计值字段的名字，必须名为"sum".
sum之后字段暂不使用。

注意：rs.d中的数据必须已按时间排序，否则无法补齐缺失的时间维度。

返回数据格式为 {@xData, @yData=[{name, @data}]}, 其中xData来自时间字段;
如果有汇总，则yData包含多个系列{name, data}，否则只有一个系列且name固定为"累计". data来源于sum字段。

示例一：

	var rs = {
		h: ["y", "m", "d", "sum"], // 时间维度为 y,m,d; sum为统计值
		d: [
			[2016, 6, 29, 13],
			[2016, 7, 1, 2],
			[2016, 7, 2, 9],
		]
	}
	var statData = rs2Stat(rs, {tmUnit: "y,m,d"});

	// 结果：
	statData = {
		xData: [
			'2016-6-29', '2016-6-30', '2016-7-1', '2016-7-2' // 2016-6-30为自动补上的日期
		],
		yData: [
			{name: 'sum', data: [13, 0, 2, 9]} // 分别对应xData中每个日期，其中'2016-6-30'没有数据自动补0
		]
	}

示例二： 有汇总字段

	var rs = {
		h: ["y", "m", "d", "sex", "sum"], // 时间维度为 y,m,d; sex为汇总字段, sum为累计值
		d: [
			[2016, 6, 29, '男', 10],
			[2016, 6, 29, '女', 3],
			[2016, 7, 1, '男', 2],
			[2016, 7, 2, '男', 8],
			[2016, 7, 2, '女', 1],
		]
	}
	var statData = rs2Stat(rs, {tmUnit: "y,m,d"});

	// 结果：
	statData = {
		xData: [
			'2016-6-29', '2016-6-30', '2016-7-1', '2016-7-2' // 2016-6-30为自动补上的日期
		],
		yData: [
			{name: '男', data: [10, 0, 2, 8]}, // 分别对应xData中每个日期，其中'2016-6-30'没有数据自动补0
			{name: '女', data: [3, 0, 0, 1]} // '2016-6-30'与'2016-7-1'没有数据自动补0.
		]
	}

默认yData中的系列名(seriesName)直接使用汇总字段，但如果汇总字段后还有一列，则以该列作为显示名称。

示例三： 汇总字段"sex"后面还有一列"sexName", 因而使用sexName作为图表系列名用于显示. 而"sex"以"M","F"分别表示男女，仅做内部使用：

	var rs = {
		h: ["y", "m", "d", "sex", "sexName", "sum"], // 时间维度为 y,m,d; sex为汇总字段, sexName为汇总显示字段, sum为累计值
		d: [
			[2016, 6, 29, 'M', '男', 10],
			[2016, 6, 29, 'F', '女', 3],
			[2016, 7, 1, 'M', '男', 2],
			[2016, 7, 2, 'M', '男', 8],
			[2016, 7, 2, 'F', '女', 1],
		]
	}
	var statData = rs2Stat(rs, {tmUnit: "y,m,d"});
	// 结果：与示例二相同。

示例四： 汇总字段支持格式化，假设性别字段以'M','F'分别表示'男', '女':

	var rs = {
		h: ["y", "m", "d", "sex", "sum"], // 时间维度为 y,m,d; sex为汇总字段, sum为累计值
		d: [
			[2016, 6, 29, 'M', 10],
			[2016, 6, 29, 'F', 3],
			[2016, 7, 1, 'M', 2],
			[2016, 7, 2, 'M', 8],
			[2016, 7, 2, 'F', 1],
		]
	}
	var opt = {
		tmUnit: "y,m,d",
		// arr为当前行数组, i为统计字段在数组中的index, 即 arr[i] = value.
		formatter: function (value, arr, i) {
			return value=='M'?'男':'女';
		}
	};
	var statData = rs2Stat(rs, opt);
	// 结果：与示例二相同。

可以使用变量WUI.options.statFormatter指定全局formatter，如示例四也可以写：

	WUI.options.statFormatter = {
		sex: function (value, arr, i) {
			return value=='M'?'男':'女';
		}
	}
	var statData = rs2Stat(rs, {tmUnit: "y,m,d"});

在无汇总时，默认汇总显示为"sum"，也可以通过formatter修改，例如

	WUI.options.statFormatter = {
		sum: function (value, arr, i) {
			return '累计';
		}
	}

注意：示例三实际上在内部使用了如下formatter:

	function formatter(value, arr, i)
	{
		return arr[i+1];
	}

## 简单汇总数据

rs.h表头格式为 [汇总字段, 汇总显示字段?, sum]，表示简单汇总数据，可用于显示折线图/柱状图/饼图等。

示例：无时间字段，使用汇总字段显示为x轴数据：

	var rs = {
		h: ["wd", "sum"], // 查看每周几的注册人数
		d: [
			[1, 201],
			[2, 180],
			[3, 206],
			[4, 322],
			[5, 208],
			[6, 435],
			[0, 478],
		]
	}
	var statData = rs2Stat(rs);

	// 结果：
	statData = {
		xData: [
			'1', '2', '3', '4', '5', '6', '0'
		],
		yData: [
			{name: 'sum', data: [201, 180, 206, 322, 208, 435, 478]} // 分别对应xData中每个值
		]
	}

注意：

- 显示饼图时，echart要求data的格式为{name, value}，这将在WUI.initChart中特殊处理。

## 指定类型数据 TODO

根据opt.cols指定列类型，并转换数据。opt.cols是字符串，每个字符表示列的类型，列分为"x"列（生成x轴数据，归入xData中），"g"列（分组列，生成图表系列，yData中每项的name），"y"列（数据列，可以有多个，yData中每项的data）。
对于其它列rs2Stat不做处理，一般用字符"."表示。

示例：

- opt.cols="yy" 例如散点图原始数据格式 table("身高","体重")，将数据全部放在yData的默认系列中。
- opt.cols="gyy" 例如多系列散点图原始数据为 table("性别","身高","体重")，将性别作为系列，其它作为数据。
- opt.cols=".gyy" 例如多系列散点图原始数据为 table("cityId", "cityName","身高","体重")，第一列被忽略，第二列cityName作为系列。
- opt.cols="xyyyy" 例如k线图数据 table("日期", "开","收","低","高")
- opt.cols=".xy" 例如饼图数据 table("cityId", "cityName", "sum")

## 参数说明

@param opt.formatter 可对汇总数据进行格式化。Function(value, arr, i). 

- value: 当前汇总字段的值
- arr: 当前行数组
- i: 汇总字段的数组index, 即 arr[i]=value

@param opt.tmUnit 如果非空，表示按指定时间维度分析。参考[JdcloudStat.tmUnit]().

@param opt.maxSeriesCnt?=10

指定此选项，则按sum倒排序，取前面的maxSeriesCnt项seriesName用于展示，剩余的项归并到“其它”中。

@return statData { @xData, @yData=[{name=seriesName, data=@seriesData}]  }

与echart结合使用示例可参考 initChart. 原理如下：

	var option = {
		...
		legend: {
			data: getSeriesNames(statData.yData) // 取yData中每项的name
		},
		xAxis:  {
			type: 'category',
			boundaryGap: false,
			data: statData.xData
		},
		yAxis: {
			type: 'value',
			axisLabel: {
				formatter: '{value}'
			}
		},
		series: statData.yData
	};
	myChart.setOption(option);

*/
self.rs2Stat = rs2Stat;
function rs2Stat(rs, opt)
{
	var xData = [], yData = [];
	var ret = {xData: xData, yData: yData};

	if (rs.d.length == 0) {
		return ret;
	}

	opt = $.extend({
		maxSeriesCnt: 10
	}, opt);
	var tmCnt = 0; // 时间字段数，e.g. y,m,d => 3; y,w=>2
	var tmUnit = opt.tmUnit;
	if (tmUnit) {
		tmCnt = tmUnit.split(',').length;
		WUI.assert(tmUnit == rs.h.slice(0, tmCnt).join(','), "*** time fields does not match. expect " + tmUnit);
	}

	var sumIdx = tmCnt;
	var groupIdx = -1;
	// 有汇总字段, groupIdx有值
	if (rs.h[sumIdx] != 'sum') {
		groupIdx = sumIdx;
		++ sumIdx;
	}
	// 有汇总显示字段
	if (rs.h[sumIdx] != 'sum') {
		opt.formatter = function (value, arr, i) {
			return arr[i+1];
		};
		++ sumIdx;
	}
	WUI.assert(rs.h[sumIdx] == 'sum', "*** cannot find sum column");

	if (opt.formatter == null && self.options.statFormatter) {
		var groupField = groupIdx<0? 'sum': rs.h[groupIdx];
		opt.formatter = self.options.statFormatter[groupField];
	}

	if (tmCnt == 0) {
		var yArr = [];
		yData.push({name: sumName_, data: yArr});
		$.each(rs.d, function (i, e) {
			var g = getGroupName(e[0], e, 0);
			var y = parseFloat(e[sumIdx]);
			xData.push(g);
			yArr.push(y);
		});
		return ret;
	}

	var othersName = "其它";
	var othersIdx = -1; // <0表示不归并数据到系列"其它"
	// 如果是分组统计，则按sum倒序排序，且只列出rs.d中最多的opt.maxSeriesCnt项，其它项归并到“其它”中。
	if (groupIdx >= 0) {
		var tmpData = {}; // {groupName => sum}
		$.each(rs.d, function (i, e) {
			var k = getGroupName(e[groupIdx], e, groupIdx);
			var v = e[sumIdx];
			if (tmpData[k] === undefined)
				tmpData[k] = v;
			else
				tmpData[k] += v;
		});
		for (var k in tmpData) {
			yData.push({
				name: k, 
				data: []
			});
		}
		// 由大到小排序，取前maxSeriesCnt项
		yData.sort(function (a, b) {
			return tmpData[b.name] - tmpData[a.name];
		});
		if (yData.length > opt.maxSeriesCnt) {
			yData.length = opt.maxSeriesCnt;
			yData.push({
				name: othersName,
				data: []
			});
			othersIdx = yData.length-1;
		}
	}

	var lastX = null;
	var lastTmArr = null;
	$.each (rs.d, function (i, e) {
		// 自动补全日期
		var tmArr = e.slice(0, tmCnt);
		if (tmArr[0] == null)
			return;
		var x = makeTm(tmUnit, tmArr);
		if (x != lastX) {
			if (lastX != null) {
				while (1) {
					lastTmArr = nextTm(tmUnit, lastTmArr);
					var nextX = makeTm(tmUnit, lastTmArr);
					xData.push(nextX);
					if (x == nextX)
						break;
				}
			}
			else {
				xData.push(x);
			}
			lastTmArr = tmArr;
			lastX = x;
		}
		var groupKey = groupIdx<0? 'sum': e[groupIdx];
		var groupName = getGroupName(groupKey, e, groupIdx);
		var groupVal = parseFloat(e[sumIdx]);

		var rv = $.grep(yData, function (a, i) { return a.name == groupName; });
		var y;
		if (rv.length > 0) { // 系列已存在
			y = rv[0].data;
		}
		else if (othersIdx < 0) { // 增加新系列
			y = [];
			yData.push({
				name: groupName,
				data: y
			});
		}
		else { // 使用"其它"系列
			y = yData[othersIdx].data;
		}
		var padCnt = xData.length-y.length-1;
		while (padCnt -- > 0) {
			// 按时间分析时，补上的日期处填0 (use '-'?)
			y.push(0);
		}
		y.push(groupVal);
	});

	return ret;

	function getGroupName(groupKey, lineArr, groupIdx)
	{
		if (opt.formatter) {
			var val = opt.formatter(groupKey, lineArr, groupIdx);
			if (val !== undefined)
				groupKey = val;
		}
		return num2str(groupKey);
	}
	// 修改纯数字属性, 避免影响字典内排序。
	function num2str(k)
	{
		if (k == null || /\D/.test(k))
			return k;
		return k + '.';
	}
}

/*
遍历jo对象中带name属性的各组件，生成统计请求的参数，发起统计请求(callSvr)，显示统计图表(rs2Stat, initChart)。

initPageStat函数是对本函数的包装。参数可参考initPageStat函数。

示例：

	<input name="tm" data-op=">=" value="2016-6-20">
	<input name="actId" value="3">

代表查询条件：

	{cond: "tm>='2016-6-20' and actId=3", ...}

- 属性data-op可表示操作符
*/
function runStat(jo, jcharts, setStatOpt)
{
	var condArr = [];
	WUI.formItems(jo, function (name, val) {
		var ji = this;

		if (val == null || val == "" || val == "无" || val == "全部")
			return;

		// fix for easyui-datetimebox
		if (ji.is(".textbox-value")) {
			ji = ji.parent().prev(".textbox-f");
		}
		var op = ji.attr('data-op');
		if (op) {
			val = op + ' ' + val;
		}
		condArr.push([name, val]);
	});

	var condStr = WUI.getQueryCond(condArr);
	// 多个请求时自动批量发送
	if (jcharts.size() > 1) {
		WUI.useBatchCall();
	}
	jcharts.each(function (chartIdx, chart) {
		var jchart = $(chart);

		var param = {
			res: "COUNT(*) sum",
			cond: condStr,
			pagesz: -1
		};

		$.each(["ac", "res"], function () {
			var val = jchart.attr("data-" + this);
			if (val)
				param[this] = val;
		});

		var opt = {
			chartOpt: {},
			seriesOpt: {},
			queryParam: param,
			tmUnit: null,
			g: null,
			gname: null
		};
		setStatOpt.call(jchart, chartIdx, opt);
		WUI.assert(param.ac, '*** no ac specified');

		if (opt.tmUnit)
			param.orderby = param.gres = opt.tmUnit;

		if (opt.g) {
			if (param.gres)
				param.gres += ',' + opt.g;
			else
				param.gres = opt.g;

			if (opt.gname) {
				param.res = opt.gname + ',' + param.res;
			}
		}

		WUI.callSvr(param.ac, api_stat, param);

		function api_stat(data)
		{
			var rs2StatOpt = {
				maxSeriesCnt: opt.maxSeriesCnt,
				tmUnit: opt.tmUnit,
				formatter: opt.formatter
			};
			var statData = rs2Stat(data, rs2StatOpt);
			opt.onLoadData && opt.onLoadData.call(jchart, chartIdx, statData, opt);
			initChart(chart, statData, opt.seriesOpt, opt.chartOpt);
		}
	});
}

/**
@fn WUI.initChart(chartTable, statData, seriesOpt, chartOpt)

初始化报表

@see WUI.rs2Stat, WUI.initPageStat
 */
self.initChart = initChart;
function initChart(chartTable, statData, seriesOpt, chartOpt)
{
	var myChart = echarts.init(chartTable);
	var legendAry;
	var seriesAry;

	var seriesOpt1 = $.extend(true, {
		type: 'line',
	}, seriesOpt);

	var chartOpt0;
	if (seriesOpt1.type == 'line' || seriesOpt1.type == 'bar') {
		// 如果没有系列则不显示系列
		if (! (statData.yData.length == 1 && statData.yData[0].name == sumName_)) {
			legendAry = $.map (statData.yData, function (e, i) {
				return e.name;
			});
		}

		seriesAry = $.map (statData.yData, function (e, i) {
			return $.extend(e, seriesOpt1);
		});

		chartOpt0 = {
			tooltip: {
				trigger: 'axis'
			},
			xAxis:  {
				type: 'category',
				data: statData.xData
			},
			yAxis: {
				type: 'value',
				axisLabel: {
					formatter: '{value}'
				}
			},
		};
	}
	else if (seriesOpt1.type == 'pie') {
		WUI.assert(statData.yData.length <= 1, "*** 饼图应只有一个系列");
		legendAry = statData.xData;
		seriesAry = [
			$.extend(statData.yData[0], seriesOpt1)
		];
		// data格式 [value] 转为 [{name, value}], 同时设置legendAry
		seriesAry[0].data = $.map(seriesAry[0].data, function (e, i) {
			var g = statData.xData[i];
			return {name: g, value: e};
		});
		chartOpt0 = {
			tooltip : {
				trigger: 'item',
				formatter: "{b}: {c} ({d}%)"
			},
		};
	}

	var chartOpt1 = $.extend(true, {
		legend: {
			data: legendAry
		},
		series: seriesAry
	}, chartOpt0, chartOpt);

	myChart.setOption(chartOpt1, true); // true: 清除之前设置过的选项
	chartTable.echart = myChart;
}

/**
@fn WUI.initPageStat(jpage, setStatOpt) -> statItf

通用统计页模式

- 查询条件区，如起止时间
- 生成统计图按钮
- 一个或多个图表，每个图表可设置不同的查询条件、时间维度等。

html示例:

	<div wui-script="pageUserRegStat.js" title="用户注册统计" my-initfn="initPageUserRegStat">
		开始时间 
		<input type="text" name="createTm" data-op=">=" data-options="showSeconds:false" class="easyui-datetimebox txtTm1">
		结束时间
		<input type="text" name="createTm" data-op="<" data-options="showSeconds:false" class="easyui-datetimebox txtTm2">
		快捷时间选择
		<select class="txtTmRange">
			<option value ="近8周">近8周</option>
			<option value ="近6月">近6月</option>
		</select>

		各种过滤条件：
		性别:
		<select name="sex">
			<option value ="">全部</option>
			<option value ="男">男</option>
			<option value ="女">女</option>
		</select>
		地域:
		<select name="region" class="my-combobox" data-options="valueField:'id',textField:'name',url:WUI.makeUrl(...)"></select>

		汇总字段:
		<select id="g">
			<option value ="">无</option>
			<option value ="sex">性别</option>
			<option value="region">地域</option>
		</select>

		<input type="button" value="生成" class="btnStat"/>

		时间维度类型：
		<select id="tmUnit">
			<option value="y,w">周报表</option>
			<option value="y,m">月报表</option>
		</select>

		统计图：
		<div class="divChart" data-ac="User.query"></div>
	</div>

遍历jpage中带name属性的各组件，生成统计请求的参数，调用接口获取统计数据并显示统计图表.

- 报表组件.divChart上，可以用data-ac属性指定调用名，用data-res属性指定调用的res参数(默认为"COUNT(*) sum")，更多参数可通过setStatOpt(...opt)回调函数动态设置opt.queryParam参数。
 可以用 jpage.find(".divChart")[0].echart 来取 echart对象.
- 生成图表的按钮组件 .btnStat
- 带name属性（且没有disabled属性）的组件，会自动生成查询条件(根据name, data-op, value生成表达式)
- 组件.txtTm1, .txtTm2识别为起止时间，可以用过 statItf.setTmRange()去重设置它们，或放置.txtTmRange下拉框组件自动设置

初始化示例：

	var statItf_ = WUI.initPageStat(jpage, setStatOpt);
	
	function setStatOpt(chartIdx, opt) 
	{
		// this是当前chart的jquery对象，chartIdx为序号，依此可针对每个chart分别设置参数

		// 设置查询参数param.ac/param.res/param.cond等
		var param = opt.queryParam;
		param.cond += ...;

		// 设置时间维度，汇总字段
		opt.tmUnit = jpage.find("#tmUnit").val();
		opt.g = jpage.find("#g").val();

		// 设置echarts参数
		var chartOpt, seriesOpt;
		if (chartIdx == 0) {
			chartOpt = { ... };
			seriesOpt = { ... };
		}
		else if (chartIdx == 1) {
			chartOpt = { ... };
			seriesOpt = { ... };
		}

		$.extend(true, opt, {
			chartOpt: chartOpt,
			seriesOpt: seriesOpt,
		});
	}

@param setStatOpt(chartIdx, opt) 回调设置每个chart. this为当前chart组件，chartIdx为当前chart的序号，从0开始。

@param opt={tmUnit?, g?, gname?, queryParam, chartOpt, seriesOpt, onLoadData?, maxSeriesCnt?, formatter?}

@param opt.tmUnit Enum. 时间维度
如果非空，则按时间维度分析，即按指定时间类型组织横轴数据，会补全时间。参考[JdcloudStat.tmUnit]()
如果设置，它会自动设置 opt.queryParam 中的gres/orderby参数。

@param opt.g 分组字段名
会影响opt.queryParam中的gres选项。

@param opt.gname 分组字段显示名。
有时分组字段使用xxxId字段，但希望显示时用xxxName字段，这时可以设置gname选项，它会影响opt.queryParam中的res选项。

示例，按场景分组显示日报表：

	opt.tmUnit = "y,m,d"; // 日报表
	opt.g = "sceneId";
	opt.gname = "sceneName";
	
这样生成的opt.queryParam中: 

	gres="y,m,d,dramaId";
	orderby="y,m,d";
	res="dramaName,COUNT(*) sum";

@param opt.queryParam 接口查询参数
可以设置ac, res, gres, cond, orderby, pagesz等筋斗云框架通用查询参数，或依照接口文档设置。
设置opt.tmUnit/opt.g/opt.gname会自动设置其中部分参数。

此外 ac, res参数也可通过在.divChart组件上设置data-ac, data-res属性，如

	<div class="divChart" data-ac="Ordr.query" data-res="SUM(amount) sum"></div>

关于接口返回数据到图表数据转换，参考rs2Stat函数：
@see WUI.rs2Stat 

@param opt.chartOpt, opt.seriesOpt 
参考百度echarts全局参数以及series参数: http://echarts.baidu.com/echarts2/doc/doc.html

@param opt.onLoadData(statData, opt) 处理统计数据后、显示图表前回调。

this为当前图表组件(jchart对象)。常用于根据统计数据调整图表显示，修改opt中的chartOpt, seriesOpt选项即可。

@param opt.maxSeriesCnt?=10 
最多显示多少图表系列（其它系列自动归并到“其它”中）。参考rs2Stat函数同名选项。

@param opt.formatter 
对汇总数据进行格式化显示。参考 rs2Stat函数同名选项。
@see WUI.rs2Stat

@return statItf={refreshStat(), setTmRange(desc)} 统计页接口

refreshStat()用于显示或刷新统计图。当调用initPageStat(jpage)且jpage中有.btnStat组件时，会自动点击该按钮以显示统计图。
setTmRange(desc)用于设置jpage中的.txtTm1, .txtTm2两个文本框，作为起止时间。

@see WUI.getTmRange

@see WUI.initChart　显示图表

也可以调用WUI.initChart及WUI.rs2Stat自行设置报表，示例如下：

	var jcharts = jpage.find(".divChart");
	var tmUnit = "y,m"; // 按时间维度分析，按“年月”展开数据
	var cond = "tm>='2016-1-1' and tm<'2017-1-1'";
	// WUI.useBatchCall(); // 如果有多个报表，可以批量调用后端接口
	// 会话访问量
	callSvr("ApiLog.query", function (data) {
		var jchart = jcharts[0];
		var opt = { tmUnit: tmUnit };
		var statData = WUI.rs2Stat(data, opt);
		var seriesOpt = {};
		var chartOpt = {
			title: {
				text: "访问量（会话数）"
			},
			legend: null
		};

		WUI.initChart(jchart, statData, seriesOpt, chartOpt);
	}, {res: "COUNT(distinct ses) sum", gres: tmUnit, orderby: tmUnit, cond: cond });

*/
self.initPageStat = initPageStat;
function initPageStat(jpage, setStatOpt)
{
	var txtTmRange = jpage.find(".txtTmRange");
	if (txtTmRange.size() > 0) {
		txtTmRange.change(function () {
			setTmRange(this.value);
		});
		txtTmRange.change();
	}
	var btnStat = jpage.find(".btnStat");
	if (btnStat.size() > 0) {
		setTimeout(function () {
			btnStat.click(refreshStat).click();
		});
	}

	function setTmRange(dscr)
	{
		var tm2 = jpage.find(".txtTm2").datetimebox("getValue");
		var range = getTmRange(dscr, tm2);
		if (range) {
			jpage.find(".txtTm1").datetimebox("setValue",range[0]);
			jpage.find(".txtTm2").datetimebox("setValue",range[1]);
		}
	}

	// 防止连续调用
	var busy_ = false;
	function refreshStat()
	{
		if (busy_)
			return;
		busy_ = true;

		var jcharts = jpage.find(".divChart");
		runStat(jpage, jcharts, setStatOpt);

		setTimeout(function () {
			busy_ = false;
		}, 10);
	}
	return {
		refreshStat: refreshStat,
		setTmRange: setTmRange
	}
}

/**
@fn WUI.getTmRange(dscr, now?)

假设今天是2015-9-9 周三：

	getTmRange("近1周") -> ["2015-9-2"，""]
	getTmRange("前1周") -> ["2015-8-31"(上周一)，"2015-9-7"(本周一)]
	getTmRange("近3月") -> ["2015-6-9", ""]
	getTmRange("前3月") -> ["2015-6-1", "2015-9-1"]

dscr可以是 

	"近|前" N "个"? "小时|日|周|月|年"

 */
self.getTmRange = getTmRange;
function getTmRange(dscr, now)
{
	var re = /(近|前)(\d+).*?(小时|日|天|月|周|年)/;
	var m = dscr.match(re);
	if (! m)
		return;
	
	if (! now)
		now = new Date();
	else if (! (now instanceof Date)) {
		now = WUI.parseDate(now);
	}
	var dt1, dt2, dt;
	var type = m[1];
	var n = parseInt(m[2]);
	var u = m[3];
	var fmt_d = "yyyy-mm-dd";
	var fmt_h = "yyyy-mm-dd HH:00";
	var fmt_m = "yyyy-mm-01";
	var fmt_y = "yyyy-01-01";

	if (u == "小时") {
		dt2 = now.format(fmt_h);
		dt1 = now.add("h", -n).format(fmt_h);
	}
	else if (u == "日" || u == "天") {
		dt2 = now.format(fmt_h);
		dt1 = now.add("d", -n).format(fmt_h);
	}
	else if (u == "月") {
		if (type == "近") {
			dt2 = now.format(fmt_d);
			//dt1 = now.add("m", -n).format(fmt_d);
			now = WUI.parseDate(now.format(fmt_m)); // 回到1号
			dt1 = now.add("m", -n).format(fmt_m);
		}
		else if (type == "前") {
			dt2 = now.format(fmt_m);
			dt1 = WUI.parseDate(dt2).add("m", -n).format(fmt_m);
		}
	}
	else if (u == "周") {
		if (type == "近") {
			dt2 = now.format(fmt_d);
			now.add("d", -now.getDay()+1); // 回到周1
			dt1 = now.add("d", -n*7).format(fmt_d);
		}
		else if (type == "前") {
			dt2 = now.add("d", -now.getDay()+1).format(fmt_d);
			dt1 = now.add("d", -7*n).format(fmt_d);
		}
	}
	else if (u == "年") {
		if (type == "近") {
			dt2 = now.format(fmt_d);
			now = WUI.parseDate(now.format(fmt_y)); // 回到1/1
			dt1 = now.add("y", -n).format(fmt_d);
		}
		else if (type == "前") {
			dt2 = now.format(fmt_y);
			dt1 = WUI.parseDate(dt2).add("y", -n).format(fmt_y);
		}
	}

	return [dt1, dt2];
}

}

