<?php
class AC0_Role extends AccessControl
{
	// called by AC2_Employee::onQuery
	static function handleRole($ac)
	{
		if ($ac->ac == "get") {
			$res = param("res");
			if (!$res || strpos($res, "perms")!==false)
				$ac->addRes("perms rolePerms");
			$ac->enumFields["rolePerms"] = function ($perms, $row) {
				if (! $perms)
					return;
				// "perm1, perm2" => "IN ('perm1', 'perm2')"
				$permsExpr = preg_replace_callback('/[\w&]+/u', function ($ms) {
					return Q($ms[0]);
				}, $perms);
				$rows = queryAll("SELECT perms FROM Role WHERE name IN (" . $permsExpr . ")");
				$ret = join(" ", array_map(function ($e) { return $e[0]; }, $rows));
				return $ret;
				//return queryOne("SELECT GROUP_CONCAT(perms) FROM Role WHERE name IN (" . $permsExpr . ")");
			};
		}
		$role = param("role");
		if ($role) {
			$ac->addCond("find_in_set(" . Q($role) . ", perms)", false, false);
		}
	}

	protected function onValidate()
	{
		if (issetval("name")) {
			if (preg_match('/[^\w&]/u', $_POST["name"]))
				jdRet(E_PARAM, "invalid char", "角色名包含非法字符");
		}
	}
}

class AC2_Role extends AC0_Role
{
}

