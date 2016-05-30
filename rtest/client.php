<?php

require_once('WebAPI.php');

###### function {{{
function sval($v)
{
	if (is_null($v))
		return "null";
	else if (is_bool($v))
		return $v? "true": "false";
	return $v;
}

function showMethod($m, $keyword=null)
{
	$name = strtolower($m->getName());
	if ($keyword && strstr($name, $keyword) === false) {
		return;
	}
	print("  $name ");
	foreach ($m->getParameters() as $param) {
		if ($param->isOptional())
			printf("{%s=%s} ", $param->getName(), sval($param->getDefaultValue()));
		else
			printf("{%s} ", $param->getName());
	}
	print "\n";
}

function showMethods($keyword = null)
{
	if ($keyword) {
		$keyword = strtolower($keyword);
	}
	echo "Available method: \n";
	$cls = new ReflectionClass("WebAPI");
	foreach ($cls->getMethods() as $m) {
		$doc = $m->getDocComment();
		if ($doc !== false && strstr($doc, "@api") !== false) {
			showMethod($m);
		}
	}
}

function help()
{
	global $argv;
	echo "Usage: " . basename($argv[0]) . " {api}\n";
	showMethods();
}

function getFn($name)
{
	$cls = new ReflectionClass("WebAPI");
	$fn = null;
	try { $fn = $cls->getMethod($name); }
	catch (Exception $e) { }
	if (isset($fn) && !$fn->isPublic()) {
		unset($fn);
	}
	return $fn;
}

function callFn($fn, $params)
{
	$n = 0;
	foreach ($fn->getParameters() as $param) {
		if (! $param->isOptional()) {
			++ $n;
		}
	}
	$showUsage = false;
	if (count($params) < $n) {
		$showUsage = true;
		print "*** param error: minimal count of params is $n\n";
	}
	foreach ($params as &$p) {
		if ($p == "null") {
			$p = null;
		}
		elseif ($p == "?") {
			$showUsage = true;
			break;
		}
	}
	if ($showUsage) {
		print "Usage:\n";
		showMethod($fn);
		return;
	}
	$fn->invokeArgs(new WebAPI(true), $params);
}
#}}}

####### main routine {{{
if ($argc < 2) {
	help();
	exit();
}

$fn = getFn($argv[1]);
if (is_null($fn)) {
	showMethods($argv[1]);
	exit();
}

try {
callFn($fn, array_slice($argv, 2));
}
catch (Exception $e) {
	echo "\n*** ERROR: $e\n";
}
#}}}
# vim: set foldmethod=marker :
?>
