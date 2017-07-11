/**
@module JdcloudStat

按日期进行数据分析统计

@see initPageStat
 */

JdcloudStat.call(WUI);
function JdcloudStat()
{
var self = this;

// 用于统计汇总字段显示
if (self.options == null)
	self.options = {};

/**
@var WUI.options.statFormatter
 */
self.options.statFormatter = {
	sum: function (value, arr, i) {
		return '累计';
	},
	wd: function (value, arr, i) {
		return '周' + value;
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
		// 当年第一个周日 + 7 * 周数
		var dt = new Date(tmArr[0], 0, 1);
		while (dt.getDay() != 0) {
			dt.setDate(dt.getDate() +1);
		}
		dt.setDate(dt.getDate() + 7 * parseInt(tmArr[1]));
		ret = dt.getFullYear() + "-" + (dt.getMonth()+1) + "-" + dt.getDate();
	}
	else {
		throw "*** unknown tmUnit=" + tmUnit;
	}
	return ret;
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
@fn rs2Stat(rs, opt?) -> statData

@param rs {@h, @d} RowSet数据。
@param opt {formatter?=WUI.options.statFormatter[groupKey], maxSeriesCnt, tmUnit}  可对汇总数据进行格式化。参考示例四。
@param opt.tmUnit 如果非空，表示按指定时间维度分析。参考[JdcloudStat.tmUnit]().

将按日期统计返回的数据，生成统计图需要的统计数据。

对输入数据rs的要求：

- rs.h为表头，格式为 [ 时间字段?, 汇总字段?, 汇总显示字段?, sum, ... ]

	如果指定opt.tmUnit，则rs.h前面几个为与opt.tmUnit指定相符的时间字段，一般是以下字段组合："y"(年),"m"(月),"d"(日),"h"(小时),"w"(周)。

	汇总字段0到1个，汇总显示字段0到1个。当有时间字段时，汇总字段以“系列”方式显示，否则显示在x轴上。
	sum为累计值字段的名字，暂定死为"sum".

- rs.d中的数据已按时间排序。

@param opt.maxSeriesCnt?=10

指定此选项，则按sum倒排序，取前面的maxSeriesCnt项seriesName用于展示，剩余的项归并到“其它”中。

@return statData { @xData, @yData=[{name=seriesName, data=@seriesData}]  }

生成数据时要求：

- xData一般为日期数据；yData为一个或多个统计系列。
- 对rs.d中缺失日期的数据需要补0.
- 如果有汇总字段，则最终返回的yData中的seriesName的值为汇总字段值（或者如果有“汇总字段显示名”这列，则使用这列值），否则yData中只有一个系列，且seriesName固定使用'SUM'.
- 如果在汇总字段后sum字段前还有一列，则以该列作为汇总系列的名称(seriesName). 参考示例三。

- 可通过opt.formatter对汇总字段进行格式化。参考示例四。

	opt.formatter: Function(value, arr, i). 
	- value: 当前汇总字段的值
	- arr: 当前行数组
	- i: 汇总字段的数组index, 即 arr[i]=value

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

示例五：无时间字段，使用汇总字段显示为x轴数据：

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
		self.assert(tmUnit == rs.h.slice(0, tmCnt).join(','), "*** time fields does not match. expect " + tmUnit);
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
	self.assert(rs.h[sumIdx] == 'sum', "*** cannot find sum column");

	if (opt.formatter == null && self.options.statFormatter) {
		var groupField = groupIdx<0? 'sum': rs.h[groupIdx];
		opt.formatter = self.options.statFormatter[groupField];
	}

	if (tmCnt == 0) {
		var yArr = [];
		yData.push({name: '累计', data: yArr});
		$.each(rs.d, function (i, e) {
			var x0 = e[0];
			var x = getGroupName(e[0], e, 0);
			var y = parseFloat(e[sumIdx]);
			xData.push(x);
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
@fn runStat(jo, jchart, opt?)

根据页面中带name属性的各控制设置情况，生成统计请求的参数，发起统计请求，显示统计图表。

@param opt 参考initPageStat中的opt参数。
@param opt.tmUnit Enum. 如果非空，则按时间维度分析，即按指定时间类型组织横轴数据，会补全时间。参考[JdcloudStat.tmUnit]()

注意：

- jo属性data-op可表示操作符
- 名称"g"表示汇总字段(groupKey)。

示例：

	<input name="tm" data-op=">=" value="2016-6-20">
	<input name="actId" value="3">
	<input name="g" value="dramaId">

代表查询条件：

	{cond: "tm>='2016-6-20' and actId=3", g: "dramaId", ...}

*/
function runStat(jo, jchart, opt)
{
	var cond = [];
	var groupKey = null;
	jo.find('[name]').each(function (i, e) {
		var name = e.name;
		var jo = $(e);
		var val = null;

		if (jo.is(".textbox-value")) {
			jo = jo.parent().prev();
			val = jo.datetimebox('getValue') || jo.datetimebox('getText');
		}
		else
			val = jo.val();

		if (val == null || val == "" || val == "无" || val == "全部")
			return;
		if (name == 'g')
			groupKey = val;
		else  {
			var op = jo.attr('data-op');
			if (op) {
				val = op + ' ' + val;
			}
			cond.push([name, val]);
		}
	});

	var param = {
		res: "count(*) sum",
		_pagesz: -1
	};
	if (opt.tmUnit) {
		param.orderby = param.gres = opt.tmUnit;
	}
	param.cond = WUI.getQueryCond(cond);
	if (groupKey) {
		param.g = groupKey;
		if (param.gres)
			param.gres += ',' + groupKey;
		else
			param.gres = groupKey;

		var groupName = opt && opt.groupNameMap && opt.groupNameMap[groupKey];
		if (groupName) {
			param.res = groupName + ',' + param.res;
		}
	}
	param.ac = jo.attr('data-ac');
	if (opt && opt.onGetQueryParam) {
		opt.onGetQueryParam(jo, param);
	}
	self.assert(param.ac, '*** no ac specified');

	callSvr(param.ac, function(data){
		var statData = rs2Stat(data, opt);
		initChart(jchart[0], statData, opt.seriesOpt, opt.chartOpt);
	}, param);
}

/*
@fn initChart
 */
function initChart(chartTable, statData, seriesOpt, chartOpt)
{
	var myChart = echarts.init(chartTable);
	var legendAry = [];
	var seriesAry = [];

	var seriesOpt1 = $.extend(true, {
		type: 'line',
	}, seriesOpt);

	$.each (statData.yData, function (i, e) {
		legendAry.push(e.name);
		seriesAry.push($.extend(e, seriesOpt1));
	});

	var chartOpt1 = $.extend(true, {
		title: {
			text: statData.xData.length==0? '暂无数据': '',
			left: 60
		},
		tooltip: {
			trigger: 'axis'
		},
		legend: {
			data: legendAry
		},
		toolbox: {
			show: true,
			feature: {
				dataZoom: {},
				dataView: {readOnly: false},
				magicType: {type: ['line', 'bar']},
				restore: {},
				saveAsImage: {}
			}
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
		series: seriesAry
	}, chartOpt);

	myChart.setOption(chartOpt1);
}

/**
@fn initPageStat(jpage, opt?)

@param opt={onGetQueryParam?, groupNameMap?, initTmRange?, seriesOpt?, chartOpt?}

@param opt.chartOpt,opt.seriesOpt 参考百度echarts全局参数以及series参数。http://echarts.baidu.com/echarts2/doc/doc.html

通用统计页模式

- 日期段为 .txtTm1, .txtTm2
- 图表为 .divChart
- 按钮 .btnStat, .btnStat2 用于生成图线，其中btnStat2用于“按时间分析”，即横轴以天或周等时间类型组织数据。
 如果没有具有".btnStat2.active"类的对象（或该对象未显示），则数据不会按时间分析。

html示例:

	<div wui-script="pageUserRegStat.js" title="用户注册统计" my-initfn="initPageUserRegStat" data-ac="User.query">
		开始时间 <input type="text" name="tm" data-op=">=" class="txtTm1"/>
		结束时间 <input type="text" name="tm" data-op="<" class="txtTm2"/>

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
		<select name="g">
			<option value ="">无</option>
			<option value ="sex">性别</option>
			<option value="region">地域</option>
		</select>

		<input type="button" value="生成" class="btnStat"/>

		统计图：
		<div class="divChart"></div>

		<div style="text-align: right">
			<input type="button" value="时" class="btnStat2"/>
			<input type="button" value="天" class="btnStat2 active"/>
			<input type="button" value="周" class="btnStat2"/>
			<input type="button" value="月" class="btnStat2" />
		</div>
	</div>

- 调用参数ac可通过jpage上的data-ac属性指定，其它参数自动生成，也可通过opt.onGetQueryParam动态设置。

@param opt.onGetQueryParam: Function(jo, param).

@param opt.groupNameMap

如果有分组字段，一般按xxxId字段进行分组，但显示时应显示名字，需要给groupNameMap参数，如：

	initPageStat(jpage, {
		groupNameMap: {
			dramaId: 'dramaName',
			actId: 'actName',
			sceneId: 'sceneName'
		}
	});

这意味着，当选择按剧目名分组显示日报表时，g="dramaId", gres="y,m,d,dramaId", res="dramaName,y,m,d"。

@param opt.initTmRange 描述字段，如"近7天","前1月"等，参考getTmRange.
*/
self.initPageStat = initPageStat;
function initPageStat(jpage, opt)
{
	jpage.find(".my-combobox").mycombobox();

	jpage.find(".txtTm1, .txtTm2").datetimebox();

	var txtTmRange = jpage.find(".txtTmRange").change(function () {
		setTmRange(this.value);
	});
	var rangeDesc = opt.initTmRange || (txtTmRange.size() >0 && txtTmRange.val());
	if (! rangeDesc)
		rangeDesc = "近7天";
	setTmRange(rangeDesc);

	jpage.find(".btnStat2").click(btnStat2_Click);
	jpage.find(".btnStat").click(btnStat_Click).click();

	function setTmRange(dscr)
	{
		var range = getTmRange(dscr);
		if (range) {
			jpage.find(".txtTm1").datetimebox("setText",range[0]);
			jpage.find(".txtTm2").datetimebox("setText",range[1]);
		}
	}
	function btnStat_Click()
	{
		var type = jpage.find(".btnStat2.active:visible").val();
		var opt1 = $.extend({}, opt);
		if (type) {
			var tmUnitMapping = {
				"时": "y,m,d,h",
				"天": "y,m,d",
				"周": "y,w",
				"月": "y,m"
			};
			opt1.tmUnit = tmUnitMapping[type];
			self.assert(!opt.tmUnit, "*** unknown time dimension `" + type + "'");
		}

		var jchart = jpage.find(".divChart");
		runStat(jpage, jchart, opt1);
	}

	function btnStat2_Click()
	{
		var type = this.value;
		jpage.find(".btnStat2").removeClass("active");
		jpage.find(".btnStat2[value='" + type + "']").addClass("active");
		btnStat_Click();
	}
}

/**
假设今天是2015-9-9 周三：

	getTmRange("近1周") -> ["2015-9-2"，""]
	getTmRange("前1周") -> ["2015-8-31"(上周一)，"2015-9-7"(本周一)]
	getTmRange("近3月") -> ["2015-6-9", ""]
	getTmRange("前3月") -> ["2015-6-1", "2015-9-1"]

dscr可以是 

	"近|前" N "小时|日|周|月|年"

 */
self.getTmRange = getTmRange;
function getTmRange(dscr)
{
	var re = /(近|前)(\d+)(小时|日|天|月|周|年)/;
	var m = dscr.match(re);
	if (! m)
		return;
	
	var now = new Date();
	var dt1, dt2;
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
			dt1 = now.add("m", -n).format(fmt_d);
		}
		else if (type == "前") {
			dt2 = now.format(fmt_m);
			dt1 = self.parseDate(dt2).add("m", -n).format(fmt_m);
		}
	}
	else if (u == "周") {
		if (type == "近") {
			dt2 = now.format(fmt_d);
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
			dt1 = now.add("y", -n).format(fmt_d);
		}
		else if (type == "前") {
			dt2 = now.format(fmt_y);
			dt1 = self.parseDate(dt2).add("y", -n).format(fmt_y);
		}
	}

	return [dt1, dt2];
}

}

