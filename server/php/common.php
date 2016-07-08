<?php

define("T_HOUR", 3600);
define("T_DAY", 24*T_HOUR);
define("FMT_DT", "Y-m-d H:i:s");

// const T_DAY = 24*T_HOUR; // not allowed

###### common {{{
/** @fn tobool($s) */
function tobool($s)
{
	if (is_string($s) && ($s === "0" || strcasecmp($s, "false") == 0))
		return false;
	return (bool)$s;
}

/** @fn startsWith($s, $pat) */
function startsWith($s, $pat)
{
	return substr($s, 0, strlen($pat)) == $pat;
}

/** 
@fn isCLI() 

command-line interface. e.g. run "php x.php"
*/
function isCLI()
{
	return php_sapi_name() == "cli";
}

/** 
@fn isCLIServer() 

php built-in web server e.g. run "php -S 0.0.0.0:8080"
*/
function isCLIServer()
{
	return php_sapi_name() == "cli-server";
}

/** @fn isEqualCollection($col1, $col2) */
function isEqualCollection($a, $b)
{
	return count($a)==count($b) && array_diff($a, $b) == [];
}

#}}}

// vim: set foldmethod=marker :
