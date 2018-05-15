<?php
/*
注意：添加新任务时，请设置task.crontab.php，以便生成安装脚本。
 */
chdir(dirname(__FILE__));

$GLOBALS["noExecApi"] = true;
require_once("../api.php");
//require_once("../app.php");

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
	echo "=== mock mode=" . $GLOBALS["MOCK_MODE"] . "\n";
}

function ac_db()
{
	@mkdir("bak");
	// -l: (login shell) run bashrc, etc.
	system("bash -l ./backup_db.sh");
}

