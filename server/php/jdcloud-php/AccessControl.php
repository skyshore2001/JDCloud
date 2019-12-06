<?php
/**
@module AccessControl

对象型接口框架。
AccessControl简写为AC，同时AC也表示自动补全(AutoComplete).

在设计文档中完成数据库设计后，通过添加AccessControl的继承类，可以很方便的提供诸如 {Obj}.query/add/get/set/del 这些对象型接口。

例如，设计文档中已定义订单对象(Ordr)的主表(Ordr)和订单日志子表(OrderLog)：

	@Ordr: id, userId, status, amount
	@OrderLog: id, orderId, tm, dscr

注意：之所以用对象和主表名用Ordr而不是Order词是避免与SQL关键字冲突。

有了表设计，订单的标准接口就已经自动生成好了：

	// 查询订单
	Ordr.query() -> tbl(id, userId, ...)
	// 添加订单
	Ordr.add()(userId=1, status='CR', amount=100) -> id
	// 查看订单
	Ordr.get(id=1)
	// 修改订单状态
	Ordr.set(id=1)(status='PA')
	// 删除订单
	Ordr.del(id=1)

但是，只有超级管理员登录后（例如从示例应用中的超级管理端登录后，web/adm.html），才有权限使用这些接口。

如果希望用户登录后，也可以使用这些接口，只要添加一个继承AccessControl的类，且命名为"AC1_Ordr"即可：

	class AC1_Ordr extends AccessControl
	{
	}

有了以上定义，在用户登录系统后，就可以使用上述和超级管理员一样的标准订单接口了。

说明：

类的命名规则为AC前缀加对象名（或主表名，因为对象名与主表名一致）。框架默认提供的前缀如下：

@key AC_  游客权限(AUTH_GUEST)，如未定义则调用时报“无权操作”错误。
@key AC0_ 超级管理员权限(AUTH_ADMIN)，如未定义，默认拥有所有权限。
@key AC1_  用户权限(AUTH_USER)，如未定义，则降级使用游客权限接口(AC_)。
@key AC2_  员工权限(AUTH_EMP/AUTH_MGR), 如未定义，报权限不足错误。

因而上例中命名为 "AC1_Ordr" 就表示用户登录后调用Ordr对象接口，将受该类控制。而这是个空的类，所以拥有一切操作权限。

框架为AUTH_ADMIN权限自动选择AC0_类，其它类可以通过函数 onCreateAC 进行自定义，仍未定义的框架使用AC_类。

@fn onCreateAC($obj)

需开发者在api.php中定义。
根据对象名，返回权限控制类名，如 AC1_{$obj}。
如果返回null, 则默认为 AC_{obj}

## 基本权限控制

@var AccessControl::$allowedAc?=["add", "get", "set", "del", "query"] 设定允许的操作，如不指定，则允许所有操作。

@var AccessControl::$readonlyFields ?=[]  (影响add/set) 字段列表，添加/更新时为这些字段填值无效（但不报错）。
@var AccessControl::$readonlyFields2 ?=[]  (影响set操作) 字段列表，更新时对这些字段填值无效。
@var AccessControl::$hiddenFields ?= []  (for get/query) 隐藏字段列表。默认表中所有字段都可返回。一些敏感字段不希望返回的可在此设置。

@var AccessControl::$requiredFields ?=[] (for add/set) 字段列表。添加时必须填值；更新时不允许置空。
@var AccessControl::$requiredFields2 ?=[] (for set) 字段列表。更新时不允许设置空。

@fn AccessControl::onQuery() (for get/query)  用于对查询条件进行设定。
@fn AccessControl::onValidate()  (for add/set). 验证添加和更新时的字段，或做自动补全(AutoComplete)工作。
@fn	AccessControl::onValidateId() (for get/set/del) 用于对id字段进行检查。比如在del时检查用户是否有权操作该记录。可在其中设置$this->id。

上节例子中，用户可以操作系统的所有订单。

现在我们到设计文档中，将接口API设计如下：

	== 订单接口 ==

	添加订单：
	Ordr.add()(amount) -> id

	查看订单：
	Ordr.query() -> tbl(id, userId, status, amount)
	Ordr.get(id)

	权限：AUTH_GUEST

	应用逻辑
	- 用户只能添加(add)、查看(get/query)订单，不可修改(set)、删除(del)订单
	- 用户只能查看(get/query)属于自己的订单。
	- 用户在添加订单时，必须设置amount字段，不必（也不允许）设置id, userId, status这些字段。
	  服务器应将userId字段自动设置为该用户编号，status字段自动设置为"CR"（已创建）

为实现以下逻辑，上面例子中代码可修改为：

	class AC1_Ordr extends AccessControl
	{
		protected $allowedAc = ["get", "query", "add"];
		protected $requiredFields = ["amount"];
		protected $readonlyFields = ["status", "userId"];

		protected function onQuery()
		{
			$userId = $_SESSION["uid"];
			$this->addCond("t0.userId={$userId}");
		}

		protected function onValidate()
		{
			if ($this->ac == "add") {
				$userId = $_SESSION["uid"];
				$_POST["userId"] = $userId;
				$_POST["status"] = "CR";
			}
		}
	}

说明：

- 使用$allowedAc设定了该对象接口允许的操作。
- 使用$requiredFields与$readonlyFields设定了添加时必须指定或不可指定的字段。由于"id"字段默认就是不可添加/更新的，所以不必在这里指定。
- 在onQuery中，对用户可查看的订单做了限制：只允许访问自己的订单。这里通过添加了条件实现。
  $_SESSION["uid"]是在用户登录后设置的，可参考login接口定义(api_login).
- 在onValidate中，对添加操作时的字段做自动补全。由于添加和更新都会走这个接口，所以用 $this->ac 判断只对添加操作时补全。
  由于添加和更新操作的具体字段都通过 $_POST 来传递，故直接设置 $_POST中的相应字段即可。

## 虚拟字段(VCol)

@var AccessControl::$vcolDefs (for get/query) 定义虚拟字段

常用于展示关联表字段、统计字段等。
在query,get操作中可以通过res参数指定需要返回的每个字段，这些字段可能是普通列名(col)/虚拟列名(vcol)/子对象(subobj)名。

### 关联字段

例如，在订单列表中需要展示用户名字段。设计文档中定义接口：

	Ordr.query() -> tbl(id, dscr, ..., userName?, userPhone?, createTm?)

query接口的"..."之后就是虚拟字段。后缀"?"表示是非缺省字段，即必须在"res"参数中指定才会返回，如：

	Ordr.query(res="*,userName")

在cond中可以直接使用虚拟字段，不管它是否在res中指定，如

	Ordr.query(cond="userName LIKE 'jian%'", res="id,dscr")

通过设置$vcolDefs实现这些关联字段：

	class AC1_Ordr extends AccessControl
	{
		protected $vcolDefs = [
			[
				"res" => ["u.name AS userName", "u.phone AS userPhone"],
				"join" => "INNER JOIN User u ON u.id=t0.userId",
				// "default" => false, // 指定true表示Ordr.query在不指定res时或res中以"*"开头时将默认会返回该字段。
			],
			[
				"res" => ["log_cr.tm AS createTm"],
				"join" => "LEFT JOIN OrderLog log_cr ON log_cr.action='CR' AND log_cr.orderId=t0.id",
			]
		]
	}

- default: 默认虚拟字段，示例："*,picCnt"表示返回t0表所有字段加默认虚拟字段，再加指定的picCnt字段；而"t0.*,picCnt"返回t0表的所有字段以及picCnt字段，不含默认虚拟字段；
 对移动端应用接口，尽量不使用default=true，让前端自由控制。对管理平台接口，列表页和详情对话框上均显示的虚拟字段设置为default=true比较方便，因为链接方式打开详情对话框时，只能直接调用"Obj.query"接口，不方便指定res参数。

注意：如果需要在程序中引入某个关联表定义，可以调用addVCol显式指定，例如：

	$this->addVcol("userName"); // 在SQL语句中添加SELECT userName ... JOIN User
	// 如果不想影响SELECT字段:
	$this->addVcol("userName", false, "-"); // 只在SQL语句中添加 JOIN User

### 关联字段依赖

假设设计有“订单评价”对象，它会与“订单对象”相关联：

	@Rating: id, orderId, content

表间的关系为：

	订单评价Rating(orderId) <-> 订单Ordr(userId) <-> 用户User

现在要为Rating表增加关联字段 "Ordr.dscr AS orderDscr", 以及"User.name AS userName", 设计接口为：

	Rating.query() -> tbl(id, orderId, content, ..., orderDscr?, userName?)
	注意：userName字段不直接与Rating表关联，而是通过Ordr表桥接。

实现时，只需在vcolDefs中使用require指定依赖字段：

	class AC1_Rating extends AccessControl
	{
		protected $vcolDefs = [
			[
				"res" => ["o.dscr AS orderDscr", "o.userId"],
				"join" => "INNER JOIN Ordr o ON o.id=t0.orderId",
			],
			[
				"res" => ["u.name AS userName"],
				"join" => "INNER JOIN User u ON o.userId=u.id",
				"require" => "userId", // *** 定义依赖，如果要用到res中的字段如userName，则自动添加userId字段引入的表关联。
				// 这里指向orderDscr也可以，一般习惯上指向关联的字段。
			],
		];
	}

使用require, 框架可自动将Ordr表作为中间表关联进来。
如果没有require定义，以下调用

	Rating.query(res="*,orderDscr,userName")

也不会出问题，因为在userName前指定了orderDscr，框架可自动引入相关表。而以下查询就会出问题：

	Rating.query(res="*,userName")
	或
	Rating.query(res="*,userName,orderDscr")

### 计算字段

示例：管理端应用在查询订单时，需要订单对象上有一个原价字段：

	Ordr.query() -> tbl(..., amount2)
	amount2:: 原价，通过OrderItem中每个项目重新计算累加得到，不考虑打折优惠。

可实现为：

	class AC0_Ordr extends AccessControl
	{
		protected $vcolDefs = [
			[
				"res" => ["(SELECT SUM(qty*ifnull(price2,0)) FROM OrderItem WHERE orderId=t0.id) AS amount2"],
			]
		];
	}

### 子表压缩字段

除了使用[子表](#AccessControl::$subobj), 对于简单的情况，也可以设计为将子表压缩成一个虚拟字段，在Query操作时直接返回。

示例：OrderItem是Ordr对象的一个子表，现在想在查询Ordr对象列表时，返回OrderItem的相关信息。
这就要把一张子表压缩成一个字段。我们使用List来描述这种压缩字段的格式：表中每行以","分隔，行中每个字段以":"分隔。
利用List，可将接口设计为：

	Ordr.query() -> tbl(..., itemsInfo)
	itemsInfo:: List(name, price, qty). 例如"洗车:25:1,换轮胎:380:2", 表示两行记录，每行3个字段。注意字段内容中不可出现":", ","这些分隔符。

子表压缩是一种特殊的计算字段，可实现如下：

	class AC1_Ordr extends AccessControl
	{
		protected $vcolDefs = [
			[
				"res" => ["(SELECT group_concat(concat(oi.name, ':', oi.price, ':', oi.qty)) FROM OrderItem oi WHERE oi.orderId=t0.id) itemsInfo"] 
			],
			...
		]
	}

注意：计算字段，包括子表压缩字段都是很消耗性能的。

### 自定义字段

假设有张虚拟表Task, 它没有存储在数据库中, 另一张表UserTaskLog关联到它。在设计文档中定义如下:

	@UserTaskLog: id, userId, taskId
	@Conf::$taskTable: id, type, name
	(关联： UserTaskLog(taskId) <-> Conf::$taskTable )
	
	提供查询接口：
	UserTaskLog.query() -> tbl(id, taskId, ..., taskName)
	taskName:: 由关联表的taskTable.name字段得到。

实现中，在代码中直接定义Task表：

	class Conf
	{
		static $taskTable = [
			["id" => 1, "type"=>"invite", "name" => "邀请5个用户注册"],
			["id" => 2, "type"=>"invite", "name" => "邀请10个用户注册"],
		];
	}

通过在vcolDefs的join属性指定一个函数，可以实现返回taskName字段：

	function getTaskName(&$row)
	{
		foreach (Conf::$taskTable as $task) {
			if ($row["taskId"] == $task["id"]) {
				$row["taskName"] = $task["name"];
			}
		}
	}

	class AC1_UserTaskLog extends AccessControl
	{
		protected $vcolDefs = [
			[
				"res" => ["taskName"],
				"join" => getTaskName
			]
		];
	}

注意:

- 自定义字段只限于对query/get的最终结果集进行操作
- 自定义字段不能用于设置cond条件.

### flags和props字段

（试验功能）
框架支持两个特别的数据库字段flags和props，并可将它们拆解为flag_xxx或prop_xxx格式。
例如，在订单表上定义：

	@Ordr: id, flags

	- flags: EnumList(g-go-员工已出发, v-visited-已回访, r-reviewed-已人工校验过, i-imported-是自动导入的订单)。例如, 值"gv"表示有"g"标志和"v"标志。
 
要查询已回访或未回访的订单，可以用：

	Ordr.query(cond="flag_v=1/0", res="id,flags") -> tbl(id, flags, ..., flag_g?, flag_v?, ...)

注意：返回字段将自动根据flags的值增加诸如flag_g这样的字段，值为0或1；但res参数中不可指定flag_v这样的虚拟字段。

要设置或清除已回访标志"g"，可以用：

	Ordr.set(id=1)(flag_g=1/0)

注意：不可一次设置多个flag。如果需要这样，则应直接设置flags字段。

props字段与之类似，flags字段中一个标志是一个字母，而props字段的标志以一个词，因而多个标志以空格隔开。
假设Ordr表中定义了props字段，且某条记录的值为"go visited"，则该记录返回字段会有 `{ prop_go:1, prop_visited:1 }`

也可以进行设置和清除，并可与flags一起用，如：

	Ordr.set(id=1)(prop_go=1/0, flag_v=1/0)

### 外部虚拟字段(ExtVCol)

(v5.2) 增加“外部虚拟字段”用于创建嵌套查询。

#### 嵌套查询

示例：下面已定义y, m两个虚拟字段，现在基于y和m再创建新的虚拟字段ym，可以这样：

	$vcolDefs = [
		[
			"res" => ["year(tm) y", "month(tm) m"],
		],
		[
			"res" => ["concat(y, '-', m) ym"],
			// 用isExt指定这是外部虚拟字段
			"isExt" => true,
			// 用require指定所有依赖的内层字段
			"require" => 'y,m'
		]
	]

query/get接口生成的查询语句大致为：

	SELECT t0.*, concat(y, '-', m) ym
	FROM (
		SELECT t0.id,year(tm) y,month(tm) m FROM ApiLog t0
		WHERE ...
	) t0

注意：即使在调用接口时用res参数指定了返回字段，外部虚拟字段依赖的内部字段也将返回。比如query(res="id,ym")返回`tbl(id,y,m,ym)`.

注意：设置require或res属性时，如果依赖的是表的字段，应加表名，如"t0.tm, t1.name"，如果是虚拟字段，则不加表名，如"y,m"。

注意：关于时间统计相关的虚拟字段，一般通过tmCols函数来指定：

	function __construct() {
		$this->vcolDefs[] = [ "res" => tmCols() ];
	}

#### 关联子查询优化

**外部虚拟字段还常常用于优化SELECT语句中关联子查询性能。框架将自动识别关联子查询，并使用嵌套查询机制来优化性能。**

如果一个虚拟字段，它的res中定义有关联子查询，在query操作时可能性能很差，当：
排序字段(orderby)不是主表字段；
或orderby虽然是主表字段（甚至是索引），但查询引擎的查询计划不佳，也会导致特别慢。（这种情况下，测试时可强制指定索引，比如在from t0后加上force index(primary)，可以大幅优化。）

示例：对ApiLog表有虚拟字段sesCnt，它使用关联子查询，定义如下：

	$vcolDefs = [
		[
			// 可作为“外部虚拟字段”来优化
			"res" => ["(select count(*) from ApiLog t1 where t1.ses=t0.ses) sesCnt"]
		],
		[
			// 普通虚拟字段，将在示例中用于orderby
			"res" => ["u.name AS userName", "u.phone AS userPhone"],
			"join" => "INNER JOIN User u ON u.id=t0.userId"
		]
	]

未做优化时，query(orderby=userName)查询语句如下：

	SELECT t0.*, (select count(*) from ApiLog t1 where t1.ses=t0.ses) sesCnt
	FROM ApiLog t0
	JOIN User ...
	ORDER BY u.name
	LIMIT 0,20

当ORDER-BY不是主表ApiLog的字段时，或虽然是主表字段但数据库的查询引擎判断失误（此处不可预料），
都可能导致查询计划中将会把虚拟字段全部计算出来后再排序，导致巨慢。（实测2万行数据，查询20行数据需要16秒）

优化策略是使用嵌套查询，将sesCnt字段放到外层查询：

	SELECT t0.*, (select count(*) from ApiLog t1 where t1.ses=t0.ses) sesCnt
	FROM (
		SELECT t0.*
		FROM ApiLog t0
		JOIN User ...
		ORDER BY u.name
		LIMIT 0,20
	) t0

这样只需要对最终结果20条数据计算虚拟字段。
由于出现了外层和内层两层SQL，我们将外层的虚拟字段称为外部虚拟字段。

效果：ApiLog仅20000行数据，优化前查询一次16秒，优化后降低到0.2s。

注意：自动优化只处理res中只有一个元素且未指定join条件的情况，并且会自动识别出依赖内层t0.ses字段。
如果自动处理或识别有误，可手工设置isExt和require属性，比如：

	[
		"res" => ["(select count(*) from ApiLog t1 where t1.ses=t0.ses and t0.userId is not null) sesCnt"],
		"isExt" => true,
		"require" => "t0.ses,t0.userId"
	]

上面require属性指定内层查询应暴露给外层的字段，如果有多个可用逗号分隔（自动优化只能处理一个）。
注意res中的t0指的是内层查询的结果表，名称固定为t0; 而require中的表指的是内层查询内部的表。

注意：使用外部虚拟字段时，将导致require中的字段被添加到最终结果集。例如上面例子中的"t0.ses,t0.userId"字段会被添加到最终结果集。

注意：如果想禁止优化，可手工设置vcolDef的isExt属性为false：

	[
		"res" => ["(select count(*) from ApiLog t1 where t1.ses=t0.ses) sesCnt"],
		"isExt" => false
	]

## 子表

@var AccessControl::$subobj (for get/query) 定义子表

subobj: { name => {obj, cond, AC?, res?, default?=false} } （v5.4）指定子表对象obj，全面支持子表的增删改查。

或

subobj: { name => {sql, default?=false, wantOne?=false, force?=false} }

设计接口：

	Ordr.get() -> {id, ..., @orderLog}
	orderLog:: {id, tm, dscr, ..., empName} 订单日志子表。

实现：

	class AC1_Ordr extends AccessControl
	{
		protected $subobj = [
			"orderLog" => ["obj"=>"OrderLog", "cond"=>"orderId=%d", "AC"=>"OrderLog", "res"=>"*,empName,empPhone"],
		];
	}

	class OrderLog extends AccessControl
	{
		protected $vcolDefs = [
			[
				"res" => ["e.name AS empName", "e.phone AS empPhone"],
				"join" => "LEFT JOIN Employee e ON e.id=t0.empId"
			]
		];
	}

或

	class AC1_Ordr extends AccessControl
	{
		protected $subobj = [
			"orderLog" => ["sql"=>"SELECT ol.*, e.name empName, e.phone empPhone FROM OrderLog ol LEFT JOIN Employee e ON ol.empId=e.id WHERE orderId=%d", "default"=>false, "wantOne"=>false],
		];
	}

子表和虚拟字段类似，支持get/query操作，执行指定的SQL语句作为结果。结果以一个数组返回[{id, tm, ...}]。

- sql: 子表查询语句，其中应包含用"field=%d"这样语句来定义与主表id字段的关系。
 (v5.1)为了优化query接口，避免每一行分别查一次子表，查询语句会被改为"field IN (...)"的形式。
- default: 与虚拟字段(vcolDefs)上的"default"选项一样，表示当"res"参数以"*"开头(比如`res="*,picCnt"`)或未指定时，是否默认返回该字段。
- wantOne: 如果为true, 则结果以一个对象返回即 {id, tm, ...}, 适用于主表与子表一对一的情况。
- force: (v5.1) 如果sql中没有与主表的关联即没有包含"field=%d"，应指定force=true，否则在query接口中会当作语句错误。

## 操作完成回调

@fn AccessControl::onAfter(&$ret)  (for all) 操作完成时的回调。可修改操作结果ret。
如果要对get/query结果中的每行字段进行设置，应重写回调 onHandleRow. 
有时使用 onAfterActions 就近添加逻辑更加方便。

注意：对于query接口，无论返回哪种格式（如默认的压缩表、或用fmt参数指定list/csv/txt/excel等格式），在onAfter或onAfterActions中都是对象数组的格式，如：

	[ [ "id"=>100, "name"=>"name1"], ["id"=>101", "name"=>"name2"], ... ]

@var AccessControl::$onAfterActions =[].  onAfter的替代方案，更易使用，便于与接近的逻辑写在一起。
@var AccessControl::$id  get/set/del时指定的id, 或add后返回的id.

例如，添加订单时，自动添加一条日志，可以用：

	protected function onValidate()
	{
		if ($this->ac == "add") {
			... 
			// 可修改$ret
			$this->onAfterActions[] = function (&$ret) use ($logAction) {
				$orderId = $this->id;
				dbInsert("OrderLog", [
					"orderId" => $orderId,
					"action" => "CR",
					"tm" => date(FMT_DT)  // 或用mysql表达式 ["now()"]
				]);
			};
		}
	}

与onAfter类似，加到onAfterActions集合中的函数，如果要修改返回数据，只要在函数参数中声明`&$ret`就可以修改它了。

@fn AccessControl::onHandleRow(&$rowData) (for get/query) 在onAfter之前运行，用于修改行中字段。

## 其它

### 编号自定义生成

@fn AccessControl::onGenId() (for add) 指定添加对象时生成的id. 缺省返回0表示自动生成.

示例：为避免ID暴露业务数据，可跳号生成ID，比如造成单量放大5-20倍的假象:

	protected function onGenId()
	{
		$id = queryOne("SELECT MAX(id) FROM Ordr");
		return $id + rand(5, 20);
	}

这个示例在超大并发时可能会有ID重复的风险且性能不高，更好的方法是向一个ID生成器服务发起请求。

### 缺省排序

@var AccessControl::$defaultSort ?= "t0.id" (for query)指定缺省排序.

示例：Video对象默认按id倒序排列：

	class AC_Video extends AccessControl 
	{
		protected $defaultSort = "t0.id DESC";
		...
	}

### 缺省输出字段列表

@var AccessControl::$defaultRes (for query)指定缺省输出字段列表. 如果不指定，则为"*", 即 "t0.*" 加默认虚拟字段(指定default=true的字段)

### 最大每页数据条数

@fn AccessControl::getMaxPageSz()  (for query) 取最大每页数据条数。为非负整数。
@var AccessControl::$maxPageSz ?= 1000 (for query) 指定最大每页数据条数。值为负数表示取PAGE_SZ_LIMIT值.

前端通过 {obj}.query(pagesz)来指定每页返回多少条数据，缺省是20条，最高不可超过100条。当指定为负数时，表示按最大允许值=min($maxPageSz, PAGE_SZ_LIMIT)返回。
PAGE_SZ_LIMIT目前定为10000条。如果还不够，一定是应用设计有问题。

如果想返回每页超过100条数据，必须在后端设置，如：

	class MyObj extends AccessControl
	{
		protected $maxPageSz = 2000; // 最大允许返回2000条
		// protected $maxPageSz = -1; // 最大允许返回 PAGE_SZ_LIMIT 条
	}

@var PAGE_SZ_LIMIT =10000

### 虚拟表和视图

假如要对ApiLog进行过滤，只查询管理端的写操作。实现以下接口：

	EmpLog.query() -> tbl(id, tm, userId, ac, req, res, reqsz, ressz, empName?, empPhone?)
	
一种办法可以在后台定义一个视图，如:

	CREATE VIEW EmpLog AS
	SELECT t0.id, tm, userId, ac, req, res, reqsz, ressz, e.name empName, e.phone empPhone
	FROM ApiLog t0
	LEFT JOIN Employee e ON e.id=t0.userId
	WHERE t0.app='emp-adm' AND t0.userId IS NOT NULL
	ORDER BY t0.id DESC

然后可将该视图当作表一样查询（但不可更新），如：

	class AC2_EmpLog extends AccessControl 
	{
		protected $allowedAc = ["query"];
	}

这样就可以实现上述接口了。

另一种办法是直接使用AccessControl创建虚拟表，代码如下：

	class AC2_EmpLog extends AccessControl 
	{
		protected $allowedAc = ["query"];
		protected $table = 'ApiLog';
		protected $defaultSort = "t0.id DESC";
		protected $defaultRes = "id, tm, userId, ac, req, res, reqsz, ressz, empName, empPhone";
		protected $vcolDefs = [
			[
				"res" => ["e.name AS empName", "e.phone AS empPhone"],
				"join" => "LEFT JOIN Employee e ON e.id=t0.userId"
			]
		];

		protected function onQuery() {
			$this->addCond("t0.app='emp-adm' and t0.userId IS NOT NULL");
		}
	}

与上例相比，它不仅无须在数据库中创建视图，还也可以进行更新。
其要点是：

- 重写 AccessControl::$table
- 重写 AccessControl::$defaultRes
- 用addCond添加缺省查询条件

table也可以指定为子表(即视图)，例如上例也可以这样实现，省去onQuery中的实现：

	class AC2_EmpLog extends AccessControl 
	{
		protected $allowedAc = ["query"];
		// 注意：子查询要加括号括起来
		protected $table = "(SELECT * FROM ApiLog t0 WHERE t0.app='emp-adm' and t0.userId IS NOT NULL)";
		protected $defaultSort = "t0.id DESC";
		protected $defaultRes = "id, tm, userId, ac, req, res, reqsz, ressz, empName, empPhone";
		protected $vcolDefs = [
			[
				"res" => ["e.name AS empName", "e.phone AS empPhone"],
				"join" => "LEFT JOIN Employee e ON e.id=t0.userId"
			]
		];
	}

甚至可将整个SQL子查询封在table中：

	class AC2_EmpLog extends AccessControl 
	{
		protected $allowedAc = ["query"];
		protected $table = "(SELECT t0.id, tm, userId, ac, req, res, reqsz, ressz, e.name AS empName, e.phone AS empPhone 
FROM ApiLog t0 
LEFT JOIN Employee e ON e.id=t0.userId
WHERE t0.app='user' and t0.userId IS NOT NULL
ORDER BY t0.id DESC)";
	}

### query接口输出格式

query接口支持fmt参数：

- list: 生成`{ @list, nextkey?, total? }`格式，而非缺省的 `{ @h, @d, nextkey?, total? }`格式
- one: 类似get接口，只返回第一条数据，常用于统计等接口。
- csv/txt/excel: 导出文件，注意为了避免分页，调用时可设置较大的pagesz值。
	- csv: 逗号分隔的文件，utf8编码。
	- excel: 逗号分隔的文件，gb18030编码以便excel可直接打开不会显示中文乱码。
	- txt: 制表分隔的文件, utf8编码。

TODO: 可加一个系统参数`_enc`表示输出编码的格式。

### distinct查询

如果想生成`SELECT DISTINCT t0.a, ...`查询，
当在AccessControl外部时，可以设置

	setParam("distinct", 1);

如果是在AccessControl子类中，可以设置

	$this->sqlConf["distinct"] =1;

### 枚举支持及自定义字段处理

(版本5.0)
@var AccessControl::$enumFields {field => map/fn($val, $row) }支持处理枚举字段，或自定义处理。

作为比onHandleRow/onAfterActions等更易用的工具，enumFields可对返回字段做修正。例如，想要对返回的status字段做修正，如"CR"显示为"Created"，可设置：

	$this->enumFields["status"] = ["CR"=>"Created", "CA"=>"Cancelled"];

也可以设置为自定义函数，如：

	$map = ["CR"=>"Created", "CA"=>"Cancelled"];
	$this->enumFields["status"] = function($v, $row) use ($map) {
		if (array_key_exists($v, $map))
			return $v . "-" . $map[$v];
		return $v;
	};

enumFields机制支持字段别名，比如若调用`Ordr.query(res="id 编号,status 状态")`，status字段使用了别名"状态"后，仍然可被正确处理，而用onHandleRow就处理不了了。

此外，枚举字段可直接由请求方通过res参数指定描述值，如：

	Ordr.query(res="id, status =CR:Created;CA:Cancelled")
	或指定alias:
	Ordr.query(res="id 编号, status 状态=CR:Created;CA:Cancelled")

(版本5.1)
设置enumFields也支持逗号分隔的枚举列表，比如字段值为"CR,CA"，实际可返回"Created,Cancelled"。

(v5.2) 导出文件时，处理字段格式

在导出报表时，常常需要处理字段格式，例如，虚拟子表字段inv定义为：`[{itemId,qty,itemName}]`

	protected $subobj = [
		"inv" => ["sql"=>"SELECT itemId,qty,i.name itemName FROM Inv LEFT JOIN Item i ON i.id=Inv.itemId WHERE couponId=%d"]
	];

默认导出文件时值会处理成 "1000:1.00:商品1,1001:2.00:商品2" 这种格式，现在希望导出格式如"商品1,商品2(2件)"，可处理该字段如下：
(写在onQuery或onInit回调中均可)

	protected function onQuery() {
		if ($this->isFileExport()) {
			$this->enumFields["inv"] = function($v, $row) {
				if (is_array($v)) {
					$v = join(',', array_map(function ($e) {
						if ($e['qty'] != 1.0)
							return $e['itemName'] . '(' . doubleval($e['qty']) . '件)';
						else
							return $e['itemName'];
					}, $v));
				}
				return $v;
			};
		}
	}

## 批量更新(setIf)和批量删除(delIf)

(v5.1) 以Ordr对象为例，要支持根据条件批量更新或删除：

	Ordr.setIf(cond)(field1=value1, field2=value2, ...)
	Ordr.delIf(cond)

在cond中，除了使用基本字段，还可以像query接口一样使用虚拟字段来查询，框架自动join相关表。

示例：对具有PERM_MGR权限的员工，登录后允许批量更新和批量删除：

	class AC2_Ordr extends AccessControl
	{
		function api_delIf() {
			checkAuth(PERM_MGR);
			return parent::api_delIf();
		}
		function api_setIf() {
			checkAuth(PERM_MGR);
			$this->checkSetFields(["status", "cmt"]);
			return parent::api_setIf();
		}
	}

setIf接口会检测readonlyFields及readonlyFields2中定义的字段不可更新。
也可以直接用checkSetFields指定哪些字段允许更新。
*/

# ====== functions {{{
class AccessControl
{
	protected $table;
	protected $ac;
	protected static $stdAc = ["add", "get", "set", "del", "query", "setIf", "delIf"];
	protected $allowedAc;
	# for add/set
	protected $readonlyFields = [];
	# for set
	protected $readonlyFields2 = [];
	# for add/set
	protected $requiredFields = [];
	# for set
	protected $requiredFields2 = [];
	# for get/query
	protected $hiddenFields = [];
	protected $enumFields = []; // elem: {field => {key=>val}} 或 {field => fn(val, row)}，与onHandleRow类似地去修改数据。
	protected $aliasMap = []; // { col => alias}
	# for query
	protected $defaultRes = "*"; // 缺省为 "t0.*" 加  default=true的虚拟字段
	protected $defaultSort = "t0.id";
	# for query
	protected $maxPageSz = 1000;

	# for get/query
	# virtual columns
	protected $vcolDefs = []; 
	protected $subobj = [];

	# 回调函数集。在after中执行（在onAfter回调之后）。
	protected $onAfterActions = [];

	# for get/query
	# 注意：sqlConf["res"/"cond"][0]分别是传入的res/cond参数, sqlConf["orderby"]是传入的orderby参数, 为空(注意用isset/is_null判断)均表示未传值。
	public $sqlConf; // {@cond, @res, @join, orderby, @subobj, gres}
	private $isAggregatinQuery; // 是聚合查询，如带group by或res中有聚合函数

	// virtual columns
	private $vcolMap; # elem: $vcol => {def, def0, added?, vcolDefIdx?=-1}

	// 在add后自动设置; 在get/set/del操作调用onValidateId后设置。
	protected $id;

	// for batchAdd
	protected $batchAddLogic;

/**
$var AccessControl::$uuid ?=false 将id伪装为uuid

为避免整数类型的id暴露内部编号，可输出仿uuid类型的id，例如：

	class AC1_Ordr extends AccessControl
	{
		protected $uuid = true;
	}

例如原先`Ordr.get/Ordr.query`返回`{id: 41}`，现在变为`{id: "d9a37e4c2038e8ad"}`.

其原理为在onQuery中添加：

	$this->enumFields["id"] = function($v, $row) {
		return jdEncryptI($v, "E", "hex");
	};

param函数以"id"类型符来支持这种伪uuid类型，如：

	$id = param("userId"); // 支持整数或伪uuid类型
	$key = param("pagekey/id");  // 支持整数或伪uuid类型

*/
	protected $uuid = false;

/**
$var AccessControl::$enableObjLog ?=true 默认记ObjLog

标准增删改方法会自动记录ObjLog。如果不要自动记录，可设置此字段为false.

@see ApiLog::addObjLog (table, id, dscr) 手动加ObjLog
*/
	protected $enableObjLog = true;

/**
@var AccessControl::create($tbl, $ac = null, $cls = null) 

如果$cls非空，则按指定AC类创建AC对象。
否则按当前登录类型自动创建AC类（回调onCreateAC）。

特别地，为兼容旧版本，当$cls为true时，按超级管理员权限创建AC类（即检查"AC0_XX"或"AccessControl"类）。

示例：

	AccessControl::create("Ordr", "add");
	AccessControl::create("Ordr", "add", true);
	AccessControl::create("Ordr", null, "AC0_Ordr");

*/
	static function create($tbl, $ac = null, $cls = null) 
	{
		/*
		if (!hasPerm(AUTH_USER | AUTH_EMP))
		{
			$wx = getWeixinUser();
			$wx->autoLogin();
		}
		 */
		if (is_string($cls)) {
			if (! class_exists($cls))
				throw new MyException(E_SERVER, "bad class $cls");
		}
		else if ($cls === true || hasPerm(AUTH_ADMIN))
		{
			$cls = "AC0_$tbl";
			if (! class_exists($cls))
				$cls = "AccessControl";
		}
		else {
			$cls = onCreateAC($tbl);
			if (!isset($cls))
				$cls = "AC_$tbl";
			if (! class_exists($cls))
			{
				// UDT general AC class
				if (substr($tbl, 0, 2) === "U_" && class_exists("AC_U_Obj")) {
					$cls = "AC_U_Obj";
				}
				else {
					$cls = null;
				}
			}
		}
		if ($cls == null)
		{
			$msg = $ac ? "$tbl.$ac": $tbl;
			throw new MyException(!hasPerm(AUTH_LOGIN)? E_NOAUTH: E_FORBIDDEN, "Operation is not allowed for current user: `$msg`");
		}
		$x = new $cls;
		if (!is_a($x, "AccessControl")) {
			throw new MyException(E_SERVER, "bad AC class `$cls`. MUST extend AccessControl", "AC类定义错误");
		}
		return $x;
	}

	/*
	支持get/post参数中同时有cond参数，且cond参数允许为数组，比如传
		URL中：cond[]=a=1&cond[]=b=2
		POST中：cond=c=3
	后端处理成 "a=1 AND b=2 AND c=3"
	*/
	static function getCondStr($condArr)
	{
		$condSql = null;
		foreach ($condArr as $cond) {
			if ($cond === null)
				continue;
			if (is_array($cond))
				$cond = self::getCondStr($cond);

			if ($condSql === null) {
				if (stripos($cond, " or ") !== false && substr($cond,0,1) != '(') {
					$condSql = "($cond)";
				}
				else {
					$condSql = $cond;
				}
			}
			else if (stripos($cond, " and ") !== false || stripos($cond, " or ") !== false)
				$condSql .= " AND ({$cond})";
			else 
				$condSql .= " AND " . $cond;
		}
		return $condSql;
	}

	private function getCondParam($name) {
		return self::getCondStr([$_GET[$name], $_POST[$name]]);
	}

	static function removeQuote($k) {
		return preg_replace('/^"(.*)"$/', '$1', $k);
	}

	// for get/query
	protected function initQuery()
	{
		$gres = param("gres");
		$res = param("res");
		$this->sqlConf = [
			"res" => [],
			"resExt" => [],
			"gres" => $gres,
			"gcond" => $this->getCondParam("gcond"),
			"cond" => [$this->getCondParam("cond")],
			"join" => [],
			"orderby" => param("orderby"),
			"subobj" => [],
			"union" => param("union"),
			"distinct" => param("distinct")
		];
		$this->isAggregatinQuery = isset($this->sqlConf["gres"]);

		$this->initVColMap();

		# support internal param res2/join/cond2
		if (($res2 = param("res2")) != null) {
			if (! is_array($res2))
				throw new MyException(E_SERVER, "res2 should be an array: `$res2`");
			foreach ($res2 as $e)
				$this->addRes($e);
		}
		if (($join=param("join")) != null) {
			$this->addJoin($join);
		}
		if (($cond2 = param("cond2", null, null, false)) != null) {
			if (! is_array($cond2))
				throw new MyException(E_SERVER, "cond2 should be an array: `$cond2`");
			foreach ($cond2 as $e)
				$this->addCond($e);
		}
		if (($subobj = param("subobj")) != null) {
			if (! is_array($subobj))
				throw new MyException(E_SERVER, "subobj should be an array");
			$this->sqlConf["subobj"] = $subobj;
		}

		$this->onQuery();
		if ($this->uuid) {
			$this->enumFields["id"] = function($v, $row) {
				return jdEncryptI($v, "E", "hex");
			};
		}

		$addDefaultCol = false;
		// 确保res/gres参数符合安全限定
		if (isset($gres)) {
			$this->filterRes($gres, true);
		}
		// 设置gres时，不使用defaultRes
		else if (!isset($res)) {
			$res = $this->defaultRes;
			$addDefaultCol = true;
		}
		else if ($res[0] == '*') {
			$addDefaultCol = true;
		}

		if (isset($res)) {
			$this->filterRes($res);
		}
		// 设置gres时，不使用default vcols/subobj
		if ($addDefaultCol) {
			$this->addDefaultVCols();
			if (count($this->sqlConf["subobj"]) == 0) {
				foreach ($this->subobj as $col => $def) {
					if (@$def["default"])
						$this->sqlConf["subobj"][$col] = $def;
				}
			}
		}
		if ($this->ac == "query")
		{
			$rv = $this->supportEasyui();
			if (isset($this->sqlConf["orderby"]) && !isset($this->sqlConf["union"]))
				$this->sqlConf["orderby"] = $this->filterOrderby($this->sqlConf["orderby"]);
		}

		// fixUserQuery
		$cond = $this->sqlConf["cond"][0];
		if (isset($cond))
			$this->sqlConf["cond"][0] = $this->fixUserQuery($cond);
		if (isset($this->sqlConf["gcond"]))
			$this->sqlConf["gcond"] = $this->fixUserQuery($this->sqlConf["gcond"]);
	}
	// for add/set
	protected function validate()
	{
		# TODO: check fields in metadata
		# foreach ($_POST as ($field, $val))

		foreach ($this->readonlyFields as $field) {
			if (array_key_exists($field, $_POST) && !($this->ac == "add" && array_search($field, $this->requiredFields) !== false)) {
				logit("!!! warn: attempt to change readonly field `$field`");
				unset($_POST[$field]);
			}
		}
		if ($this->ac == "set") {
			foreach ($this->readonlyFields2 as $field) {
				if (array_key_exists($field, $_POST)) {
					logit("!!! warn: attempt to change readonly field `$field`");
					unset($_POST[$field]);
				}
			}
		}
		if ($this->ac == "add") {
			foreach ($this->requiredFields as $field) {
// 					if (! issetval($field, $_POST))
// 						throw new MyException(E_PARAM, "missing field `{$field}`", "参数`{$field}`未填写");
				mparam($field, $_POST); // validate field and type; refer to field/type format for mparam.
			}
		}
		else { # for set, the fields can not be set null
			$fs = array_merge($this->requiredFields, $this->requiredFields2);
			foreach ($fs as $field) {
				if (is_array($field)) // TODO
					continue;
				if (array_key_exists($field, $_POST) && ( ($v=$_POST[$field]) === "null" || $v === "" || $v==="empty" )) {
					throw new MyException(E_PARAM, "{$this->table}.set: cannot set field `$field` to null.", "字段`$field`不允许置空");
				}
			}
		}
		$this->onValidate();
	}

/**
@fn AccessControl::callSvc($tbl, $ac, $param=null, $postParam=null)

直接调用指定类的接口，如内部直接调用"PdiRecord.query"方法：

	// 假如当前是AC2权限，对应的AC类为AC2_PdiRecord:
	$acObj = new AC2_PdiRecord();
	$acObj->callSvc("PdiRecord", "query");

这相当于调用`callSvcInt("PdiRecord.query")`。
区别是，用本方法可自由指定任意AC类，无须根据当前权限自动匹配类。

例如，"PdiRecord.query"接口不对外开放，只对内开放，我们就可以只定义`class PdiRecord extends AccessControl`（无AC前缀，外界无法访问），在内部访问它的query接口：

	$acObj = new PdiRecord();
	$acObj->callSvc("PdiRecord", "query");

如果未指定param/postParam，则使用当前GET/POST环境参数执行，否则使用指定环境执行，并在执行后恢复当前环境。

@see callSvc
@see callSvcInt
*/
	final function callSvc($tbl, $ac, $param=null, $postParam=null)
	{
		if ($param || $postParam) {
			return tmpEnv($param, $postParam, function () use ($tbl, $ac) {
				return $this->callSvc($tbl, $ac);
			});
		}

		if (is_null($this->table))
			$this->table = $tbl;
		$this->ac = $ac;
		$this->onInit();

		$fn = "api_" . $ac;
		if (! is_callable([$this, $fn]))
			throw new MyException(E_PARAM, "Bad request - unknown `$tbl` method: `$ac`", "接口不支持");
		$this->before();
		$ret = $this->$fn();
		$this->after($ret);
		return $ret;
	}

	protected final function before()
	{
		$ac = $this->ac;
		if (isset($this->allowedAc) && in_array($ac, self::$stdAc) && !in_array($ac, $this->allowedAc)) {
			$errCode = hasPerm(AUTH_LOGIN)? E_FORBIDDEN: E_NOAUTH;
			throw new MyException($errCode, "Operation `$ac` is not allowed on object `$this->table`");
		}
	}

	private $afterIsCalled = false;
	protected static $objLogAcMap = [
		"add" => "添加",
		"set" => "更新",
		"del" => "删除",
		"batchAdd" => "批量添加",
		"setIf" => "批量更新",
		"delIf" => "批量删除"
	];
	protected final function after(&$ret) 
	{
		// 确保只调用一次
		if ($this->afterIsCalled)
			return;
		$this->afterIsCalled = true;

		$this->onAfter($ret);

		foreach ($this->onAfterActions as $fn)
		{
			# NOTE: php does not allow call $this->onAfterActions();
			$fn($ret);
		}

		if ($this->enableObjLog && array_key_exists($this->ac, self::$objLogAcMap)) {
			ApiLog::addObjLog($this->table, $this->id, self::$objLogAcMap[$this->ac]);
		}
	}

	final public function getTable()
	{
		return $this->table;
	}
	final public function getMaxPageSz()
	{
		return $this->maxPageSz <0? PAGE_SZ_LIMIT: min($this->maxPageSz, PAGE_SZ_LIMIT);
	}

	private function handleRow(&$rowData)
	{
		foreach ($this->hiddenFields as $field) {
			unset($rowData[$field]);
		}
		unset($rowData["pwd"]);
		$this->flag_handleResult($rowData);
		$this->onHandleRow($rowData);

		$SEP = ',';
		foreach ($this->enumFields as $field=>$map) {
			if (array_key_exists($field, $this->aliasMap)) {
				$field = $this->aliasMap[$field];
			}
			if (array_key_exists($field, $rowData)) {
				$v = $rowData[$field];
				if (is_callable($map)) {
					$v = $map($v, $rowData);
				}
				else if (array_key_exists($v, $map)) {
					$v = $map[$v];
				}
				else if (strpos($v, $SEP) !== false) {
					$v1 = [];
					foreach(explode($SEP, $v) as $e) {
						$v1[] = $map[$e] ?: $e;
					}
					$v = join($SEP, $v1);
				}
				$rowData[$field] = $v;
			}
		}
	}

	# for query. "field1"=>"t0.field1"
	private function fixUserQuery($q)
	{
		if (stripos($q, "select") !== false) {
			throw new MyException(E_FORBIDDEN, "forbidden SELECT in param cond");
		}
		// 伪uuid转换 id='d9a37e4c2038e8ad' => id=41
		$q = preg_replace_callback('/([iI]d=)\'([a-fA-F0-9]{16})\'/u', function ($ms) {
			return $ms[1] . jdEncryptI($ms[2], 'D', 'hex');
		}, $q);
		# "aa = 100 and t1.bb>30 and cc IS null" -> "t0.aa = 100 and t1.bb>30 and t0.cc IS null" 
		$ret = preg_replace_callback('/[\w.\x{4E00}-\x{9FA5}]+(?=(\s*[=><]|(\s+(IS|LIKE)\s+)))/iu', function ($ms) {
			// 't0.$0' for col, or 'voldef' for vcol
			$col = $ms[0];
			if (strpos($col, '.') !== false)
				return $col;
			if (isset($this->vcolMap[$col])) {
				$this->addVCol($col, false, "-");
				return $this->vcolMap[$col]["def"];
			}
			return "t0." . $col;
		}, $q);
		return $ret;
	}
	private function supportEasyui()
	{
		if (isset($_REQUEST["rows"])) {
			setParam("pagesz", $_REQUEST["rows"]);
		}
		// support easyui: sort/order
		if (isset($_REQUEST["sort"]))
		{
			$orderby = $_REQUEST["sort"];
			if (isset($_REQUEST["order"]))
				$orderby .= " " . $_REQUEST["order"];
			$this->sqlConf["orderby"] = $orderby;
		}
		// 兼容旧代码: 支持 _pagesz等参数，新代码应使用pagesz
		foreach (["_pagesz", "_pagekey", "_fmt"] as $e) {
			if (isset($_REQUEST[$e])) {
				setParam(substr($e, 1), $_REQUEST[$e]);
			}
		}
	}

	protected function handleAlias($col, &$alias)
	{
		// support enum
		$a = explode('=', $alias, 2);
		if (count($a) == 2) {
			$this->enumFields[$col] = parseKvList($a[1], ";", ":");
			$alias = $a[0] ?: null;
		}
		if ($alias)
			$this->aliasMap[self::removeQuote($col)] = self::removeQuote($alias);
	}

	// return: new field list
	private function filterRes($res, $gres=false)
	{
		$cols = [];
		foreach (explode(',', $res) as $col) {
			$col = trim($col);
			$alias = null;
			$fn = null;
			if ($col === "*" || $col === "t0.*") {
				$this->addRes("t0.*", false);
				continue;
			}
			// 适用于res/gres, 支持格式："col" / "col col1" / "col as col1", alias可以为中文，如"col 某列"
			// 如果alias中有特殊字符（逗号不支持），则应加引号，如"amount \"金额(元)\"", "v \"速率 m/s\""等。
			if (! preg_match('/^\s*(\w+)(?:\s+(?:AS\s+)?([^,]+))?\s*$/iu', $col, $ms))
			{
				// 对于res, 还支持部分函数: "fn(col) as col1", 目前支持函数: count/sum，如"count(distinct ac) cnt", "sum(qty*price) docTotal"
				if (!$gres && preg_match('/(\w+)\([a-z0-9_.\'* ,+\/]+\)\s+(?:AS\s+)?([^,]+)/iu', $col, $ms)) {
					list($fn, $alias) = [strtoupper($ms[1]), $ms[2]];
					if ($fn != "COUNT" && $fn != "SUM" && $fn != "AVG")
						throw new MyException(E_FORBIDDEN, "function not allowed: `$fn`");
					$this->isAggregatinQuery = true;
				}
				else 
					throw new MyException(E_PARAM, "bad property `$col`");
			}
			else {
				if ($ms[2]) {
					$col = $ms[1];
					$alias = $ms[2];
				}
			}
			if (isset($fn)) {
				$this->addRes($col);
				continue;
			}

			if ($alias)
				$this->handleAlias($col, $alias);

// 			if (! ctype_alnum($col))
// 				throw new MyException(E_PARAM, "bad property `$col`");
			if ($this->addVCol($col, true, $alias) === false) {
				if (!$gres && array_key_exists($col, $this->subobj)) {
					$key = self::removeQuote($alias ?: $col);
					$this->sqlConf["subobj"][$key] = $this->subobj[$col];
				}
				else {
					$col = "t0." . $col;
					$col1 = $col;
					if (isset($alias)) {
						$col1 .= " {$alias}";
					}
					$this->addRes($col1);
				}
			}
			$cols[] = $alias ?: $col;
		}
		if ($gres)
			$this->sqlConf["gres"] = join(",", $cols);
	}

	private function filterOrderby($orderby)
	{
		$colArr = [];
		foreach (explode(',', $orderby) as $col) {
			if (! preg_match('/^\s*(\w+\.)?(\S+)(\s+(asc|desc))?$/i', $col, $ms))
				throw new MyException(E_PARAM, "bad property `$col`");
			if ($ms[1]) // e.g. "t0.id desc"
			{
				$colArr[] = $col;
				continue;
			}
			$col = preg_replace_callback('/^\s*(\w+)/', function ($ms) {
				$col1 = $ms[1];
				// 注意：与cond不同，orderby使用了虚拟字段，应在res中添加。而cond中是直接展开了虚拟字段。因为where条件不支持虚拟字段。
				// 故不用：$this->addVCol($col1, true, '-');
				if ($this->addVCol($col1, true) !== false)
					return $col1;
				return "t0." . $col1;
			}, $col);
			$colArr[] = $col;
		}
		return join(",", $colArr);
	}

	// 将外部虚拟字段的require依赖字段添加到res中（支持其中引用其它虚拟字段）
	// 引用内层查询的某字段时，需要将该字段加到内层res中暴露到外层使用；但是如果内层res已经有t0.*则不要重复添加。
	// 示例："res" => ["(select count(*) from ApiLog t1 where t1.ses=t0.ses) sesCnt"], 需要将t0.ses暴露给外层SQL使用。
	private function filterExtVColRequire($cols)
	{
		foreach (explode(',', $cols) as $col) {
			$col = preg_replace_callback('/^(\w+)$/', function ($ms) {
				$col1 = $ms[1];
				if ($this->addVCol($col1, true) !== false)
					return "";
				return "t0." . $col1;
			}, trim($col));
			if (! $col) // 虚拟字段已在addVCol中加过
				continue;
			$this->addRes($col, false);
		}
	}

	final public function issetCond()
	{
		return isset($this->sqlConf["cond"][0]);
	}

/**
@fn AccessControl::addRes($res, $analyzeCol=true)

定义新的虚拟字段，并添加到get/query接口的返回字段中。
如果要引入已有的虚拟字段，应调用addVCol。

注意: 
- analyzeCol=true时, 注册到对象的虚拟字段中。
- addRes("col+1 as col1", false); -- 简单地新定义一个计算列, as可省略

@see AccessControl::addCond 其中有示例
@see AccessControl::addVCol 添加已定义的虚拟列。
 */
	final public function addRes($res, $analyzeCol=true, $isExt=false)
	{
		if ($isExt) {
			$this->addResInt($this->sqlConf["resExt"], $res);
			return;
		}
		$this->addResInt($this->sqlConf["res"], $res);
		if ($analyzeCol)
			$this->setColFromRes($res, true);
	}

	// 内部被addRes调用。避免重复添加字段到res
	private function addResInt(&$resArr, $col) {
		$ignoreT0 = @$resArr[0] == "t0.*";
		// 如果有"t0.*"，则忽略主表字段如"t0.id"，但应避免别名字段如"t0.id orderId"被去掉
		if ($ignoreT0 && substr($col,0,3) == "t0." && strpos($col, ' ') === false)
			return;
		$found = false;
		foreach ($resArr as $e) {
			if ($e == $col)
				$found = true;
		}
		if (!$found)
			$resArr[] = $col;
	}

/**
@fn AccessControl::addCond($cond, $prepend=false, $fixUserQuery=false)

@param $prepend 为true时将条件排到前面。
@param $fixUserQuery 设置为true，用于自动处理虚拟字段，这时不允许复杂查询。

调用多次addCond时，多个条件会依次用"AND"连接起来。

添加查询条件。
示例：假如设计有接口：

	Ordr.query(q?) -> tbl(..., payTm?)
	参数：
	q:: 查询条件，值为"paid"时，查询10天内已付款的订单。且结果会多返回payTm/付款时间字段。

实现时，在onQuery中检查参数"q"并定制查询条件：

	protected function onQuery()
	{
		// 限制只能看用户自己的订单
		$uid = $_SESSION["uid"];
		$this->addCond("t0.userId=$uid");

		$q = param("q");
		if (isset($q) && $q == "paid") {
			$validDate = date("Y-m-d", strtotime("-9 day"));
			$this->addRes("olpay.tm payTm");
			$this->addJoin("INNER JOIN OrderLog olpay ON olpay.orderId=t0.id");
			$this->addCond("olpay.action='PA' AND olpay.tm>'$validDate'");
		}
	}

上例在处理"q"参数时，临时引入了关联表。如果关联表已在vcolDefs中定义过，可以用addVCol直接引入：

	protected $vcolDefs = [
		[
			"res" => ["olpay.tm payTm"],
			"join" => "INNER JOIN OrderLog olpay ON olpay.orderId=t0.id"
		]
	];
	protected function onQuery()
	{
		$q = param("q");
		if (isset($q) && $q == "paid") {
			$validDate = date("Y-m-d", strtotime("-9 day"));
			// 注意：要添加虚拟字段用addVCol，不是addRes
			$this->addVCol("payTm");
			// 注意：addCond中不可直接使用payTm，要用原始定义olpay.tm。(下面会讲怎样直接在cond中用payTm)
			$this->addCond("olpay.action='PA' AND olpay.tm>'$validDate'");
		}
	}

关于fixUserQuery=true:

默认后端可以添加任何形式的SQL条件，但是如果其中含有虚拟字段，如果它尚未加到res查询结果中时，查询就会出错（无法识别这个字段）。
设置fixUserQuery=true后，就会将该条件当作用户查询(UserQuery)来处理，即相当于query接口传入的cond字段，其中的虚拟字段会自动处理避免出错。
但用户查询条件是受限的，比如不允许各种子查询，也不允许使用各种SQL函数（count/sum/avg等少量聚合函数除外）。

仍用上面示例：

	// 在cond中使用payTm虚拟字段，可自动解析和引入它的定义
	$this->addCond("olpay.action='PA' AND payTm>'$validDate'", false, true);

这相当于调用：

	$this->addVCol("payTm", false, "-"); // 引入定义但并不加到SELECT字段中
	$this->addCond("olpay.action='PA' AND olpay.tm>'$validDate'");

@see AccessControl::addRes
@see AccessControl::addJoin
 */
	final public function addCond($cond, $prepend=false, $fixUserQuery=false)
	{
		if ($fixUserQuery)
			$cond = $this->fixUserQuery($cond);
		if ($prepend)
			array_unshift($this->sqlConf["cond"], $cond);
		else
			$this->sqlConf["cond"][] = $cond;
	}

	/**
@fn AccessControl::addJoin(joinCond)

添加Join条件.

@see AccessControl::addCond 其中有示例
	 */
	final public function addJoin($join)
	{
		$this->sqlConf["join"][] = $join;
	}

	private function setColFromRes($res, $added, $vcolDefIdx=-1)
	{
		if (preg_match('/^(\w+)\.(\w+)$/', $res, $ms)) {
			$colName = $ms[2];
			$def = $res;
		}
		else if (preg_match('/^(.*?)\s+(?:as\s+)?(\S+)\s*$/is', $res, $ms)) {
			$colName = $ms[2];
			$def = $ms[1];
		}
		else
			throw new MyException(E_SERVER, "bad res definition: `$res`");

		$colName = self::removeQuote($colName);
		if (array_key_exists($colName, $this->vcolMap)) {
			if ($added && $this->vcolMap[ $colName ]["added"])
				throw new MyException(E_SERVER, "res for col `$colName` has added: `$res`");
			$this->vcolMap[ $colName ]["added"] = true;
		}
		else {
			$this->vcolMap[ $colName ] = ["def"=>$def, "def0"=>$res, "added"=>$added, "vcolDefIdx"=>$vcolDefIdx];
		}
	}

	// 外部虚拟字段：如果未设置isExt，且无join条件，将自动识别和处理外部虚拟字段（以便之后优化查询）。
	// 示例 "res" => ["(select count(*) from ApiLog t1 where t1.ses=t0.ses) sesCnt"] 将设置 isExt=true, require="t0.ses"
	// 注意目前只自动处理第一个res。如果自动处理有误，请手工设置vcolDef的isExt和require属性。require属性支持逗号分隔的多字段。
	private function autoHandleExtVCol(&$vcolDef) {
		if (isset($vcolDef["isExt"]) || isset($vcolDef["join"]))
			return;
		$res_0 = $vcolDef["res"][0];
		if (preg_match('/\(.*select.*where.*?(t0\.\w+)?\)/', $res_0, $ms)) {
			$vcolDef["isExt"] = true;
			if (isset($ms[1])) {
				$vcolDef["require"] = $ms[1];
			}
		}
	}

	private function initVColMap()
	{
		if (is_null($this->vcolMap)) {
			$this->vcolMap = [];
			foreach ($this->vcolDefs as $idx=>&$vcolDef) {
				@$res = $vcolDef["res"];
				assert(is_array($res), "res必须为数组");
				foreach ($vcolDef["res"] as $e) {
					$this->setColFromRes($e, false, $idx);
				}

				$this->autoHandleExtVCol($vcolDef);
			}
		}
	}

/**
@fn AccessControl::addVCol($col, $ignoreError=false, $alias=null)

@param $col 必须是一个英文词, 不允许"col as col1"形式; 该列必须在 vcolDefs 中已定义.
@param $alias 列的别名。可以中文. 特殊字符"-"表示只添加join/cond等定义，并不将该字段加到输出字段中。
@return Boolean T/F

引入一个已有的虚拟字段及其相应关联表，例如之前在vcolDefs中定义过虚拟字段`createTm`:

	// 引入createTm定义及关联表，且在最终输出中添加createTm列
	$this->addVCol("createTm"); 

	// 只引入createTm字段的关联表，不影响最终输出字段
	$this->addVCol("createTm", false, "-");

@see AccessControl::addRes
 */
	protected function addVCol($col, $ignoreError = false, $alias = null)
	{
		if (! isset($this->vcolMap[$col])) {
			if (!$ignoreError)
				throw new MyException(E_SERVER, "unknown vcol `$col`");
			return false;
		}
		if ($this->vcolMap[$col]["added"])
			return true;
		$vcolDef = $this->addVColDef($this->vcolMap[$col]["vcolDefIdx"]);
		$isExt = @ $vcolDef["isExt"] && true;
		if ($alias) {
			if ($alias !== "-")
				$this->addRes($this->vcolMap[$col]["def"] . " AS {$alias}", false, $isExt);
		}
		else {
			$this->addRes($this->vcolMap[$col]["def0"], false, $isExt);
		}
		return true;
	}

	private function addDefaultVCols()
	{
		$idx = 0;
		foreach ($this->vcolDefs as $vcolDef) {
			if (@$vcolDef["default"]) {
				$this->addVColDef($idx);
				$isExt = @ $vcolDef["isExt"] && true;
				foreach ($vcolDef["res"] as $e) {
					$this->addRes($e, true, $isExt);
				}
			}
			++ $idx;
		}
	}

	/*
	根据index找到vcolDef中的一项，添加join/cond到最终查询语句(但不包含res)。
	 */
	private function addVColDef($idx)
	{
		if ($idx < 0 || @$this->vcolDefs[$idx]["added"])
			return;
		$this->vcolDefs[$idx]["added"] = true;

		$vcolDef = $this->vcolDefs[$idx];

		if (@$vcolDef["isExt"]) {
			$requireCol = @$vcolDef["require"];
			// 外部虚拟字段：将require字段加入内层SQL。
			if ($requireCol) {
				$this->filterExtVColRequire($requireCol);
			}
			return $vcolDef;
		}
		if (isset($vcolDef["require"]))
		{
			$requireCol = $vcolDef["require"];
			$this->addVCol($requireCol, false, "-");
		}
		if (isset($vcolDef["join"]))
			$this->addJoin($vcolDef["join"]);
		if (isset($vcolDef["cond"]))
			$this->addCond($vcolDef["cond"]);
		return $vcolDef;
	}

	protected function onInit()
	{
	}
	protected function onValidate()
	{
	}
	protected function onValidateId()
	{
	}
 	protected function onHandleRow(&$rowData)
 	{
 	}
	protected function onAfter(&$ret)
	{
	}
	protected function onQuery()
	{
	}
	protected function onGenId()
	{
		return 0;
	}

/**
@fn AccessControl::api_add()

标准对象添加接口。
*/
	function api_add()
	{
		$this->validate();

		$id = $this->onGenId();
		if ($id != 0) {
			$_POST["id"] = $id;
		}
		else if (array_key_exists("id", $_POST)) {
			unset($_POST["id"]);
		}
		$this->handleSubObjForAddSet();

		$this->id = dbInsert($this->table, $_POST);

		$res = param("res");
		if (isset($res)) {
			// TODO
			setParam("id", $this->id);
			$ret = tableCRUD("get", $this->table);
		}
		else
			$ret = $this->id;
		return $ret;
	}

/**
@fn AccessControl::api_set()

标准对象设置接口。api函数应通过callSvc调用，不应直接调用。
*/
	function api_set()
	{
		$this->onValidateId();
		if ($this->id === null)
			$this->id = mparam("id");
		$this->validate();
		$this->handleSubObjForAddSet();

		$cnt = dbUpdate($this->table, $_POST, $this->id);
	}

	function handleSubObjForAddSet()
	{
		$onAfterActions = [];
		foreach ($this->subobj as $k=>$v) {
			if (is_array($_POST[$k]) && isset($v["obj"])) {
				$subobjList = $_POST[$k];
				$onAfterActions[] = function (&$ret) use ($subobjList, $v) {
					$relatedKey = null;
					if (preg_match('/(\w+)=%d/', $v["cond"], $ms)) {
						$relatedKey = $ms[1];
					}
					if ($relatedKey == null) {
						throw new MyException(E_SERVER, "bad cond: cannot get relatedKey", "子表配置错误");
					}

					$objName = $v["obj"];
					$acObj = AccessControl::create($objName, null, $v["AC"]);
					foreach ($subobjList as $subobj) {
						$subid = $subobj["id"];
						if ($subid) {
							$fatherId = queryOne("SELECT $relatedKey FROM $objName WHERE id=$subid");
							if ($fatherId != $this->id)
								throw new MyException(E_FORBIDDEN, "$objName id=$subid: require $relatedKey={$this->id}, actual " . var_export($fatherId, true), "不可操作该子项");
							// TODO: set/del接口支持cond. $cond = $relatedKey . "=" . $this->id;
							if (! @$subobj["_delete"]) {
								$acObj->callSvc($objName, "set", ["id"=>$subid], $subobj);
							}
							else {
								$acObj->callSvc($objName, "del", ["id"=>$subid]);
							}
						}
						else {
							$subobj[$relatedKey] = $this->id;
							$acObj->callSvc($objName, "add", null, $subobj);
						}
					}
				};
				unset($_POST[$k]);
			}
		}
		if ($onAfterActions) {
			array_splice($this->onAfterActions, 0, 0, $onAfterActions);
		}
	}

	// extSqlFn: 如果为空，则如果有外部虚拟字段，则返回完整嵌套SQL语句；否则返回内层SQL语句，由调用方再调用extSqlFn函数生成嵌套SQL查询。
	protected function genQuerySql(&$tblSql=null, &$condSql=null, &$extSqlFn=null)
	{
		$sqlConf = &$this->sqlConf;
		$resSql = join(",", $sqlConf["res"]);
		if ($resSql == "") {
			$resSql = "t0.id";
		}
		if (@$sqlConf["distinct"]) {
			$resSql = "DISTINCT {$resSql}";
		}

		$tblSql = "{$this->table} t0";
		if (count($sqlConf["join"]) > 0)
			$tblSql .= "\n" . join("\n", $sqlConf["join"]);
		$condSql = self::getCondStr($sqlConf["cond"]);
/*
			foreach ($_POST as $k=>$v) {
				# skip sys param which generally starts with "_"
				if (substr($k, 0, 1) === "_")
					continue;
				# TODO: check meta
				if (! preg_match('/^\w+$/', $k))
					throw new MyException(E_PARAM, "bad key $k");

				if ($condSql !== '') {
					$condSql .= " AND ";
				}
				$condSql .= KVtoCond($k, $v);
			}
*/

		$sql = "SELECT $resSql FROM $tblSql";
		if ($condSql)
		{
			$this->flag_handleCond($condSql);
			$sql .= "\nWHERE $condSql";
		}
		if (count($sqlConf["resExt"]) > 0) {
			$resExtSql = join(",", $sqlConf["resExt"]);
			$doExtSql = !isset($extSqlFn);
			$extSqlFn = function ($sql) use ($resExtSql) {
				return "SELECT t0.*, $resExtSql
FROM ($sql) t0";
			};
			if ($doExtSql)
				$sql = $extSqlFn($sql);
		}
		return $sql;
	}

/**
@fn AccessControl::api_get()

标准对象获取接口。api函数应通过callSvc调用，不应直接调用。
*/
	function api_get()
	{
		$this->onValidateId();
		if ($this->id === null)
			$this->id = mparam("id");
		$this->initQuery();

		$this->addCond("t0.id={$this->id}", true);
		$hasFields = (count($this->sqlConf["res"]) > 0);
		if ($hasFields) {
			$sql = $this->genQuerySql();
			$ret = queryOne($sql, true);
			if ($ret === false) 
				throw new MyException(E_PARAM, "not found `{$this->table}.id`=`{$this->id}`");
		}
		else {
			// 如果get用res字段指定只取子对象，则不必多次查询。e.g. callSvr('Ordr.get', {res: orderLog});
			$ret = ["id" => $this->id];
		}
		$this->handleSubObj($this->id, $ret);
		$this->handleRow($ret);
		return $ret;
	}

/**
@fn AccessControl::api_query()

标准对象查询接口（列表）。api函数应通过callSvc调用，不应直接调用。

接口参数有：res, cond, pagesz, pagekey, orderby, gres, union, fmt等。(参见DACA架构接口文档)

内部调用时还支持以下参数：

- res2, cond2: 它们要求为数组，数组的每一项与res, cond含义相同。这样不覆盖res, cond参数（从而外部仍可以使用它们）。
- join: 要求为数组。指定关联表。
- subobj: 指定子对象。

调用示例：

	// 定死res外部无法覆盖, 但外部可额外指定cond参数
	$ret = callSvcInt("PdiRecord.query", [
		"res": "id,vinCode,result,orderId,tm",
		"cond2": ["type='EQ'", "tm>='2019-1-1'"]
	]);

*/
	function api_query()
	{
		$this->initQuery();

		$sqlConf = &$this->sqlConf;

		$pagesz = param("pagesz/i");
		$pagekey = param("pagekey/id");
		if (! isset($pagekey)) {
			$pagekey = param("page/i");
			if (isset($pagekey))
			{
				$enableTotalCnt = true;
				$enablePartialQuery = false;
			}
		}
		if ($pagesz == 0) {
			$pagesz = param("fmt") !== "one"? 20: 1;
		}

		$maxPageSz = $this->getMaxPageSz();
		if ($pagesz < 0 || $pagesz > $maxPageSz)
			$pagesz = $maxPageSz;

		if ($this->isAggregatinQuery) {
			$enablePartialQuery = false;
		}

		$orderSql = $sqlConf["orderby"];

		// setup cond for partialQuery
		if ($orderSql == null && !$this->isAggregatinQuery)
			$orderSql = $this->defaultSort;

		if (!isset($enableTotalCnt))
		{
			$enableTotalCnt = false;
			if ($pagekey === 0)
				$enableTotalCnt = true;
		}

		// 如果未指定orderby或只用了id(以后可放宽到唯一性字段), 则可以用partialQuery机制(性能更好更精准), pagekey表示该字段的最后值；否则pagekey表示下一页页码。
		if (!isset($enablePartialQuery)) {
			$enablePartialQuery = false;
			if (preg_match('/^(t0\.)?id\b/', $orderSql)) {
				$enablePartialQuery = true;
				if ($pagekey) {
					if (preg_match('/\bid DESC/i', $orderSql)) {
						$partialQueryCond = "t0.id<$pagekey";
					}
					else {
						$partialQueryCond = "t0.id>$pagekey";
					}
					// setup res for partialQuery
					if ($partialQueryCond) {
// 							if (isset($sqlConf["res"][0]) && !preg_match('/\bid\b/',$sqlConf["res"][0])) {
// 								array_unshift($sqlConf["res"], "t0.id");
// 							}
						array_unshift($sqlConf["cond"], $partialQueryCond);
					}
				}
			}
		}

		$tblSql = null;
		$condSql = null;
		$extSqlFn = false;
		$sql = $this->genQuerySql($tblSql, $condSql, $extSqlFn);

		$complexCntSql = false;
		if (isset($sqlConf["union"])) {
			$sql .= "\nUNION\n" . $sqlConf["union"];
			$complexCntSql = true;
		}
		if ($sqlConf["gres"]) {
			$sql .= "\nGROUP BY {$sqlConf['gres']}";
			if ($sqlConf["gcond"])
				$sql .= "\nHAVING {$sqlConf['gcond']}";
			$complexCntSql = true;
		}

		if ($enableTotalCnt) {
			if (!$complexCntSql) {
				$cntSql = "SELECT COUNT(*) FROM $tblSql";
				if ($condSql)
					$cntSql .= "\nWHERE $condSql";
			}
			else {
				$cntSql = "SELECT COUNT(*) FROM ($sql) t0";
			}
			$totalCnt = queryOne($cntSql);
		}
		if ($orderSql)
			$sql .= "\nORDER BY " . $orderSql;

		if ($enablePartialQuery) {
			$sql .= "\nLIMIT " . $pagesz;
		}
		else {
			if (! $pagekey)
				$pagekey = 1;
			$sql .= "\nLIMIT " . ($pagekey-1)*$pagesz . "," . $pagesz;
		}

		if ($extSqlFn) {
			$sql = $extSqlFn($sql);
		}
		$ret = queryAll($sql, true);
		if ($ret === false)
			$ret = [];

		// Note: colCnt may be changed in after().
		$fixedColCnt = count($ret)==0? 0: count($ret[0]);

		$SUBOBJ_OPTIMIZE = true;
		if ($SUBOBJ_OPTIMIZE) {
			$this->handleSubObjForList($ret); // 优化: 总共只用一次查询, 替代每个主表查询一次
			foreach ($ret as &$ret1) {
				$this->handleRow($ret1);
			}
		}
		else {
			foreach ($ret as &$ret1) {
				$id1 = $ret1["id"];
				if (isset($id1))
					$this->handleSubObj($id1, $ret1);
				$this->handleRow($ret1);
			}
		}
		$this->after($ret);

		if ($pagesz == count($ret)) { // 还有下一页数据, 添加nextkey
			if ($enablePartialQuery) {
				$nextkey = $ret[count($ret)-1]["id"];
			}
			else {
				$nextkey = $pagekey + 1;
			}
		}
		$fmt = param("fmt");
		if ($fmt === "list") {
			$ret = ["list" => $ret];
		}
		else if ($fmt === "one") {
			if (count($ret) == 0)
				throw new MyException(E_PARAM, "no data", "查询不到数据");
			return $ret[0];
		}
		else {
			$ret = objarr2table($ret, $fixedColCnt);
		}
		if (isset($nextkey)) {
			$ret["nextkey"] = $nextkey;
		}
		if (isset($totalCnt)) {
			$ret["total"] = $totalCnt;
		}
		if (isset($fmt))
			$this->handleExportFormat($fmt, $ret, param("fname", $this->table));

		return $ret;
	}

/**
@fn AccessControl::api_del()

标准对象删除接口。api函数应通过callSvc调用，不应直接调用。
*/
	function api_del()
	{
		$this->onValidateId();
		if ($this->id === null)
			$this->id = mparam("id");
		$sql = sprintf("DELETE FROM %s WHERE id=%d", $this->table, $this->id);
		$cnt = execOne($sql);
		if (param('force')!=1 && $cnt != 1)
			throw new MyException(E_PARAM, "del: not found {$this->table}.id={$this->id}");
	}

/**
@fn AccessControl::checkSetFields($allowedFields)

e.g.
	function onValidate()
	{
		if ($this->ac == "set")
			$this->checkSetFields(["status", "cmt"]);
	}
*/
	protected function checkSetFields($allowedFields)
	{
		foreach (array_keys($_POST) as $k) {
			if (! in_array($k, $allowedFields))
				throw new MyException(E_FORBIDDEN, "forbidden to set field `$k`");
		}
	}

	// for setIf/delIf
	// return {tblSql, condSql}
	protected function genCondSql()
	{
		$cond = $this->getCondParam("cond");
		$this->initVColMap();
		if ($cond)
			$this->addCond($cond, false, true);

		// borrow query handler
		$ac = $this->ac;
		$this->ac = "query";
		$this->onQuery();
		$this->ac = $ac;

		$sqlConf = $this->sqlConf;
		if (count($sqlConf["cond"]) == 0)
			throw new MyException(E_PARAM, "setIf/delIf requires condition");

		$tblSql = "{$this->table} t0";
		if ($sqlConf["join"] && count($sqlConf["join"]) > 0)
			$tblSql .= "\n" . join("\n", $sqlConf["join"]);
		$condSql = self::getCondStr($sqlConf["cond"]);

		return ["tblSql"=>$tblSql, "condSql"=>$condSql];
	}
	
/**
@fn AccessControl::api_setIf()

批量更新。

setIf接口会检测readonlyFields及readonlyFields2中定义的字段不可更新。
也可以直接用checkSetFields指定哪些字段允许更新。
返回更新记录数。
示例：

	class AC2_Ordr extends AccessControl {
		function api_setIf() {
			// 限制只有经理权限才能批量更新
			checkAuth(PERM_MGR);

			// 限制只能更新指定字段
			$this->checkSetFields(["status", "cmt"]);

			// 限制只可更新自己的订单，一般写在onQuery中，以便get/query/setIf/delIf均可通用。
			$empId = $_SESSION["empId"];
			$this->addCond("t0.empId=$empId");
			// $this->addJoin(...);

			return parent::api_setIf();
		}
	}
 */
	function api_setIf()
	{
		$roFields = $this->readonlyFields + $this->readonlyFields2;
		foreach ($roFields as $field) {
			if (array_key_exists($field, $_POST))
				throw new MyException(E_FORBIDDEN, "forbidden to set field `$field`");
		}

		$rv = $this->genCondSql();

		// 有join时，防止字段重名。统一加"t0."
		$kv = $_POST;
		$sqlConf = $this->sqlConf;
		if ($sqlConf["join"] && count($sqlConf["join"]) > 0) {
			$kv = [];
			foreach ($_POST as $k=>$v) {
				$kv["t0.$k"] = $v;
			}
		}
		$cnt = dbUpdate($rv["tblSql"], $kv, $rv["condSql"]);
		return $cnt;
	}
/**
@fn AccessControl::api_delIf()

批量删除。返回删除记录数。
示例：

	class AC2_Ordr extends AccessControl {
		function api_delIf() {
			// 限制只有经理权限才能批量更新
			checkAuth(PERM_MGR);

			// 限制只可更新自己的订单，一般写在onQuery中，以便get/query/setIf/delIf均可通用。
			$empId = $_SESSION["empId"];
			$this->addCond("t0.empId=$empId");
			// $this->addJoin(...);

			return parent::api_delIf();
		}
	}
 */
	function api_delIf()
	{
		$rv = $this->genCondSql();
		$sql = sprintf("DELETE t0 FROM %s WHERE %s", $rv["tblSql"], $rv["condSql"]);
		$cnt = execOne($sql);
		return $cnt;
	}

/**
@fn AccessControl::api_batchAdd()

批量添加（导入）。返回导入记录数cnt及编号列表idList

	Obj.batchAdd(title?)(...) -> {cnt, @idList}

在一个事务中执行，一行出错后立即失败返回，该行前面已导入的内容也会被取消（回滚）。

- title: List(fieldName). 指定标题行(即字段列表). 如果有该参数, 则忽略POST内容或文件中的标题行.
 如"title=name,-,addr"表示导入第一列name和第三列addr, 其中"-"表示忽略该列，不导入。
 字段列表以逗号或空白分隔, 如"title=name - addr"与"title=name, -, addr"都可以.

支持两种方式上传：

1. 直接在HTTP POST中传输内容，数据格式为：首行为标题行(即字段名列表)，之后为实际数据行。
行使用"\n"分隔, 列使用"\t"分隔.
接口为：

	{Obj}.batchAdd(title?)(标题行，数据行)
	(Content-Type=text/plain)

前端JS调用示例：

	var data = "name\taddr\n" + "门店1\t地址1\n门店2\t地址2\n";
	callSvr("Store.batchAdd", function (ret) {
		app_alert("成功导入" + ret.cnt + "条数据！");
	}, data, {contentType:"text/plain"});

或指定title参数:

	var data = "门店名\t地址\n" + "门店1\t地址1\n门店2\t地址2\n";
	callSvr("Store.batchAdd", {title: "name,addr"}, function (ret) {
		app_alert("成功导入" + ret.cnt + "条数据！");
	}, data, {contentType:"text/plain"});

示例: 在chrome console中导入数据

	callSvr("Vendor.batchAdd", {title: "-,name, tel, idCard, addr, email, legalAddr, weixin, qq, area, picId"}, $.noop, `编号	姓名	手机号码	身份证号	通讯地址	邮箱	户籍地址	微信号	QQ号	负责安装的区域	身份证图
	112	郭志强	15384813214	150221199211215000	内蒙古呼和浩特赛罕区丰州路法院小区二号楼	815060695@qq.com	内蒙古包头市	15384813214	815060695	内蒙古	532
	111	高长平	18375998418	500226198312065000	重庆市南岸区丁香路同景国际W组	1119780700@qq.com	荣昌	18375998418	1119780700	重庆	534
	`, {contentType:"text/plain"});
		
2. 标准csv/txt文件上传：

上传的文件首行当作标题列，如果这一行不是后台要求的标题名称，可通过URL参数title重新定义。
一般使用excel csv文件（编码一般为gbk），或txt文件（以"\t"分隔列）。
接口为：

	{Obj}.batchAdd(title?)(csv/txt文件)
	(Content-Type=multipart/form-data, 即html form默认传文件的格式)

后端处理时, 将自动判断文本编码(utf-8或gbk).

前端HTML:

	<input type="file" name="f" accept=".csv,.txt">

前端JS示例：

	var fd = new FormData();
	fd.append("file", frm.f.files[0]);
	callSvr("Store.batchAdd", {title: "name,addr"}, function (ret) {
		app_alert("成功导入" + ret.cnt + "条数据！");
	}, fd);

或者使用curl等工具导入：
从excel中将数据全选复制到1.txt中(包含标题行，也可另存为csv格式文件)，然后导入。
下面示例用curl工具调用VendorA.batchAdd导入：

	#/bin/sh
	baseUrl=http://localhost/p/anzhuang/api.php
	param=title=name,phone,idCard,addr,email,legalAddr,weixin,qq,area
	curl -v -F "file=@1.txt" "$baseUrl/VendorA.batchAdd?$param"

如果要调试(php/xdebug)，可加URL参数`XDEBUG_SESSION_START=1`或Cookie中加`XDEBUG_SESSION=1`

*/
	function api_batchAdd()
	{
		$st = BatchAddStrategy::create($this->batchAddLogic);
		$n = 1;
		$titleRow = null;
		$ret = [
			"cnt" => 0,
			"idList" => []
		];
		$tmp = $_POST;
		$this->ac = "add";
		$bak = [];
		foreach ($this as $k=>$v) {
			$bak[$k] = $v;
		}
		$bak_SOLO = ApiFw_::$SOLO;
		ApiFw_::$SOLO = false; // 避免其间有setRet输出
		while (($row = $st->getRow()) != null) {
			if ($n == 1) {
				$titleRow = $row;
			}
			else if (($cnt = count($row)) > 0) {
				// $_POST = array_combine($titleRow, $row);
				$i = 0;
				$_POST = [];
				foreach ($titleRow as $e) {
					if ($i >= $cnt)
						break;
					if ($e === '-') {
						++ $i;
						continue;
					}
					$_POST[$e] = $row[$i++];
					if ($_POST[$e] === '') {
						$_POST[$e] = null;
					}
				}
				try {
					$st->beforeAdd($_POST, $row);
					$id = $this->api_add();
					$this->after($id);
					// restore fields
					foreach ($bak as $k=>$v) {
						$this->$k = $v;
					}
				}
				catch (DirectReturn $ex) {
					global $X_RET;
					if ($X_RET[0] == 0) {
						$id = $X_RET[1];
					}
					else {
						$msg = ($X_RET[2] ?: $X_RET[1]);
						ApiFw_::$SOLO = $bak_SOLO;
						throw new MyException(E_PARAM, $X_RET[1], "第{$n}行出错(\"" . join(',', $row) . "\"): " . $msg);
					}
				}
				catch (Exception $ex) {
					$msg = $ex->getMessage();
					if ( ($ex instanceof MyException) && $ex->internalMsg != null)
						$msg .= "-" .$ex->internalMsg;
					ApiFw_::$SOLO = $bak_SOLO;
					throw new MyException(E_PARAM, (string)$ex, "第{$n}行出错(\"" . join(',', $row) . "\"): " . $msg);
				}
				++ $ret["cnt"];
				$ret["idList"][] = $id;
			}
			++ $n;
		}
		ApiFw_::$SOLO = $bak_SOLO;
		$this->ac = "batchAdd";
		$_POST = $tmp;
		return $ret;
	}

	// query sub table for mainObj(id), and add result to mainObj as obj or obj collection (opt["wantOne"])
	protected function handleSubObj($id, &$mainObj)
	{
		$subobj = $this->sqlConf["subobj"];
		if (is_array($subobj)) {
			# $opt: {sql, wantOne=false}
			foreach ($subobj as $k => $opt) {
				if ($opt["obj"] && $opt["cond"]) {
					$opt["cond"] = sprintf($opt["cond"], $id); # e.g. "orderId=%d"
					$res = param("res_$k");
					if ($res) {
						$opt["res"] = $res;
					}
					$objName = $opt["obj"];
					$acObj = AccessControl::create($objName, null, $opt["AC"]);
					$rv = $acObj->callSvc($objName, "query", $opt + [
						"fmt" => "list",
						"pagesz" => -1
					]);
					if (array_key_exists("list", $rv))
						$mainObj[$k] = $rv["list"];
					else
						$mainObj[$k] = $rv;
					continue;
				}

				if (! @$opt["sql"])
					continue;
				$sql1 = sprintf($opt["sql"], $id); # e.g. "select * from OrderItem where orderId=%d"
				$ret1 = queryAll($sql1, true);
				if (@$opt["wantOne"]) {
					if (count($ret1) > 0)
						$mainObj[$k] = $ret1[0];
					else
						$mainObj[$k] = null;
				}
				else {
					$mainObj[$k] = $ret1;
				}
			}
		}
	}

	// 优化的子表查询. 对列表使用一次`IN (id,...)`查询出子表, 然后使用程序自行join
	// 临时添加了"id_"作为辅助字段.
	protected function handleSubObjForList(&$ret)
	{
		$subobj = $this->sqlConf["subobj"];
		if (! is_array($subobj) || count($subobj)==0)
			return;

		$idArr = [];
		foreach ($ret as $row) {
			$key = $row["id"] ?: $row["编号"]; // TODO: use id
			if ($key === null)
				continue;
			$idArr[] = $key;
		}
		if (count($idArr) == 0)
			return;
		$idList = join(',', $idArr);

		# $opt: {sql, wantOne=false}
		foreach ($subobj as $k => $opt) {
			if (! @$opt["sql"])
				continue;
			$joinField = null;

			# e.g. "select * from OrderItem where orderId=%d" => (添加主表关联字段id_) "select *, orderId id_ from OrderItem where orderId=%d"
			$sql = preg_replace_callback('/(\S+)=%d/', function ($ms) use (&$joinField, $idList){
				$joinField = $ms[1];
				return $ms[1] . " IN ($idList)";
			}, $opt["sql"]); 
			if ($joinField === null) {
				if (! @$opt["force"])
					throw new MyException(E_SERVER, "bad subobj def: `" . $opt["sql"] . "'. require `field=%d`");

				$ret1 = queryAll($sql, true);
				if (@$opt["wantOne"]) {
					if (count($ret1) == 0)
						$ret1 = null;
					else
						$ret1 = $ret1[0];
				}
				foreach ($ret as &$row) {
					$row[$k] = $ret1;
				}
				continue;
			}

			$sql = preg_replace('/ from/i', ", $joinField id_$0", $sql, 1);
			// "SELECT status, count(*) cnt FROM Task WHERE orderId=%d group by status" 
			// => "select status, count(*) cnt, orderId id_ FROM Task WHERE orderId IN (...) group by id_, status"
			$sql = preg_replace('/group by/i', "$0 id_, ", $sql);

			$ret1 = queryAll($sql, true);
			$subMap = []; // {id_=>[subobj]}
			foreach ($ret1 as $e) {
				$key = $e["id_"];
				unset($e["id_"]);
				if (! array_key_exists($key, $subMap)) {
					$subMap[$key] = [$e];
				}
				else {
					$subMap[$key][] = $e;
				}
			}
			foreach ($ret as &$row) {
				$key = $row["id"] ?: $row["编号"]; // TODO: use id
				$val = @$subMap[$key];
				if (@$opt["wantOne"]) {
					if ($val !== null)
						$val = $val[0];
				}
				else {
					if ($val === null)
						$val = [];
				}
				$row[$k] = $val;
			}
		}
	}

/*
# "key= vallue"
# "key= >=vallue"
# "key= <vallue"
# "key= ~vallue"
function KVtoCond($k, $v)
{
	$op = "=";
	$is_like = false;
	if (preg_match('/^(~|<>|>=?|<=?)/', $v, $ms)) {
		$op = $ms[1];
		$v = substr($v, strlen($op));
		if ($op == "~") {
			$op = " LIKE ";
			$is_like = true;
		}
	}
	$v = trim($v);

	if ($is_like || !ctype_digit($v) {
# 		// ???? 只对access数据库: 支持 yyyy-mm-dd, mm-dd, hh:nn, hh:nn:ss
# 		if (!is_like && v.match(/^((19|20)\d{2}[\/.-])?\d{1,2}[\/.-]\d{1,2}$/) || v.match(/^\d{1,2}:\d{1,2}(:\d{1,2})?$/))
# 			return op + "#" + v + "#";
		if ($is_like) {
			$v = "'%" + $v + "%'";
		}
		else {
			$v = "'" + $v + "'";
		}
	}
	return $k . $op . $v;
}
 */

	// 处理flags/props字段。设置字段参考flag_getExpForSet函数和dbUpdate
	private function flag_handleResult(&$rowData)
	{
		@$flags = $rowData["flags"];
		if (isset($flags)) {
			foreach (str_split($flags) as $e) {
				if (ctype_alnum($e))
					$rowData["flag_" . $e] = 1;
			}
		}
		@$props = $rowData["props"];
		if (isset($props)) {
			foreach (explode(" ", $props) as $e) {
				if (ctype_alnum($e[0]))
					$rowData["prop_" . $e] = 1;
			}
		}
	}

	private function flag_handleCond(&$cond)
	{
		$cond = preg_replace_callback('/((?:\w+\.)?flag|prop)_(\w+)=(0|1)/', function($ms) {
			$name = $ms[1] . 's'; // flag->flags
			$val = $ms[2];
			if ($ms[3] == '1') {
				$s = "{$name} LIKE '%{$val}%'";
			}
			else {
				$s = "({$name} IS NULL OR {$name} NOT LIKE '%{$val}%')";
			}
			return $s;
		}, $cond);
	}

	// 对象或对象数组转成 list string
	static function array2Str($arr)
	{
		if (count($arr) == 0)
			return "";
		if (! isset($arr[0]))
			return join(':', $arr);
		return join(',', array_map("self::array2Str", $arr));
	}

	function outputCsvLine($row, $enc)
	{
		$firstCol = true;
		foreach ($row as $e) {
			if ($firstCol)
				$firstCol = false;
			else
				echo ',';
			if (is_array($e))
				$e = self::array2Str($e);
			if ($enc) {
				$e = iconv("UTF-8", "{$enc}//TRANSLIT" , (string)$e);

				// Excel使用本地编码(gb18030)
				// 大数字，避免excel用科学计数法显示（从11位手机号开始）。
				// 5位-10位数字时，Excel会根据列宽显示科学计数法或完整数字，11位以上数字总显示科学计数法。
				if (preg_match('/^\d{11,}$/', $e)) {
					$e .= "\t";
				}
			}
			if (strpos($e, '"') !== false || strpos($e, "\n") !== false || strpos($e, ",") !== false)
				echo '"', str_replace('"', '""', $e), '"';
			else
				echo $e;
		}
		echo "\n";
	}

	function table2csv($tbl, $enc = null)
	{
		if (isset($tbl["h"]))
			$this->outputCsvLine($tbl["h"], $enc);
		foreach ($tbl["d"] as $row) {
			$this->outputCsvLine($row, $enc);
		}
	}

	function table2txt($tbl)
	{
		if (isset($tbl["h"]))
			echo join("\t", $tbl["h"]), "\n";
		foreach ($tbl["d"] as $row) {
			echo join("\t", $row), "\n";
		}
	}

	function table2html($tbl)
	{
		echo("<table border=1 cellspacing=0>");
		if (isset($tbl["h"])) {
			echo "<tr><th>" . join("</th><th>", $tbl["h"]), "</th></tr>\n";
		}
		foreach ($tbl["d"] as $row) {
			echo "<tr><td>" . join("</td><td>", $row), "</td></tr>\n";
		}
		echo("</table>");
	}

	function table2excel($tbl)
	{
		$hdr = [];
		foreach ($tbl["h"] as $h) {
			$hdr[$h] = "string";
		}
		$writer = new XLSXWriter();
		$writer->writeSheet($tbl["d"], "Sheet1", $hdr);
		$writer->writeToStdOut();
	}

/**
@fn handleExportFormat($fmt, $arr, $fname)

导出表到文件。

- fmt: csv-逗号分隔的文本; excel-使用gb18030编码的csv文本(excel可直接打开); txt-制表符分隔的文本。 
- arr: 筋斗云表格格式({@h, @d}), 或二维数组表格格式。
- fname: 导出的文件名

示例：导出订单行及其明细等表，将多个查询结果拼成一个数组，导出excel-csv文件。

	class AC2_Ordr 
	{
		function api_export()
		{
			$id = mparam("id");
			$tbl = queryAllWithHeader("SELECT t0.id 订单号, u.name 用户, u.phone 联系方式, t0.createTm 创建时间, t0.amount 金额
	FROM Ordr t0
	LEFT JOIN User u ON u.id=t0.userId
	WHERE t0.id=$id", true);
			$tbl2 = queryAllWithHeader("SELECT name 商品, price 单价, qty 数量, spec 规格 FROM OrderItem WHERE orderId=$id", true);
			$tbl3 = queryAllWithHeader("SELECT name 名称, amount 金额 FROM OrderAmount WHERE orderId=$id", true);

			$arr = array_merge($tbl, [[], ["订单明细:"]], $tbl2, [[], ["金额调整:"]], $tbl3);

			$this->handleExportFormat("excel", $arr, "订单明细-$id");
		}
	}

注意：`[[], ["订单明细"]`表示插入两行，一个空行，另一个只有一列"订单明细"。

前端JS示例:

	var url = WUI.makeUrl("Ordr.export", {id: orderId});
	window.open(url);

导出示例：

	订单号	用户	联系方式	创建时间	金额
	51343	王五555	"12345678901	"	2018/11/16 15:38	135
					
	订单明细:				
	商品	单价	数量	规格	
	高压氧气管三胶二线	115	1	8MM	
					
	金额调整:				
	名称	金额			
	运费	20			

*/
	function handleExportFormat($fmt, $ret, $fname)
	{
		// 若二维数组转成{h,d}格式
		if (!isset($ret["d"])) {
			$ret = ["d"=>$ret];
		}
		$handled = false;
		if ($fmt === "csv") {
			header("Content-Type: application/csv; charset=UTF-8");
			header("Content-Disposition: attachment;filename={$fname}.csv");
			$this->table2csv($ret);
			$handled = true;
		}
		else if ($fmt === "excel") {
			require_once("xlsxwriter.class.php");
			header("Content-disposition: attachment; filename=" . XLSXWriter::sanitize_filename($fname) . ".xlsx");
			header("Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
			header("Content-Transfer-Encoding: binary");
			$this->table2excel($ret);
			$handled = true;
		}
		else if ($fmt === "excelcsv") {
			header("Content-Type: application/csv; charset=gb18030");
			header("Content-Disposition: attachment;filename={$fname}.csv");
			$this->table2csv($ret, "gb18030");
			$handled = true;
		}
		else if ($fmt === "txt") {
			header("Content-Type: text/plain; charset=UTF-8");
			header("Content-Disposition: attachment;filename={$fname}.txt");
			$this->table2txt($ret);
			$handled = true;
		}
		else if ($fmt === "html") {
			header("Content-Type: text/html; charset=UTF-8");
			header("Content-Disposition: filename={$fname}.html");
			$this->table2html($ret);
			$handled = true;
		}
		if ($handled)
			throw new DirectReturn();
	}

/**
@fn AccessControl::isFileExport()

返回是否为导出文件请求。
*/
	function isFileExport(&$fmt=null)
	{
		if ($this->ac != "query")
			return false;
		$fmt = param("fmt");
		return $fmt != null && $fmt != 'list';
	}
}

function issetval($k, $arr = null)
{
	if ($arr === null)
		$arr = $_POST;
	return isset($arr[$k]) && $arr[$k] !== "";
}
/**
@class BatchAddLogic

用于定制批量导入行为。
示例，实现接口：

	Task.batchAdd(orderId, task1)(city, brand, vendorName, storeName)

其中vendorName和storeName字段需要通过查阅修正为vendorId和storeId字段。

	class TaskBatchAddLogic extends BatchAddLogic
	{
		protected $vendorCache = [];
		function __construct () {
			// 每个对象添加时都会用的字段，加在$this->params数组中
			$this->params["orderId"] = mparam("orderId", "G"); // mparam要求必须指定该字段
			$this->params["task1"] = param("task1", null, "G");
		}
		// $params为待添加数据，可在此修改，如用`$params["k1"]=val1`添加或更新字段，用unset($params["k1"])删除字段。
		// $row为原始行数据数组。
		function beforeAdd(&$params, $row) {
			// vendorName -> vendorId 将params数组中的venderName字段查阅Vendor表改成vendorId字段。如果查不到则报错。传入vendorCache数组来优化查询。
			translateKey($params, "vendorName", "vendorId", "SELECT id FROM Vendor WHERE name=%s", null, $this->vendorCache);
			// storeName -> storeId 将params数组中的storeName字段查阅Store表改成storeId字段。如果查不到则自动以指定insert语句创建。
			translateKey($params, "storeName", "storeId", "SELECT id FROM Store WHERE name=%s", "INSERT INTO Store (name) VALUES (%s)");
		}
		// 处理原始标题行数据, $row1是通过title参数传入的标题数组，可能为空
		function onGetTitleRow($row, $row1) {
		}
	}

	class AC2_Task extends AC0_Task
	{
		function api_batchAdd() {
			$this->batchAddLogic = new TaskBatchAddLogic();
			return parent::api_batchAdd();
		}
	}

@see api_batchAdd
*/
class BatchAddLogic
{
	public $params = [];
	function beforeAdd(&$paramArr, $row) {
	}
	function onGetTitleRow($row, $row1) {
	}
}

/*
分析符合下列格式的HTTP POST内容：

- 以"\n"为行分隔，以"\t"为列分隔的文本数据表。
- 第1行: 标题(如果有URL参数title，则忽略该行)，第2行开始为数据

若需要定制其它导入方式，可继承和改写该类，如CsvBatchAddStrategy，改写以下方法

	onInit
	onGetRow

通过BatchAddLogic::create来创建合适的类。
*/
class BatchAddStrategy
{
	protected $rowIdx;
	protected $logic; // BatchAddLogic
	private $rows;

	static function create($logic=null) {
		$st = null;
		if (empty($_FILES)) {
			$st = new BatchAddStrategy();
		}
		else {
			$st = new CsvBatchAddStrategy();
		}
		if ($logic == null)
			$st->logic = new BatchAddLogic();
		else
			$st->logic = $logic;
		return $st;
	}

	final function beforeAdd(&$paramArr, $row) {
		foreach ($this->logic->params as $k=>$v) {
			$paramArr[$k] = $v;
		}
		$this->logic->beforeAdd($paramArr, $row);
	}

	protected function onInit() {
		$content = getHttpInput();
		self::backupFile(null, null);
		$this->rows = preg_split('/\s*\n/', $content);
	}
	protected function onGetRow() {
		if ($this->rowIdx >= count($this->rows))
			return null;
		$rowStr = $this->rows[$this->rowIdx];
		if ($rowStr == "") {
			$row = [];
		}
		else {
			$row = preg_split('/[ ]*\t[ ]*/', $rowStr);
		}
		return $row;
	}

	function getRow() {
		if ($this->rowIdx == null) {
			$this->rowIdx = 0;
			$this->onInit();
		}
		$row = $this->onGetRow();
		if ($row == null)
			return null;
		if (++ $this->rowIdx == 1) {
			$title = param("title", null, "G");
			$row1 = null;
			if ($title) {
				$row1 = preg_split('/[\s,]+/', $title);
			}
			$this->logic->onGetTitleRow($row, $row1);
			if ($row1 != null)
				$row = $row1;
		}
		return $row;
	}

	// backupFile(null, null): 保存http请求的内容.
	static function backupFile($file, $orgName) {
		$dir = "upload/import";
		if (! is_dir($dir)) {
			if (mkdir($dir, 0777, true) === false)
				throw new MyException(E_SERVER, "fail to create folder: $dir");
		}
		$fname = $dir . "/" . date("Ymd_His");
		$ext = strtolower(pathinfo($orgName, PATHINFO_EXTENSION)) ?: "txt";
		$n = 0;
		do {
			if (!$n)
				$bakF = "$fname.$ext";
			else
				$bakF = "$fname_$n.$ext";
			++ $n;
		} while (is_file($bakF));

		if (is_null($file)) {
			$orgName = "(http content)";
			file_put_contents($bakF, getHttpInput());
		}
		else {
			copy($file, $bakF);
		}
		$title = param("title", null, "G");
		if ($title) {
			$title = ", param title=`$title`";
		}
		logit("import file: $orgName, backup: $bakF{$title}");
	}
}

/*
支持csv, txt两种文件，分别以","和"\t"分隔。
标题栏为数据第一行，也可通过title参数来覆盖。
*/
class CsvBatchAddStrategy extends BatchAddStrategy
{
	protected $fp;
	protected $delim;

	protected function onInit() {
		if (empty($_FILES))
			throw new MyException(E_PARAM, "no file", "没有文件上传");
		$f = current($_FILES);
		if ($f["size"] <= 0 || $f["error"] != 0)
			throw new MyException(E_PARAM, "error file: code={$f['error']}", "文件数据出错");

		$orgName = $f["name"];
		$file = $f["tmp_name"];
		self::backupFile($file, $orgName);
		$this->fp = fopen($file, "rb");
		utf8InputFilter($this->fp);

		if (substr($orgName, -4) == ".txt") {
			$this->delim = "\t";
		}
		else {
			$this->delim = ",";
		}
	}

	// 如果是全空行，返回true
	static function trimArr(&$arr) {
		$isEmpty = true;
		foreach ($arr as &$e) {
			$e = trim($e);
			if ($e != "") {
				$isEmpty = false;
			}
		}
		return $isEmpty;
	}
	protected function onGetRow() {
		do {
			$row = fgetcsv($this->fp, 0, $this->delim);
			if ($row === false) {
				fclose($this->fp);
				$row = null;
				break;
			}
		} while(self::trimArr($row));
		return $row;
	}
}

# }}}

// vi: foldmethod=marker
