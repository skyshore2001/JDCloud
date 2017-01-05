(function() {
	var user = {
		id: 1001,
		name: "孙悟空",
	};
	var orders = []; // @order={id, status, dscr, @orderLog={action, tm} }
	// id = index +100
	// status=CR-created/RE-received/CA-cancelled

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
			if (param.cond == "status in ('CR')") {
				arr = $.grep(orders, function (o) {return o.status == 'CR'});
			}
			else if (param.cond == "status in ('RE','CA')") {
				arr = $.grep(orders, function (o) {return o.status != 'CR'});
			}
			else {
				arr = orders;
			}
			return [0, arr];
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
})();
