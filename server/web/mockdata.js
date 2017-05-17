(function() {

var userTable = new MockTable("User", {
	before: function () {
		if (this.ac == "add") {
			if (this.postParam.createTm == null)
				this.postParam.createTm = new Date();
		}
	}
});
var empTable = new MockTable("Employee", {
	before: function () {
		if (this.ac == "add") {
			if (this.postParam.perms == null)
				this.postParam.perms = "emp";
		}
	}
});
var ordrTable = new MockTable("Ordr");

// 模拟数据
var INIT_CNT = 48;
for (var i=1; i<=INIT_CNT; ++i) {
	var userId = userTable.add({name: "用户"+i, phone: "" + (13700000000 + i)});
	empTable.add({
		name: "员工"+i,
		uname: "emp"+i,
		phone: "" + (18900000000 + i),
		perms: i%20 ==3? "emp,mgr": "emp"
	});
	ordrTable.add({
		userId: userId,
		status: i>(INIT_CNT*0.8) && i%3==0? 'CR': 'RE',
		dscr: (i%4!=0? "基础套餐": "精英套餐"),
		amount: (i%4!=0? 128: 228)  
	});
}

WUI.options.mockDelay = 200; // 模拟调用时间，毫秒
WUI.mockData = {
	"login": [0, empTable.get(1)],
	"logout": [0, "OK"],
	"execSql": [1, "未实现"]
};
userTable.regSvc(WUI.mockData);
empTable.regSvc(WUI.mockData);
ordrTable.regSvc(WUI.mockData);

})();
