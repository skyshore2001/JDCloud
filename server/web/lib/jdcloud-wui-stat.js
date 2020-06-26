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
	sum: function (value) {
		return sumName_;
	},
	wd: function (value) {
		return '周' + weekdayNames_[value];
	},
	h: function (value) {
		return value + "时";
	},
	y: function (value) {
		return value + "年";
	},
	m: function (value) {
		return value + "月";
	},
	d: function (value) {
		return value + "日";
	},

	// for tmUnit:
	"y,m": function (tmArr) {
		return tmArr.join('-');
	},
	"y,m,d": function (tmArr) {
		return tmArr.join('-');
	},
	"y,m,d,h": function (tmArr) {
		return tmArr[1] + "-" + tmArr[2] + " " + tmArr[3] + ":00";
	},
	"y,w": function (tmArr) {
		// 当年第一个周一 + 7 * (周数-1), 对应mysql week()函数模式7
		var dt = firstWeek(tmArr[0]);
		var days = 7 * (parseInt(tmArr[1])-1);
		dt.addDay(days);
		return dt.getFullYear() + "-" + (dt.getMonth()+1) + "-" + dt.getDate();
	},
	"y,q": function (tmArr) {
		return tmArr[0] + "-Q" + tmArr[1];
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
	if (fn = self.options.statFormatter[tmUnit]) {
		return fn(tmArr);
	}
	throw "*** unknown tmUnit=" + tmUnit;
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
	else if (tmUnit == 'y,q') {
		tmArr2 = [ tmArr[0], tmArr[1]+1 ];
		if (tmArr2[1] == 5) {
			tmArr2[1] = 1;
			++ tmArr2[0];
		}
	}
	else {
		throw "*** unknown tmUnit=" + tmUnit;
	}
	return tmArr2;
}

/**
@fn WUI.pivot(rs, opt)

@param opt {gcol, xcol, ycol?, gtext?, maxSeriesCnt?, formatter?}

gcol/gtext, xcol, ycol可以是数字, 表示第几列; 也可以是数字数组, 表示若干列.
gtext也是列号或列号数组，与gcol合用，表示按gcol分组，最终“组名”结果按gtext列显示。
如果指定formatter，则“组名”再经formatter处理后显示。formatter(val): val是一个值或一个数组，由gcol/gtext决定。

如果指定opt.maxSeriesCnt，则分组最多maxSeriesCnt列，其它组则都归并到“其它”组。

示例: 按年-月统计各产品类别(cateId)的订单金额, 可以调用接口:

	callSvr("Ordr.query", {gres: "y,m,cateId", res: "cateName,SUM(amount) sum"}, orderby: "y,m")

得到rs表格:

	var rs = {
		h: ["y","m","cateId","cateName","sum"],
		d: [
			[2019, 11, 1, "衣服", 20000],
			[2019, 11, 2, "食品", 12000],
			[2019, 12, 2, "食品", 15000],
			[2020, 02, 1, "衣服", 19000]
		]
	}

即:

	y	m	cateId	cateName	sum
	------------
	2019	11	1	衣服	20000
	2019	11	2	食品	12000
	2019	12	2	食品	15000
	2020	02	1	衣服	19000

1. 将分类cateId转到列上(但按cateName来显示):

	var rs1 = pivot(rs, {
		xcol: [0, 1], // 0,1列
		gcol: 2, // 按该列转置
		gtext: 3, // 表示第3列是第2列的显示内容, 也可以用函数`function (row) { return row[3] }`
		ycol: 4, // 值列, 可以不指定, 缺省为最后一列.
	})

得到结果:

	rs1 = {
		h: ["y","m","衣服","食品"],
		d: [
			[2019, 11, 20000, 12000],
			[2019, 12, null, 15000],
			[2020, 02, 19000, null]
		]
	}

即:

	y	m 衣服	食品
	------------
	2019	11	20000	12000
	2019	12	null	15000
	2020	02	19000	null

2. 若xcol中只保留年:

	var rs1 = pivot(rs, {
		xcol: 0,
		gcol: 2,
		gtext: 3,
		ycol:4
	})

得到结果将变成这样:

	rs1 = {
		h: ["y","衣服","食品"],
		d: [
			[2019, 20000, 27000],
			[2020, 19000, null]
		]
	}

3. 若在xcol中保留分类, 将年-月转到列上:

	var rs1 = pivot(rs, {
		xcol: [2, 3], // 或只留3也可以
		gcol: [0, 1],
		ycol:4
	})

得到结果:

	rs1 = {
		h: ["cateId","cateName","2019-11","2019-12","2020-2"],
		d: [
			[1, "衣服", 20000, null, 19000],
			[2, "食品", 12000, 15000, null]
		]
	}

即:

	cateId cateName 2019-11 2019-12 2020-02
	------------
	1	衣服	20000	0	19000
	2	食品	12000	15000	0

4. ycol也可以指定多列, 用的比较少.

	var rs1 = pivot(rs, {
		xcol: [0, 1],
		gcol: 3,
		ycol: [4,4], // 为演示结果, 故意重复sum列. 实际可能为"订单总额","订单数"两列.
	})

得到结果:

	rs1 = {
		h: ["y","m","衣服","食品"],
		d: [
			[2019, 11, [20000,20000], [12000,12000]],
			[2019, 12, null, [15000,15000]],
			[2020, 02, [19000,19000], null]
		]
	}
*/
self.pivot = pivot;
function pivot(rs, opt)
{
	if (opt == null)
		opt = {};
	if (!opt.ycol) {
		opt.ycol = rs.h.length-1;
	}

	var xMap = []; // {x=>新行} e.g. {"a1"=>["a1", 99(app), 98(db)], "a2"=>["a2", 97(app), null(db)], "a4"=>["a4", 96(app), null(db)] }
	var gList = []; // g列的值数组: e.g. ["app", "db"]
	var newHdr = [];

	var xtext = getTextFn(opt.xcol);
	var xarr = getArrFn(opt.xcol);
	var yval = getArrFn(opt.ycol, true);
	var gval = getTextFn(opt.gcol);
	var gtext = getTextFn(opt.gtext||opt.gcol, opt.formatter);
	var xcolCnt = $.isArray(opt.xcol)? opt.xcol.length: 1;

	var addToOther = false;
	if (opt.maxSeriesCnt) {
		// 取分组累计值最大maxSeriesCnt组，剩下的放到“其它”组
		var gsumMap = {}; // { g=>{text, sum} }
		$.each(rs.d, function (i, row) {
			var g = gval(row);
			var y = yval(row, true);
			if (gsumMap[g] === undefined)
				gsumMap[g] = {text: gtext(row)+"", sum: 0};
			gsumMap[g].sum += y;
		});
		gList = Object.keys(gsumMap).sort(function (a, b) {
			return gsumMap[b].sum - gsumMap[a].sum;
		});
		if (gList.length > opt.maxSeriesCnt) {
			gList.length = opt.maxSeriesCnt;
			gList.push("其它");
			addToOther = true;
		}
		newHdr = $.map(gList, function (g) {
			if (g == "其它")
				return "其它";
			return gsumMap[g].text;
		});
	}

	$.each(rs.d, function (i, row) {
		var x = xtext(row);
		var g = gval(row);

		if (xMap[x] === undefined) {
			xMap[x] = xarr(row);
		}
		var idx = gList.indexOf(g);
		if (idx < 0) {
			// 若添加到“其它”组，gList和newHdr已在前面设置好；否则添加新组到gList和newHdr中
			if (addToOther) {
				idx = gList.length-1;
			}
			else {
				idx = gList.length;
				gList.push(g);
				newHdr.push(gtext(row) + "");
			}
		}
		var y = yval(row, true);
		setY(xMap[x], idx+xcolCnt, y);
	});
	newHdr.unshift.apply(newHdr, xarr(rs.h));
	var ret = {h: newHdr, d: Object.values(xMap)};

	// 填充null
	var cnt = ret.h.length;
	$.each(ret.d, function (idx, e) {
		for (var i=0; i<cnt; ++i) {
			if (e[i] === undefined)
				e[i] = null;
		}
	});

	function setY(arr, idx, y) {
		if (arr[idx] === undefined)
			arr[idx] = y;
		else
			arr[idx] += y;
	}

	return ret;
}

/*
将一列或多列数据（cols指定列号）生成显示用的字符串。
如果指定了formatter，则执行formatter(value)生成显示字符串。value是原始数据，可以是值或值数组（根据cols是否为数组决定）。
*/
function getTextFn(cols, formatter) {
	return function (row) {
		if (! $.isArray(cols)) {
			var ret = row[cols];
			if (formatter)
				return formatter(ret) + "";
			if (ret === null || ret === "" || ret === undefined)
				ret = "(空)";
			else
				ret += ""; // 转字符串
			return ret;
		}
		var arr = $.map(cols, function (e, i) {
			return row[e];
		});
		if (formatter)
			return formatter(arr) + "";
		return arr.join("-");
	}
}

// xval = getArrFn(opt.xcol)
// yval = getArrFn(opt.ycol, true) 如果opt.ycol不是数组, 则返回值也不用数组
function getArrFn(cols, allowNonArr) {
	return function (row) {
		if (! $.isArray(cols))
			return allowNonArr? row[cols]: [row[cols]];
		var arr = $.map(cols, function (e, i) {
			return row[e];
		});
		return allowNonArr && arr.length==1? arr[0]: arr;
	}
}

function rangeArr(from, length)
{
	var ret = [];
	for (var i=0; i<length; ++i) {
		ret.push(from+i);
	}
	return ret;
}

/**
@fn WUI.rs2Stat(rs, opt?) -> statData

将query接口返回的数据，转成统计图需要的数据格式。

@param opt {xcol, ycol, gcol, gtext, maxSeriesCnt, tmUnit, formatter, formatterX}

@param opt.xcol 指定X轴数据，可以是一列或多列，如0表示第0列, 值[0,1]表示前2列。
@param opt.ycol 指定值数据，可以是一列或多列。
@param opt.gcol 指定分组列。
@param opt.gtext 指定分组值对应的显示文本列。比如表中既有商品编号，又有商品名称，商品编号列设置为gcol用于分组，而商品名称列设置为gtext用于显示。

xcol,ycol,gcol,gtext,maxSeriesCnt参数可参考函数 WUI.pivot

@param opt.tmUnit 如果非空，表示按指定时间维度分析。参考[JdcloudStat.tmUnit]().

未指定tmUnit时，缺省xcol=0列，ycol=最后一列，gcol如需要则应手工指定

tmUnit用于指定时间字段: "y,m"-年,月; "y,m,d"-年,月,日; "y,w"-年,周; "y,m,d,h"-年,月,日,时; "y,q"-年,季度
若指定了tmUnit，则可以不指定xcol,gcol,ycol，而是由字段排列自动得到，详见"tmUnit使用举例"章节。

@param opt.formatter 对汇总数据列进行格式化，缺省取WUI.options.statFormatter[ycolNames]。Function(value).
@param opt.formatterX 对X轴数据进行格式化，缺省取WUI.options.statFormatter[xcolNames]。Function(value)。若opt.xcol是数组，则value也是数组。

@return statData { @xData, @yData=[{name=seriesName, data=@seriesData}]  }

与echart结合使用示例可参考 initChart. 原理如下：

	var option = {
		...
		legend: {
			data: statData.yData
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

## 常用统计图示例

例1：统计每个用户的订单金额, 由高到低显示前10名, 显示为饼图或柱状图.

	callSvr("Ordr.query", {gres: "userId 用户编号", res: "userName 用户, SUM(amount) 金额", orderby: "sum DESC", pagesz: 10})
	// 一般用userId而不是userName来分组, 因为不仅userName可能会重名, 而且userName一般是从外部表join过来的, 没有索引性能较差不适合做分组字段.

得到结果示例:

	var rs = {
		h: ["用户编号", "用户", "金额"],
		d: [
			[1001,"用户1",12000],
			[1002,"用户2",10000]
		]
	}

即:

	用户编号	用户	金额
	-------------
	1001	用户1	12000
	1002	用户2	10000
	...

通过rs2Stat转换:

	var statData = rs2Stat(rs, {xcol:1}); // xcol指定横轴数据列, 缺省为第0列, 这里指定为第1列，用名字替代编号。ycol选项可指定统计值列, 这里没有指定，缺省为最后一列，
	// 结果：
	statData = {
		xData: [
			'用户1', '用户2'
		],
		yData: [
			{name: '金额', data: [12000, 10000]}
		]
	}

例2：按年-月统计订单金额, 显示为柱状图或折线图.

	callSvr("Ordr.query", {gres: "y,m", res: "SUM(amount) sum", orderby: "y,m"})

得到表:

	y	m	sum
	-----------
	2019	11	30000
	2019	12	34000
	2020	2	25000

转换示例:

	var rs = {
		h: ["y", "m", "sum"],
		d: [
			[2019,11,30000],
			[2019,12,34000],
			[2020,2,25000],
		]
	}
	var statData = rs2Stat(rs, {xcol:[0,1]});
	// 结果：
	statData = {
		xData: [
			'2019-11', '2019-12', '2020-2'
		],
		yData: [
			{name: '累计', data: [30000, 34000, 25000]}
		]
	}

上面年月中缺少了2020-1, 如果要补上缺少的月份, 可以使用tmUnit参数指定日期类型, 注意这时原始数据中年月须已排好序:

	var statData = rs2Stat(rs, {xcol:[0,1], ycol:2, tmUnit:"y,m"} );
	// 指定tmUnit后, 若xcol缺省为前N列, N是tmUnit中列数, 如"y,m,d"(年月日)表示前3列即`xcol: [0,1,2]`. 上面参数可简写为:
	var statData = rs2Stat(rs, {tmUnit:"y,m"} );
	// 结果：
	statData = {
		xData: [
			'2019-11', '2019-12', '2020-1', '2020-2'
		],
		yData: [
			{name: '累计', data: [30000, 34000, 0, 25000]}
		]
	}

例3：按年-月统计各产品类别(cateId)的订单金额, 产品类别在列上显示(即显示为系列, 列为"年,月,类别1,类别2,..."):

	callSvr("Ordr.query", {gres: "y,m,cateId", res: "cateName,SUM(amount) sum"}, orderby: "y,m")

	y	m	cateId	cateName	sum
	------------
	2019	11	1	衣服	20000
	2019	11	2	食品	12000
	2019	12	2	食品	15000
	2020	02	1	衣服	19000

结果需要将分类cateName转到列上, 即:

	y	m 衣服	食品
	------------
	2019	11	20000	12000
	2019	12	0	15000
	2020	02	19000	0

可以添加gcol参数指定转置列(pivot column):

	var rs = {
		h: ["y","m","cateId","cateName","sum"],
		d: [
			[2019, 11, 1, "衣服", 20000],
			[2019, 11, 2, "食品", 12000],
			[2019, 12, 2, "食品", 15000],
			[2020, 02, 1, "衣服", 19000]
		]
	}
	var statData = rs2Stat(rs, {
		xcol: [0, 1], // 0,1列
		gcol: 2,
		gtext: 3 // gtext表示gcol如何显示, 数字3表示按第3列显示, 即"1","2"显示成"衣服", "食品"; gtext也可以用函数, 如 `function (val, row, i) { return row[3] }`
	})
	// 结果：
	statData = {
		xData: [
			'2019-11', '2019-12', '2020-2'
		],
		yData: [
			{name: '衣服', data: [20000, 0, 19000]},
			{name: '食品', data: [12000, 15000, 0]}
		]
	}

如果还需要补上缺少的年月, 可以加tmUnit参数, 要求原始数据中年月须已排好序:

	var statData = rs2Stat(rs, {
		// xcol: [0, 1], // 有tmUnit参数时, 且刚好前N列表示时间, 则xcol可缺省
		gcol: 2,
		gtext: 3,
		tmUnit: "y,m"
	})
	// 结果：
	statData = {
		xData: [
			'2019-11', '2019-12', '2020-1', '2020-2' // '2020-1'是自动补上的
		],
		yData: [
			{name: '衣服', data: [20000, 0, 0, 19000]},
			{name: '食品', data: [12000, 15000, 0, 0]}
		]
	}

注意: 上面将分类cateName转到列上再转成统计数据, 也可以分步来做, 先用pivot函数:

	var rs1 = pivot(rs, {
		xcol: [0, 1],
		gcol: 2,
		gtext: 3
	})

得到结果rs1:

	y	m 衣服	食品
	------------
	2019	11	20000	12000
	2019	12	0	15000
	2020	02	19000	0

再将rs1转成统计数据:

	var statData = rs2Stat(rs1, {
		xcol: [0, 1],
		ycol: [2, 3], // 注意这时ycol是多列, 显式指定.
		tmUnit: "y,m"
	})

## tmUnit使用举例

当有tmUnit时, 列按如下规则分布, 可以省去指定xcol, gcol等参数:

	与tmUnit匹配的时间列	值统计列
	与tmUnit匹配的时间列	分组列	值统计列
	与tmUnit匹配的时间列	分组列	组名列	值统计列

例如以下列, 均可以只用参数 `{tmUnit: "y,m,d"}`:

	y,m,d,sum  完整参数为: { tmUnit: "y,m,d", xcol:[0,1,2], ycol: 3 }
	y,m,d,cateName,sum  完整参数为: { tmUnit: "y,m,d", xcol:[0,1,2], gcol:3, ycol: 4 }
	y,m,d,cateId,cateName,sum  完整参数为:	{ tmUnit: "y,m,d", xcol:[0,1,2], gcol:3, gtext:4, ycol: 5 }

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
	// 结果：与示例二相同。它等价于调用:
	var statData = rs2Stat(rs, {tmUnit: "y,m,d",
		xcol: [0,1,2],
		gcol: 3,
		gtext: 4,
		ycol: 5
	});

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

在无汇总时，列"sum"会自动被改为"累计"，这时默认在statFormatter中设置的：

	WUI.options.statFormatter = {
		sum: function (value) {
			return '累计';
		}
	}

*/
self.rs2Stat = rs2Stat
function rs2Stat(rs, opt)
{
	opt = $.extend({}, opt); // 避免修改原始opt参数

	// 设置缺省xcol,ycol,gcol
	var colCnt = rs.h.length;
	var ycol_isset = true;
	if (opt.ycol == null) {
		opt.ycol = colCnt -1;
		ycol_isset = false;
	}
	if (opt.tmUnit) {
		var tmCnt = opt.tmUnit.split(',').length;
		if (opt.xcol == null) {
			opt.xcol = rangeArr(0, tmCnt);
		}
		var leftColCnt = colCnt - tmCnt;
		if (opt.gcol == null && !ycol_isset && leftColCnt >= 2) { // gcol?, gtext?, sum
			opt.gcol = tmCnt;
			if (leftColCnt >= 3)
				opt.gtext = tmCnt +1;
		}
	}
	if (opt.xcol == null) {
		opt.xcol = 0;
	}

	if (opt.gcol != null) {
		if (opt.formatter == null) {
			var gcolName = rs.h[opt.gcol];
			opt.formatter = self.options.statFormatter[gcolName];
		}
		var rs1 = pivot(rs, opt);
		colCnt = rs1.h.length;
		var xCnt = $.isArray(opt.xcol)? opt.xcol.length: 1;

		// update opt
		opt.xcol = rangeArr(0, xCnt);
		opt.ycol = rangeArr(xCnt, colCnt-xCnt);
		opt.gcol = null;
		opt.gtext = null;
		opt.formatter = null;
		rs = rs1;
	}
	else if (opt.formatter == null) {
		var ycolName = rs.h[opt.ycol];
		opt.formatter = self.options.statFormatter[ycolName];
	}

	var xData = [], yData = [];
	var ret = {xData: xData, yData: yData};
	var yArr = [];
	var xcols = $.isArray(opt.xcol)? opt.xcol: [opt.xcol];
	var xcolCnt = xcols.length;
	var ycols = $.isArray(opt.ycol)? opt.ycol: [opt.ycol];
	$.each(ycols, function (i, ycol) {
		var y = rs.h[ycol];
		if (opt.formatter) {
			y = opt.formatter(y);
		}
		yData.push({
			name: y,
			data: []
		});
	});

	var lastX = null;
	var lastTmArr = null;
	var xarr = getArrFn(opt.xcol);

	var xcolName = $.map(xcols, function (xcol) {
		return rs.h[xcol];
	}).join(",");
	if (opt.formatterX == null)
		opt.formatterX = self.options.statFormatter[xcolName];
	var xtext = getTextFn(opt.xcol, opt.formatterX);

	// [x, y1, y2, y3...]
	$.each(rs.d, function (i, row) {
		// 补日期
		var x;
		if (! opt.tmUnit) {
			x = xtext(row);
		}
		else {
			var tmArr = xarr(row);
			x = makeTm(opt.tmUnit, tmArr);
			var completeCnt = 0;
			if (lastX != null) {
				while (lastX != x) {
					lastTmArr = nextTm(opt.tmUnit, lastTmArr);
					var nextX = makeTm(opt.tmUnit, lastTmArr);
					if (x == nextX)
						break;
					xData.push(nextX);
					++ completeCnt;
				}
			}
			lastTmArr = tmArr;
			lastX = x;
			if (completeCnt > 0) {
				$.each(ycols, function (i, ycol) {
					var y = 0; // y默认补0
					for (var j=0; j<completeCnt; ++j)
						yData[i].data.push(y);
				});
			}
		}
	
		xData.push(x);
		$.each(ycols, function (i, ycol) {
			var y = parseFloat(row[ycol]) || 0; // y默认补0
			yData[i].data.push(y);
		});
	});
	return ret;
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
	WUI.formItems(jo, function (ji, name, it) {
		var val = it.getValue(ji);

		if (val == null || val == "" || val == "无" || val == "全部")
			return;

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

		// 如果有多个ycol字段，则按ycol显示多系列（这时g分组无效）
		var ycol = null;
		var yCnt = 0;
		if ((yCnt = param.res.split(',').length) > 1) {
			var tmCnt = opt.tmUnit? opt.tmUnit.split(',').length: 0;
			ycol = rangeArr(tmCnt, yCnt);
		}
		else if (opt.g) {
			if (opt.g.indexOf(',') > 0) {
				var a = opt.g.split(/,/);
				opt.g = a[0];
				opt.gname = a[1];
			}

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
				ycol: ycol,
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

初始化echarts报表组件.

- chartTable: 图表DOM对象
- statData: 符合echarts规范的数据，格式为 {@xData, @yData=[{name, @data}]}.
- seriesOpt, chartOpt: 参考百度echarts全局参数以及series参数: http://echarts.baidu.com/echarts2/doc/doc.html

statData示例：

	statData = {
		xData: [
			'2016-6-29', '2016-6-30', '2016-7-1', '2016-7-2'
		],
		yData: [
			{name: 'sum', data: [13, 0, 2, 9]} // 分别对应xData中每个日期，其中'2016-6-30'没有数据自动补0
		]
	}

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
		if (statData.yData.length == 0) {
			var item = { name: "", value: 0 };
			seriesAry = [
				$.extend( {data: [ item ] }, seriesOpt1 )
			];
		}
		else {
			seriesAry = [
				$.extend(statData.yData[0], seriesOpt1)
			];
			// data格式 [value] 转为 [{name, value}], 同时设置legendAry
			seriesAry[0].data = $.map(seriesAry[0].data, function (e, i) {
				var g = statData.xData[i];
				return {name: g, value: e};
			});
		}
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

	// handle resize
	$(chartTable).addClass("jd-echart").off("doResize").on("doResize", function () {
		myChart.resize();
	});
	return myChart;
}
$(window).on('resize.echart', function () {
	$(".jd-echart").trigger("doResize");
});

/**
@fn WUI.initPageStat(jpage, setStatOpt) -> statItf

通用统计页模式

- 查询条件区，如起止时间
- 生成统计图按钮
- 一个或多个图表，每个图表可设置不同的查询条件、时间维度等。

示例可参考超级管理端API日志统计(web/adm/pageApiLogStat)

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

		统计项
		<select id="cboRes">
			<option value ="COUNT(*) 总数">数量</option>
			<option value="SUM(t) sum">调用时间(毫秒)</option>
			<!-- 可以指定多个字段，逗号分隔，表示显示多个系列（这时下面的“分类汇总”是无效的），示例：
			<option value ="totalMh 理论工时,totalMh1 实际工时,totalMh2 出勤工时">工时</option>
			-->
		</select>

		汇总字段:
		<select id="g">
			<option value ="">无</option>
			<option value ="sex">性别</option>
			<option value="region">地域</option>

			<!-- 可以指定两个字段，逗号分隔，格式"分组字段,分组显示字段"
			<option value="userId,userName">用户</option>
			<option value="itemId,itemName">物料</option>
			-->
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
		param.res = jpage.find("#cboRes").val();

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

	gres="y,m,d,sceneId";
	orderby="y,m,d";
	res="sceneName,COUNT(*) sum";

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

	var jchart = jpage.find(".divChart");
	var tmUnit = "y,m"; // 按时间维度分析，按“年月”展开数据
	var cond = "tm>='2016-1-1' and tm<'2017-1-1'";
	// WUI.useBatchCall(); // 如果有多个报表，可以批量调用后端接口
	// 会话访问量
	callSvr("ApiLog.query", function (data) {
		var opt = { tmUnit: tmUnit };
		var statData = WUI.rs2Stat(data, opt);
		var seriesOpt = {};
		var chartOpt = {
			title: {
				text: "访问量（会话数）"
			},
			legend: null
		};

		WUI.initChart(jchart[0], statData, seriesOpt, chartOpt);
	}, {res: "COUNT(distinct ses) sum", gres: tmUnit, orderby: tmUnit, cond: cond });


此外，也支持直接显示无汇总的数据。

示例：有以下接口：

	RecM.query() -> tbl(who, tm, cpu)

返回 服务器(who)在每一分钟(tm)的最低cpu使用率。数据示例：

	{ h: ["who", "tm", "cpu"],
	  d: [ 
	  	["app", "2018-10-1 10:10:00", 89],
	  	["app", "2018-10-1 10:11:00", 91],
	  	["db", "2018-10-1 10:10:00", 68],
	  	["db", "2018-10-1 10:11:00", 72]
	  ]
	}

由于tm已经汇总到分钟，现在希望直接显示tm对应的值，且按服务器不同("app"表示"应用服务器"，"db"表示"数据库服务器")分系列显示。
rs2Stat支持转化此类数据，但表示要求是 "g, x, y"的格式，分别表示分组字段（系列名）、x轴标签、y轴数据，应该可用查询：

	RecM.query(res="who g, tm x, cpu y", cond="...") -> tbl(g, x, y)

JS示例：

	function initPageRecMStat()
	{
		...
		var statItf_ = WUI.initPageStat(jpage, setStatOpt);
		function setStatOpt(chartIdx, opt) 
		{
			var param = opt.queryParam;
			param.res = "who g,tm x,cpu y";

			opt.formatter = function (value, arr, i) {
				var map = {
					"app": "应用服务器",
					"db": "数据库服务器"
				};
				return map[value] || value;
			};
		}
	}

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
		//var tm2 = jpage.find(".txtTm2").datetimebox("getValue");
		//var range = getTmRange(dscr, tm2);
		var range = getTmRange(dscr);
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

	getTmRange("前1周") -> ["2015-8-31"(上周一)，"2015-9-7"(本周一)]
	getTmRange("前3月") -> ["2015-6-1", "2015-9-1"]
	getTmRange("前3天") -> ["2015-9-7", "2015-9-9"]

	getTmRange("近1周") -> ["2015-9-3"，"2015-9-10"]
	getTmRange("近3月") -> ["2015-6-10", "2015-9-10"]
	getTmRange("近3天") -> ["2015-9-7", "2015-9-10"]  // "前3天"+今天

	getTmRange("本日") -> ["2015-9-9", "2015-9-10"]
	getTmRange("本月"") -> ["2015-9-1", "2015-10-1"]
	getTmRange("本年"") -> ["2015-1-1", "2016-1-1"]

dscr可以是 

	"近|前" N "个"? "小时|日|周|月|年"
	"本|今" "小时|日/天|周|月|年"

注意："近X周"包括今天（即使尚未过完）。

 */
self.getTmRange = getTmRange;
function getTmRange(dscr, now)
{
	dscr = dscr.replace(/本|今/, "前0");
	var re = /(近|前)(\d+).*?(小时|日|天|月|周|年)/;
	var m = dscr.match(re);
	if (! m)
		return;
	
	if (! now)
		now = new Date();
	else if (! (now instanceof Date)) {
		now = WUI.parseDate(now);
	}
	else {
		now = new Date(now); // 不修改原时间
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
		if (n == 0) {
			now.add("h",1);
			n = 1;
		}
		if (type == "近") {
			now.add("h",1);
		}
		dt2 = now.format(fmt_h);
		dt1 = now.add("h", -n).format(fmt_h);
	}
	else if (u == "日" || u == "天") {
		if (n == 0 || type == "近") {
			now.addDay(1);
			++ n;
		}
		dt2 = now.format(fmt_d);
		dt1 = now.add("d", -n).format(fmt_d);
	}
	else if (u == "月") {
		if (n == 0) {
			now.addMonth(1);
			n = 1;
		}
		if (type == "近") {
			now.addDay(1);
			var d2 = now.getDate();
			dt2 = now.format(fmt_d);
			now.add("m", -n);
			do {
				// 5/31近一个月, 从4/30开始: [4/30, 5/31]
				var d1 = now.getDate();
				if (d1 == d2 || d1 > 10)
					break;
				now.addDay(-1);
			} while (true);
			dt1 = now.format(fmt_d);
			
			// now = WUI.parseDate(now.format(fmt_m)); // 回到1号
			//dt1 = now.add("m", -n).format(fmt_m);
		}
		else if (type == "前") {
			dt2 = now.format(fmt_m);
			dt1 = WUI.parseDate(dt2).add("m", -n).format(fmt_m);
		}
	}
	else if (u == "周") {
		if (n == 0) {
			now.addDay(7);
			n = 1;
		}
		if (type == "近") {
			now.addDay(1);
			dt2 = now.format(fmt_d);
			//now.add("d", -now.getDay()+1); // 回到周1
			dt1 = now.add("d", -n*7).format(fmt_d);
		}
		else if (type == "前") {
			dt2 = now.add("d", -now.getDay()+1).format(fmt_d);
			dt1 = now.add("d", -7*n).format(fmt_d);
		}
	}
	else if (u == "年") {
		if (n == 0) {
			now.add("y",1);
			n = 1;
		}
		if (type == "近") {
			now.addDay(1);
			dt2 = now.format(fmt_d);
			//now = WUI.parseDate(now.format(fmt_y)); // 回到1/1
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

