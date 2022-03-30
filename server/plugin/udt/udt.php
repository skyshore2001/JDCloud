<?php
class AC2_UDT extends AccessControl
{
	protected $subobj = [
		"fields" => ["sql"=>"SELECT * FROM UDF WHERE udtId=%d", "default"=>true]
	];

	protected function onValidateId()
	{
		$name = param("name");
		if ($name) {
			$this->id = queryOne("SELECT id FROM UDT", false, ["name"=>$name]);
			if (!$this->id)
				jdRet(E_PARAM);
		}
	}
}

class AC_UDT extends AC2_UDT
{
	protected $allowedAc = ["get"];
}

class AC_U_Obj extends AccessControl
{
	protected $readonlyFields = ["tm", "updateTm"];

	protected function onValidate()
	{
		if ($this->ac === "add") {
			$_POST["tm"] = date(FMT_DT);
			$_POST["updateTm"] = date(FMT_DT);
		}
		else if ($this->ac === "set") {
			$_POST["updateTm"] = date(FMT_DT);
		}
		addLog($_POST);
	}
}
