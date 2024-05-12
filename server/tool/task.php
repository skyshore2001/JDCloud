<?php
/*
注意：添加新任务时，请设置task.crontab.php，以便生成安装脚本。
 */
chdir(__DIR__);

require_once("../api.php");

$GLOBALS["dbConfirmFn"] = function ($connstr) {
	echo "=== connect to $connstr\n";
//	echo "=== connect to $connstr (enter to cont, ctrl-c to break) ";
//	fgets(STDIN);
};

$ac = @$argv[1] or die("=== Usage: task {ac}\n");

$fn = "ac_" . $ac;
if (function_exists($fn)) {
	echo "=== [" . date('Y-m-d H:i:s') . "] exec task: $ac\n";
	try {
		$fn();
	}
	catch (Exception $e) {
		echo($e);
	}
	// 正常结束，以确保全局对象析构(JDEnv)时输出日志到debug.log
}
else {
	die("*** unknown ac=`$ac`\n");
}

function ac_test()
{
	// 模拟AC2权限调用接口
	$_SESSION = ["empId" => -1];
	// 设置参数
	$_GET = ["for" => "task", "fmt" => "one"];
	$rv = callSvc("Employee.query");
	echo "=== ret " . jsonEncode($rv) . "\n";
}

function ac_db()
{
	@mkdir("bak");
	// -l: (login shell) run bashrc, etc.
	system("bash -l ./backup_db.sh");
}

// ApiLog日志归档到ApiLog_{date}, 如果日志很多，建议每半年执行一次，不定期手工删除
// task.crontab.php建议(每年1/1,6/1执行): 10 4 1 1,6 * $TASK dblog >> $LOG 2>&1
function ac_dblog()
{
	// 默认存在当前库，建议新建备份库如"bak"，否则db备份会很大！
	$bakdb = '';
	$dt = date("Ymd");
	foreach (["ApiLog", "ApiLog1"] as $tbl) {
		// $cnt = queryOne("SELECT COUNT(*) FROM $tbl"); // NOTE: 大表count非常慢
		// if ($cnt < 10000)
		$rv = queryOne("SELECT MAX(id) ma, MIN(id) mi FROM $tbl");
		if (! ($rv && $rv[0] && $rv[0]-$rv[1] > 10000))
			continue;

		$tblBak = $bakdb? "$bakdb.{$tbl}_$dt": "{$tbl}_$dt";
		$tblNew = "{$tbl}_{$dt}_1";
		echo("backup table $tbl to $tblBak\n");
		execOne("create table $tblNew like $tbl");
		execOne("insert into $tblNew select * from $tbl order by id desc limit 1");
		execOne("DROP TABLE IF EXISTS $tblBak");
		execOne("RENAME TABLE $tbl TO $tblBak, $tblNew TO $tbl");
	}
}

