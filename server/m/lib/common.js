/**
@module common.js

JS通用函数库
*/

// ====== General {{{
/**
@fn randInt(from, to)

生成一个随机整数。如生成10到20间的随机整数：

	var n = randInt(10, 20)

*/
function randInt(from, to)
{
	return Math.floor(Math.random() * (to - from + 1)) + from;
}

/**
@fn randAlphanum(cnt)

生成指定长度(cnt)的随机代码。不出现"0","1","o","l"这些易混淆字符。

示例：生成8位随机密码

	var dyn_pwd = randAlphanum(8);

*/
function randAlphanum(cnt)
{
	var r = '';
	var i;
	var char_a = 'a'.charCodeAt(0);
	var char_o = 'o'.charCodeAt(0);
	var char_l = 'l'.charCodeAt(0);
	for (i=0; i<cnt; ) {
		ran = randInt(0, 35);
		if (ran == 0 || ran == 1 || ran == char_o - char_a + 10 || ran == char_l - char_a + 10) {
			continue;
		}
		if (ran > 9) {
			ran = String.fromCharCode(ran - 10 + char_a);
		}
		r += ran;
		i ++;
	}
	return r;
}

// eg. range(1, 10)
// eg. range(1, 10, 3)
// eg. range(1, 100, 3, 10)
function range(from, to, step, max) // (from, to, step=1, max=0)
{
	var arr = [];
	if (!step) {
		step = 1;
	}
	for (i=0, v=from; (!max || i<max) && v<=to; ++i, v+=step) {
		arr[i] = v;
	}
	return arr;
}

/**
@fn basename(name, ext?)

取名字的基础部分，如

	var name = basename("/cc/ttt.asp"); // "ttt.asp"
	var name2 = basename("c:\\aaa\\bbb/cc/ttt.asp", ".asp"); // "ttt"

 */
function basename(name, ext)
{
	name = name.replace(/^.*(\\|\/)/, '');
	if (! ext) 
		return name;
	var i = name.length - ext.length;
	return name.indexOf(ext, i) == -1? name: name.substring(0, i);
}

function isArray(o)
{
	return o instanceof Array;
// 	return o.constructor === Array;
}

// params: {k=>val}
function paramStr(params)
{
	var arr = [];
	for(var k in params) {
		if (typeof params[k] != "function") {
			arr.push(k + "=" + encodeURIComponent(params[k]));
		}
	}
	return arr.join("&");
}

// params: {k=>val}
function appendParam(url, params)
{
	return url + (url.indexOf('?')>0? "&": "?") + paramStr(params);
}

/**
@fn assert(cond, dscr?)
 */
function assert(cond, dscr)
{
	if (!cond) {
		var msg = "!!! assert fail!";
		if (dscr)
			msg += " - " + dscr;
		throw(msg);
	}
}

/**
@fn parseQuery(str)

解析url编码格式的查询字符串，返回对应的对象。

	if (location.search) {
		var queryStr = location.search.substr(1); // "?id=100&name=abc&val=3.14"去掉"?"号
		var args = parseQuery(queryStr); // {id: 100, name: "abc", val: 3.14}
	}

注意：

如果值为整数或小数，则会转成相应类型。如上例中 id为100,不是字符串"100".
 */
function parseQuery(s)
{
	var ret = {};
	if (s != "")
	{
		var a = s.split('&')
		for (i=0; i<a.length; ++i) {
			var a1 = a[i].split("=");
			var val = a1[1];
			if (val === undefined)
				val = 1;
			else if (/^-?[0-9]+$/.test(val)) {
				val = parseInt(val);
			}
			else if (/^-?[0-9.]+$/.test(val)) {
				val = parseFloat(val);
			}
			else {
				val = decodeURIComponent(val);
			}
			ret[a1[0]] = val;
		}
	}
	return ret;
}

/**
@fn tobool(v)

将字符串转成boolean值。除"0", "1"外，还可以支持字符串 "on"/"off", "true"/"false"等。
*/
function tobool(v)
{
	if (typeof v === "string")
		return v !== "" && v !== "0" && v.toLowerCase() !== "false" && v.toLowerCase() !== "off";
	return !!v;
}

/**
@fn reloadSite()

重新加载当前页面，但不要#hash部分。
*/
function reloadSite()
{
	var href = location.href.replace(/#.+/, '#');
	location.href = href;
	location.reload();
	throw "abort";
}

// }}}

// ====== Date {{{
// ***************** DATE MANIPULATION: format, addMonth, addDay, addHours ******************

function setWidth_2(number)
{
	return number < 10? ("0" + number) : ("" + number);
}

/**
@fn Date.format(fmt?=L)

日期对象格式化字符串。

@param fmt 格式字符串。由以下组成：

	yyyy - 四位年，如2008, 1999
	yy - 两位年，如 08, 99
	mm - 两位月，如 02, 12
	dd - 两位日，如 01, 30
	HH - 两位小时，如 00, 23
	MM - 两位分钟，如 00, 59
	SS - 两位秒，如 00, 59

	支持这几种常用格式：
	L - 标准日期时间，相当于 "yyyy-mm-dd HH:MM:SS"
	D - 标准日期，相当于 "yyyy-mm-dd"
	T - 标准时间，相当于 "HH:MM:SS"

示例：

	var dt = new Date();
	var dtStr1 = dt.format("D"); // "2009-10-20"
	var dtStr2 = dt.format("yyyymmdd-HHMM"); // "20091020-2038"

 */
Date.prototype.format = function(fmt)
{
	if (fmt == null)
		fmt = "L";

	switch (fmt) {
	case "L":
		fmt = "yyyy-mm-dd HH:MM:SS";
		break;
	case "D":
		fmt = "yyyy-mm-dd";
		break;
	case "T":
		fmt = "HH:MM:SS";
		break;
	}
	var year = this.getFullYear();
	return fmt.replace("yyyy", year)
	          .replace("yy", ("" + year).substring(2))
	          .replace("mm", setWidth_2(this.getMonth()+1))
	          .replace("dd", setWidth_2(this.getDate()))
	          .replace("HH", setWidth_2(this.getHours()))
	          .replace("MM", setWidth_2(this.getMinutes()))
	          .replace("SS", setWidth_2(this.getSeconds()))
			  ;
}

/** @fn Date.addDay(n) */
Date.prototype.addDay = function(iDay)
{
	this.setDate(this.getDate() + iDay);
	return this;
}

/** @fn Date.addHours(n) */
Date.prototype.addHours = function (iHours)
{
	this.setHours(this.getHours() + iHours);
	return this;
}

/** @fn Date.addMin(n) */
Date.prototype.addMin = function (iMin)
{
	this.setMinutes(this.getMinutes() + iMin);
	return this;
}

/** @fn Date.addMonth(n) */
Date.prototype.addMonth = function (iMonth)
{
	this.setMonth(this.getMonth() + iMonth);
	return this;
}

// Similar to the VB interface
// the following interface conform to: dt - DateTime(DateValue(dt), TimeValue(dt)) == 0
function DateValue(dt)
{
	//return new Date(Date.parse(dt.getFullYear() + "/" + dt.getMonth() + "/" + dt.getDate()));
	return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function TimeValue(dt)
{
	return new Date(0,0,1,dt.getHours(),dt.getMinutes(),dt.getSeconds());
}

function DateTime(d, t)
{
	return new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.getHours(),t.getMinutes(),t.getSeconds());
}

/**
@fn parseTime(s)

将纯时间字符串生成一个日期对象。

	var dt1 = parseTime("10:10:00");
	var dt2 = parseTime("10:11");

 */
function parseTime(s)
{
	var a = s.split(":");
	var dt =  new Date(0,0,1, a[0],a[1]||0,a[2]||0);
	if (isNaN(dt.getYear()))
		return null;
	return dt;
}

/**
@fn parseDate(dateStr)

将日期字符串转为日期时间格式。其效果相当于`new Date(Date.parse(dateStr))`，但兼容性更好（例如在safari中很多常见的日期格式无法解析）

示例：

	var dt1 = parseDate("2012-01-01");
	var dt2 = parseDate("2012/01/01 20:00:09");
	var dt3 = parseDate("2012.1.1 20:00");

 */
function parseDate(str)
{
	if (str == null)
		return null;
	if (str instanceof Date)
		return str;
	var ms = str.match(/^(\d+)(?:[-\/.](\d+)(?:[-\/.](\d+))?)?/);
	if (ms == null)
		return null;
	var y, m, d;
	var now = new Date();
	if (ms[3] !== undefined) {
		y = parseInt(ms[1]);
		m = parseInt(ms[2])-1;
		d = parseInt(ms[3]);
		if (y < 100)
			y += 2000;
	}
	else if (ms[2] !== undefined) {
		y = now.getFullYear();
		m = parseInt(ms[1])-1;
		d = parseInt(ms[2]);
	}
	else {
		y = now.getFullYear();
		m = now.getMonth();
		d = parseInt(ms[1]);
	}
	var h, n, s;
	h=0; n=0; s=0;
	ms = str.match(/(\d+):(\d+)(?::(\d+))?/);
	if (ms != null) {
		h = parseInt(ms[1]);
		n = parseInt(ms[2]);
		if (ms[3] !== undefined)
			s = parseInt(ms[3]);
	}
	var dt = new Date(y, m, d, h, n, s);
	if (isNaN(dt.getYear()))
		return null;
	return dt;
}

/**
@fn Date.add(sInterval, n)

为日期对象加几天/小时等。参数n为整数，可以为负数。

@param sInterval Enum. 间隔单位. d-天; m-月; y-年; h-小时; n-分; s-秒

示例：

	var dt = new Date();
	dt.add("d", 1); // 1天后
	dt.add("m", 1); // 1个月后
	dt.add("y", -1); // 1年前
	dt.add("h", 3); // 3小时后
	dt.add("n", 30); // 30分钟后
	dt.add("s", 30); // 30秒后

@see Date.diff
 */
Date.prototype.add = function (sInterval, n)
{
    switch (sInterval) {
	case 'd':
		this.setDate(this.getDate()+n);
		break;
	case 'm':
		this.setMonth(this.getMonth()+n);
		break;
	case 'y':
		this.setYear(this.getYear()+n);
		break;
	case 'h':
		this.setHours(this.getHours()+n);
		break;
	case 'n':
		this.setMinutes(this.getMinutes()+n);
		break;
	case 's':
		this.setSeconds(this.getSeconds()+n);
		break;
	}
	return this;
}

/**
@fn Date.diff(sInterval, dtEnd)

计算日期到另一日期间的间隔，单位由sInterval指定(具体值列表参见Date.add).

	var dt = new Date();
	...
	var dt2 = new Date();
	var days = dt.diff("d", dt2); // 相隔多少天

@see Date.add
*/
Date.prototype.diff = function(sInterval, dtEnd)
{
	var dtStart = this;
	switch (sInterval) 
	{
		case 'd' :return Math.round((dtEnd - dtStart) / 86400000);
		case 'm' :return dtEnd.getMonth() - dtStart.getMonth() + (dtEnd.getFullYear()-dtStart.getFullYear())*12;
		case 'y' :return dtEnd.getFullYear() - dtStart.getFullYear();
		case 's' :return Math.round((dtEnd - dtStart) / 1000);
		case 'n' :return Math.round((dtEnd - dtStart) / 60000);
		case 'h' :return Math.round((dtEnd - dtStart) / 3600000);
	}
}

function DateAdd(sInterval, n, dt)
{
	return new Date(dt).add(sInterval, n);
}

function DateDiff(sInterval, dtStart, dtEnd)
{
	return dtStart.diff(sInterval, dtEnd);
}

function dateStr(s)
{
	var dt = parseDate(s);
	if (dt == null)
		return "";
	return dt.format("D");
}

function dtStr(s)
{
	var dt = parseDate(s);
	if (dt == null)
		return "";
	return dt.format("yyyy-mm-dd HH:MM");
}
// }}}

// ====== JSON {{{
// TODO: use browser's internal JSON object
var MyJSON = {};
(function($) {
    // the code of this function is from  
    // http://lucassmith.name/pub/typeof.html 
    $.type = function(o) { 
        var _toS = Object.prototype.toString; 
        var _types = { 
            'undefined': 'undefined', 
            'number': 'number', 
            'boolean': 'boolean', 
            'string': 'string', 
            '[object Function]': 'function', 
            '[object RegExp]': 'regexp', 
            '[object Array]': 'array', 
            '[object Date]': 'date', 
            '[object Error]': 'error' 
        }; 
        return _types[typeof o] || _types[_toS.call(o)] || (o ? 'object' : 'null'); 
    }; 
    // the code of these two functions is from mootools 
    // http://mootools.net 
    var $specialChars = { '\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"': '\\"', '\\': '\\\\' }; 
    var $replaceChars = function(chr) { 
        return $specialChars[chr] || '\\u00' + Math.floor(chr.charCodeAt() / 16).toString(16) + (chr.charCodeAt() % 16).toString(16); 
    }; 
    $.toJSON = function(o) { 
        var s = []; 
        switch ($.type(o)) { 
            case 'undefined': 
                return 'undefined'; 
                break; 
            case 'null': 
                return 'null'; 
                break; 
            case 'number': 
            case 'boolean': 
            case 'date': 
            case 'function': 
                return o.toString(); 
                break; 
            case 'string': 
                return '"' + o.replace(/[\x00-\x1f\\"]/g, $replaceChars) + '"'; 
                break; 
            case 'array': 
                for (var i = 0, l = o.length; i < l; i++) { 
                    s.push($.toJSON(o[i])); 
                } 
                return '[' + s.join(',') + ']'; 
                break; 
            case 'error': 
            case 'object': 
                for (var p in o) { 
                    s.push(p + ':' + $.toJSON(o[p])); 
                } 
                return '{' + s.join(',') + '}'; 
                break; 
            default: 
                return ''; 
                break; 
        } 
    }; 
    $.evalJSON = function(s) { 
        if ($.type(s) != 'string' || !s.length) return null; 
		try {
			return eval("(" + s + ")");
		}
		catch (e) {
			return null;
		}
    }; 
})(MyJSON); 

var parseJSON = MyJSON.evalJSON;
var toJSON = MyJSON.toJSON;
// }}}

// ====== Cookie and Storage (localStorage/sessionStorage) {{{
/**
@fn setCookie(name, value, days?=30)

设置cookie值。如果只是为了客户端长时间保存值，一般建议使用 setStorage.

@see getCookie
@see delCookie
@see setStorage
*/
function setCookie(name,value,days)
{
	if (days===undefined)
		days = 30;
	if (value == null)
	{
		days = -1;
		value = "";
	}
	var exp  = new Date();
	exp.setTime(exp.getTime() + days*24*60*60*1000);
	document.cookie = name + "="+ escape (value) + ";expires=" + exp.toGMTString();
}

/**
@fn getCookie(name)

取cookie值。

@see setCookie
@see delCookie
*/
function getCookie(name)
{
	var m = document.cookie.match(new RegExp("(^| )"+name+"=([^;]*)(;|$)"));
	if(m != null) {
		return (unescape(m[2]));
	} else {
		return null;
	}
}

/**
@fn delCookie(name)

删除一个cookie项。

@see getCookie
@see setCookie
*/
function delCookie(name)
{
	if (getCookie(name) != null) {
		setCookie(name, null, -1);
	}
}

/**
@fn setStorage(name, value, useSession?=false)

使用localStorage存储(或使用sessionStorage存储, 如果useSession=true)。
注意只能存储字符串，所以value不可以为数组，对象等，必须序列化后存储。 

如果浏览器不支持Storage，则使用cookie实现.

示例：

	setStorage("id", "100");
	var id = getStorage("id");
	delStorage("id");

示例2：对象需要序列化后存储：

	var obj = {id:10, name:"Jason"};
	setStorage("obj", JSON.stringify(obj));
	var obj2 = getStorage("obj");
	alert(obj2.name);

@see getStorage
@see delStorage
*/
function setStorage(name, value, useSession)
{
	assert(typeof value != "object", "value must be scalar!");
	if (window.localStorage == null)
	{
		setCookie(name, value);
		return;
	}
	if (useSession)
		sessionStorage.setItem(name, value);
	else
		localStorage.setItem(name, value);
}

/**
@fn getStorage(name, useSession?=false)

取storage中的一项。
默认使用localStorage存储，如果useSession=true，则使用sessionStorage存储。

如果浏览器不支持Storage，则使用cookie实现.

@see setStorage
@see delStorage
*/
function getStorage(name, useSession)
{
	if (window.localStorage == null)
	{
		getCookie(name);
		return;
	}
	var rv;
	if (useSession)
		rv = sessionStorage.getItem(name);
	else
		rv = localStorage.getItem(name);

	// 兼容之前用setCookie设置的项
	if (rv == null)
		return getCookie(name);
	return rv;
}

/**
@fn delStorage(name)

删除storage中的一项。

@see getStorage
@see setStorage
*/
function delStorage(name, useSession)
{
	if (window.localStorage == null)
	{
		delCookie(name);
		return;
	}
	if (useSession)
		sessionStorage.removeItem(name);
	else
		localStorage.removeItem(name);
	delCookie(name);
}
//}}}

// ====== rs object {{{
/**
@fn rs2Array(rs)

@param rs={h=[header], d=[ @row ]} rs对象(RowSet)
@return arr=[ %obj ]

rs对象用于传递表格，包含表头与表内容。
函数用于将服务器发来的rs对象转成数组。

示例：

	var rs = {
		h: ["id", "name"], 
		d: [ [100, "Tom"], [101, "Jane"] ] 
	};
	var arr = rs2Array(rs); 

	// 结果为
	arr = [
		{id: 100, name: "Tom"},
		{id: 101, name: "Jane"} 
	];

@see rs2Hash
@see rs2MultiHash
*/
function rs2Array(rs)
{
	var ret = [];
	var colCnt = rs.h.length;

	for (var i=0; i<rs.d.length; ++i) {
		var obj = {};
		var row = rs.d[i];
		for (var j=0; j<colCnt; ++j) {
			obj[rs.h[j]] = row[j];
		}
		ret.push(obj);
	}
	return ret;
}

/**
@fn rs2Hash(rs, key)

@param rs={h, d}  rs对象(RowSet)
@return hash={key => %obj}

示例：

	var rs = {
		h: ["id", "name"], 
		d: [ [100, "Tom"], [101, "Jane"] ] 
	};
	var hash = rs2Hash(rs, "id"); 

	// 结果为
	hash = {
		100: {id: 100, name: "Tom"},
		101: {id: 101, name: "Jane"}
	};

@see rs2Array
*/
function rs2Hash(rs, key)
{
	var ret = {};
	var colCnt = rs.h.length;
	for (var i=0; i<rs.d.length; ++i) {
		var obj = {};
		var row = rs.d[i];
		for (var j=0; j<colCnt; ++j) {
			obj[rs.h[j]] = row[j];
		}
		ret[ obj[key] ] = obj;
	}
	return ret;
}

/**
@fn rs2MultiHash(rs, key)

@param rs={h, d}  rs对象(RowSet)
@return hash={key => [ %obj ]}

示例：

	var rs = {
		h: ["id", "name"], 
		d: [ [100, "Tom"], [101, "Jane"], [102, "Tom"] ] 
	};
	var hash = rs2Hash(rs, "name");  

	// 结果为
	hash = {
		"Tom": [{id: 100, name: "Tom"}, {id: 102, name: "Tom"}],
		"Jane": [{id: 101, name: "Jane"}]
	};

@see rs2Hash
@see rs2Array
*/
function rs2MultiHash(rs, key)
{
	var ret = {};
	var colCnt = rs.h.length;
	for (var i=0; i<rs.d.length; ++i) {
		var obj = {};
		var row = rs.d[i];
		for (var j=0; j<colCnt; ++j) {
			obj[rs.h[j]] = row[j];
		}
		if (ret[ obj[key] ] === undefined)
			ret[ obj[key] ] = [];
		ret[ obj[key] ].push(obj);
	}
	return ret;
}
//}}}

// vi: foldmethod=marker 
