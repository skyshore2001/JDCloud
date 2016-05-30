<?php
$PROG_DIR = dirname(__FILE__);
$TASK = $PROG_DIR . "/task.php";
$LOG = $PROG_DIR . "/task.log";
?>
TASK="php <?=$TASK?>"
LOG=<?=$LOG?>

1 1 * * * $TASK db >> $LOG 2>&1
