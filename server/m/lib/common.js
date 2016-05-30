// common functions

// ====== General {{{
// eg. var ran = randInt(1, 10)
function randInt(from, to)
{
	return Math.floor(Math.random() * (to - from + 1)) + from;
}

// eg. var dyn_pwd = randAlphanum(8)
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

// eg. println(basename("c:\\aaa\\bbb/cc/ttt.asp", ".asp"));
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

function assert(dscr, cond)
{
	if (!cond) {
		throw("assert fail - " + dscr);
	}
}

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

function tobool(v)
{
	if (typeof v === "string")
		return v !== "" && v !== "0" && v.toLowerCase() !== "false" && v.toLowerCase() !== "off";
	return !!v;
}

// goto default page without hash (#xx)
function reloadSite()
{
	if (location.href == location.pathname || location.href == location.pathname + location.search)
		location.reload();
	else
		location.href = location.pathname + location.search;
	throw "abort";
}

// }}}

// ====== Date {{{
// ***************** DATE MANIPULATION: format, addMonth, addDay, addHours ******************

// dt.format('yyyy-mm-dd HH:MM:SS');
// dt.format(); // 即 yyyy-mm-dd HH:MM:SS (缺省)
// dt.format('L'); // 即 yyyy-mm-dd HH:MM:SS (缺省)
// dt.format('D'); // 即 yyyy-mm-dd
// dt.format('T'); // 即 HH:MM:SS
// dt.addMonth(-1);
// dt.addDay(1);
// dt.addHours(10);

function setWidth_2(number)
{
	return number < 10? ("0" + number) : ("" + number);
}

// format a data object
// by default: fmt = "L" ("L": long即date & time, "D": date, "T": time)
// e.g. new Date.format("yyyy/mm/dd HH:MM:SS"
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

// addDay for Date object
Date.prototype.addDay = function(iDay)
{
	this.setDate(this.getDate() + iDay);
	return this;
}

// addHour for Date object
Date.prototype.addHours = function (iHours)
{
	this.setHours(this.getHours() + iHours);
	return this;
}

// addMin for Date object
Date.prototype.addMin = function (iMin)
{
	this.setMinutes(this.getMinutes() + iMin);
	return this;
}
// addMonth for Date object
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

function parseTime(s)
{
	var a = s.split(":");
	var dt =  new Date(0,0,1, a[0],a[1]||0,a[2]||0);
	if (isNaN(dt.getYear()))
		return null;
	return dt;
}

// TODO: timezone
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
// days: default=30
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

function getCookie(name)
{
	var m = document.cookie.match(new RegExp("(^| )"+name+"=([^;]*)(;|$)"));
	if(m != null) {
		return (unescape(m[2]));
	} else {
		return null;
	}
}

function delCookie(name)
{
	if (getCookie(name) != null) {
		setCookie(name, null, -1);
	}
}

// 使用localStorage存储(或sessionStorage, 如果useSession=true)，只能存储字符串
// 如果浏览器不支持，则使用cookie实现
// useSession?=false
function setStorage(name, value, useSession)
{
	assert("value must be scalar!", typeof value != "object");
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
// [{col1, col2}]
function rs2Array(rs)
{
	var a = [];
	var cols = rs.h.length;

	for (var i=0; i<rs.d.length; ++i) {
		var e = {};
		for (var j=0; j<cols; ++j) {
			e[rs.h[j]] = rs.d[i][j];
		}
		a.push(e);
	}
	return a;
}

// {k=>{col1, col2}}
function rs2Hash(rs, key)
{
	var h = {};
	var cols = rs.th.length;
	var key_col;
	for (var i=0; i<cols; ++i) {
		if (rs.h[i] == key) {
			key_col = i;
			break;
		}
	}
	if (key_col == null)
		return h;

	for (var i=0; i<rs.d.length; ++i) {
		var td = rs.d[i];
		var e = [];
		for (var j=0; j<cols; ++j) {
			e[rs.h[j]] = td[j];
		}
		h[td[key_col]] = e;
	}
	return h;
}

function rs2MultiHash(rs, key)
{
	var h = {};
    var a = [];
	var cols = rs.h.length;
	var key_col;
	for (var i=0; i<cols; ++i) {
		if (rs.h[i] == key) {
			key_col = i;
			break;
		}
	}
	if (key_col == null)
		return h;

	for (var i=0; i<rs.d.length; ++i) {
		var td = rs.d[i];
		var e = {};
		for (var j=0; j<cols; ++j) {
			e[rs.h[j]] = td[j];
		}
        
        if (h[td[key_col]] == null) {
            h[td[key_col]] = new Array();
        }

        h[td[key_col]].push(e);
	}
	return h;
}
//}}}

// vim: set foldmethod=marker cms=//\ %s :
