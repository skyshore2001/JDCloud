<?php
// run setenv to choose db

chdir(__DIR__);

require_once("../server/api.php");

$GLOBALS["dbConfirmFn"] = function ($connstr) {
	echo "=== connect to $connstr (enter to cont, ctrl-c to break) ";
	fgets(STDIN);
};

//$env = new DBEnv("mysql", "mysql:host=localhost;port=3306;dbname=firefly_web", "root", "123456");
$env = getJDEnv();

// example: update all names of users, e.g. "用户13712345678"->"用户137****5678"
$rows = $env->queryAll("select id, name, phone from User");

$n = 0;
foreach ($rows as $row) {
	$id = $row[0];
	$name = $row[1] ?: "User " . $row[2];
	$name1 = preg_replace('/\d{3}\K\d{4}/', '****', $name);
	if ($name1 != $name)
	{
		echo "update `{$name}` to `{$name1}`\n";
		$env->dbUpdate("User", ["name"=>$name1], $id);
		++ $n;
	}
}
echo "update $n records.\n";

/* example: use transaction and prepare
$DBH = $env->DBH;
$DBH->beginTransaction();
$sth = $DBH->prepare("update User set name=? where id=?");
$n = 0;
foreach ($rows as $row) {
	$id = $row[0];
	$name = $row[1] ?: "User " . $row[2];
	$name1 = preg_replace('/\d{3}\K\d{4}/', '****', $name);
	if ($name1 != $name)
	{
		echo "update `{$name}` to `{$name1}`\n";
		$sth->execute([$name1, $id]);
		++ $n;
	}
}
$DBH->commit();
echo "update $n records.\n";
 */
