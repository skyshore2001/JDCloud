(function() {
	var user = {
		id: 1001,
		name: "孙悟空",
		phone: "18912345678"
	};
	var orders = []; // @order={id, status, dscr, @orderLog={action, tm} }
	// id = index +100
	// status=CR-created/RE-received/CA-cancelled

	MUI.options.mockDelay = 500; // 模拟调用时间，毫秒
	MUI.mockData = {
		"login": [0, user],
		"logout": [0, "OK"],
		"User.get": [0, user],
		"User.set": function (param, postParam) {
			$.extend(user, postParam);
			return [0, "OK"];
		},
		"Ordr.add": function (param, postParam) {
			var id = orders.length+100;
			var o = $.extend({id: id, status: 'CR'}, postParam);
			o.orderLog = [ {action: 'CR', tm: new Date()} ];
			orders.push(o);
			return [0, id];
		},
		"Ordr.get": function (param, postParam) {
			var idx = param.id - 100;
			return [0, orders[idx]];
		},
		"Ordr.query": function (param, postParam) {
			var arr;
			if (/CR/.test(param.cond)) {
				arr = $.grep(orders, function (o) {return o.status == 'CR'});
			}
			else if (/RE|CA/.test(param.cond)) {
				arr = $.grep(orders, function (o) {return o.status != 'CR'});
			}
			else {
				arr = orders;
			}
			// 分页模拟, 倒序排列
			var ret = {list: []};
			var pagesz = param._pagesz || 20;
			var pagekey = param._pagekey || 0;

			for (var n=0, i=pagekey; n<pagesz && i<arr.length; ++n, ++i) {
				ret.list.push(arr[arr.length-i-1]);
			}
			if (n == pagesz)
				ret.nextkey = i;
			return [0, ret];
		},
		"Ordr.set": function (param, postParam) {
			var idx = param.id - 100;
			var o = orders[idx];
			if (postParam.status) {
				o.orderLog.push({action: postParam.status, tm: new Date()});
			}
			$.extend(o, postParam);
			return [0, "OK"];
		}
	}

	// 模拟订单
	var INIT_CNT = 48;
	for (var i=0; i<INIT_CNT; ++i) {
		var ret = MUI.mockData["Ordr.add"](null, {
			dscr: i%4!=0? "基础套餐": "精英套餐",
			amount: i%4!=0? 128: 228
		});
		var id = ret[1];
		// 设置为已完成
		if (i < 5) {
			MUI.mockData["Ordr.set"]({id: id}, {status: 'RE'});
		}
	}
})();
