<?php
/**
@fn mygetopt($opt, &$argv1)

@param $opt similar to longopt of getopt()
@param $argv1 (output)
@return $options
*/
function mygetopt($opt, &$argv1)
{
	global $argv;
	$options = [];
	$argv1 = [];
	$spec = [];

	foreach ($opt as $e) {
		if (! preg_match('/(\w+)(.*)$/', $e, $ms)) {
			die("*** bad opt format: $e\n");
		}
		$spec[$ms[1]] = $ms[2] ?: "";
	}

	$first = true;
	$curOpt = null; // {name, optional}
	foreach ($argv as $e) {
		if ($first) {
			$first = false;
			continue;
		}
		
		if ($e[0] == "-") {
			if ($curOpt && !$curOpt["optional"]) {
				die("*** require option value: `{$curOpt}'\n");
			}

			$opt = substr($e, 1);
			if (!$opt || ! array_key_exists($opt, $spec)) {
				die("*** unknown option value: `{$opt}'\n");
			}
			$tag = $spec[$opt];
			if ($tag == "") {
				$options[$opt] = true;
				$curOpt = null;
			}
			else if ($tag == ":") {
				$curOpt = [ "name"=>$opt, "optional"=>false];
			}
			else if ($tag == "::") {
				$options[$opt] = true;
				$curOpt = [ "name"=>$opt, "optional"=>true];
			}
		}
		else if (isset($curOpt)) {
			$options[$curOpt["name"]] = $e;
			$curOpt = null;
		}
		else {
			$argv1[] = $e;
		}
	}
	return $options;
}
