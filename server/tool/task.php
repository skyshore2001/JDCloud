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
	$fn();
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

