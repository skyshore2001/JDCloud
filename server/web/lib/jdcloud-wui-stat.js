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
	}
};

/*
@fn makeTm(tmUnit, tmArr) -> tmStr

示例：

	var tmArr = [2016, 6, 1];
	var tmStr = makeTm('ymd', tmArr); // '2016-6-1'

	var tmArr = [2016, 6, 1, 11];
	var tmStr = makeTm('ymdh', tmArr); // '6-1 11:00'

	// 年/周，换算时，用 当年第一个周日 + 7 * 周数
	var tmArr = [2016, 23];
	var tmStr = makeTm('yw', tmArr); // '2016-6-12'

 */
function makeTm(tmUnit, tmArr)
{
	var ret;
	if (tmUnit == 'ymd' || tmUnit == 'ym') {
		ret = tmArr.join('-');
	}
	else if (tmUnit == 'ymdh') {
		ret = tmArr[1] + "-" + tmArr[2] + " " + tmArr[3] + ":00";
	}
	else if (tmUnit == 'yw') {
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

@param tmUnit Enum('ymd'|'ymdh'|'yw')
@param tmArr  与tmUnit对应的时间数组。

示例：

	// 年月日
	var tmArr = [2016, 6, 1];
	var tmArr2 = nextTm('ymd', tmArr);
	// tmArr2 = [2016, 6, 2];

	var tmArr = [2016, 6, 30];
	var tmArr2 = nextTm('ymd', tmArr);
	// tmArr2 = [2016, 7, 1];

	// 年月日时
	var tmArr = [2016, 6, 30, 23];
	var tmArr2 = nextTm('ymdh', tmArr);
	// tmArr2 = [2016, 7, 1, 0];

	// 年周
	var tmArr = [2016, 10];
	var tmArr2 = nextTm('yw', tmArr);
	// tmArr2 = [2016, 11];
*/
function nextTm(tmUnit, tmArr)
{
	var tmArr2;
	if (tmUnit == 'ymd') {
		var dt = new Date(tmArr[0], tmArr[1]-1, tmArr[2] +1);
		tmArr2 = [ dt.getFullYear(), dt.getMonth()+1, dt.getDate() ];
	}
	else if (tmUnit == 'ymdh') {
		var dt = new Date(tmArr[0], tmArr[1]-1, tmArr[2], tmArr[3] +1);
		tmArr2 = [ dt.getFullYear(), dt.getMonth()+1, dt.getDate(), dt.getHours() ];
	}
	else if (tmUnit == 'yw') {
		// NOTE: 在makeTm中有换算，会自动计年，这时不做处理。
		tmArr2 = [ tmArr[0], tmArr[1]+1 ];
	}
	else if (tmUnit == 'ym') {
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
@param opt {formatter?=WUI.options.statFormatter[groupKey]}  可对汇总数据进行格式化。参考示例四。

将按日期统计返回的数据，生成统计图需要的统计数据。

对输入数据rs的要求：

- rs.h为表头，格式为 [ 时间字段, sum ] 或 [ 时间字段, 汇总字段, 汇总字段显示值?, sum, ... ]

	时间字段可以是以下一到多个："y"(年),"m"(月),"d"(日),"h"(小时),"w"(周), 目前支持以下时间序列字段：

	 - y,m,d - 年月日
	 - y,m,d,h - 年月日时
	 - y,w - 年周

	sum为累计值字段的名字，暂定死为"sum".

- rs.d中的数据已按时间排序。

@return statData { @xData, %yData={seriesName => @seriesData }  }

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
		h: ["y", "m", "d", "sum"], // 时间序列为 y,m,d; sum为统计值
		d: [
			[2016, 6, 29, 13],
			[2016, 7, 1, 2],
			[2016, 7, 2, 9],
		]
	}
	var statData = rs2Stat(rs);

	// 结果：
	statData = {
		xData: [
			'2016-6-29', '2016-6-30', '2016-7-1', '2016-7-2' // 2016-6-30为自动补上的日期
		],
		yData: {
			'sum': [13, 0, 2, 9], // 分别对应xData中每个日期，其中'2016-6-30'没有数据自动补0
		}
	}

示例二： 有汇总字段

	var rs = {
		h: ["y", "m", "d", "sex", "sum"], // 时间序列为 y,m,d; sex为汇总字段, sum为累计值
		d: [
			[2016, 6, 29, '男', 10],
			[2016, 6, 29, '女', 3],
			[2016, 7, 1, '男', 2],
			[2016, 7, 2, '男', 8],
			[2016, 7, 2, '女', 1],
		]
	}
	var statData = rs2Stat(rs);

	// 结果：
	statData = {
		xData: [
			'2016-6-29', '2016-6-30', '2016-7-1', '2016-7-2' // 2016-6-30为自动补上的日期
		],
		yData: {
			'男': [10, 0, 2, 8], // 分别对应xData中每个日期，其中'2016-6-30'没有数据自动补0
			'女': [3, 0, 0, 1] // '2016-6-30'与'2016-7-1'没有数据自动补0.
		}
	}

默认yData中的系列名(seriesName)直接使用汇总字段，但如果汇总字段后还有一列，则以该列作为显示名称。
示例三： 汇总字段"sex"后面还有一列"sexName", 因而使用sexName作为图表系列名用于显示. 而"sex"以"M","F"分别表示男女，仅做内部使用：

	var rs = {
		h: ["y", "m", "d", "sex", "sexName", "sum"], // 时间序列为 y,m,d; sex为汇总字段, sexName为汇总显示字段, sum为累计值
		d: [
			[2016, 6, 29, 'M', '男', 10],
			[2016, 6, 29, 'F', '女', 3],
			[2016, 7, 1, 'M', '男', 2],
			[2016, 7, 2, 'M', '男', 8],
			[2016, 7, 2, 'F', '女', 1],
		]
	}
	var statData = rs2Stat(rs);
	// 结果：与示例二相同。

示例四： 汇总字段支持格式化，假设性别字段以'M','F'分别表示'男', '女':

	var rs = {
		h: ["y", "m", "d", "sex", "sum"], // 时间序列为 y,m,d; sex为汇总字段, sum为累计值
		d: [
			[2016, 6, 29, 'M', 10],
			[2016, 6, 29, 'F', 3],
			[2016, 7, 1, 'M', 2],
			[2016, 7, 2, 'M', 8],
			[2016, 7, 2, 'F', 1],
		]
	}
	var opt = {
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
	var statData = rs2Stat(rs);

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


与echart结合使用示例可参考 initChart. 原理如下：

	var option = {
		...
		legend: {
			data: keys(statData.yData)
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
		series: createSeries(statData.yData) // 再次转换下格式
	};
	myChart.setOption(option);

*/
self.rs2Stat = rs2Stat;
function rs2Stat(rs, opt)
{
	var xData = [], yData = {};
	var ret = {xData: xData, yData: yData};

	if (rs.d.length == 0) {
		return ret;
	}

	opt = $.extend({}, opt);
	var tmCnt = 0; // 时间字段数，e.g. y,m,d => 3; y,w=>2
	var tmUnits = ['y','m','d','h','w'];
	$.each(rs.h, function (i, e) {
		if (tmUnits.indexOf(e) == -1)
			return false;
		++ tmCnt;
	});

	var sumIdx = tmCnt;
	var groupIdx = -1;
	if (rs.h[sumIdx] != 'sum') {
		groupIdx = sumIdx;
		++ sumIdx;
	}
	if (rs.h[sumIdx] != 'sum') {
		opt.formatter = function (value, arr, i) {
			return arr[i+1];
		};
		++ sumIdx;
	}
	if (rs.h[sumIdx] != 'sum')
		throw "*** cannot find sum column";

	if (opt.formatter == null && self.options.statFormatter) {
		var groupField = groupIdx<0? 'sum': rs.h[groupIdx];
		opt.formatter = self.options.statFormatter[groupField];
	}

	var tmUnit = rs.h.slice(0, tmCnt).join('');
	var lastX = null;
	var lastTmArr = null;
	$.each (rs.d, function (i, e) {
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
		if (opt.formatter) {
			var val = opt.formatter(groupKey, e, groupIdx);
			if (val !== undefined)
				groupKey = val;
		}
		var groupVal = e[sumIdx];
		var y = yData[groupKey];
		if (!y) {
			y = yData[groupKey] = [];
		}
		y[xData.length-1] = parseFloat(groupVal);
	});

	// 遍历数据，将undefined 改为 0
	var n = xData.length;
	for (var k in yData) {
		var y= yData[k];
		for (var i=0; i<n; ++i) {
			if (y[i] === undefined)
				y[i] = 0;
		}
	}

	return ret;
}

/*
@fn runStat(jo, jchart, dtType, opt={onGetQueryParam?, groupNameMap?})

根据页面中带name属性的各控制设置情况，生成统计请求的参数，发起统计请求，显示统计图表。

@param dtType Enum. d-日，h-时，w-周，m-月。
@param opt 参考initPageStat中的opt参数。

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
function runStat(jo, jchart, dtType, opt)
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
	if (dtType == 'h') {
		param.gres = "y,m,d,h";
		param.orderby = 'y,m,d,h';
	}
	if (dtType == 'd') {
		param.gres = "y,m,d";
		param.orderby = 'y,m,d';
	}
	if (dtType == 'w') {
		param.gres = "y,w";
		param.orderby = 'y,w';
	}
	if (dtType == 'm') {
		param.gres = "y,m";
		param.orderby = 'y,m';
	}
	param.cond = WUI.getQueryCond(cond);
	if (groupKey) {
		param.g = groupKey;
		param.gres += ',' + groupKey;

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
		var statData = rs2Stat(data);
		initChart(jchart[0], statData);
	}, param);
}

/*
@fn initChart
 */
function initChart(chartTable, statData)
{
	var myChart = echarts.init(chartTable);
	var legendAry = [];
	var seriesAry = [];
	$.each (statData.yData, function (key, e) {
		legendAry.push(key);
		seriesAry.push({
					name: key,
					type:'line',
					data: e,
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
	});

	option = {
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
	};

	myChart.setOption(option);
}

/**
@fn initPageStat(jpage, opt?={onGetQueryParam?, groupNameMap?, initTmRange?})

通用统计页模式

- 日期段为 .txtTm1, .txtTm2
- 图表为 .divChart
- 按钮 .btnStat, .btnStat2 用于生成图线。

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
		jpage.find(".btnStat2.active").click();
	}

	function btnStat2_Click()
	{
		jpage.find(".btnStat2").removeClass("active");
		var type = this.value;
		var dtType;

		if(type == '时'){
			$(".btnStat2[value='时']").addClass("active");
			dtType = 'h';
		}
		else if(type == '月'){
			$(".btnStat2[value='月']").addClass("active");
			dtType = 'm';
		}
		else if(type == '周'){
			$(".btnStat2[value='周']").addClass("active");
			dtType = 'w';
		}
		else {
			$(".btnStat2[value='天']").addClass("active");
			dtType = 'd';
		}

		var jchart = jpage.find(".divChart");
		runStat(jpage, jchart, dtType, opt);
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

