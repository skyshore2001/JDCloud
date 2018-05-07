ns_MockTable.call(window);
function ns_MockTable()
{
var self = this;
/**
@fn MockTable(name, opts)

@param opts?={before(), after(data)}

before, after回调中可以使用this变量 = {ac, param, postParam}
其中ac="add"|"set"|"get"|"del"|"query"

例：

	var userTable = new MockTable("User", {
		before: function () {
			if (this.ac == "add") {
				if (this.postParam.createTm == null)
					this.postParam.createTm = new Date().format("L");
			}
		}
	});
	userTable.svcfn("chpwd", function () {
		var id = 1;
		var pwd = this.postParam.pwd; //md5
		return this.svc.set(id, {pwd: pwd});
		// return this.svc.callSvc("set", {id: id}, {pwd: pwd});
	});

	var id = userTable.add({name: "用户1", phone: "13700001234"});
	var user = userTable.get(id);
	userTable.set(id, {name: "用户2"});
	userTable.del(id);

	var rv = userTable.callSvc("add", null, {name: "用户1", phone: "13700001234"});
	var id = rv[1];

	rv = userTable.callSvc("get", {id: id});
	var user = rv[1];

	rv = userTable.callSvc("set", {id: id}, {name: "用户2"});
	rv = userTable.callSvc("del", {id: id});

	rv = userTable.callSvc("query", {cond: "id>10 and name like '%2'", orderby: "id desc"});
	var rows = rv[1].list; // { @list, total?, nextkey?}

	// 添加 User.add/get/set/del/query
	userTable.regSvc(WUI.mockData);

	WUI.mockData["User.add"](null, {name: "abc"});
	WUI.mockData["User.chpwd"](null, {pwd: "1234"});
	WUI.mockData["User.get"]({id: 1});

 */
self.MockTable = MockTable;
function MockTable(name, opts)
{
	var self = this;
	self.name = name;
	self.opts = opts || {};
	self.objs = {}; // id=>obj
	self.seq = 1;
	self.E_PARAM = 1;

	self.svc = {};
	self.svcfn("add", function () {
		return MockTable_add.call(self, this.postParam);
	});
	self.svcfn("set", function () {
		return MockTable_set.call(self, this.param.id, this.postParam);
	});
	self.svcfn("get", function () {
		return MockTable_get.call(self, this.param.id);
	});
	self.svcfn("del", function () {
		return MockTable_del.call(self, this.param.id);
	});
	self.svcfn("query", function () {
		var p = $.extend({}, this.param, this.postParam);
		return MockTable_query.call(self, p);
	});
}

MockTable.prototype.svcfn = function (ac, cb) 
{
	var self = this;
	self.svc[ac] = function (param, postParam) {
		var ret;
		try {
			var ctx = {
				ac: ac,
				param: param || {},
				postParam: postParam || {},
				svc: self
			};
			self.opts.before && self.opts.before.call(ctx);
			var rv = cb.call(ctx);
			self.opts.after && self.opts.after.call(ctx, rv);
			if (rv == null)
				rv = "OK";
			ret = [0, rv];
		}
		catch (ex) {
			if ($.isArray(ex))
				ret = ex;
			else
				throw ex;
		}
		return ret;
	}
}

MockTable.prototype.regSvc = function (obj)
{
	for (ac in this.svc) {
		obj[this.name + "." + ac] = this.svc[ac];
	}
}

function MockTable_add(obj)
{
	var obj1 = $.extend({}, obj);
	obj1.id = this.seq ++;
	this.objs[obj1.id] = obj1;
	return obj1.id;
}

function MockTable_get(id)
{
	var obj = this.objs[id];
	if (obj == null)
		throw [this.E_PARAM, "Not found"];
	return obj;
}

function MockTable_del(id)
{
	if (! (id in this.objs))
		throw [this.E_PARAM, "Not found"];
	delete this.objs[id];
}

function MockTable_set(id, obj)
{
	delete obj.id;
	var obj1 = this.get(id);
	$.extend(obj1, obj);
}

function MockTable_query(param)
{
	var arr = [];
	var cond = param.cond;
	if (cond) {
		// id>=10 and name like '%xx%' and addr='shanghai'
		// => id>=10 && /.*xx.*/.test(name) && addr=='shanghai'
		cond = cond.replace(/((\w\s*)(=|<>)(\s*\S))|(\w+)\s+like\s+'([^']+)'|(and)|(or)/ig, function (m,m1, m11,m12,m13, m21, m22,m3,m4) {
			if (m3)
				return "&&";
			if (m4)
				return "||";
			if (m1) {
				if (m12 == "=")
					return m11 + "==" + m13;
				else
					return m11 + "!=" + m13;
			}
			if (m21) {
				return "/^" + m22.replace(/%/g, '.*') + "$/.test(" + m21 + ")";
			}
		});
	}
	$.each(this.objs, function () {
		if (cond) {
			with(this) {
				if (eval(cond)) {
					arr.push(this);
				}
			}
		} else {
			arr.push(this);
		}
	});
	if (param.orderby && arr.length > 0) {
	  var m = param.orderby.match(/(\w+)(?:\s+(asc|desc))?/i);
	  if (m) {
			var field = m[1];
			var desc = (m[2] && m[2].toLowerCase() == "desc");
			arr.sort(function (a, b) {
				var ret = a[field] > b[field]? 1: -1;
				if (desc)
					ret= -ret;
				return ret;
			});
	  }
	}

	// 分页模拟
	var ret = {list: []};
	var pagesz = param._pagesz || param.rows || 20;
	var pagekey = param._pagekey || param.page || 1;
	if (pagekey == 1 || param.page)
		ret.total = arr.length;

	for (var n=0, i=(pagekey-1)*pagesz; n<pagesz && i<arr.length; ++n, ++i) {
		ret.list.push(arr[i]);
	}
	if (n == pagesz)
		ret.nextkey = pagekey+1;
	return ret;
}

$.extend(MockTable.prototype, {
	callSvc: function (ac, param, postParam) {
		var fn = this.svc[ac];
		if (! $.isFunction(fn))
			throw "bad svc: " + ac;
		var rv = fn.call(this, param, postParam);
		if (rv[0] == 0)
			return rv[1];
		throw rv;
	},
	add: function (obj) {
		return this.callSvc("add", null, obj);
	},
	set: function (id, obj) {
		return this.callSvc("set", {id: id}, obj);
	},
	get: function (id) {
		return this.callSvc("get", {id: id});
	},
	del: function (id) {
		return this.callSvc("del", {id: id});
	}
});

}

