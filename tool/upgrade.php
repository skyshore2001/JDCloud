<?php

require_once('upglib.php');

$h = new UpgHelper();

if (count($argv) > 1) {
	for ($i=1; $i<count($argv); $i++) {
		switch ($argv[$i]) {
		case "upgrade":
			upgradeAuto();
			break;
		case "all":
			$h->initDB();
			break;
		default:
			$h->addTable($argv[$i]);
			break;
		}
	}
	return;
}

while (true) {
	try {
		echo "> ";
		$s = fgets(STDIN);
		if ($s === false)
			break;
		$s = chop($s);
		if (! $s)
			continue;

		if ($s == "q") {
			$h->quit();
		}
		else if (preg_match('/^\s*(select|update|delete|insert|drop|create)\s+/i', $s)) {
			$h->execSql($s);
		}
		else if (preg_match('/^(\w+)\s*\((.*)\)/', $s, $ms) || preg_match('/^(\w+)\s*$/', $s, $ms)) {
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
		echo($e);
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
