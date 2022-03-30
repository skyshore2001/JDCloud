<?php

class Cinf
{
	static function getValue($name) {
		$ret = queryOne("SELECT value FROM Cinf", false, ["name" => $name]) ?: null;
		return $ret;
	}
	static function setValue($name, $value) {
		$id = queryOne("SELECT id FROM Cinf", false, ["name" => $name]);
		if ($id === false) {
			dbInsert("Cinf", ["name" => $name, "value" => dbExpr(Q($value))]);
		}
		else {
			dbUpdate("Cinf", ["value" => dbExpr(Q($value))], $id);
		}
	}
}

class AC0_Cinf extends AccessControl
{
	protected function onValidate() {
		if (issetval("value")) {
			$_POST["value"] = dbExpr(Q($_POST["value"]));
		}
	}

	function api_getValue() {
		$name = mparam("name");
		return Cinf::getValue($name);
	}
	function api_setValue() {
		$name = mparam("name");
		$value = mparam("value", null, false);
		Cinf::setValue($name, $value);
	}
}

class AC2_Cinf extends AC0_Cinf
{
}

