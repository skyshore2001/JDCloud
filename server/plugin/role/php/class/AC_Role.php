<?php
class AC0_Role extends AccessControl
{
	static function handleRole($ac)
	{
		$ac->addRes("perms rolePerms");
		$ac->enumFields["rolePerms"] = function ($perms, $row) {
			if (! $perms)
				return;
			// "perm1, perm2" => "IN ('perm1', 'perm2')"
			$permsExpr = preg_replace_callback('/[\w&]+/u', function ($ms) {
				return Q($ms[0]);
			}, $perms);
			return queryOne("SELECT GROUP_CONCAT(perms) FROM Role WHERE name IN (" . $permsExpr . ")");
		};
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

