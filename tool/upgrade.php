<?php

/**
@module jdcloud-upgrade

筋斗云一站式数据模型部署工具。

- 根据设计文档中的数据模型定义，创建或更新数据库表。
- 数据库支持mysql，此外，对mssql(microsoft sqlserver)与sqlite提供基本功能支持。

工具要求php5.4以上版本环境。

## 快速上手

参照META.md，在文本文件中定义数据库表和字段，比如：

	@ApiLog: id, tm, addr

这样就定义了表ApiLog以及它的字段。

在mysql中创建一个新的数据库，名为jdcloud。

参照upgrade.sh，配置数据库连接参数，如：

	export P_DB=localhost/jdcloud
	export P_DBCRED=demo:demo123

然后运行它（一般在git-bash中运行）：

	./upgrade.sh

回车确认连接后，输入命令`initdb`，即可创建数据库表。
也可以直接用一个非交互的命令：

	./upgrade.sh initdb

当在META.md中修改了数据库设计，比如添加了表或字段，再重新运行升级脚本时，可刷新数据库表。

要查看所有建表的SQL语句，可以用：

	./upgrade.sh showtable

要查看指定的表:

	./upgrade.sh 'showtable("ordr")'

默认升级时(initdb)只会添加缺失的表和字段, 不会更新已有的表和字段, 但可以用

	./upgrade.sh 'showtable("*", true)' | tee 1.sql

导出SQL后, 手工编辑并执行, 以避免误修改或删除字段.

## 定义数据模型

数据模型主要为表和字段，一般在设计文档中定义，最常见的形式如：

	@ApiLog: id, tm, addr

这样就定义了表ApiLog以及它的字段。
字段类型根据命名规范自动判断，比如以id结尾的字段会被自动作为整型创建，以tm结尾会被当作日期时间类型创建，其它默认是字符串，规则如下：

| 规则 | 类型 |
| --   | --   |
| 以"Id"结尾                           | Integer
| 以"Price"/"Total"/"Qty"/"Amount"结尾 | Currency
| 以"Tm"/"Dt"/"Time"结尾               | Datetime/Date/Time
| 以"Flag"结尾                         | TinyInt(1B) NOT NULL

例如，"total", "docTotal", "total2", "docTotal2"都被认为是Currency类型（字段名后面有数字的，判断类型时数字会被忽略）。
 
也可以用一个类型后缀表示，如 `retVal&`表示整型，类型后缀规则如下：

| 后缀 | 类型 |
| --   | --   |
| &    | Integer
| @    | Currency
| #    | Double

字符串可以指定长度如`status(2)`，`name(s)`，字串长度以如下方式描述：

| 标记 | 长度 |
|--    | --   |
| s | small=20            |
| m | medium=50 (default) |
| l | long=255            |
| t | text                |

### include指令

主设计文档中可以包含其它设计文档，指令如下：

	@include sub/mydesign.md

允许使用通配符，例如在筋斗云框架应用的主设计文档DESIGN.md中默认会包含各插件的设计文档：

	@include server/plugin/ * /DESIGN.md

## 配置环境变量

可设置环境变量来定制运行参数。

- P_METAFILE: 指定META文件，一般即主设计文档，根据其中定义的数据模型生成数据库。默认为项目根目录下的"DESIGN.md"
- P_DBTYPE,P_DB,P_DBCRED: 设置数据库连接，参考下节。

### 连接数据库

连接mysql示例(注意在php.ini中打开php_pdo_mysql扩展)，设置以下环境变量：

	P_DBTYPE=mysql
	P_DB=172.12.77.221/jdcloud
	P_DBCRED=demo:demo123

P_DBTYPE参数可以不设置，它默认值就是mysql。
它还支持设置为mssql(microsoft sqlserver)与sqlite，工具对这两具数据库也提供基本功能支持。

连接sqlite示例(注意打开php_pdo_sqlite扩展)：

	P_DBTYPE=sqlite
	P_DB=d:/db/jdcloud.db

连接mssql示例(通过odbc连接，注意打开php_pdo_odbc扩展)

	P_DBTYPE=mssql
	P_DB=odbc:DRIVER=SQL Server Native Client 10.0; DATABASE=jdcloud; Trusted_Connection=Yes; SERVER=.\MSSQL2008;
	P_DBCRED=sa:demo123

或使用odbc的文件DSN（可通过系统自带的odbcad32工具创建），如：

	P_DBTYPE=mssql
	P_DB=odbc:FILEDSN=d:\db\jdcloud-mssql.dsn;
	P_DBCRED=sa:demo123

一般创建脚本文件upgrade.sh来指定这些变量，以方便执行。

环境变量P_DBCRED指定连接数据库的用户名密码，格式为`{用户名}:{密码}`或其base64编码的形式，如：

	P_DBCRED=ZGVtbzpkZW1vMTIzCg==
	(即demo:demo123)

注意：

- 升级工具只创建表, 不创建数据库本身。
- 默认不会删除表或字段, 不会更新类型与定义不一致的字段。如有需要可用`showtable("*", true)`命令导出SQL并手工操作。

### 筋斗云框架支持

本工具原为筋斗云框架的升级工具(tool/upgrade.php)，后独立出来。对筋斗云框架有以下支持：

- 未指定P_METAFILE时，默认加载筋斗云应用的主设计文档(DESIGN.md或DESIGN.wiki)作为META文件。
- 如果存在筋斗云应用配置文件server/php/conf.user.php，会自动包含进来，一般可复用里面的数据库连接配置。
 工具与筋斗云框架的数据库连接配置方式兼容，都通过同名环境变量来指定数据库连接参数。

## 用法

运行`php upgrade.php`，进入命令行交互。

### 交互命令

一般命令格式与函数调用类似, 也支持直接输入常用的sql语句，示例：

	> addtable("item")
	> addtable("item", true)
	> quit()
	
	对于无参数命令可不加括号
	> initdb
	> quit
	
	支持直接的sql语句, 限"select|update|delete|insert|drop|create"这些语句。
	> select * from item limit 10
	> update item set price=333 where id=8

支持的交互命令如下：

**[help]**

参数: [command]

显示帮助. 可以指定command名称, 全部或部分均可.

例:

	> help
	> help("addtable")
	> help("table")

**[initdb]**

自动添加所有表. 等同于updatedb命令.

**[updatedb]**

自动添加或更新所有表. 相当于对所有表调用addtable命令.
如果某张表已存在, 则检查是否有缺失的字段(注意: 只检查缺失, 不检查字段类型是否变化), 有则添加, 否则对该表不做更改.

**[execsql]**

参数: {sql} [silent=false]

对于select语句, 返回结果集内容; 对于其它语句, 返回affectedRows.

例:

	> execsql("select * from item limit 10")
	> execsql("update item set price=10 where id=3")

注:
- 支持直接输入SQL语句, 会自动调用execsql()执行. 程序通过以select等关键字识别SQL, 如

	> select * from item limit 10
	> update item set price=10 where id=3

**[quit]**

退出交互. 可简写为"q".

例:

	> quit
	或
	> q

**[TODO: upgrade]**

TODO
自动根据版本差异，执行升级脚本，升级数据库. 
如果字段cinf.ver不存在, 则重建DB(但会忽略已有的表, 不会删除它再重新创建). 升级完成后设置cinf.ver字段.

**[showtable]**

参数: {table?="*", checkDb=false}

查看某表的metadata以及SQL创建语句. 参数{table}中可以包含通配符。
如果参数{checkDb}=true, 则以SQL命令(如ALTER TABLE语句)方式输出数据模型定义与实际数据库表的差异, 它不会自动执行, 以避免误修改或删除字段, 可由用户导出SQL编辑后手工执行.

例: 

	> showtable("item")
	> showtable("*log")

	> showtable("*", true)

**[addtable]**

参数: {table} [force=false]

根据metadata添加指定的表{table}. 未指定force参数时, 如果表已存在且未指定force=true, 则检查和添加缺失的字段; 如果指定了force=true, 则会删除表重建.

例:

	> addtable("item")
	
	(删除表item并重建)
	> addtable("item", true)

**[TODO: reload]**

重新加载metadata. 当修改了DESIGN.wiki中的表结构定义时, 应调用该命令刷新metadata, 以便showtable/addtable等命令使用最新的metadata.

**[addcol]**

addcol {table} {col}

添加字段{table}.{col}

**[getver]**

取表定义的version.

**[getdbver]**

取数据库的version. 

**[import]**

参数: {filename} {noPrompt=false} [encoding=utf8]

将文本文件内容导入表中，支持定义关联表数据，如果表不存在，会自动创建表（根据metadata），如果表已存在，会删除重建。文件编码默认为utf8. (TODO: 支持指定编码）

参考[导入数据表](#导入数据表)章节。

noPrompt
: 默认导入表之前要求确认，如果指定该项为true，则不需要提示，直接导入。

### 非交互命令

更新指定表（addtable命令）：

	upgrade.php car_brand car_series car_model

更新所有表（initdb命令）：

	upgrade.php all

版本差量升级（TODO：upgrade命令）：

	upgrade.php upgrade

## 导入数据表

一个文件可以包含多个表，每张表的数据格式如下：

	# table [CarBrand]
	id	name	shortcut
	110	奥迪	A
	116	宝骏	B
	103	宝马	B
	...

"#"开头为注释，一般被忽略；特别地，"table [表名]"会标识开始一个新表，然后接下去一行是header定义，以tab分隔，再下面是数据定义，以tab分隔。

这种文件一般可以在excel中直接编辑（但注意：excel默认用本地编码，也支持unicode即ucs-2le编码，但不直接支持utf-8编码）

注意:
- 如果字段值为空, 直接写null.

例：导入车型测试数据
先生成测试数据：

	initdata\create_testdata.pl
	(生成到文件brands.txt)


再在upgrade.php中用import导入：

	> import("../initdata/brands.txt")


注意：如果列名以"-"开头，则忽略此列数据，如

	# table [CarBrand]
	id	name	-shortcut
	110	奥迪	A
	...

将不会导入shortcut列。

### TODO: 带关联字段导入：

	# table [Figure]
	name	bookId(Book.name)	ref
	黄帝	史记	本纪-五帝

上例数据中，表示根据Book.name查找Book.id，然后填入Figure.bookId。如果Book中找不到相应项，会自动添加一项。

### 关联表导入

示例：

	# table [Svc]
	id	name	Svc_ItemType(ittId,svcId)
	1	小保养	1,2,6
	2	大保养	1,2,3,4,7

上例有个字段表述为"Svc_ItemType(ittId,svcId)", 它表示该字段关联到表 Svc_ItemType.ittId字段，而本表的id对应关联表字段svcId。其内容为以逗号分隔的一串值。以上描述相当于：

	# table [Svc]
	id	name
	1	小保养
	2	大保养
	
	# table [Svc_ItemType]
	ittId	svcId
	1	1
	2	1
	6	1
	...

还可以这样设置：

	# table [Svc]
	id	name	Svc_ItemType(ittId,svcId,ItemType.name)
	1	小保养	机油;机油滤清器

上例中"Svc_ItemType"多了一个参数"ItemType.name", 它表示下面内容是关联到ItemType.name字段，即需要先用"SELECT id FROM ItemType WHERE name=?"查询出Svc_ItemType.ittId(第一个参数)，再同上例进行添加。

## TODO: 写升级脚本

当表结构变化时, 

- 更新设计文档中的表设计(相当于更改meta data)
- 增加设计文档中的设计版本号(@ver)
- 在升级脚本中添加升级逻辑, 如添加字段(及设置默认值), 添加表, 修改字段等.
- 测试升级脚本后, 上传设计文档及升级脚本, 再通过API或登录服务器执行远程升级; 或直接在本地通过设置P_DB环境变量直接用升级工具连接远端数据库.

upgrade.php

	ver = getver();
	dbver = getdbver();
	if (ver <= dbver)
		return;
	
	if (dbver == 0) {
		initdb();
		return;
	}
	
	if (dbver < 1) {
		addcol(table, col);
		execsql('update table set col=col1+1');
	}
	if (dbver < 2) {
		addtable(table);
		importdata('data.txt');
	}
	if (dbver < 3) {
		addkey(key);
	}
	if (dbver < 4) {
		altercol(table, col);
	}
	
	update cinf set ver, update_tm
*/

require_once('upglib.php');

global $h;
try {
	$h = new UpgHelper();

	if (count($argv) > 1) {
		$cmd = join(' ', array_slice($argv, 1));
		execCmd($cmd);
		return;
	}

	while (true) {
		echo "> ";
		$s = fgets(STDIN);
		if ($s === false)
			break;
		$s = chop($s);
		if (! $s)
			continue;

		execCmd($s);
	}
}
catch (Exception $e) {
	echo($e->getMessage());
	echo("\n");
}

function execCmd($cmd)
{
	global $h;
	try {
		if ($cmd == "q") {
			$h->quit();
		}
		else if (preg_match('/^\s*(select|update|delete|insert|drop|create)\s+/i', $cmd)) {
			$h->execSql($cmd);
		}
		else if (preg_match('/^(\w+)\s*\((.*)\)/', $cmd, $ms) || preg_match('/^(\w+)\s*$/', $cmd, $ms)) {
			try {
				$fn = $ms[1];
				@$param = $ms[2] ?: '';
				$refm = new ReflectionMethod('UpgHelper', $ms[1]);
				try {
					eval('$r = $h->' . "$fn($param);");
					if (is_scalar($r))
						echo "=== Return $r\n";
				}
				catch (Exception $ex) {
					print "*** error: " . $ex->getMessage() . "\n";
					echo $ex->getTraceAsString();
					showMethod($refm);
				}
			}
			catch (ReflectionException $ex) {
				echo("*** unknown call. try help()\n");
			}
		}
		else {
			echo "*** bad format. try help()\n";
		}
	}
	catch (Exception $e) {
		echo($e->getMessage());
		echo("\n");
	}
}

function upgradeAuto()
{
	echo "TODO\n";
	return;
	$ver = UpgLib\getVer();
	$dbver = UpgLib\getDBVer();
	if ($ver <= $dbver)
	{
		return;
	}

	if ($dbver == 0) {
		UpgLib\initDB();
		# insert into cinf ver,create_tm
		UpgLib\updateDbVer();
		return;
	}

/*
if (dbver < 1) {
	addcol(table, col);
}
if (dbver < 2) {
	addtable(table);
}
if (dbver < 3) {
	addkey(key);
}
if (dbver < 4) {
	altercol(table, col);
}
*/

	UpgLib\updateDbVer();
}
?>
