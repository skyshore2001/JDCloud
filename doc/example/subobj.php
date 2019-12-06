<?php
/*
演示子表设计与实现。

用法：

1. 在设计文档DESIGN.md中添加表定义，使用upgrade.sh升级数据模型。

	@Item: id, name, price
	@OrderItem: id, orderId, itemId, itemName, price, qty, amount

2. 将api_objects.php中的AC1_Ordr类改名，然后在最后包含本文件：

	require_once("subobj.php");

测试`Ordr.add/set/get/query`接口。
*/

class AC1_Item extends AccessControl
{
}

class OrderItem extends AccessControl
{
	protected $requiredFields = ["itemId", "price", "qty", "amount"];
}

class AC1_Ordr extends AccessControl
{
	protected $requiredFields = ["items", "amount"];
	protected $allowedAc = ["get", "query", "add", "set"];
	protected $subobj = [
		"items" => ["obj"=>"OrderItem", "cond"=>"orderId=%d", "AC"=>"OrderItem"]
	];

	protected function onQuery()
	{
		$userId = $_SESSION["uid"];
		$this->addCond("t0.userId={$userId}");
	}

	function api_completeItem()
	{
		$this->completeItem($_POST);
		return $_POST;
	}

	// {itemId, price?, itemName?, qty?}
	protected function completeItem(&$item)
	{
		$itemId = mparam("itemId", $item);
		if (!issetval("price", $item) || !issetval("itemName", $item)) {
			$rv = queryOne("SELECT name, price FROM Item WHERE id=" . $itemId, true);
			if (!issetval("price", $item))
				$item["price"] = $rv["price"];
			if (!issetval("itemName", $item))
				$item["itemName"] = $rv["name"];
		}
		if (!issetval("qty", $item)) {
			$item["qty"] = 1.0;
		}
	}

	// { items={qty, price, amount!}, amount! }
	function api_calc()
	{
		$this->calc($_POST);
		return $_POST;
	}

	protected function calc(&$order)
	{
		mparam("items", $order);
		$amount = 0;
		foreach ($order["items"] as &$item) {
			mparam("price", $item);
			mparam("qty", $item);
			$item["amount"] = $item["price"] * $item["qty"];
			$amount += $item["amount"];
		}
		$order["amount"] = $amount;
	}

	protected function validateCalc()
	{
		$this->onAfterActions[] = function () {
			$order = queryOne("SELECT amount FROM Ordr WHERE id=" . $this->id, true);
			$order["items"] = queryAll("SELECT price,qty,amount FROM OrderItem WHERE orderId=" . $this->id, true);
			$order0 = $order;
			$this->calc($order);
			if ($order0["amount"] != $order["amount"])
				throw new MyException(E_PARAM, "bad amount, require " . $order["amount"] . ", actual " . $order0["amount"], "金额不正确");
		};
	}

	protected function onValidate()
	{
		if ($this->ac == "add") {
			$userId = $_SESSION["uid"];
			$_POST["userId"] = $userId;
			$_POST["status"] = "CR";
			$_POST["createTm"] = date(FMT_DT);

			mparam("items", $_POST);
			foreach ($_POST["items"] as &$item) {
				$this->completeItem($item);
			}
			if ($_GET["doCalc"])
				$this->calc($_POST);
			else
				$this->validateCalc();
		}
		else {
			if (issetval("amount") || issetval("items"))
				$this->validateCalc();
		}
	}
}
